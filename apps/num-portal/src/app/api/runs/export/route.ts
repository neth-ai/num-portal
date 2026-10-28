// GET /api/runs/export - the CSV used by analysis/analyze.py
import { NextResponse } from 'next/server';
import { listRuns } from '@/lib/runs';

export const dynamic = 'force-dynamic';

const HEADER = 'date,scenario,method,run_no,dev_user,ops_user,deployment_s,lead_time_s,handoff_wait_s,handoffs,manual_steps,result,recovery_s,source,is_dummy';

export async function GET() {

  const runs = await listRuns();
  const lines = runs.map((r) => [
    new Date(r.createdAt).toISOString(), r.scenario, r.method, r.runNo, r.devUser ?? '', r.opsUser ?? '',
    r.deploymentS ?? '', r.leadTimeS ?? '', r.handoffWaitS ?? '', r.handoffs, r.manualSteps,
    r.result, r.recoveryS ?? '', r.source, r.isDummy,
  ].join(','));

  return new NextResponse([HEADER, ...lines].join('\n') + '\n', {
    headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="runs.csv"' },
  });
}
