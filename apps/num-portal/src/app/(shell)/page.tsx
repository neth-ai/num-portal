import GroupedBars from '@/components/charts/GroupedBars';
import PageHeader from '@/components/shell/PageHeader';
import RunsTable from '@/components/ui/RunsTable';
import { Kpi, Legend, Mini, Panel, VsList, type VsRow } from '@/components/ui';
import { TITLES } from '@/lib/nav';
import { hasDummyRuns, latestRuns, listRuns, meanByScenario, summarize } from '@/lib/runs';
import { PIPELINE_STEPS, SCENARIOS, SOP } from '@/lib/scenarios';

export const dynamic = 'force-dynamic';

const PLANNED_RUNS = 100;

export default async function HomePage() {
  const [title, hint] = TITLES['/'];
  const runs = await listRuns();
  const latest = await latestRuns(4);
  const showFootnote = await hasDummyRuns();

  const a = summarize(runs, 'A');
  const b = summarize(runs, 'B');
  const saved = a.deployment > 0 ? Math.round((1 - b.deployment / a.deployment) * 100) : 0;

  // The static process lists: no state, this page only explains the two ways of working.
  const stepsA: VsRow[] = [
    { owner: 'Dev', text: 'Write and test code' },
    { owner: 'Dev', text: 'Send handoff request' },
    { owner: 'Dev', text: 'Wait for Ops to continue' },
    ...SOP.map(([label]) => ({ owner: 'Ops', text: label })),
    { owner: 'Ops', text: 'Live on the website' },
  ];
  const stepsB: VsRow[] = PIPELINE_STEPS.map(([label], i) => ({ owner: i === 0 ? 'Dev' : 'Pipe', text: label }));

  const bars = SCENARIOS.map(([id]) => ({
    scenario: id,
    a: meanByScenario(runs, id, 'A'),
    b: meanByScenario(runs, id, 'B'),
  }));

  return (
    <>
      <PageHeader title={title} hint={hint} />

      <div className="kpis">
        <Kpi label="Runs recorded" value={runs.length} sub={`of ${PLANNED_RUNS} planned`} />
        <Kpi label="Mean time A" value={`${Math.round(a.deployment)} s`} sub="Method A, hands-on" />
        <Kpi label="Mean time B" value={`${Math.round(b.deployment)} s`} sub="Method B, pipeline" />
        <Kpi label="Time saved" value={`${saved}%`} sub="B compared with A" />
        <Kpi label="Handoffs per release" value={`${a.handoffs.toFixed(1)} to ${b.handoffs.toFixed(1)}`} sub="Method A to B" />
      </div>

      <div className="cols2">
        <Panel title="Method A: Manual process">
          <p className="hint" style={{ margin: '0 0 10px' }}>Dev team and Operations team hand work to each other.</p>
          <VsList rows={stepsA} />
          <Mini items={[
            ['Mean handoff wait', `${Math.round(a.wait)} s`],
            ['Mean hands-on', `${Math.round(a.deployment)} s`],
            ['Failed runs', a.failed],
          ]} />
        </Panel>

        <Panel title="Method B: DevOps process">
          <p className="hint" style={{ margin: '0 0 10px' }}>One shared team. The pipeline does the work, with no approval.</p>
          <VsList rows={stepsB} />
          <Mini items={[
            ['Mean handoff wait', '0 s'],
            ['Mean pipeline', `${Math.round(b.deployment)} s`],
            ['Failed runs', b.failed],
          ]} />
        </Panel>
      </div>

      <Panel title={<>Overview data for the thesis <span className="hint">mean deployment time per scenario (s)</span></>}>
        <Legend items={[['var(--ma)', 'Method A manual'], ['var(--mb)', 'Method B DevOps']]} />
        <GroupedBars rows={bars} />
        {showFootnote ? (
          <p className="hint" style={{ margin: '10px 0 0' }}>Includes example rows until the real runs are recorded.</p>
        ) : null}
      </Panel>

      <Panel title="Latest runs">
        <RunsTable runs={latest} />
      </Panel>
    </>
  );
}
