import type { Run } from '@/lib/runs';
import { Pill } from './index';

const RESULT_LABEL: Record<string, string> = { success: 'Success', failed: 'Failed', rolled_back: 'Rolled back' };

export default function RunsTable({ runs }: { runs: Run[] }) {
  if (!runs.length) return <p className="hint" style={{ margin: 0 }}>No run recorded yet.</p>;
  return (
    <div className="tbl">
      <table>
        <thead>
          <tr>
            <th>Run</th><th>Scenario</th><th>Method</th><th>Dev / Ops</th>
            <th className="n">Deploy (s)</th><th className="n">Wait (s)</th><th className="n">Lead (s)</th>
            <th className="n">Steps</th><th className="n">Handoffs</th><th>Result</th><th>Source</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((r) => (
            <tr key={r.id}>
              <td className="mono">{r.scenario}-{String(r.runNo).padStart(2, '0')}</td>
              <td>{r.scenario}</td>
              <td><Pill status={r.method} /></td>
              <td>{r.devUser && r.opsUser ? `${r.devUser}/${r.opsUser}` : r.devUser || '-'}</td>
              <td className="n">{r.deploymentS ?? '-'}</td>
              <td className="n">{r.handoffWaitS ?? 0}</td>
              <td className="n">{r.leadTimeS ?? '-'}</td>
              <td className="n">{r.manualSteps}</td>
              <td className="n">{r.handoffs}</td>
              <td><Pill status={r.result} label={RESULT_LABEL[r.result] ?? r.result} /></td>
              <td className="hint">{r.source}{r.isDummy ? ' · DUMMY' : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
