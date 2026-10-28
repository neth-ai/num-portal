import { NextRequest, NextResponse } from 'next/server';
import type { Commit, Job, LiveData, Pipeline } from '@/components/thesis-map/live-model';
export const dynamic = 'force-dynamic';
const base = 'https://gitlab.com/api/v4/projects/neth-ai%2Fnum-portal';
class ApiError extends Error { constructor(public status: number) { super(`GitLab returned HTTP ${status}`); } }
async function get(path: string) {
  const token = process.env.GITLAB_TOKEN || process.env.GITLAB_READ_TOKEN;
  const response = await fetch(base + path, { headers: token ? { 'PRIVATE-TOKEN': token } : {}, cache: 'no-store', signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new ApiError(response.status);
  return { data: await response.json(), more: Boolean(response.headers.get('x-next-page')) };
}
// Explicitly select public display fields: never return credentials or user profiles.
const pipeline = (p: Pipeline): Pipeline => ({ id: p.id, ref: p.ref, status: p.status, sha: p.sha, web_url: p.web_url, updated_at: p.updated_at });
const commit = (c: Commit): Commit => ({ id: c.id, title: c.title, message: c.message, web_url: c.web_url, committed_date: c.committed_date });
const cache = new Map<string, { until: number; data: LiveData }>();
export async function GET(request: NextRequest) {
  const selected = request.nextUrl.searchParams.get('pipeline') || '';
  if (selected && !/^\d{1,12}$/.test(selected)) return NextResponse.json({ error: 'Invalid pipeline ID' }, { status: 400 });
  const hit = cache.get(selected);
  if (hit && hit.until > Date.now()) return NextResponse.json(hit.data, { headers: { 'Cache-Control': 'no-store' } });
  try {
    const [list, commits, mergeRequests, deploymentResult] = await Promise.all([
      get('/pipelines?per_page=12'), get('/repository/commits?per_page=8'), get('/merge_requests?per_page=20&scope=all'),
      get('/deployments?per_page=8&order_by=updated_at&sort=desc').then(value => ({ value, notice: null })).catch(error => ({ value: null, notice: error instanceof ApiError && [401, 403].includes(error.status) ? 'Deployment records require a server-side GitLab read_api token. Deployment job statuses below are available.' : 'Deployment records are temporarily unavailable.' }))
    ]);
    const id = selected || list.data[0]?.id;
    const detail = id ? (await get(`/pipelines/${id}`)).data : null;
    const [jobResult, commitResult] = detail ? await Promise.all([get(`/pipelines/${id}/jobs?per_page=100`), get(`/repository/commits/${encodeURIComponent(detail.sha)}`)]) : [{ data: [], more: false }, null];
    const data: LiveData = {
      fetchedAt: new Date().toISOString(), mergeRequests: mergeRequests.data.map((m: { iid: number; title: string; state: string; web_url: string }) => ({ iid: m.iid, title: m.title, state: m.state, web_url: m.web_url })), pipelines: list.data.map(pipeline), pipeline: detail ? pipeline(detail) : null,
      commit: commitResult ? commit(commitResult.data) : null, commits: commits.data.map(commit),
      jobs: jobResult.data.map((j: Job) => ({ id: j.id, name: j.name, stage: j.stage, status: j.status, web_url: j.web_url, started_at: j.started_at, finished_at: j.finished_at, duration: j.duration, runner: j.runner ? { id: j.runner.id, description: j.runner.description } : null })),
      jobsTruncated: jobResult.more,
      deployments: (deploymentResult.value?.data || []).map((d: { id: number; status: string; ref: string; environment: { name: string }; updated_at: string }) => ({ id: d.id, status: d.status, ref: d.ref, environment: d.environment.name, updated_at: d.updated_at })),
      deploymentNotice: deploymentResult.notice
    };
    if (cache.size >= 20) cache.clear();
    cache.set(selected, { until: Date.now() + 15000, data });
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof ApiError ? error.message : 'GitLab is temporarily unreachable. Please retry.' }, { status: error instanceof ApiError && error.status === 429 ? 429 : 502, headers: { 'Cache-Control': 'no-store', ...(error instanceof ApiError && error.status === 429 ? { 'Retry-After': '20' } : {}) } });
  }
}
