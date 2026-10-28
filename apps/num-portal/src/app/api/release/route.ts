// POST /api/release - one commit goes to both methods.
//   Method B: the change is written to the cafe site and pushed, which starts the pipeline.
//   Method A: a handoff request is created and the Dev team waits for Operations.
import { NextResponse } from 'next/server';
import { one } from '@/lib/db';
import { createHandoff } from '@/lib/handoffs-db';
import { broadcast } from '@/lib/live';
import { commitContent } from '@/lib/git';
import { nextRunNo } from '@/lib/runs';
import { COMMIT_MESSAGE, isScenario } from '@/lib/scenarios';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { scenario, code, message } = body as { scenario?: string; code?: string; message?: string };

  if (!isScenario(scenario)) return NextResponse.json({ error: 'Choose a kind of change' }, { status: 400 });
  if (typeof code !== 'string' || !code.trim()) return NextResponse.json({ error: 'The file cannot be empty' }, { status: 400 });

  // A release cannot start while Operations still owes a result for the last one.
  const open = await one('SELECT 1 FROM handoffs WHERE status IN (\'waiting\', \'deploying\')');
  if (open) return NextResponse.json({ error: 'A release is running' }, { status: 409 });

  const runNo = await nextRunNo(scenario);
  const text = (message || COMMIT_MESSAGE[scenario]).slice(0, 200);

  // Method B: write the file and push. Without GitLab configured the commit stays local.
  const commit = await commitContent(code, text);

  // Method A: the same change goes to Operations by hand.
  const handoff = await createHandoff({
    scenario,
    version: `v1.${runNo}.0`,
    note: text,
    newSettings: scenario === 'S5' ? 'DELIVERY_FEE' : 'none',
    dbSteps: 'none',
  });

  const release = await one<{ id: number }>(
    'INSERT INTO releases (scenario, run_no, message, code, sha, handoff_id) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',
    [scenario, runNo, text, code, commit.sha, handoff?.id ?? null]);

  broadcast({ type: 'release', scenario, runNo, sha: commit.sha, handoffId: handoff?.id });

  return NextResponse.json({
    ok: true,
    releaseId: release?.id,
    scenario,
    runNo,
    sha: commit.sha,
    message: text,
    handoffId: handoff?.id,
    pushed: commit.pushed,
    note: commit.note,
  });
}
