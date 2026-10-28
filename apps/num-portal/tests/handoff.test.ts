import { describe, expect, it } from 'vitest';
import { canAct, canGoLive, isOpen, nextStatus, triesAfterResend } from '@/lib/handoff';
import { diffLines, countChanges } from '@/lib/diff';
import { BASE_CODE, PRESET, SOP } from '@/lib/scenarios';

describe('handoff state machine', () => {
  it('walks the happy path: waiting to deploying to live', () => {
    expect(nextStatus('waiting', 'start')).toBe('deploying');
    expect(nextStatus('deploying', 'health_ok')).toBe('live');
  });

  it('sends a failed health check back to the Dev team', () => {
    expect(nextStatus('deploying', 'health_failed')).toBe('failed');
    expect(nextStatus('failed', 'resend')).toBe('waiting');
    expect(triesAfterResend(1)).toBe(2);
  });

  it('refuses an action the current status does not allow', () => {
    expect(nextStatus('waiting', 'health_ok')).toBeNull();
    expect(nextStatus('live', 'start')).toBeNull();
    expect(canAct('deploying', 'start')).toBe(false);
  });

  it('counts a request as open only while Ops owes a result', () => {
    expect(isOpen('waiting')).toBe(true);
    expect(isOpen('deploying')).toBe(true);
    expect(isOpen('live')).toBe(false);
    expect(isOpen('failed')).toBe(false);
  });

  it('needs every command ticked before going live', () => {
    expect(canGoLive([0, 1, 2], SOP.length)).toBe(false);
    expect(canGoLive(SOP.map((_, i) => i), SOP.length)).toBe(true);
  });
});

describe('diff', () => {
  it('finds the single added line of the S2 change', () => {
    const lines = diffLines(BASE_CODE, PRESET.S2);
    expect(countChanges(lines).added).toBe(2); // the new section plus the comma on the line above
  });

  it('reports no change when the file is the same', () => {
    expect(countChanges(diffLines(BASE_CODE, BASE_CODE))).toEqual({ added: 0, removed: 0 });
  });
});

describe('scenario presets', () => {
  it('S3 is deliberately invalid JSON so the health check fails', () => {
    expect(() => JSON.parse(PRESET.S3.join('\n'))).toThrow();
  });

  it('the other presets are valid JSON', () => {
    for (const id of ['S1', 'S2', 'S4', 'S5'] as const) {
      expect(() => JSON.parse(PRESET[id].join('\n')), id).not.toThrow();
    }
  });
});
