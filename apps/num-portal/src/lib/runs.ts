// Database access for the runs and handoffs tables.
import { one, q } from './db';
import { mean } from './metrics';
import type { Method, RunResult } from './metrics';
import type { ScenarioId } from './scenarios';

export type Run = {
  id: number;
  scenario: ScenarioId;
  method: Method;
  runNo: number;
  devUser: string | null;
  opsUser: string | null;
  deploymentS: number | null;
  leadTimeS: number | null;
  handoffWaitS: number | null;
  handoffs: number;
  manualSteps: number;
  result: RunResult;
  recoveryS: number | null;
  sha: string | null;
  source: string;
  isDummy: boolean;
  createdAt: Date;
};

const SELECT = `
  SELECT id, scenario, method, run_no AS "runNo", dev_user AS "devUser", ops_user AS "opsUser",
         deployment_s AS "deploymentS", lead_time_s AS "leadTimeS", handoff_wait_s AS "handoffWaitS",
         handoffs, manual_steps AS "manualSteps", result, recovery_s AS "recoveryS",
         sha, source, is_dummy AS "isDummy", created_at AS "createdAt"
    FROM runs`;

export const listRuns = () => q<Run>(`${SELECT} ORDER BY created_at DESC, id DESC`);

export const latestRuns = (limit = 4) => q<Run>(`${SELECT} ORDER BY created_at DESC, id DESC LIMIT $1`, [limit]);

export const hasRealRuns = async () =>
  ((await one<{ n: number }>('SELECT count(*)::int AS n FROM runs WHERE is_dummy = false'))?.n ?? 0) > 0;

export const hasDummyRuns = async () =>
  ((await one<{ n: number }>('SELECT count(*)::int AS n FROM runs WHERE is_dummy = true'))?.n ?? 0) > 0;

/** The next free run number for a scenario (the number that goes in the commit tag). */
export async function nextRunNo(scenario: string): Promise<number> {
  const row = await one<{ n: number }>('SELECT COALESCE(MAX(run_no), 0)::int AS n FROM runs WHERE scenario = $1', [scenario]);
  return (row?.n ?? 0) + 1;
}

export type NewRun = {
  scenario: string;
  method: Method;
  runNo: number;
  devUser?: string | null;
  opsUser?: string | null;
  tCommit?: Date | null;
  tHandoff?: Date | null;
  tOpsStart?: Date | null;
  tLive?: Date | null;
  deploymentS?: number | null;
  leadTimeS?: number | null;
  handoffWaitS?: number | null;
  handoffs?: number;
  manualSteps?: number;
  result: RunResult;
  recoveryS?: number | null;
  sha?: string | null;
  source?: string;
  isDummy?: boolean;
};

/** Inserts a run, or replaces the one with the same method, scenario and number. */
export function saveRun(r: NewRun) {
  return one<Run>(
    `INSERT INTO runs (scenario, method, run_no, dev_user, ops_user, t_commit, t_handoff, t_ops_start, t_live,
                       deployment_s, lead_time_s, handoff_wait_s, handoffs, manual_steps, result, recovery_s,
                       sha, source, is_dummy)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
     ON CONFLICT (method, scenario, run_no) DO UPDATE SET
       dev_user = EXCLUDED.dev_user, ops_user = EXCLUDED.ops_user,
       t_commit = COALESCE(EXCLUDED.t_commit, runs.t_commit),
       t_handoff = COALESCE(EXCLUDED.t_handoff, runs.t_handoff),
       t_ops_start = COALESCE(EXCLUDED.t_ops_start, runs.t_ops_start),
       t_live = COALESCE(EXCLUDED.t_live, runs.t_live),
       deployment_s = EXCLUDED.deployment_s, lead_time_s = EXCLUDED.lead_time_s,
       handoff_wait_s = EXCLUDED.handoff_wait_s, handoffs = EXCLUDED.handoffs,
       manual_steps = EXCLUDED.manual_steps, result = EXCLUDED.result, recovery_s = EXCLUDED.recovery_s,
       sha = COALESCE(EXCLUDED.sha, runs.sha), source = EXCLUDED.source, is_dummy = EXCLUDED.is_dummy
     RETURNING id, scenario, method, run_no AS "runNo", dev_user AS "devUser", ops_user AS "opsUser",
               deployment_s AS "deploymentS", lead_time_s AS "leadTimeS", handoff_wait_s AS "handoffWaitS",
               handoffs, manual_steps AS "manualSteps", result, recovery_s AS "recoveryS",
               sha, source, is_dummy AS "isDummy", created_at AS "createdAt"`,
    [r.scenario, r.method, r.runNo, r.devUser ?? null, r.opsUser ?? null,
      r.tCommit ?? null, r.tHandoff ?? null, r.tOpsStart ?? null, r.tLive ?? null,
      r.deploymentS ?? null, r.leadTimeS ?? null, r.handoffWaitS ?? null,
      r.handoffs ?? 0, r.manualSteps ?? 0, r.result, r.recoveryS ?? null,
      r.sha ?? null, r.source ?? 'manual', r.isDummy ?? false],
  );
}

export type MethodSummary = {
  n: number;
  deployment: number;
  lead: number;
  wait: number;
  handoffs: number;
  steps: number;
  failed: number;
};

/** The figures behind the KPI row and the two process columns. */
export function summarize(runs: Run[], method: Method): MethodSummary {
  const list = runs.filter((r) => r.method === method);
  const num = (xs: (number | null)[]) => xs.filter((x): x is number => x !== null);
  return {
    n: list.length,
    deployment: mean(num(list.map((r) => r.deploymentS))),
    lead: mean(num(list.map((r) => r.leadTimeS))),
    wait: mean(num(list.map((r) => r.handoffWaitS))),
    handoffs: mean(list.map((r) => r.handoffs)),
    steps: mean(list.map((r) => r.manualSteps)),
    failed: list.filter((r) => r.result !== 'success').length,
  };
}

/** Mean deployment time per scenario, used by the chart on Home. */
export function meanByScenario(runs: Run[], scenario: string, method: Method): number {
  const xs = runs
    .filter((r) => r.scenario === scenario && r.method === method && r.deploymentS !== null)
    .map((r) => r.deploymentS as number);
  return Math.round(mean(xs));
}
