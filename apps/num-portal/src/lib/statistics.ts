// Hypothesis tests for Chapter V.
//
// The tests themselves live in analysis/analyze.py, which already implements Shapiro-Wilk,
// the paired t-test, Wilcoxon signed-rank and Fisher's exact test with scipy. This module
// exports the runs as CSV, hands them to that script and reads the tables back, so the
// portal and the thesis always report the same numbers.
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { listRuns, type Run } from './runs';

export type Hypothesis = {
  id: 'H1' | 'H2' | 'H3' | 'H4';
  measure: string;
  test: string;
  normality: string;
  p: string;
  effect: string;
  decision: 'Supported' | 'Not supported' | 'Not enough data';
};

export type StatisticsReport = { hypotheses: Hypothesis[]; note?: string };

const MEASURES: Record<Hypothesis['id'], string> = {
  H1: 'Deployment time',
  H2: 'Failure rate',
  H3: 'Recovery time',
  H4: 'Manual steps',
};

const empty = (note: string): StatisticsReport => ({
  note,
  hypotheses: (Object.keys(MEASURES) as Hypothesis['id'][]).map((id) => ({
    id, measure: MEASURES[id], test: '-', normality: '-', p: '-', effect: '-', decision: 'Not enough data',
  })),
});

const PYTHON = process.env.PYTHON_BIN || 'python3';
const ANALYZE = process.env.ANALYZE_SCRIPT || 'analysis/analyze.py';

function toCsv(runs: Run[]): string {
  const header = 'date,method,scenario,run,result,seconds,steps,sha';
  const lines = runs
    .filter((r) => r.deploymentS !== null)
    .map((r) => [
      r.createdAt instanceof Date ? r.createdAt.toISOString() : new Date(r.createdAt).toISOString(),
      r.method, r.scenario, r.runNo,
      r.result === 'success' ? 'success' : 'failed',
      r.deploymentS, r.manualSteps, r.sha || '',
    ].join(','));
  return [header, ...lines].join('\n');
}

/** Runs analyze.py and returns its tests.csv, or null when the script cannot run here. */
async function runAnalyze(csv: string): Promise<string | null> {
  const dir = await mkdtemp(join(tmpdir(), 'numportal-stats-'));
  const input = join(dir, 'runs.csv');
  await writeFile(input, csv, 'utf8');

  const finished = await new Promise<boolean>((resolve) => {
    const child = spawn(PYTHON, [ANALYZE, input, '--output', dir], { stdio: 'ignore' });
    child.on('error', () => resolve(false));
    child.on('close', (code) => resolve(code === 0));
    setTimeout(() => { child.kill(); resolve(false); }, 30_000);
  });
  if (!finished) return null;

  return readFile(join(dir, 'tests.csv'), 'utf8').catch(() => null);
}

export async function runStatistics(): Promise<StatisticsReport> {
  const runs = await listRuns();
  const paired = runs.filter((r) => r.deploymentS !== null);
  if (paired.length < 4) {
    return empty('No test has been run yet. The tests need paired runs of both methods.');
  }

  const tests = await runAnalyze(toCsv(paired));
  if (!tests) {
    return {
      ...empty('The statistics script could not run here. Install the packages in analysis/requirements.txt and set PYTHON_BIN if python3 is not on the path.'),
    };
  }

  // tests.csv: hypothesis,measure,test,normality,p,effect,decision
  const rows = tests.split(/\r?\n/).slice(1).filter(Boolean).map((l) => l.split(','));
  const hypotheses = (Object.keys(MEASURES) as Hypothesis['id'][]).map((id) => {
    const row = rows.find((c) => c[0] === id);
    if (!row) return { id, measure: MEASURES[id], test: '-', normality: '-', p: '-', effect: '-', decision: 'Not enough data' as const };
    const decision = row[6] === 'Supported' ? 'Supported' as const
      : row[6] === 'Not supported' ? 'Not supported' as const : 'Not enough data' as const;
    return { id, measure: MEASURES[id], test: row[2] || '-', normality: row[3] || '-', p: row[4] || '-', effect: row[5] || '-', decision };
  });

  const dummy = runs.some((r) => r.isDummy);
  return { hypotheses, note: dummy ? 'Includes example rows marked DUMMY. These numbers are not thesis results.' : undefined };
}
