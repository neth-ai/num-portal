// Pure time calculations for the experiment. No database access, so they are easy to test.
//
//   Method A deployment time = t_live - t_ops_start   (hands-on work only)
//   Method B deployment time = pipeline created until deploy_production finished
//   Lead time                = t_live - t_commit      (both methods)
//   Handoff wait             = t_ops_start - t_handoff (Method A only; B is always 0)

export type Method = 'A' | 'B';
export type RunResult = 'success' | 'failed' | 'rolled_back';

export type RunTimes = {
  tCommit?: Date | null;
  tHandoff?: Date | null;
  tOpsStart?: Date | null;
  tLive?: Date | null;
};

const seconds = (from?: Date | null, to?: Date | null): number | null => {
  if (!from || !to) return null;
  return Math.round(((to.getTime() - from.getTime()) / 1000) * 10) / 10;
};

export const deploymentSeconds = (t: RunTimes) => seconds(t.tOpsStart, t.tLive);
export const leadSeconds = (t: RunTimes) => seconds(t.tCommit, t.tLive);
export const handoffWaitSeconds = (t: RunTimes) => seconds(t.tHandoff, t.tOpsStart);

/** Every timing of one Method A run, from the four timestamps. */
export function methodATimes(t: RunTimes) {
  return {
    deploymentS: deploymentSeconds(t),
    leadTimeS: leadSeconds(t),
    handoffWaitS: handoffWaitSeconds(t),
  };
}

export type JobTiming = { name: string; status: string; startedAt: Date | null; finishedAt: Date | null };

/**
 * Method B includes a human production approval; the whole pipeline is counted:
 * from the moment the pipeline was created until deploy_production finished.
 */
export function methodBTimes(
  pipelineCreatedAt: Date,
  jobs: JobTiming[],
): { deploymentS: number; result: RunResult } | null {
  const production = jobs.find((j) => j.name === 'deploy_production');
  const finished = jobs.filter((j) => j.finishedAt).map((j) => j.finishedAt!.getTime());

  if (!production || !production.finishedAt) {
    // The pipeline stopped before production: count until the last job that finished.
    const failed = jobs.find((j) => j.status === 'failed');
    if (!failed || finished.length === 0) return null;
    return { deploymentS: round((Math.max(...finished) - pipelineCreatedAt.getTime()) / 1000), result: 'failed' };
  }

  const deploymentS = round((production.finishedAt.getTime() - pipelineCreatedAt.getTime()) / 1000);
  const rolledBack = jobs.some((j) => j.name.includes('rollback') && j.status === 'success');
  if (rolledBack) return { deploymentS, result: 'rolled_back' };
  return { deploymentS, result: production.status === 'success' ? 'success' : 'failed' };
}

const round = (n: number) => Math.round(n * 10) / 10;

/** Reads a run tag such as "[S2-07]" or "[s2 7]" from a commit message. */
export function parseRunTag(message: string | null | undefined): { scenario: string; runNo: number } | null {
  const m = (message || '').match(/\[\s*(S[1-5])[\s_-]*(\d{1,3})\s*\]/i);
  return m ? { scenario: m[1].toUpperCase(), runNo: Number(m[2]) } : null;
}

/** Builds the tag that links a commit to a run, e.g. "[S2-07]". */
export const runTag = (scenario: string, runNo: number) => `[${scenario}-${String(runNo).padStart(2, '0')}]`;

export const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export function standardDeviation(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1));
}

/** mm:ss for the timers on the Ops queue and the waiting banner. */
export const formatClock = (totalSeconds: number) => {
  const s = Math.max(0, Math.floor(totalSeconds));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};
