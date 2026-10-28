// POST /api/webhooks/gitlab – receives push, pipeline and job events from GitLab,
// stores them for the experiment, and pushes live updates to the dashboard.
import { NextResponse } from 'next/server';
import { config } from '@/lib/config';
import { handleGitlabEvent } from '@/lib/events';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (!config.gitlabWebhookSecret || req.headers.get('x-gitlab-token') !== config.gitlabWebhookSecret) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const event = await req.json().catch(() => null);
  if (!event) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  const result = await handleGitlabEvent(event);
  return NextResponse.json({ ok: true, result });
}
