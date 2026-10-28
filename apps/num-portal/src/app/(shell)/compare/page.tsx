import PageHeader from '@/components/shell/PageHeader';
import RangePlot from '@/components/charts/RangePlot';
import Gauge from '@/components/charts/Gauge';
import { Legend, Note, Panel } from '@/components/ui';
import { TITLES } from '@/lib/nav';
import { hasDummyRuns, listRuns, summarize } from '@/lib/runs';
import { SCENARIOS } from '@/lib/scenarios';

export const dynamic = 'force-dynamic';

export default async function ComparePage() {
  const [title, hint] = TITLES['/compare'];
  const runs = await listRuns();
  const dummy = await hasDummyRuns();
  const a = summarize(runs, 'A');
  const b = summarize(runs, 'B');

  // Fastest run, mean and slowest run per scenario and method.
  const ranges = SCENARIOS.map(([id]) => {
    const pick = (method: 'A' | 'B') => {
      const xs = runs
        .filter((r) => r.scenario === id && r.method === method && r.deploymentS !== null)
        .map((r) => r.deploymentS as number);
      if (!xs.length) return null;
      return { min: Math.min(...xs), mean: Math.round(xs.reduce((p, q) => p + q, 0) / xs.length), max: Math.max(...xs) };
    };
    return { scenario: id, a: pick('A'), b: pick('B') };
  });

  const total = (m: 'A' | 'B') => runs.filter((r) => r.method === m).length;
  const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);

  return (
    <>
      <PageHeader title={title} hint={hint} />
      {dummy ? <Note>Includes example rows marked DUMMY. Real values come from the analysis after the 100 runs.</Note> : null}

      <Panel title="Deployment time by scenario (seconds)">
        <Legend items={[['var(--ma)', 'Method A manual'], ['var(--mb)', 'Method B DevOps']]} />
        <RangePlot rows={ranges} />
        <p className="hint" style={{ margin: '6px 0 0' }}>Each line runs from the fastest to the slowest run. The dot is the mean.</p>
      </Panel>

      <div className="cols">
        <Panel title={`Failed deployments (of ${runs.length} runs)`}>
          <div className="bars">
            <div className="bar">
              <span>Method A</span>
              <div className="track">
                <div className="a" style={{ width: `${Math.max(6, pct(a.failed, total('A')))}%` }}>
                  {a.failed} ({pct(a.failed, total('A'))}%)
                </div>
              </div>
            </div>
            <div className="bar">
              <span>Method B</span>
              <div className="track">
                <div className="b" style={{ width: `${Math.max(6, pct(b.failed, total('B')))}%` }}>
                  {b.failed} ({pct(b.failed, total('B'))}%)
                </div>
              </div>
            </div>
          </div>
        </Panel>

        <Panel title="Apdex (T = 1 s)">
          <div className="tools" style={{ justifyContent: 'space-around' }}>
            <Gauge value={null} series="a" label="Method A" />
            <Gauge value={null} series="b" label="Method B" />
          </div>
          <p className="hint" style={{ margin: '8px 0 0' }}>
            Apdex comes from the k6 load test (<span className="mono">tests/load/apdex.js</span>). Run it against both
            addresses and import the summary.
          </p>
        </Panel>
      </div>

      <Panel title="DORA metrics">
        <div className="dora">
          <div><span className="hint">Lead time</span><b>{Math.round(a.lead)} to {Math.round(b.lead)} s</b></div>
          <div><span className="hint">Change failure rate</span><b>{pct(a.failed, total('A'))}% to {pct(b.failed, total('B'))}%</b></div>
          <div><span className="hint">Manual steps</span><b>{Math.round(a.steps)} to {Math.round(b.steps)}</b></div>
          <div><span className="hint">Handoffs per release</span><b>{a.handoffs.toFixed(1)} to {b.handoffs.toFixed(1)}</b></div>
        </div>
        <p className="hint" style={{ margin: '8px 0 0' }}>Left value is Method A, right value is Method B.</p>
      </Panel>
    </>
  );
}
