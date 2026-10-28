'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Panel, Pill } from '@/components/ui';
import type { Handoff } from '@/lib/handoffs-db';
import { formatClock } from '@/lib/metrics';
import { SCENARIOS, SOP, type ScenarioId } from '@/lib/scenarios';

const clock = (fromIso: string | Date, now: number) => formatClock((now - new Date(fromIso).getTime()) / 1000);

/** The amber banner the Dev team sees while Operations still owes a result. */
export function WaitBanner({ handoff }: { handoff: Handoff }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 300);
    return () => clearInterval(t);
  }, []);

  const deploying = handoff.status === 'deploying';
  const since = deploying && handoff.startAt ? handoff.startAt : handoff.sentAt;

  return (
    <section className="panel" style={{ borderColor: 'var(--warn)' }}>
      <h2>
        {deploying ? 'Ops-1 is deploying your version' : 'Waiting for Ops-1 to continue the deployment'}
        <Pill status={handoff.status} />
      </h2>
      <div className="tools" style={{ justifyContent: 'space-between' }}>
        <div>
          <span className="hint">{deploying ? 'Hands-on time so far' : 'Waiting time'}</span>
          <div className="timer" id="wtime">{clock(since, now)}</div>
        </div>
        <div>
          <span className="hint">Steps done by Ops</span>
          <div className="timer">
            {handoff.stepsDone.length}<span className="hint" style={{ fontSize: 16 }}> / {SOP.length}</span>
          </div>
        </div>
      </div>
      <p className="hint" style={{ margin: '8px 0 0' }}>
        {deploying
          ? 'Nothing moves until Operations reports the result. If the health check fails, the request comes back to you.'
          : `Request #${handoff.id} is in the queue. Method A cannot move until your friend continues the deployment.`}
      </p>
    </section>
  );
}

export default function HandoffForm({ open, requests }: { open: Handoff | null; requests: Handoff[] }) {
  const router = useRouter();
  const [scenario, setScenario] = useState<ScenarioId>('S2');
  const [version, setVersion] = useState('v1.4.0');
  const [note, setNote] = useState('Add opening hours section');
  const [settings, setSettings] = useState('none');
  const [dbSteps, setDbSteps] = useState('none');
  const [sending, setSending] = useState(false);

  async function send() {
    setSending(true);
    await fetch('/api/handoffs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario, version, note, newSettings: settings, dbSteps }),
    });
    setSending(false);
    router.refresh();
  }

  async function resend(id: number) {
    await fetch(`/api/handoffs/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'resend' }),
    });
    router.refresh();
  }

  const info = (h: Handoff) => {
    const at = new Date(h.sentAt).toTimeString().slice(0, 8);
    if (h.status === 'waiting') return `waiting since ${at}`;
    if (h.status === 'failed') return `Ops reported: health check failed (try ${h.tries})`;
    if (h.status === 'live') return 'live on the website';
    return 'Ops is deploying now';
  };

  return (
    <>
      {open ? <WaitBanner handoff={open} /> : null}
      <div className="cols">
        <Panel title={<>Handoff request <Pill status="A" label="Method A" /></>}>
          <label className="hint" htmlFor="hsc">Scenario</label>
          <select id="hsc" value={scenario} onChange={(e) => setScenario(e.target.value as ScenarioId)}>
            {SCENARIOS.map(([id, name]) => <option key={id} value={id}>{id} {name}</option>)}
          </select>

          <label className="hint blk" htmlFor="hver">Version</label>
          <input type="text" id="hver" value={version} onChange={(e) => setVersion(e.target.value)} />

          <label className="hint blk" htmlFor="hnote">What changed</label>
          <textarea id="hnote" style={{ minHeight: 70 }} value={note} onChange={(e) => setNote(e.target.value)} />

          <div className="cols" style={{ marginTop: 10 }}>
            <div>
              <label className="hint" htmlFor="hset">New settings</label>
              <input type="text" id="hset" value={settings} onChange={(e) => setSettings(e.target.value)} />
            </div>
            <div>
              <label className="hint" htmlFor="hdb">Database steps</label>
              <select id="hdb" value={dbSteps} onChange={(e) => setDbSteps(e.target.value)}>
                <option>none</option>
                <option>run migration</option>
              </select>
            </div>
          </div>

          <div className="tools" style={{ marginTop: 12 }}>
            <button className="btn pri" type="button" onClick={send} disabled={Boolean(open) || sending}>
              {open ? 'Waiting for Ops' : sending ? <><span className="spin" />Sending</> : 'Send to Operations'}
            </button>
            <span className="hint">The handoff wait timer starts when you send.</span>
          </div>
        </Panel>

        <Panel title="Requests sent">
          {requests.length ? requests.map((h) => (
            <div className="row" key={h.id}>
              <span className="mono hint">#{h.id}</span>
              <span className="t">{h.scenario} {h.version}</span>
              <Pill status={h.status} />
              <span className="m">
                {h.note} · {info(h)}
                {h.status === 'failed' ? (
                  <> <button className="btn sm" type="button" onClick={() => resend(h.id)}>Fix and resend</button></>
                ) : null}
              </span>
            </div>
          )) : (
            <p className="hint" style={{ margin: 0 }}>
              No request yet. Send one, then open the Ops queue to continue it.
            </p>
          )}
        </Panel>
      </div>
    </>
  );
}
