// GET /api/health - used by deploy.sh, rollback.sh, publish-site.sh and the Docker HEALTHCHECK.
// A page.json that cannot be read makes the deployment fail, which is scenario S3.
import { NextResponse } from 'next/server';
import { readPublished } from '@/lib/content';

export const dynamic = 'force-dynamic';

export async function GET() {
  const env = process.env.SITE_ENV ?? 'site';
  const version = process.env.APP_VERSION ?? 'dev';

  const missing = ['DELIVERY_FEE'].filter((name) => process.env.NEEDS_DELIVERY_FEE === '1' && !process.env[name]);
  if (missing.length) return NextResponse.json({ status: 'missing-settings', env, missing }, { status: 503 });

  try {
    const published = await readPublished();
    // Nothing deployed here yet: not an error, but not online either.
    if (published.notDeployed) return NextResponse.json({ status: 'not-deployed', env }, { status: 503 });
    return NextResponse.json({ status: 'ok', env, version, title: process.env.SITE_EXPERIENCE === 'student-hub' ? 'NUM Student Hub' : published.content.title });
  } catch (err) {
    return NextResponse.json({ status: 'bad-content', env, detail: err instanceof Error ? err.message : 'unknown' }, { status: 503 });
  }
}
