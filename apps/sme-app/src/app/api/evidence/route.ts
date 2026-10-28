import { NextResponse } from "next/server";
import pg from "pg";
export const dynamic = "force-dynamic";
const globalPool = globalThis as unknown as { evidencePool?: pg.Pool };
export async function GET() {
  if (!process.env.DATABASE_URL)
    return NextResponse.json(
      { error: "PostgreSQL is not configured. Set server-side DATABASE_URL." },
      { status: 503 },
    );
  try {
    const pool = (globalPool.evidencePool ??= new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      max: 3,
      connectionTimeoutMillis: 3000,
      statement_timeout: 5000,
    }));
    const { rows } =
      await pool.query(`SELECT id, scenario, method, run_no, order_group,
      t_commit, t_handoff, t_ops_start, t_live, deployment_s,
      CASE WHEN t_live >= t_commit THEN EXTRACT(EPOCH FROM (t_live - t_commit))::float8 END AS lead_time_s,
      CASE WHEN method = 'A' AND t_ops_start >= t_handoff THEN EXTRACT(EPOCH FROM (t_ops_start - t_handoff))::float8 END AS handoff_wait_s,
      CASE WHEN method = 'A' AND t_live >= t_ops_start THEN EXTRACT(EPOCH FROM (t_live - t_ops_start))::float8 END AS manual_deployment_s,
      manual_steps, result, recovery_s, sha,
      to_jsonb(runs)->>'health_check_ok' AS health_check_ok,
      to_jsonb(runs)->>'reset_confirmed_at' AS reset_confirmed_at,
      to_jsonb(runs)->>'environment_error' AS environment_error
      FROM runs WHERE is_dummy = false AND scenario IN ('S1','S2','S3','S4','S5')
      AND method IN ('A','B') AND run_no BETWEEN 1 AND 10 ORDER BY created_at, id`);
    const transit = await pool.query(
      "SELECT count(*)::int AS n FROM handoffs WHERE status IN ('waiting', 'deploying')",
    );
    return NextResponse.json(
      {
        inTransit: transit.rows[0].n,
        fetchedAt: new Date().toISOString(),
        runs: rows,
        notice:
          "Real PostgreSQL records only. A success record without public health evidence is unverified. Missing reset, health and environment fields need the proposed migration.",
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      {
        error:
          "Unable to read PostgreSQL runs. Check database connectivity and schema; no illustrative measurements are substituted.",
      },
      { status: 503 },
    );
  }
}
