// PATCH /api/handoffs/:id - the Operations side of one request.
//   { action: "start" }                      the handoff wait ends, the timer starts
//   { action: "step", index, checked }       tick or untick one of the eleven commands
//   { action: "health_ok" | "health_failed" } report the result and record the run
//   { action: "resend" }                     the Dev team sends a fixed version (tries + 1)
import { NextResponse } from 'next/server';
import { one } from '@/lib/db';
import { canGoLive, nextStatus, type HandoffAction } from '@/lib/handoff';
import { createHandoff, findHandoff, finishHandoff, linkRun, setSteps, startHandoff } from '@/lib/handoffs-db';
import { broadcast } from '@/lib/live';
import { formatClock, handoffWaitSeconds, leadSeconds } from '@/lib/metrics';
import { nextRunNo, saveRun } from '@/lib/runs';
import { SOP } from '@/lib/scenarios';

export const dynamic = 'force-dynamic';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  const handoff = await findHandoff(id);
  if (!handoff) return NextResponse.json({ error: 'No such request' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const action = body.action as HandoffAction | 'step';

  if (action === 'step') {
    if (handoff.status !== 'deploying') {
      return NextResponse.json({ error: 'Press "Start deploy" first' }, { status: 409 });
    }
    const index = Number(body.index);
    if (!Number.isInteger(index) || index < 0 || index >= SOP.length) {
      return NextResponse.json({ error: 'Unknown step' }, { status: 400 });
    }
    const done = new Set(handoff.stepsDone);
    const times = { ...handoff.stepTimes };
    if (body.checked) {
      done.add(index);
      times[String(index)] = formatClock((Date.now() - (handoff.startAt?.getTime() ?? Date.now())) / 1000);
    } else {
      done.delete(index);
      delete times[String(index)];
    }
    const steps = [...done].sort((a, b) => a - b);
    await setSteps(id, steps, times);
    broadcast({ type: 'handoff', id, status: handoff.status, steps: steps.length });
    return NextResponse.json({ ok: true, stepsDone: steps, stepTimes: times });
  }

  const target = nextStatus(handoff.status, action);
  if (!target) return NextResponse.json({ error: `Cannot do that while the request is ${handoff.status}` }, { status: 409 });

  if (action === 'start') {
    await startHandoff(id);
    broadcast({ type: 'handoff', id, status: 'deploying' });
    return NextResponse.json({ ok: true, status: 'deploying' });
  }

  if (action === 'resend') {
    // A failed request goes back to the Dev team, who send a fixed version as a new try.
    const again = await createHandoff({
      scenario: handoff.scenario,
      version: handoff.version,
      note: handoff.note,
      newSettings: handoff.newSettings,
      dbSteps: handoff.dbSteps,
      tries: handoff.tries + 1,
    });
    broadcast({ type: 'handoff', id: again?.id, status: 'waiting' });
    return NextResponse.json({ ok: true, handoff: again });
  }

  // health_ok or health_failed: the request is finished and the run is written down.
  if (action === 'health_ok' && !canGoLive(handoff.stepsDone, SOP.length)) {
    return NextResponse.json({ error: 'Tick every step before going live' }, { status: 409 });
  }

  const tLive = new Date();
  await finishHandoff(id, target as 'live' | 'failed');

  const release = await one<{ run_no: number; t_commit: Date }>(
    'SELECT run_no, t_commit FROM releases WHERE handoff_id = $1 ORDER BY id DESC LIMIT 1', [id]);
  const runNo = release?.run_no ?? (await nextRunNo(handoff.scenario));
  const times = { tCommit: release?.t_commit ?? handoff.sentAt, tHandoff: handoff.sentAt, tOpsStart: handoff.startAt, tLive };

  const run = await saveRun({
    scenario: handoff.scenario,
    method: 'A',
    runNo,
    devUser: 'Dev-1',
    opsUser: 'Ops-1',
    tCommit: times.tCommit,
    tHandoff: handoff.sentAt,
    tOpsStart: handoff.startAt,
    tLive,
    deploymentS: handoff.startAt ? Math.round(((tLive.getTime() - handoff.startAt.getTime()) / 1000) * 10) / 10 : null,
    leadTimeS: leadSeconds(times),
    handoffWaitS: handoffWaitSeconds(times),
    handoffs: handoff.tries,
    manualSteps: handoff.stepsDone.length,
    result: target === 'live' ? 'success' : 'failed',
    source: 'manual',
  });
  if (run) await linkRun(id, run.id);

  broadcast({ type: 'handoff', id, status: target, runId: run?.id });
  return NextResponse.json({ ok: true, status: target, run });
}
