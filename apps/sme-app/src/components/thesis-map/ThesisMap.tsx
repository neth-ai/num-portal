"use client";

import dynamic from "next/dynamic";
import { useEffect, useReducer, useRef, useState, type CSSProperties } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCube, faExpand, faPlay, faPause, faRotateLeft, faLocationCrosshairs, faRocket, faPlus, faMinus } from "@fortawesome/free-solid-svg-icons";
import { devopsPosition, initialSimulation, packetPosition, packetStatus, scenarios, simulationReducer, zones } from "./model";
import type { CommitSource } from "./model";
import type { LiveData } from "./live-model";
import DevOpsRoadmap from "./DevOpsRoadmap";
import LiveGitLab from "./LiveGitLab";
import s from "./ThesisMap.module.css";

const Scene = dynamic(() => import("./Scene"), { ssr: false, loading: () => <div className={s.loading}>Preparing the 3D research map…</div> });
const clock = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${Math.floor(seconds % 60).toString().padStart(2, "0")}`;

function DemoMap() {
  const [state, dispatch] = useReducer(simulationReducer, undefined, initialSimulation);
  const [gitlab, setGitlab] = useState<LiveData | null>(null);
  const [sourceMode, setSourceMode] = useState("gitlab");
  const [pipelineId, setPipelineId] = useState("");
  const [sourceError, setSourceError] = useState("");
  const [sourceRefresh, setSourceRefresh] = useState(0);
  const source: CommitSource | undefined = gitlab?.commit && gitlab.pipeline ? { sha: gitlab.commit.id, message: gitlab.commit.title, branch: gitlab.pipeline.ref, url: gitlab.commit.web_url } : undefined;
  useEffect(() => {
    const controller = new AbortController();
    setGitlab(null); setSourceError("");
    fetch(`/api/gitlab/live${pipelineId ? `?pipeline=${pipelineId}` : ""}`, { signal: controller.signal }).then(async response => {
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "GitLab unavailable"); return data;
    }).then(setGitlab).catch(error => { if (!controller.signal.aborted) setSourceError(error.message); });
    return () => controller.abort();
  }, [pipelineId, sourceRefresh]);
  const sourceRef = useRef(source);
  sourceRef.current = sourceMode === "gitlab" ? source : undefined;
  const [scenario, setScenario] = useState(0);
  const [artifact, setArtifact] = useState("apps/sme-app/page.tsx");
  const [commitMessage, setCommitMessage] = useState("feat(portal): update student information");
  const [branch, setBranch] = useState("dev/neth");
  const [zoomRequest, setZoomRequest] = useState({ id: 0, direction: 1 });
  const [outcome, setOutcome] = useState<"pass" | "fail">("pass");
  const [auto, setAuto] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [track, setTrack] = useState(false);
  const [view, setView] = useState(-1);
  const [cameraKey, setCameraKey] = useState(0);
  const [notice, setNotice] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const visible = useRef(false);
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => { setReduced(media.matches); if (media.matches) { setPaused(true); setAuto(false); } };
    update(); media.addEventListener("change", update);
    const observer = new IntersectionObserver(([entry]) => { visible.current = entry.isIntersecting; });
    observer.observe(root.current!);
    return () => { media.removeEventListener("change", update); observer.disconnect(); };
  }, []);
  useEffect(() => {
    if (paused) return;
    let previous = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now(), delta = Math.min(.2, (now - previous) / 1000); previous = now;
      if (!visible.current || document.hidden) return;
      dispatch({ type: "tick", seconds: delta * speed, auto: auto && (sourceMode !== "gitlab" || Boolean(sourceRef.current)), source: sourceRef.current });
    }, 100);
    return () => window.clearInterval(timer);
  }, [paused, speed, auto, sourceMode]);
  function focus(index: number) { setView(index); setCameraKey(key => key + 1); setTrack(false); }
  function launch() {
    if (sourceMode === "gitlab" && !source) return;
    const selected = sourceMode === "gitlab" ? source : undefined;
    dispatch({ type: "dispatch", scenario, artifact: selected ? selected.sha.slice(0, 8) : artifact.trim() || "apps/sme-app/page.tsx", commitMessage: selected?.message || commitMessage.trim(), branch: selected?.branch || branch, outcome, source: selected });
    setPaused(false);
  }
  async function fullscreen() {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await root.current?.requestFullscreen(); }
    catch { setNotice("Fullscreen is unavailable here. The map remains interactive below."); }
  }
  return <div className={s.viewer} ref={root}>
    <header className={s.header}>
      <div className={s.identity}><span><FontAwesomeIcon icon={faCube} /></span><div><h3>THESIS OPS · 3D FLOW MAP</h3><p>One scenario. Two deployment methods. Shared evidence.</p></div><b>DEMO</b></div>
      <div className={s.stats} aria-label="Simulation counters">
        {[ ["Dispatched", state.sent], ["In transit", state.active.length], ["Check failed", state.failed], ["Compared", state.completed] ].map(([name, value]) => <div key={name}><small>{name}</small><strong>{value}</strong></div>)}
      </div>
    </header>
    <nav className={s.cameras} aria-label="Map camera">
      <span>MAP CAM</span><button type="button" aria-pressed={view === -1 && !track} onClick={() => focus(-1)}>Full map</button>
      {zones.map((zone, i) => <button type="button" key={zone.title} aria-pressed={view === i && !track} onClick={() => focus(i)}>{zone.subtitle.split(" · ")[0]} · {zone.title}</button>)}
      <button type="button" className={s.expand} onClick={fullscreen} aria-label="Toggle map fullscreen"><FontAwesomeIcon icon={faExpand} /></button>
    </nav>
    <div className={s.workspace}>
      <form className={s.dispatch} onSubmit={event => { event.preventDefault(); launch(); }}>
        <div className={s.panelHeading}><h4>SCENARIO DISPATCH</h4><span>INPUT</span></div>
        <p className={s.muted}>Send a paired demonstration through Method A and Method B.</p>
        <label htmlFor="thesis-scenario">Study scenario</label>
        <select id="thesis-scenario" value={scenario} onChange={event => setScenario(Number(event.target.value))}>{scenarios.map((name, i) => <option value={i} key={name}>S{i + 1} · {name}</option>)}</select>
        <label htmlFor="demo-source">Commit source</label>
        <select id="demo-source" value={sourceMode} onChange={e => setSourceMode(e.target.value)}><option value="gitlab">Real GitLab commit</option><option value="custom">Custom demonstration</option></select>
        {sourceMode === "gitlab" && <div className={s.sourceCard}>
          <label htmlFor="demo-pipeline">Commit from pipeline</label><select id="demo-pipeline" value={pipelineId} onChange={e => setPipelineId(e.target.value)}><option value="">Latest pipeline</option>{gitlab?.pipelines.map(p => <option key={p.id} value={p.id}>#{p.id} · {p.ref}</option>)}</select>
          {source ? <><a href={source.url} target="_blank" rel="noreferrer">{source.sha.slice(0, 8)} · {source.branch} ↗</a><p>{source.message}</p></> : <p role="status">{sourceError || "Loading real commit…"}</p>}
          <button type="button" onClick={() => setSourceRefresh(n => n + 1)}>Refresh commits</button>
          <small>Real commit identity; illustrative routes, outcomes and timing. Method A replay does not mean a human deployed this commit.</small>
        </div>}
        <fieldset disabled={sourceMode === "gitlab"} hidden={sourceMode === "gitlab"} className={s.customSource}>
        <label htmlFor="thesis-artifact">Release / artifact name</label>
        <input id="thesis-artifact" maxLength={80} value={artifact} onChange={event => setArtifact(event.target.value)} required />
        <div className={s.presets}>{["page.tsx", "Dockerfile", "config.json"].map(name => <button key={name} type="button" onClick={() => setArtifact(name)}>{name}</button>)}</div>
        <label htmlFor="thesis-commit">Commit message</label>
        <input id="thesis-commit" required maxLength={120} value={commitMessage} onChange={event => setCommitMessage(event.target.value)} />
        <label htmlFor="thesis-branch">Target branch</label>
        <select id="thesis-branch" value={branch} onChange={event => setBranch(event.target.value)}><option>dev/neth</option><option>staging</option><option>main</option></select>
        </fieldset>
        <label htmlFor="thesis-outcome">Illustrative check outcome</label>
        <select id="thesis-outcome" value={outcome} onChange={event => setOutcome(event.target.value as "pass" | "fail")}><option value="pass">Pass · continue to comparison</option><option value="fail">Fail · halt at evidence lab</option></select>
        <div className={s.methods}><span><i /> A · Human + SOP</span><span><i /> B · GitLab + Docker</span></div>
        <button className={s.launch} type="submit" disabled={state.active.length > 10 || (sourceMode === "gitlab" && !source)}><FontAwesomeIcon icon={faRocket} /> LAUNCH DEMO PAIR</button>
        <small className={s.disclaimer}>Illustrative traffic only. No deployment, CSV export or thesis measurements are created.</small>
      </form>
      <div className={s.stage}>
        <Scene zoomRequest={zoomRequest} packets={state.active} view={view} resetKey={cameraKey} track={track} paused={paused} reduced={reduced} onSelect={focus} onOrbit={() => setTrack(false)} />
        <div className={s.zoomControls}><button type="button" aria-label="Zoom in" onClick={() => { setTrack(false); setZoomRequest(value => ({ id: value.id + 1, direction: 1 })); }}><FontAwesomeIcon icon={faPlus} /></button><button type="button" aria-label="Zoom out" onClick={() => { setTrack(false); setZoomRequest(value => ({ id: value.id + 1, direction: -1 })); }}><FontAwesomeIcon icon={faMinus} /></button><button type="button" onClick={() => focus(-1)}>Fit map</button></div>
        <div className={s.routeKey}><span><i /> METHOD A</span><span><i /> METHOD B</span><span>SIMULATION +{clock(state.time)}</span></div>
      </div>
      <div className={s.mobilePackets} aria-label="In-transit commit messages">{state.active.slice(-4).map(packet => <div key={packet.id}><strong>#{packet.id} · {packet.artifact}</strong><span>{packet.commitMessage}</span><small>{packet.method} · {packetStatus(packet)}</small></div>)}</div>
      <aside className={s.side}>
        <div className={s.radar}>
          <div className={s.panelHeading}><h4>TACTICAL RADAR</h4><span>LIVE DEMO</span></div>
          <svg viewBox="-12 -8 28 19" role="img" aria-label="Overhead view of the same five zones and moving demonstration packets">
            <path d="M -9 0 L -2.5 -5 L 5 0 L 12 0" fill="none" stroke="#315e7b" strokeWidth=".2" />
            <polyline points={[[-9, 0], ...Array.from({ length: 10 }, (_, i) => { const p = devopsPosition(i); return [p[0], p[2]]; }), [5, 0], [12, 0]].map(p => p.join(",")).join(" ")} fill="none" stroke="#ffc857" strokeWidth=".15" />
            {zones.map((zone, i) => <circle key={zone.title} cx={zone.position[0]} cy={zone.position[2]} r={view === i ? .65 : .45} fill={zone.color} />)}
            {state.active.map(packet => { const [x, , z] = packetPosition(packet.progress, packet.method); return <circle key={packet.id} cx={x} cy={z} r=".2" fill="white" />; })}
          </svg>
          <div className={s.radarButtons}>{zones.map((zone, i) => <button type="button" key={zone.title} onClick={() => focus(i)} aria-label={`Focus ${zone.title}`} aria-pressed={view === i}>{i + 1}</button>)}</div>
        </div>
        <div className={s.arrivals}><div className={s.panelHeading}><h4>RECENT DEMO OUTCOMES</h4><span>{state.completed + state.failed}</span></div>
          {state.recent.length === 0 ? <p className={s.empty}>Launch a pair or enable auto traffic. Completed routes appear here.</p> : <ul>{state.recent.map(packet => <li key={packet.id} data-result={packet.result}><strong>{packet.artifact}</strong><small>#{packet.id} · S{packet.scenario + 1} · Method {packet.method} · {packet.branch}</small><p className={s.commitText}>{packet.commitMessage}</p><b>{packet.result === "failed" ? "Check failed · halted" : "Reached comparison"}</b></li>)}</ul>}
        </div>
      </aside>
    </div>
    <DevOpsRoadmap packets={state.active} recent={state.recent} />
    <section className={s.roadmap} aria-label="Thesis relationship roadmap">
      <h4>THESIS ROADMAP · ONE RELEASE, TWO METHODS</h4>
      <p>01 → 02 (Method A) / 03 (Method B) → 04 → 05. Methods A and B are parallel comparisons, not consecutive deployment steps.</p>
      <div>{[
        ["01 · Define the scenario", "Select S1–S5, the release SHA, starting environment and success criteria. Both methods use the same study conditions."],
        ["02 · Method A — human SOP", "SSH → git → npm → PM2. A human records actual commands, duration and outcome using the measurement helper."],
        ["03 · Method B — GitLab + Docker", "dev/*: validate + test → merge staging: build Docker image + deploy staging → merge main: production deployment. Optional rollback supports S3."],
        ["04 · Verify the evidence", "Match the release SHA to pipeline/job logs and human records. Check duration, result, health checks and recovery evidence. Missing evidence stays missing."],
        ["05 · Compare by scenario", "Compare deployment time, success rate and manual steps for A versus B; compare recovery time for S3. Animation speed is never a study measurement."]
      ].map(([title, detail], i) => <button type="button" key={title} aria-pressed={view === i} onClick={() => focus(i)}><strong>{title}</strong><span>{detail}</span></button>)}</div>
      <h4>COMMIT JOURNEYS · SIMULATED REPLAY</h4>
      {[...state.active.filter(p => p.method === "B").slice(-3), ...state.recent.filter(p => p.method === "B").slice(0, 1)].map(packet => <article key={packet.id}><strong>{packet.commitMessage}</strong><p>{packet.branch} · {packet.source?.sha.slice(0, 8) || "Custom demo"} · S{packet.scenario + 1} · {packetStatus(packet)}</p><span>01 Prepare → 03 GitLab / Docker → 04 Evidence → 05 Comparison</span>{packet.source && <a href={packet.source.url} target="_blank" rel="noreferrer">View original GitLab commit ↗</a>}</article>)}
      {!state.active.length && !state.recent.length && <p>Launch a pair to follow its commit message through the study roadmap.</p>}
    </section>
    <div className={s.bottom}>
      <section className={s.telemetry} aria-label="Demo event log">
        <div className={s.panelHeading}><h4><i /> thesis-flow-demo.log</h4><span>{state.active.length} IN TRANSIT</span></div>
        <ol>{state.events.length ? state.events.map(event => <li key={event.id} data-kind={event.kind}><time>+{clock(event.time)}</time><b>[{event.kind}]</b><span>{event.message}</span></li>) : <li><time>+00:00</time><b>[READY]</b><span>Simulation ready. Select a scenario or turn on auto traffic.</span></li>}</ol>
      </section>
      <div className={s.controls}>
        <label className={s.switch}><span>Auto map traffic<small>Replay selected commit</small></span><input type="checkbox" checked={auto} onChange={event => setAuto(event.target.checked)} /></label>
        <label className={s.speed}>Transit speed <b>{speed.toFixed(1)}×</b><input aria-label="Transit speed" type="range" min="0.5" max="2" step="0.1" value={speed} onChange={event => setSpeed(Number(event.target.value))} /></label>
        <button type="button" aria-pressed={track} onClick={() => setTrack(!track)}><FontAwesomeIcon icon={faLocationCrosshairs} /> Track latest: {track ? "ON" : "OFF"}</button>
        <button type="button" onClick={() => setPaused(!paused)} aria-pressed={paused}><FontAwesomeIcon icon={paused ? faPlay : faPause} /> {paused ? "Resume" : "Pause"}</button>
        <button type="button" onClick={() => { dispatch({ type: "reset" }); setAuto(false); focus(-1); }}><FontAwesomeIcon icon={faRotateLeft} /> Reset demo</button>
        <p>Demo counters describe this animation session only. Transit speed is illustrative.</p>
      </div>
    </div>
    {notice && <p role="status" className={s.muted}>{notice}</p>}
    <div className={s.zoneSummary} style={{ "--zone": zones[Math.max(0, view)].color } as CSSProperties}><span>{view >= 0 ? zones[view].subtitle : "RESEARCH FLOW"}</span><strong>{view >= 0 ? zones[view].title : "Prepare → Method A / Method B → Validate → Compare"}</strong><p>{view >= 0 ? zones[view].detail : "The two routes share the same scenario and meet at the evidence checkpoint. Real study conclusions require verified human runs and pipeline records."}</p></div>
  </div>;
}

export default function ThesisMap() {
  const [mode, setMode] = useState("live");
  return <><div className={s.cameras} aria-label="Data source"><button type="button" aria-pressed={mode === "live"} onClick={() => setMode("live")}>Live GitLab</button><button type="button" aria-pressed={mode === "demo"} onClick={() => setMode("demo")}>Demo simulation</button></div>{mode === "live" ? <LiveGitLab /> : <DemoMap />}</>;
}
