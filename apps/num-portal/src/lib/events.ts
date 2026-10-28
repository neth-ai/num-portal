// Stores the GitLab webhook events (push, pipeline, job) and writes the Method B run
// once the production deployment has finished. Method B has no approval step, so the
// whole pipeline counts as the deployment time.
import { config } from './config';
import { one, q } from './db';
import { broadcast } from './live';
import { methodBTimes, parseRunTag, type JobTiming } from './metrics';
import { saveRun } from './runs';

/** GitLab sends dates as "2026-10-19 08:15:00 UTC" or ISO. */
export function toDate(v: unknown): Date | null {
  if (!v || typeof v !== 'string') return null;
  const iso = v.replace(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) UTC$/, '$1T$2Z');
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

const FINISHED = ['success', 'failed', 'canceled', 'skipped'];

// GitLab payloads vary by event, so they are read as loose records.
type Json = Record<string, any>; // eslint-disable-line

export async function handleGitlabEvent(event: Json): Promise<string> {
  switch (event?.object_kind) {
    case 'push': return handlePush(event);
    case 'pipeline': return handlePipeline(event);
    case 'build': return handleJob(event);
    default: return 'ignored';
  }
}

async function handlePush(e: Json): Promise<string> {
  broadcast({ type: 'push', ref: e.ref, commits: Number(e.total_commits_count ?? e.commits?.length ?? 0) });
  return 'push received';
}

async function upsertPipeline(id: number, d: {
  ref: string; sha: string; status: string; source?: string | null; commitMessage?: string | null;
  createdAt?: Date | null; finishedAt?: Date | null; durationSec?: number | null;
}) {
  const tag = parseRunTag(d.commitMessage);
  await q(
    `INSERT INTO pipeline_runs (id, ref, sha, status, source, commit_message, scenario, run_no, created_at, finished_at, duration_sec)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8, COALESCE($9, now()), $10, $11)
     ON CONFLICT (id) DO UPDATE SET
       status = EXCLUDED.status,
       ref = CASE WHEN EXCLUDED.ref <> '' THEN EXCLUDED.ref ELSE pipeline_runs.ref END,
       sha = CASE WHEN EXCLUDED.sha <> '' THEN EXCLUDED.sha ELSE pipeline_runs.sha END,
       source = COALESCE(EXCLUDED.source, pipeline_runs.source),
       commit_message = COALESCE(EXCLUDED.commit_message, pipeline_runs.commit_message),
       scenario = COALESCE(EXCLUDED.scenario, pipeline_runs.scenario),
       run_no = COALESCE(EXCLUDED.run_no, pipeline_runs.run_no),
       created_at = COALESCE($9, pipeline_runs.created_at),
       finished_at = COALESCE(EXCLUDED.finished_at, pipeline_runs.finished_at),
       duration_sec = COALESCE(EXCLUDED.duration_sec, pipeline_runs.duration_sec),
       updated_at = now()`,
    [id, d.ref, d.sha, d.status, d.source ?? null, d.commitMessage ? d.commitMessage.slice(0, 1000) : null,
      tag?.scenario ?? null, tag?.runNo ?? null, d.createdAt ?? null, d.finishedAt ?? null, d.durationSec ?? null]);
}

async function upsertJob(j: {
  id: number; pipelineId: number; stage: string; name: string; status: string;
  startedAt: Date | null; finishedAt: Date | null; durationSec: number | null; log?: string | null;
}) {
  await q(
    `INSERT INTO job_runs (id, pipeline_id, stage, name, status, started_at, finished_at, duration_sec, log)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     ON CONFLICT (id) DO UPDATE SET
       status = EXCLUDED.status,
       started_at = COALESCE(EXCLUDED.started_at, job_runs.started_at),
       finished_at = COALESCE(EXCLUDED.finished_at, job_runs.finished_at),
       duration_sec = COALESCE(EXCLUDED.duration_sec, job_runs.duration_sec),
       log = COALESCE(EXCLUDED.log, job_runs.log),
       updated_at = now()`,
    [j.id, j.pipelineId, j.stage, j.name, j.status, j.startedAt, j.finishedAt, j.durationSec, j.log ?? null]);
}

async function handlePipeline(e: Json): Promise<string> {
  const p = e.object_attributes || {};
  const id = Number(p.id);
  await upsertPipeline(id, {
    ref: String(p.ref || ''), sha: String(p.sha || ''), status: String(p.status || 'unknown'),
    source: p.source ?? null, commitMessage: e.commit?.message ?? null,
    createdAt: toDate(p.created_at), finishedAt: toDate(p.finished_at), durationSec: p.duration ?? null,
  });
  for (const b of e.builds || []) {
    await upsertJob({
      id: Number(b.id), pipelineId: id, stage: String(b.stage), name: String(b.name), status: String(b.status),
      startedAt: toDate(b.started_at), finishedAt: toDate(b.finished_at), durationSec: b.duration ?? null,
    });
  }
  if (FINISHED.includes(p.status)) await writeMethodBRun(id);
  broadcast({ type: 'pipeline', id, ref: p.ref, status: p.status, duration: p.duration });
  return 'pipeline stored';
}

async function handleJob(e: Json): Promise<string> {
  const pipelineId = Number(e.pipeline_id);
  const known = await one('SELECT 1 FROM pipeline_runs WHERE id = $1', [pipelineId]);
  if (!known) {
    await upsertPipeline(pipelineId, {
      ref: String(e.ref || ''), sha: String(e.sha || ''), status: 'running', commitMessage: e.commit?.message ?? null,
    });
  }
  await upsertJob({
    id: Number(e.build_id), pipelineId, stage: String(e.build_stage), name: String(e.build_name),
    status: String(e.build_status), startedAt: toDate(e.build_started_at), finishedAt: toDate(e.build_finished_at),
    durationSec: e.build_duration ?? null, log: typeof e.build_log === 'string' ? e.build_log : null,
  });
  if (e.build_name === 'deploy_production' && FINISHED.includes(e.build_status)) await writeMethodBRun(pipelineId);
  broadcast({ type: 'job', pipelineId, name: e.build_name, stage: e.build_stage, status: e.build_status });
  return 'job stored';
}

/** Writes the Method B run for a pipeline whose commit carried a run tag such as [S2-07]. */
export async function writeMethodBRun(pipelineId: number): Promise<void> {
  const p = await one<{ id: number; ref: string; sha: string; scenario: string | null; run_no: number | null; created_at: Date }>(
    'SELECT id, ref, sha, scenario, run_no, created_at FROM pipeline_runs WHERE id = $1', [pipelineId]);
  if (!p?.scenario || !p.run_no || p.ref !== config.gitlabDefaultBranch) return;

  const jobs = await q<JobTiming>(
    'SELECT name, status, started_at AS "startedAt", finished_at AS "finishedAt" FROM job_runs WHERE pipeline_id = $1',
    [pipelineId]);
  const timing = methodBTimes(new Date(p.created_at), jobs);
  if (!timing) return;

  await saveRun({
    scenario: p.scenario,
    method: 'B',
    runNo: p.run_no,
    devUser: 'Dev-1',
    opsUser: null,
    tCommit: new Date(p.created_at),
    tLive: new Date(new Date(p.created_at).getTime() + timing.deploymentS * 1000),
    deploymentS: timing.deploymentS,
    leadTimeS: timing.deploymentS,
    handoffWaitS: 0,
    handoffs: 0,
    manualSteps: 1,
    result: timing.result,
    sha: p.sha,
    source: 'gitlab',
  });
  broadcast({ type: 'run', method: 'B', scenario: p.scenario, runNo: p.run_no });
}
