import PageHeader from '@/components/shell/PageHeader';
import PipelineView from '@/components/release/PipelineView';
import { Panel } from '@/components/ui';
import { TITLES } from '@/lib/nav';
import { jobsOf, listPipelines, stageView } from '@/lib/pipelines';

export const dynamic = 'force-dynamic';

export default async function PipelinesPage({ searchParams }: { searchParams: { id?: string } }) {
  const [title, hint] = TITLES['/pipelines'];
  const pipelines = await listPipelines(10);

  if (!pipelines.length) {
    return (
      <>
        <PageHeader title={title} hint={hint} />
        <Panel title="No pipeline yet">
          <p className="hint" style={{ margin: 0 }}>
            Pipelines appear here as soon as GitLab sends its first webhook. Connect the project and push a
            commit from the Change code page.
          </p>
        </Panel>
      </>
    );
  }

  const selected = pipelines.find((p) => String(p.id) === searchParams.id) ?? pipelines[0];
  const jobs = await jobsOf(selected.id);

  return (
    <>
      <PageHeader title={title} hint={hint} />
      <PipelineView
        pipelines={pipelines.map((p) => ({
          id: p.id,
          status: p.status,
          message: p.commitMessage ?? '',
          sha: p.sha,
        }))}
        selected={{
          id: selected.id,
          status: selected.status,
          sha: selected.sha,
          message: selected.commitMessage ?? '',
          ...stageView(jobs),
        }}
        jobs={jobs.map((j) => ({ name: j.name, status: j.status, log: j.log }))}
      />
    </>
  );
}
