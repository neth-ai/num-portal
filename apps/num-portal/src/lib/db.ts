// PostgreSQL connection pool (node-postgres) – one pool per server process.
import pg from 'pg';

const g = globalThis as unknown as { pgPool?: pg.Pool };
export const pool: pg.Pool = g.pgPool ?? new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 10 });
g.pgPool = pool;

/** Runs a query and returns all rows. */
export async function q<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  const res = await pool.query(sql, params);
  return res.rows as T[];
}

/** Runs a query and returns the first row (or null). */
export async function one<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T | null> {
  const rows = await q<T>(sql, params);
  return rows[0] ?? null;
}
