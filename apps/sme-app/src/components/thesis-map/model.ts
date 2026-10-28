export const zones = [
  { title: "Scenario hub", subtitle: "01 · PREPARE", color: "#32caff", position: [-9, 0, 0], detail: "Choose the same release, starting state and success criteria for both methods." },
  { title: "Manual workstation", subtitle: "02 · METHOD A", color: "#ae87ff", position: [-2.5, 0, -5], detail: "A human follows the SOP and records actual commands, timestamps and deployment evidence." },
  { title: "CI/CD foundry", subtitle: "03 · METHOD B", color: "#ffc857", position: [-2.5, 0, 5], detail: "GitLab runs checks and builds Docker images before staging and approved production deployment." },
  { title: "Evidence lab", subtitle: "04 · VALIDATE", color: "#47e0d1", position: [5, 0, 0], detail: "Validate logs, failures, versions, health checks and timing before calculating statistics." },
  { title: "Comparison archive", subtitle: "05 · COMPARE", color: "#4fe69d", position: [12, 0, 0], detail: "Compare verified deployment time, success and manual steps by scenario; use recovery time for S3." },
] as const;
export const devopsSteps = [
  { title: "Code change", detail: "Select the release commit and S1–S5 study scenario.", phase: "CI" },
  { title: "Push to GitLab", detail: "A dev/* push or merge request starts validation.", phase: "CI" },
  { title: "Validate", detail: "Validate the release; branch_policy is a repository implementation detail.", phase: "CI" },
  { title: "Test", detail: "npm ci, lint and app builds; portal also runs automated tests.", phase: "CI" },
  { title: "Build & registry", detail: "On staging/main: build Docker images tagged with the commit SHA and push to the registry.", phase: "CI" },
  { title: "Deploy staging", detail: "The staging pipeline pulls its image and deploys Compose on :3003.", phase: "CD" },
  { title: "Staging health", detail: "The deployment script verifies health before accepting the release.", phase: "CD" },
  { title: "Production approval", detail: "After merge to main and its build, a person starts deploy_production. Approval here is simulated.", phase: "CD" },
  { title: "Deploy production", detail: "The approved main pipeline deploys the devops service on :3002.", phase: "CD" },
  { title: "Production health", detail: "Verify release health, then hand job logs, SHA and outcome to 04 Evidence.", phase: "CD" },
] as const;
export const DEVOPS_START = .15, DEVOPS_END = .75, EVIDENCE_AT = .9;
export const devopsPosition = (index: number): [number, number, number] => [index < 5 ? -6 + index * 2.3 : -6 + (9 - index) * 2.3, 1.1, index < 5 ? 5 : 8];
export function devopsStep(progress: number) { return progress < DEVOPS_START ? -1 : progress >= DEVOPS_END ? 10 : Math.min(9, Math.floor((progress - DEVOPS_START) / (DEVOPS_END - DEVOPS_START) * 10)); }
export const scenarios = ["First deployment", "Feature update", "Fault & rollback", "Environment mismatch", "Configuration change"];
export type Method = "A" | "B";
export type CommitSource = { sha: string; message: string; branch: string; url: string };
export type Packet = { source?: CommitSource; id: number; scenario: number; artifact: string; commitMessage: string; branch: string; method: Method; outcome: "pass" | "fail"; progress: number };
export type Event = { id: number; time: number; kind: "DISPATCH" | "METHOD A" | "METHOD B" | "VERIFY" | "COMPLETE" | "FAILED"; message: string };
export type Simulation = { time: number; nextId: number; nextEvent: number; sent: number; completed: number; failed: number; autoClock: number; autoIndex: number; active: Packet[]; recent: (Packet & { result: "complete" | "failed" })[]; events: Event[] };
export const initialSimulation = (): Simulation => ({ time: 0, nextId: 1, nextEvent: 1, sent: 0, completed: 0, failed: 0, autoClock: 3, autoIndex: 0, active: [], recent: [], events: [] });
export type Action = { type: "tick"; seconds: number; auto: boolean; source?: CommitSource } | { type: "dispatch"; source?: CommitSource; scenario: number; artifact: string; commitMessage: string; branch: string; outcome: "pass" | "fail" } | { type: "reset" };
function log(state: Simulation, kind: Event["kind"], message: string) {
  state.events = [{ id: state.nextEvent++, time: state.time, kind, message }, ...state.events].slice(0, 40);
}
function dispatch(state: Simulation, scenario: number, artifact: string, outcome: "pass" | "fail", commitMessage: string, branch: string, source?: CommitSource) {
  if (state.active.length > 10) return;
  for (const method of ["A", "B"] as const) {
    const packet: Packet = { source, id: state.nextId++, scenario, artifact, commitMessage, branch, method, outcome, progress: 0 };
    state.active.push(packet);
    state.sent++;
    log(state, "DISPATCH", `#${packet.id} · S${scenario + 1} · ${method} · [${branch}] ${artifact} — "${commitMessage}"`);
  }
}
export function simulationReducer(previous: Simulation, action: Action): Simulation {
  if (action.type === "reset") return initialSimulation();
  const state = { ...previous, active: previous.active.map(p => ({ ...p })), events: [...previous.events], recent: [...previous.recent] };
  if (action.type === "dispatch") { dispatch(state, action.scenario, action.artifact, action.outcome, action.commitMessage, action.branch, action.source); return state; }
  const dt = Math.max(0, Math.min(action.seconds, 0.5));
  state.time += dt;
  state.autoClock = action.auto ? state.autoClock + dt : 0;
  if (action.auto && state.autoClock >= 4) {
    state.autoClock = 0;
    if (action.source) dispatch(state, state.autoIndex % 5, action.source.sha.slice(0, 8), "pass", action.source.message, action.source.branch, action.source);
    else dispatch(state, state.autoIndex % 5, ["apps/sme-app/page.tsx", "Dockerfile", "release/config.json"][state.autoIndex % 3], state.autoIndex % 4 === 3 ? "fail" : "pass", ["feat(portal): update student information", "build(docker): refresh application image", "fix(config): align deployment environment"][state.autoIndex % 3], ["dev/neth", "staging", "main"][state.autoIndex % 3]);
    state.autoIndex++;
  }
  state.active = state.active.filter(packet => {
    const old = packet.progress;
    packet.progress = Math.min(1, old + dt / (packet.method === "B" ? 40 : 12));
    if (packet.method === "B") {
      devopsSteps.forEach((step, index) => {
        const at = DEVOPS_START + index * (DEVOPS_END - DEVOPS_START) / 10;
        if (old < at && packet.progress >= at) log(state, "METHOD B", `#${packet.id} · 03.${index + 1} ${step.title} (simulation) · ${packet.commitMessage}`);
      });
      if (packet.outcome === "fail" && old < DEVOPS_END && packet.progress >= DEVOPS_END) log(state, "METHOD B", `#${packet.id} · Health check failed → automatic rollback walkthrough · ${packet.commitMessage}`);
    } else if (old < 1 / 3 && packet.progress >= 1 / 3) log(state, "METHOD A", `#${packet.id} · 02 · Human SOP: SSH → git → npm → PM2 · ${packet.commitMessage}`);
    const evidenceAt = packet.method === "B" ? EVIDENCE_AT : 2 / 3;
    if (old < evidenceAt && packet.progress >= evidenceAt) log(state, "VERIFY", `#${packet.id} · 04 · Collect duration, result, logs and release SHA · ${packet.commitMessage}`);
    const failed = packet.outcome === "fail" && packet.progress >= evidenceAt;
    if (!failed && packet.progress < 1) return true;
    if (failed) state.failed++; else state.completed++;
    log(state, failed ? "FAILED" : "COMPLETE", `#${packet.id} · ${failed ? "Illustrative check failed; route halted" : "05 · Compare matched scenarios: deployment time, success, manual steps; S3 recovery"}`);
    state.recent = [{ ...packet, result: failed ? "failed" as const : "complete" as const }, ...state.recent].slice(0, 6);
    return false;
  });
  return state;
}
/** One coordinate function drives the 3D scene, radar and tracking camera. */
export function packetPosition(progress: number, method: Method): [number, number, number] {
  if (method === "B") {
    const interpolate = (a: readonly number[], b: readonly number[], t: number): [number, number, number] => [a[0] + (b[0] - a[0]) * t, 1.1, a[2] + (b[2] - a[2]) * t];
    if (progress < DEVOPS_START) return interpolate(zones[0].position, devopsPosition(0), progress / DEVOPS_START);
    if (progress < DEVOPS_END) {
      const scaled = (progress - DEVOPS_START) / (DEVOPS_END - DEVOPS_START) * 10;
      const index = Math.min(9, Math.floor(scaled));
      return interpolate(devopsPosition(index), devopsPosition(Math.min(9, index + 1)), Math.max(0, (scaled - index - .6) / .4));
    }
    if (progress < EVIDENCE_AT) return interpolate(devopsPosition(9), zones[3].position, (progress - DEVOPS_END) / (EVIDENCE_AT - DEVOPS_END));
    return interpolate(zones[3].position, zones[4].position, (progress - EVIDENCE_AT) / (1 - EVIDENCE_AT));
  }
  const route = [zones[0].position, zones[method === "A" ? 1 : 2].position, zones[3].position, zones[4].position];
  const segment = Math.min(2, Math.floor(progress * 3));
  const t = Math.min(1, progress * 3 - segment);
  const a = route[segment], b = route[segment + 1];
  return [a[0] + (b[0] - a[0]) * t, 1.1 + Math.sin(t * Math.PI) * 1.6, a[2] + (b[2] - a[2]) * t];
}

export function packetStatus(packet: Packet): string {
  if (packet.method === "B") {
    const step = devopsStep(packet.progress);
    if (step < 0) return "01 → 03 · Entering DevOps roadmap";
    if (step < 10) return `03.${step + 1} · ${devopsSteps[step].title} (demo)`;
    if (packet.outcome === "fail") return packet.progress < EVIDENCE_AT ? "03 · Health failure → rollback (demo)" : "04 · Record failure / recovery evidence";
    return packet.progress < EVIDENCE_AT ? "03 complete → 04 Evidence" : packet.progress < 1 ? "04 → 05 · Verify and compare" : "05 · Comparison walkthrough complete";
  }
  if (packet.progress < 1 / 3) return `01 · [${packet.branch}] Prepare matched scenario`;
  if (packet.progress < 2 / 3) return packet.method === "A" ? "02 · SSH → git → npm → PM2" : "03 · Validate → test → Docker → deploy (demo)";
  return packet.outcome === "fail" ? "04 · Illustrative check failed" : packet.progress >= 1 ? "05 · Comparison walkthrough complete" : "04 → 05 · Verify evidence → compare";
}
