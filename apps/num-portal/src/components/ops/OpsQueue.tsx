'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Panel, Pill } from '@/components/ui';
import type { Handoff } from '@/lib/handoffs-db';
import { formatClock } from '@/lib/metrics';
import { SOP } from '@/lib/scenarios';

export default function OpsQueue({ queue }: { queue: Handoff[] }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<number | null>(queue[0]?.id ?? null);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);

  const current = queue.find((h) => h.id === selectedId) ?? queue[0] ?? null;
  const deploying = current?.status === 'deploying';

  useEffect(() => {
    if (!deploying) return;
    const t = setInterval(() => setNow(Date.now()), 300);
    return () => clearInterval(t);
  }, [deploying]);

  async function patch(body: Record<string, unknown>) {
    if (!current) return;
    setBusy(true);
    await fetch(`/api/handoffs/${current.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    setBusy(false);
    router.refresh();
  }

  const done = current?.stepsDone ?? [];
  const allTicked = done.length >= SOP.length;
  const handsOn = current?.startAt ? formatClock((now - new Date(current.startAt).getTime()) / 1000) : '00:00';

  return (
    <div className="split">
      <Panel title="Queue">
        <div id="pl">
          {queue.length ? queue.map((h) => (
            <button key={h.id} type="button" className="pitem" aria-pressed={current?.id === h.id}
              onClick={() => setSelectedId(h.id)}>
              <span className="mono">#{h.id}</span>
              <span>{h.scenario} {h.version}</span>
              <Pill status={h.status} />
            </button>
          )) : (
            <p className="hint" style={{ margin: 0 }}>
              Nothing waiting. Send a handoff request from Change code or the Handoff form.
            </p>
          )}
        </div>
      </Panel>

      <div style={{ minWidth: 0 }}>
        {current ? (
          <Panel title={<>Request #{current.id} <Pill status={current.status} /></>}>
            <p className="hint" style={{ margin: '0 0 10px' }}>
              From Dev: {current.note}. New settings: {current.newSettings}. Database steps: {current.dbSteps}.
              Sent at {new Date(current.sentAt).toTimeString().slice(0, 8)}.
            </p>

            <div className="tools" style={{ justifyContent: 'space-between' }}>
              <div>
                <span className="hint">Hands-on time</span>
                <div className="timer" id="mtime">{handsOn}</div>
              </div>
              <div>
                <span className="hint">Manual steps</span>
                <div className="timer">
                  {done.length}<span className="hint" style={{ fontSize: 16 }}> / {SOP.length}</span>
                </div>
              </div>
            </div>

            {!deploying ? (
              <div className="tools" style={{ margin: '12px 0' }}>
                <button className="btn pri" type="button" disabled={busy} onClick={() => patch({ action: 'start' })}>
                  Start deploy
                </button>
                <span className="hint">Dev-1 is waiting for you. The handoff wait ends when you start.</span>
              </div>
            ) : null}

            <div>
              {SOP.map(([label, command], i) => (
                <label className="chk" key={i}>
                  <input type="checkbox" checked={done.includes(i)} disabled={!deploying || busy}
                    onChange={(e) => patch({ action: 'step', index: i, checked: e.target.checked })} />
                  <span>{label}<br /><code className="mono hint">{command}</code></span>
                  <span className="mono hint">{current.stepTimes?.[String(i)] ?? ''}</span>
                </label>
              ))}
            </div>

            {deploying ? (
              <div className="tools" style={{ marginTop: 12 }}>
                <button className="btn pri" type="button" disabled={!allTicked || busy}
                  onClick={() => patch({ action: 'health_ok' })}>
                  Health OK: go live
                </button>
                <button className="btn danger" type="button" disabled={!allTicked || busy}
                  onClick={() => patch({ action: 'health_failed' })}>
                  Health failed: report to Dev
                </button>
              </div>
            ) : null}
          </Panel>
        ) : (
          <Panel title="Deployment checklist">
            <p className="hint" style={{ margin: 0 }}>Select a request from the queue.</p>
          </Panel>
        )}
      </div>
    </div>
  );
}
