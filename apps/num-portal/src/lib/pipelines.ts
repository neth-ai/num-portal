// Reads the pipelines and jobs that GitLab webhooks delivered (Method B).
import { one, q } from './db';
import { PIPELINE_STEPS } from './scenarios';

export type PipelineRow = {
  id: number;
  ref: string;
  sha: string;
  status: string;
  commitMessage: string | null;
  scenario: string | null;
  runNo: number | null;
  createdAt: Date;
  durationSec: number | null;
};

export type JobRow = {
  id: number;
  stage: string;
  name: string;
  status: string;
  startedAt: Date | null;
  finishedAt: Date | null;
  durationSec: number | null;
  log: string | null;
};

const SELECT = `
  SELECT id, ref, sha, status, commit_message AS "commitMessage", scenario, run_no AS "runNo",
         created_at AS "createdAt", duration_sec AS "durationSec"
    FROM pipeline_runs`;

export const listPipelines = (limit = 10) =>
  q<PipelineRow>(`${SELECT} ORDER BY created_at DESC LIMIT $1`, [limit]);

export const findPipeline = (id: number) => one<PipelineRow>(`${SELECT} WHERE id = $1`, [id]);

export const latestPipeline = () => one<PipelineRow>(`${SELECT} ORDER BY created_at DESC LIMIT 1`);

export const jobsOf = (pipelineId: number) =>
  q<JobRow>(
    `SELECT id, stage, name, status, started_at AS "startedAt", finished_at AS "finishedAt",
            duration_sec AS "durationSec", log
       FROM job_runs WHERE pipeline_id = $1 ORDER BY COALESCE(started_at, now()), id`,
    [pipelineId]);

/** Maps the jobs of a pipeline onto the seven stages the interface shows. */
export function stageView(jobs: JobRow[]) {
  const stages = PIPELINE_STEPS.map(([name]) => {
    const key = name.toLowerCase().replace(/\s+/g, '_');
    const job = jobs.find((j) => j.name === key || j.name.replace(/-/g, '_') === key || j.stage === key);
    return { name, status: job?.status ?? 'created', seconds: job?.durationSec ?? null };
  });
  const rolledBack = jobs.some((j) => j.name.includes('rollback') && j.status === 'success');
  return { stages, rolledBack };
}
