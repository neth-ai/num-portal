import PageHeader from '@/components/shell/PageHeader';
import { Panel, Pill } from '@/components/ui';
import { TITLES } from '@/lib/nav';
import { SCENARIOS, SCENARIO_NOTE } from '@/lib/scenarios';

export default function AboutPage() {
  const [title, hint] = TITLES['/about'];
  return (
    <>
      <PageHeader title={title} hint={hint} />

      <Panel title="What is compared">
        <div className="cols">
          <div>
            <Pill status="A" label="Method A" />
            <p>Manual deployment. A Dev team writes the code and hands it to an Operations team.
              Operations connects to the server and repeats a written procedure by hand.</p>
          </div>
          <div>
            <Pill status="B" label="Method B" />
            <p>GitLab CI/CD and Docker. One shared team. The pipeline does the repeated work.
              A change that passes the checks goes live by itself, and the pipeline rolls back
              if the health check fails.</p>
          </div>
        </div>
      </Panel>

      <Panel title="The five scenarios">
        <div className="tbl">
          <table>
            <thead><tr><th>Scenario</th><th>Name</th><th>What it tests</th></tr></thead>
            <tbody>
              {SCENARIOS.map(([id, name]) => (
                <tr key={id}>
                  <td className="mono">{id}</td>
                  <td>{name}</td>
                  <td style={{ whiteSpace: 'normal' }}>{SCENARIO_NOTE[id]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="What is recorded">
        <p style={{ margin: 0 }}>Deployment time, lead time, handoff wait, number of manual steps,
          failures and recovery time. Each scenario is run ten times with each method, so the study
          records one hundred deployments. The order of the methods alternates A B B A so that
          practice with one method does not favour the other.</p>
        <p className="hint" style={{ margin: '10px 0 0' }}>Only system data is stored. No personal data is
          collected, and the source code is public.</p>
      </Panel>
    </>
  );
}
