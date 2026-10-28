"use client";
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { liveZones, stages, type LiveData } from './live-model';
import type { Packet } from './model';
import s from './ThesisMap.module.css';
const Scene = dynamic(() => import('./Scene'), { ssr: false });
const date = (value: string | null) => value ? new Date(value).toLocaleString() : '—';
export default function LiveGitLab() {
  const [data, setData] = useState<LiveData | null>(null);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [showMap, setShowMap] = useState(false);
  const [view, setView] = useState(-1);
  const [reset, setReset] = useState(0);
  const [zoom, setZoom] = useState({ id: 0, direction: 1 });
  useEffect(() => {
    let canceled = false;
    let timer: ReturnType<typeof setTimeout>;
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(`/api/gitlab/live${selected ? `?pipeline=${selected}` : ''}`, { signal: controller.signal, cache: 'no-store' });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Unable to read GitLab');
        if (!canceled) { setData(result); setError(''); }
      } catch (e) { if (!canceled) setError(e instanceof Error ? e.message : 'Unable to read GitLab'); }
      if (!canceled) timer = setTimeout(load, 20000);
    }
    load();
    return () => { canceled = true; controller.abort(); clearTimeout(timer); };
  }, [selected, refresh]);
  const group = stages(data?.jobs || []);
  // Marker represents an observed stage, never a simulated successful deployment.
  let current = group.findIndex(stage => ['failed', 'running', 'pending', 'preparing', 'waiting_for_resource'].includes(stage.status));
  if (current < 0) current = group.findIndex(stage => ['manual', 'created', 'scheduled', 'canceled'].includes(stage.status));
  if (current < 0) current = group.reduce((last, stage, i) => stage.status === 'success' ? i : last, -1);
  const stageIndex = current + 1;
  const packet: Packet[] = data?.pipeline && data.commit ? [{ id: data.pipeline.id, scenario: 0, artifact: data.pipeline.sha.slice(0, 8), commitMessage: data.commit.title, branch: data.pipeline.ref, method: 'B', outcome: data.pipeline.status === 'failed' ? 'fail' : 'pass', progress: stageIndex / 4 }] : [];
  const focus = (index: number) => { setView(index); setReset(n => n + 1); };
  return <div className={s.viewer}>
    <header className={s.header}><div className={s.identity}><div><h3>NUM PORTAL · LIVE GITLAB</h3><p>Real commits, pipeline jobs and deployment status · neth-ai/num-portal</p></div><b>LIVE</b></div><button type="button" onClick={() => setRefresh(n => n + 1)}>Refresh</button></header>
    <div className={s.liveIntro}><p>Read-only GitLab snapshot · refreshes every 20 seconds. The map marker follows observed job status. Successful jobs do not independently prove current website health.</p><p>Last fetched: {data ? date(data.fetchedAt) : error ? 'Fetch failed' : 'Loading…'}</p>{error && <p role="alert">{error}{data ? ' · Showing the last successful snapshot; it may be stale.' : ''}</p>}
      <label>Pipeline <select value={selected} onChange={e => { setSelected(e.target.value); setData(null); }}><option value="">Latest pipeline</option>{data?.pipelines.map(p => <option key={p.id} value={p.id}>#{p.id} · {p.ref} · {p.status}</option>)}</select></label>
      {data?.pipeline && <p><a href={data.pipeline.web_url} target="_blank" rel="noreferrer">#{data.pipeline.id} · {data.pipeline.ref} · {data.pipeline.status} ↗</a><br />{data.commit?.title}</p>}
    </div>
    <button type="button" aria-expanded={showMap} onClick={() => setShowMap(!showMap)}>Toggle secondary 3D map</button>
    {showMap && <><nav className={s.cameras} aria-label="Live map camera"><button onClick={() => focus(-1)}>Full map</button>{liveZones.map((zone, i) => <button key={zone.title} aria-pressed={view === i} onClick={() => focus(i)}>{zone.title}</button>)}</nav>
    <div className={s.liveStage}><Scene live liveStatus={`${data?.pipeline?.ref || ''} · ${current < 0 ? 'Commit' : group[current].status}`} packets={packet} view={view} resetKey={reset} zoomRequest={zoom} track={false} paused reduced onSelect={focus} onOrbit={() => {}} /><div className={s.zoomControls}><button aria-label="Zoom in" onClick={() => setZoom(z => ({ id: z.id + 1, direction: 1 }))}>+</button><button aria-label="Zoom out" onClick={() => setZoom(z => ({ id: z.id + 1, direction: -1 }))}>−</button><button onClick={() => focus(-1)}>Fit map</button></div></div></>}
    {data && <>{data.pipelines.length === 0 && <p className={s.liveIntro}>No pipelines returned for this project.</p>}<div className={s.liveSteps}>{group.map((stage, i) => <section key={i} data-status={stage.status}><h4>{liveZones[i + 1].title}</h4><strong>{stage.status}</strong>{stage.jobs.map(job => <a key={job.id} href={job.web_url} target="_blank" rel="noreferrer">{job.name} · {job.status}<small>{job.duration === null ? 'Duration pending' : `${job.duration.toFixed(1)} s`} · Started: {date(job.started_at)} · Finished: {date(job.finished_at)} · Runner: {job.runner?.description || 'Not assigned'}</small></a>)}</section>)}</div>
      {data.jobsTruncated && <p className={s.liveIntro}>Showing the first 100 jobs. Open GitLab for the complete pipeline.</p>}
      <div className={s.liveColumns}><section><h4>RECENT COMMITS · DEFAULT BRANCH</h4>{data.commits.map(c => <a key={c.id} href={c.web_url} target="_blank" rel="noreferrer"><strong>{c.title}</strong><small>{c.id.slice(0, 8)} · {date(c.committed_date)}</small></a>)}</section><section><h4>PROJECT DEPLOYMENT RECORDS</h4>{data.deploymentNotice ? <p>{data.deploymentNotice}</p> : data.deployments.length ? data.deployments.map(d => <p key={d.id}>#{d.id} · {d.environment} · {d.ref} · {d.status}<small>{date(d.updated_at)}</small></p>) : <p>No deployment records returned.</p>}<h4>RECENT MERGE REQUESTS</h4>{data.mergeRequests.length ? data.mergeRequests.map(m => <a key={m.iid} href={m.web_url} target="_blank" rel="noreferrer">!{m.iid} · {m.title} · {m.state}</a>) : <p>No merge requests returned.</p>}<p>Method A manual runs are not recorded by this GitLab connection.</p></section></div></>}
  </div>;
}
