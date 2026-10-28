// Database access for the handoffs table (Method A).
import { one, q } from './db';
import type { HandoffStatus } from './handoff';
import type { ScenarioId } from './scenarios';

export type Handoff = {
  id: number;
  runId: number | null;
  scenario: ScenarioId;
  version: string | null;
  note: string;
  newSettings: string;
  dbSteps: string;
  status: HandoffStatus;
  tries: number;
  sentAt: Date;
  startAt: Date | null;
  finishedAt: Date | null;
  stepsDone: number[];
  stepTimes: Record<string, string>;
};

const SELECT = `
  SELECT id, run_id AS "runId", scenario, version, note, new_settings AS "newSettings", db_steps AS "dbSteps",
         status, tries, sent_at AS "sentAt", start_at AS "startAt", finished_at AS "finishedAt",
         steps_done AS "stepsDone", step_times AS "stepTimes"
    FROM handoffs`;

export const listHandoffs = () => q<Handoff>(`${SELECT} ORDER BY id DESC`);

export const openHandoffs = () =>
  q<Handoff>(`${SELECT} WHERE status IN ('waiting', 'deploying') ORDER BY id`);

export const findHandoff = (id: number) => one<Handoff>(`${SELECT} WHERE id = $1`, [id]);

/** The request the Dev team is currently waiting on, if there is one. */
export const currentHandoff = () =>
  one<Handoff>(`${SELECT} WHERE status IN ('waiting', 'deploying') ORDER BY id DESC LIMIT 1`);

export const waitingCount = async () =>
  (await one<{ n: number }>("SELECT count(*)::int AS n FROM handoffs WHERE status = 'waiting'"))?.n ?? 0;

export type NewHandoff = {
  scenario: string;
  version?: string | null;
  note: string;
  newSettings?: string;
  dbSteps?: string;
  tries?: number;
};

export const createHandoff = (h: NewHandoff) =>
  one<Handoff>(
    `INSERT INTO handoffs (scenario, version, note, new_settings, db_steps, tries)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, run_id AS "runId", scenario, version, note, new_settings AS "newSettings",
               db_steps AS "dbSteps", status, tries, sent_at AS "sentAt", start_at AS "startAt",
               finished_at AS "finishedAt", steps_done AS "stepsDone", step_times AS "stepTimes"`,
    [h.scenario, h.version ?? null, h.note, h.newSettings ?? 'none', h.dbSteps ?? 'none', h.tries ?? 1],
  );

export const startHandoff = (id: number) =>
  q('UPDATE handoffs SET status = $2, start_at = now() WHERE id = $1 AND status = $3', [id, 'deploying', 'waiting']);

export const setSteps = (id: number, stepsDone: number[], stepTimes: Record<string, string>) =>
  q('UPDATE handoffs SET steps_done = $2::jsonb, step_times = $3::jsonb WHERE id = $1',
    [id, JSON.stringify(stepsDone), JSON.stringify(stepTimes)]);

export const finishHandoff = (id: number, status: 'live' | 'failed') =>
  q('UPDATE handoffs SET status = $2, finished_at = now() WHERE id = $1 AND status = $3', [id, status, 'deploying']);

export const linkRun = (id: number, runId: number) =>
  q('UPDATE handoffs SET run_id = $2 WHERE id = $1', [id, runId]);
