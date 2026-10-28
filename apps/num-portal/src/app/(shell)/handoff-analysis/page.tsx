import PageHeader from '@/components/shell/PageHeader';
import StackedBars from '@/components/charts/StackedBars';
import { Kpi, Legend, Note, Panel } from '@/components/ui';
import { TITLES } from '@/lib/nav';
import { hasDummyRuns, listRuns, summarize } from '@/lib/runs';
import { mean } from '@/lib/metrics';
import { SCENARIOS } from '@/lib/scenarios';

export const dynamic = 'force-dynamic';

export default async function HandoffAnalysisPage() {
  const [title, hint] = TITLES['/handoff-analysis'];
  const runs = await listRuns();
  const dummy = await hasDummyRuns();
  const a = summarize(runs, 'A');
  const b = summarize(runs, 'B');

  // Lead time split: Method A is waiting plus hands-on work, Method B is pipeline time only.
  const rows = SCENARIOS.map(([id]) => {
    const of = (method: 'A' | 'B', key: 'handoffWaitS' | 'deploymentS') =>
      Math.round(mean(runs
        .filter((r) => r.scenario === id && r.method === method && r[key] !== null)
        .map((r) => r[key] as number)));
    return { scenario: id, wait: of('A', 'handoffWaitS'), hands: of('A', 'deploymentS'), pipe: of('B', 'deploymentS') };
  });

  return (
    <>
      <PageHeader title={title} hint={hint} />

      <div className="kpis">
        <Kpi label="Mean handoff wait" value={`${Math.round(a.wait)} s`} sub="Method A only" />
        <Kpi label="Handoffs per release" value={`${a.handoffs.toFixed(1)} to ${b.handoffs.toFixed(1)}`} sub="Method A to B" />
        <Kpi label="Manual steps" value={`${Math.round(a.steps)} to ${Math.round(b.steps)}`} sub="Method A to B" />
        <Kpi label="Mean lead time" value={`${Math.round(a.lead)} to ${Math.round(b.lead)} s`} sub="Method A to B" />
      </div>

      {dummy ? <Note>Includes example rows marked DUMMY.</Note> : null}

      <Panel title="Lead time split (seconds)">
        <Legend items={[['var(--warn)', 'Handoff wait'], ['var(--ma)', 'Hands-on deploy (A)'], ['var(--mb)', 'Pipeline (B)']]} />
        <StackedBars rows={rows} />
        <p className="hint" style={{ margin: '10px 0 0' }}>
          In Method A a large part of the lead time is waiting for the other team, not typing commands.
        </p>
      </Panel>
    </>
  );
}
