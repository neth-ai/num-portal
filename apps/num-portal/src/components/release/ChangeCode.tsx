'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Diff from './Diff';
import { Panel } from '@/components/ui';
import { BASE_CODE, COMMIT_MESSAGE, PRESET, SCENARIOS, SCENARIO_NOTE, type ScenarioId } from '@/lib/scenarios';
import { runTag } from '@/lib/metrics';

type Props = { nextRunNo: Record<string, number>; busy: boolean };

export default function ChangeCode({ nextRunNo, busy }: Props) {
  const router = useRouter();
  const [scenario, setScenario] = useState<ScenarioId>('S2');
  const [code, setCode] = useState(PRESET.S2.join('\n'));
  const [message, setMessage] = useState(`${COMMIT_MESSAGE.S2} ${runTag('S2', nextRunNo.S2 ?? 1)}`);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const disabled = busy || sending;

  function pickScenario(id: ScenarioId) {
    if (disabled) return;
    setScenario(id);
    setCode(PRESET[id].join('\n'));
    setMessage(`${COMMIT_MESSAGE[id]} ${runTag(id, nextRunNo[id] ?? 1)}`);
  }

  async function commit() {
    setSending(true);
    setError('');
    const res = await fetch('/api/release', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario, code, message }),
    });
    const data = await res.json().catch(() => ({}));
    setSending(false);
    if (!res.ok) {
      setError(data.error || 'The release could not start');
      return;
    }
    router.refresh();
  }

  return (
    <div className="cols">
      <Panel title={<>Change the code <span className="hint mono">apps/sme-app/src/content/page.json</span></>}>
        <label className="hint">Kind of change</label>
        <div className="chips">
          {SCENARIOS.map(([id, name]) => (
            <button key={id} className="chip" type="button" aria-pressed={id === scenario}
              disabled={disabled} onClick={() => pickScenario(id)}>
              {id} {name}
            </button>
          ))}
        </div>
        <p className="hint" style={{ margin: '0 0 6px' }}>{SCENARIO_NOTE[scenario]}</p>

        <label className="hint blk" htmlFor="codeedit">Edit the file</label>
        <textarea id="codeedit" className="mono" style={{ minHeight: 200, whiteSpace: 'pre' }}
          value={code} disabled={disabled} onChange={(e) => setCode(e.target.value)} />

        <label className="hint blk" htmlFor="cmsg2">Commit message</label>
        <input type="text" id="cmsg2" value={message} disabled={disabled}
          onChange={(e) => setMessage(e.target.value)} />

        <div className="tools" style={{ marginTop: 12 }}>
          <button className="btn pri" type="button" onClick={commit} disabled={disabled}>
            {sending ? <><span className="spin" />Committing</> : busy ? 'A release is running' : 'Commit and deploy to both'}
          </button>
          <span className="hint">One commit starts Method B and sends the same change to Method A.</span>
        </div>
        {error ? <p className="hint" style={{ margin: '8px 0 0', color: 'var(--bad)' }}>{error}</p> : null}
      </Panel>

      <Panel title="Changed lines">
        <Diff before={BASE_CODE} after={code} />
        <p className="hint" style={{ margin: '12px 0 4px' }}>What happens after the commit</p>
        <ul className="guard">
          <li><b>Method B:</b> the pipeline builds and deploys by itself.</li>
          <li><b>Method A:</b> a handoff request goes to Operations. The Dev team waits until Ops continues the deployment.</li>
        </ul>
        <div className="tools" style={{ marginTop: 12 }}>
          <button className="btn" type="button" onClick={() => router.push('/result')}>See the website</button>
        </div>
      </Panel>
    </div>
  );
}
