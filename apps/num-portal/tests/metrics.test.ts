import { describe, expect, it } from 'vitest';
import {
  deploymentSeconds, formatClock, handoffWaitSeconds, leadSeconds,
  methodBTimes, parseRunTag, runTag, standardDeviation,
} from '@/lib/metrics';

const at = (hhmmss: string) => new Date(`2026-10-19T${hhmmss}Z`);

describe('run tag', () => {
  it('reads the tag a commit message carries', () => {
    expect(parseRunTag('Add opening hours section [S2-11]')).toEqual({ scenario: 'S2', runNo: 11 });
    expect(parseRunTag('faulty release [s3 5]')).toEqual({ scenario: 'S3', runNo: 5 });
  });
  it('returns null when there is no tag', () => {
    expect(parseRunTag('Change the footer text')).toBeNull();
    expect(parseRunTag(null)).toBeNull();
  });
  it('builds the tag the Change code page prefills', () => {
    expect(runTag('S2', 7)).toBe('[S2-07]');
  });
});

describe('Method A timings', () => {
  const times = {
    tCommit: at('10:00:00'),
    tHandoff: at('10:02:10'),
    tOpsStart: at('10:03:35'),
    tLive: at('10:07:21'),
  };
  it('deployment time is hands-on work only', () => {
    expect(deploymentSeconds(times)).toBe(226);
  });
  it('lead time runs from the commit', () => {
    expect(leadSeconds(times)).toBe(441);
  });
  it('handoff wait is the time Ops left the request sitting', () => {
    expect(handoffWaitSeconds(times)).toBe(85);
  });
  it('is null while a timestamp is missing', () => {
    expect(deploymentSeconds({ tOpsStart: at('10:00:00') })).toBeNull();
  });
});

describe('Method B timings', () => {
  const created = at('10:00:00');
  const job = (name: string, status: string, from: string, to: string) =>
    ({ name, status, startedAt: at(from), finishedAt: at(to) });

  it('counts the whole pipeline, because there is no approval step', () => {
    const result = methodBTimes(created, [
      job('deploy_staging', 'success', '10:02:11', '10:02:40'),
      job('deploy_production', 'success', '10:02:41', '10:03:15'),
    ]);
    expect(result).toEqual({ deploymentS: 195, result: 'success' });
  });

  it('reports a rollback when the rollback job ran', () => {
    const result = methodBTimes(created, [
      job('deploy_production', 'success', '10:01:00', '10:01:11'),
      job('rollback_production', 'success', '10:01:12', '10:01:18'),
    ]);
    expect(result?.result).toBe('rolled_back');
  });

  it('counts until the last job when the pipeline never reached production', () => {
    const result = methodBTimes(created, [job('test_app', 'failed', '10:00:05', '10:00:27')]);
    expect(result).toEqual({ deploymentS: 27, result: 'failed' });
  });

  it('returns null when nothing finished', () => {
    expect(methodBTimes(created, [{ name: 'test_app', status: 'running', startedAt: created, finishedAt: null }])).toBeNull();
  });
});

describe('small helpers', () => {
  it('formats the timers as mm:ss', () => {
    expect(formatClock(0)).toBe('00:00');
    expect(formatClock(95)).toBe('01:35');
  });
  it('standard deviation needs at least two values', () => {
    expect(standardDeviation([5])).toBe(0);
    expect(Math.round(standardDeviation([2, 4, 4, 4, 5, 5, 7, 9]) * 100) / 100).toBe(2.14);
  });
});
