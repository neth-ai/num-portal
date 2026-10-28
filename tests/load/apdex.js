// k6 load test – response time and Apdex score (threshold T = 1 second)
// Run: k6 run -e TARGET=https://devops.example.com tests/load/apdex.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';

const T = 1000; // milliseconds
const satisfied = new Counter('apdex_satisfied');
const tolerating = new Counter('apdex_tolerating');
const frustrated = new Counter('apdex_frustrated');

export const options = {
  vus: 20,
  duration: '60s',
  thresholds: { http_req_duration: ['p(95)<1000'] },
};

export default function () {
  const res = http.get(`${__ENV.TARGET}/`);
  check(res, { 'status is 200': (r) => r.status === 200 });
  const d = res.timings.duration;
  if (res.status !== 200 || d > 4 * T) frustrated.add(1);
  else if (d > T) tolerating.add(1);
  else satisfied.add(1);
  sleep(1);
}

export function handleSummary(data) {
  const s = data.metrics.apdex_satisfied?.values.count || 0;
  const t = data.metrics.apdex_tolerating?.values.count || 0;
  const f = data.metrics.apdex_frustrated?.values.count || 0;
  const apdex = (s + t / 2) / Math.max(1, s + t + f);
  const p95 = data.metrics.http_req_duration.values['p(95)'];
  const mean = data.metrics.http_req_duration.values.avg;
  const text = `Apdex(T=1s) = ${apdex.toFixed(3)} | p95 response time = ${p95.toFixed(0)} ms\n`;
  return { stdout: text, 'apdex-summary.json': JSON.stringify({ apdex, p95, mean, s, t, f }) };
}
