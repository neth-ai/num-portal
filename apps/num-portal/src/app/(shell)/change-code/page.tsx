import PageHeader from '@/components/shell/PageHeader';
import ChangeCode from '@/components/release/ChangeCode';
import { MethodAColumn, MethodBColumn } from '@/components/release/MethodColumns';
import { Note } from '@/components/ui';
import { one } from '@/lib/db';
import { currentHandoff, findHandoff } from '@/lib/handoffs-db';
import { TITLES } from '@/lib/nav';
import { jobsOf, latestPipeline, stageView } from '@/lib/pipelines';
import { nextRunNo } from '@/lib/runs';
import { SCENARIOS } from '@/lib/scenarios';

export const dynamic = 'force-dynamic';

export default async function ChangeCodePage() {
  const [title, hint] = TITLES['/change-code'];

  const numbers: Record<string, number> = {};
  for (const [id] of SCENARIOS) numbers[id] = await nextRunNo(id);

  const release = await one<{ id: number; sha: string | null; message: string; t_commit: Date; handoff_id: number | null }>(
    'SELECT id, sha, message, t_commit, handoff_id FROM releases ORDER BY id DESC LIMIT 1');
  const handoff = release?.handoff_id ? await findHandoff(release.handoff_id) : await currentHandoff();
  const open = handoff?.status === 'waiting' || handoff?.status === 'deploying';

  const pipeline = await latestPipeline();
  const jobs = pipeline ? await jobsOf(pipeline.id) : [];
  const view = pipeline ? { ...stageView(jobs), status: pipeline.status } : null;

  return (
    <>
      <PageHeader title={title} hint={hint} />
      <ChangeCode nextRunNo={numbers} busy={Boolean(open)} />

      {release ? (
        <>
          <Note tone="accent">
            Commit <b className="mono">{release.sha ?? 'local'}</b> · {release.message} · sent to both methods at{' '}
            {new Date(release.t_commit).toTimeString().slice(0, 8)}
          </Note>
          <div className="cols2">
            <MethodAColumn handoff={handoff} />
            <MethodBColumn pipeline={view} />
          </div>
        </>
      ) : null}
    </>
  );
}
