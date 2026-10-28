import PageHeader from '@/components/shell/PageHeader';
import { Note, Panel, Pill } from '@/components/ui';
import { TITLES } from '@/lib/nav';
import { runStatistics } from '@/lib/statistics';

export const dynamic = 'force-dynamic';

const DECISION_PILL: Record<string, string> = { Supported: 'success', 'Not supported': 'waiting', 'Not enough data': 'idle' };

export default async function StatisticsPage() {
  const [title, hint] = TITLES['/statistics'];
  const report = await runStatistics();

  return (
    <>
      <PageHeader title={title} hint={hint} />

      {report.note ? <Note>{report.note}</Note> : null}

      <Panel title="Hypothesis tests">
        <div className="tbl">
          <table>
            <thead>
              <tr>
                <th>Hypothesis</th><th>Measure</th><th>Test</th><th>Shapiro-Wilk</th>
                <th>Result</th><th>Effect size</th><th>Decision</th>
              </tr>
            </thead>
            <tbody>
              {report.hypotheses.map((h) => (
                <tr key={h.id}>
                  <td className="mono">{h.id}</td>
                  <td>{h.measure}</td>
                  <td>{h.test}</td>
                  <td className="mono">{h.normality}</td>
                  <td className="mono">{h.p}</td>
                  <td className="mono">{h.effect}</td>
                  <td><Pill status={DECISION_PILL[h.decision] ?? 'idle'} label={h.decision} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="hint" style={{ margin: '8px 0 0' }}>
          Significant when p is below 0.05. Each scenario has ten runs per method.
          A result that is not significant is reported as it is.
        </p>
      </Panel>

      <Panel title="How each test is chosen">
        <ul className="guard">
          <li>Runs are paired by scenario and run number (A-S2-3 with B-S2-3).</li>
          <li>Shapiro-Wilk on the paired differences. p above 0.05 means a paired t-test, otherwise Wilcoxon signed-rank.</li>
          <li>Failure rates use Fisher&apos;s exact test on the two-by-two table.</li>
          <li>Effect size is Cohen&apos;s dz for the t-test and rank-biserial r for Wilcoxon.</li>
        </ul>
      </Panel>
    </>
  );
}
