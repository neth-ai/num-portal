'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Mini, Panel, Pill, VsList, type VsRow } from '@/components/ui';
import type { Handoff } from '@/lib/handoffs-db';
import { PIPELINE_STEPS, SOP } from '@/lib/scenarios';

type PipelineView = { stages: { name: string; status: string; seconds: number | null }[]; rolledBack: boolean; status: string };

/** Method A column: the rows turn ok, run or bad as Operations works through the procedure. */
export function MethodAColumn({ handoff }: { handoff: Handoff | null }) {
  const router = useRouter();
  const [now, setNow] = useState(() => Date.now());

  const open = handoff?.status === 'waiting' || handoff?.status === 'deploying';
  useEffect(() => {
    if (!open) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [open]);

  const status = handoff?.status ?? 'idle';
  const sentAt = handoff ? new Date(handoff.sentAt).getTime() : 0;
  const startAt = handoff?.startAt ? new Date(handoff.startAt).getTime() : 0;
  const wait = handoff ? Math.round(((handoff.status === 'waiting' ? now : startAt) - sentAt) / 1000) : 0;
  const hands = handoff && startAt ? Math.round(((handoff.status === 'deploying' ? now : (handoff.finishedAt ? new Date(handoff.finishedAt).getTime() : now)) - startAt) / 1000) : 0;
  const done = handoff?.stepsDone ?? [];
  const nextStep = SOP.findIndex((_, i) => !done.includes(i));

  const rows: VsRow[] = [
    { owner: 'Dev', text: 'Write and test code', state: handoff ? 'ok' : '' },
    { owner: 'Dev', text: 'Send handoff request', state: handoff ? 'ok' : '' },
    { owner: 'Dev', text: 'Wait for Ops to continue', state: !handoff ? '' : handoff.status === 'waiting' ? 'run' : 'ok', time: handoff ? `${wait} s` : '' },
    ...SOP.map(([label], i) => ({
      owner: 'Ops',
      text: label,
      state: (!handoff ? '' : done.includes(i) ? 'ok' : handoff.status === 'deploying' && i === nextStep ? 'run' : '') as VsRow['state'],
      time: handoff?.stepTimes?.[String(i)] ?? '',
    })),
    { owner: 'Ops', text: 'Live on the website', state: !handoff ? '' : handoff.status === 'live' ? 'ok' : handoff.status === 'failed' ? 'bad' : '' },
  ];
  if (handoff?.status === 'failed') rows.push({ owner: 'Dev', text: 'Fix and resend (back to handoff)', state: 'run' });

  async function resend() {
    if (!handoff) return;
    await fetch(`/api/handoffs/${handoff.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'resend' }),
    });
    router.refresh();
  }

  return (
    <Panel title={<>Method A: Manual <Pill status={status} /></>}>
      <p className="hint" style={{ margin: '0 0 10px' }}>Dev team and Operations team hand work to each other.</p>
      <VsList rows={rows} />
      <Mini items={[
        ['Handoff wait', `${wait} s`],
        ['Hands-on', `${hands} s`],
        ['Manual steps', done.length],
        ['Handoffs', handoff?.tries ?? 0],
      ]} />
      {handoff?.status === 'waiting' ? (
        <div className="tools" style={{ marginTop: 12 }}>
          <button className="btn pri" type="button" onClick={() => router.push('/ops-queue')}>Open the Ops queue</button>
        </div>
      ) : null}
      {handoff?.status === 'failed' ? (
        <div className="tools" style={{ marginTop: 12 }}>
          <button className="btn pri" type="button" onClick={resend}>Fix and resend</button>
        </div>
      ) : null}
    </Panel>
  );
}

/** Method B column: the seven stages run on their own, with no approval step. */
export function MethodBColumn({ pipeline }: { pipeline: PipelineView | null }) {
  const rows: VsRow[] = PIPELINE_STEPS.map(([name], i) => {
    const stage = pipeline?.stages[i];
    return {
      owner: i === 0 ? 'Dev' : 'Pipe',
      text: name,
      state: (stage?.status === 'success' ? 'ok' : stage?.status === 'running' ? 'run' : stage?.status === 'failed' ? 'bad' : '') as VsRow['state'],
      time: stage?.seconds != null ? `${stage.seconds} s` : '',
    };
  });
  if (pipeline?.rolledBack) rows.push({ owner: 'Pipe', text: 'Automatic rollback', state: 'ok' });

  const total = pipeline?.stages.reduce((sum, s) => sum + (s.seconds ?? 0), 0) ?? 0;

  return (
    <Panel title={<>Method B: DevOps <Pill status={pipeline?.status ?? 'idle'} /></>}>
      <p className="hint" style={{ margin: '0 0 10px' }}>One shared team. The pipeline does the work, with no approval.</p>
      <VsList rows={rows} />
      <Mini items={[
        ['Handoff wait', '0 s'],
        ['Pipeline time', `${total} s`],
        ['Manual steps', pipeline ? 1 : 0],
        ['Handoffs', 0],
      ]} />
      {!pipeline ? (
        <p className="hint" style={{ margin: '10px 0 0' }}>
          No pipeline yet. It starts when the commit is pushed to GitLab.
        </p>
      ) : null}
    </Panel>
  );
}
