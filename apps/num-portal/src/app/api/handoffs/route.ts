// GET  /api/handoffs - every request, newest first (the Handoff form and the Ops queue read this)
// POST /api/handoffs - the Dev team sends a new request to Operations
import { NextResponse } from 'next/server';
import { createHandoff, listHandoffs } from '@/lib/handoffs-db';
import { broadcast } from '@/lib/live';
import { isScenario } from '@/lib/scenarios';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ handoffs: await listHandoffs() });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { scenario, version, note, newSettings, dbSteps, tries } = body as Record<string, unknown>;

  if (!isScenario(scenario)) return NextResponse.json({ error: 'Choose a scenario' }, { status: 400 });
  if (typeof note !== 'string' || !note.trim()) return NextResponse.json({ error: 'Describe what changed' }, { status: 400 });

  const handoff = await createHandoff({
    scenario,
    version: typeof version === 'string' ? version : null,
    note: note.trim().slice(0, 500),
    newSettings: typeof newSettings === 'string' && newSettings.trim() ? newSettings.trim() : 'none',
    dbSteps: dbSteps === 'run migration' ? 'run migration' : 'none',
    tries: typeof tries === 'number' && tries > 0 ? tries : 1,
  });

  broadcast({ type: 'handoff', id: handoff?.id, status: 'waiting' });
  return NextResponse.json({ ok: true, handoff });
}
