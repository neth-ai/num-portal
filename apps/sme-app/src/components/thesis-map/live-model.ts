import { zones, type Method } from './model';
export type Pipeline = { id: number; ref: string; status: string; sha: string; web_url: string; updated_at: string };
export type Commit = { id: string; title: string; message: string; web_url: string; committed_date: string };
export type Job = { id: number; name: string; stage: string; status: string; web_url: string; started_at: string | null; finished_at: string | null; duration: number | null; runner: { id: number; description: string } | null };
export type LiveData = { fetchedAt: string; mergeRequests: { iid: number; title: string; state: string; web_url: string }[]; pipelines: Pipeline[]; pipeline: Pipeline | null; commit: Commit | null; jobs: Job[]; commits: Commit[]; deployments: { id: number; status: string; ref: string; environment: string; updated_at: string }[]; deploymentNotice: string | null; jobsTruncated: boolean };
export const liveZones = zones.map((zone, i) => ({ ...zone, title: ['Commit', 'Validate & test', 'Build images', 'Deploy staging', 'Deploy production'][i], subtitle: `0${i + 1} · GITLAB`, detail: 'Status from the selected GitLab pipeline.' }));
export function livePosition(progress: number, _method?: Method): [number, number, number] {
  const scaled = Math.max(0, Math.min(1, progress)) * 4, index = Math.min(3, Math.floor(scaled)), t = scaled - index;
  const a = liveZones[index].position, b = liveZones[index + 1].position;
  return [a[0] + (b[0] - a[0]) * t, 1.2, a[2] + (b[2] - a[2]) * t];
}
export function stages(jobs: Job[]) {
  return [['validate', 'test'], ['build'], ['deploy_staging'], ['deploy_production']].map(names => {
    const group = jobs.filter(job => names.includes(job.stage));
    const priority = ['failed', 'running', 'pending', 'preparing', 'waiting_for_resource', 'created', 'scheduled', 'manual', 'canceled', 'success', 'skipped'];
    return { jobs: group, status: priority.find(status => group.some(job => job.status === status)) || (group.length ? group[0].status : 'not included') };
  });
}
