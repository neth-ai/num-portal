// Adds the example runs used while the real runs are still being recorded.
// Usage:  node scripts/seed.mjs --dummy
//
// The portal has no sign-in, so there are no accounts to create. Who did what is
// recorded on each run in runs.dev_user and runs.ops_user.
import fs from 'node:fs';
import pg from 'pg';

if (fs.existsSync('.env')) {
  for (const line of fs.readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"]*)"?\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
}

if (!process.argv.includes('--dummy')) {
  console.log('Nothing to seed. Pass --dummy to add the example runs.');
  process.exit(0);
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

// Example rows so the pages have something to draw before the real runs exist.
// Every row is flagged is_dummy and is never reported in the thesis.
const rows = [
  ['S1', 'A', 1, 412, 130, 31, 1, 'success'], ['S1', 'B', 1, 138, 0, 1, 0, 'success'],
  ['S2', 'A', 3, 226, 85, 14, 1, 'success'], ['S2', 'B', 3, 96, 0, 1, 0, 'success'],
  ['S3', 'A', 5, 540, 160, 19, 2, 'failed'], ['S3', 'B', 5, 71, 0, 1, 0, 'rolled_back'],
  ['S4', 'A', 2, 388, 110, 22, 2, 'failed'], ['S4', 'B', 2, 124, 0, 1, 0, 'success'],
  ['S5', 'A', 7, 264, 95, 17, 1, 'success'], ['S5', 'B', 7, 103, 0, 1, 0, 'success'],
];

let added = 0;
for (const [scenario, method, runNo, dep, wait, steps, handoffs, result] of rows) {
  const res = await client.query(
    `INSERT INTO runs (scenario, method, run_no, dev_user, ops_user, deployment_s, lead_time_s, handoff_wait_s,
                       handoffs, manual_steps, result, source, is_dummy)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,true)
     ON CONFLICT (method, scenario, run_no) DO NOTHING`,
    [scenario, method, runNo, 'Dev-1', method === 'A' ? 'Ops-1' : null,
      dep, dep + wait, wait, handoffs, steps, result, method === 'A' ? 'manual' : 'gitlab']);
  added += res.rowCount;
}

console.log(`\nAdded ${added} DUMMY runs (flagged is_dummy, never report them).\n`);
await client.end();
