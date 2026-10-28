// GET /api/health – used by deploy.sh, rollback.sh, the Docker HEALTHCHECK and the timer scripts.
import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { missingSettings } from '@/lib/required-settings';

export const dynamic = 'force-dynamic';

export async function GET() {
  const missing = missingSettings();
  if (missing.length) return NextResponse.json({ status: 'missing-settings', missing }, { status: 503 });
  try {
    await pool.query('SELECT 1');
    return NextResponse.json({ status: 'ok', version: process.env.APP_VERSION ?? 'dev' });
  } catch {
    return NextResponse.json({ status: 'database-unavailable' }, { status: 503 });
  }
}
