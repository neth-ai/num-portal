"use client";
import { useEffect, useState } from "react";
import LiveGitLab from "./LiveGitLab";
import dynamic from "next/dynamic";
const Scene = dynamic(() => import("./Scene"), { ssr: false });
import { scenarios } from "./model";
import s from "./ResearchDashboard.module.css";
type Run = {
  id: number;
  scenario: string;
  method: "A" | "B";
  run_no: number;
  order_group: string | null;
  t_commit: string | null;
  t_handoff: string | null;
  t_ops_start: string | null;
  t_live: string | null;
  deployment_s: number | null;
  manual_deployment_s: number | null;
  lead_time_s: number | null;
  handoff_wait_s: number | null;
  manual_steps: number;
  result: string;
  recovery_s: number | null;
  health_check_ok: string | null;
  reset_confirmed_at: string | null;
  environment_error: string | null;
};
const stamp = (v: string | null) => (v ? new Date(v).toLocaleString() : "—");
const seconds = (v: number | null) =>
  v === null ? "—" : `${Number(v).toFixed(1)} s`;
const good = (r: Run) =>
  r.result === "success" && r.health_check_ok === "true" && Boolean(r.t_live);
const manual = (scenario: string) =>
  scenario === "S1"
    ? [
        "SSH to server",
        "Clone repository",
        "Open repository",
        "Checkout release",
        "Open SME app",
        "Copy environment settings",
        "npm ci",
        "npm run build",
        "PM2 start",
        "PM2 save",
        "Public health check :3001",
      ]
    : [
        "SSH to server",
        "Open repository",
        "Back up working version",
        "Fetch release tags",
        "Checkout release",
        "Open SME app",
        "npm ci",
        ...(scenario === "S5" ? ["Update setting / secret"] : []),
        "npm run build",
        "PM2 restart",
        "Public health check :3001",
      ];
function Demo({ scenario }: { scenario: string }) {
  const [showMap, setShowMap] = useState(false);
  const [phase, setPhase] = useState(0);
  const [started, setStarted] = useState(0);
  const [approval, setApproval] = useState<number | null>(null);
  const [clock, setClock] = useState(0);
  useEffect(() => {
    if (!started || phase === 4) return;
    const timer = setInterval(
      () => setClock((Date.now() - started) / 1000),
      250,
    );
    return () => clearInterval(timer);
  }, [started, phase]);
  useEffect(() => {
    setPhase(0);
    setStarted(0);
    setApproval(null);
    setClock(0);
  }, [scenario]);
  const [done, setDone] = useState(0);
  const [history, setHistory] = useState<
    { scenario: string; order: string; finished: string }[]
  >([]);
  const [baseline, setBaseline] = useState(false);
  const [liveAt, setLiveAt] = useState<number | null>(null);
  const points = [
    "Commit",
    "Handoff request",
    "Ops start",
    "Public health answered",
  ];
  return (
    <section className={s.card}>
      <div className={s.sectionTitle}>
        <div>
          <small>DEMO · ILLUSTRATIVE ONLY</small>
          <h2>One release. Two delivery methods.</h2>
        </div>
        <span className={s.badge}>A–B–B–A</span>
      </div>
      <p>
        Same scenario and starting state. The teaching walkthrough below does
        not record study deployments.
      </p>
      <label>
        <input
          type="checkbox"
          checked={baseline}
          onChange={(e) => setBaseline(e.target.checked)}
        />{" "}
        Confirm both demo servers reset to the same baseline
      </label>
      <div className={s.actions}>
        <button
          disabled={
            !baseline ||
            (phase > 0 && phase < 4) ||
            done >= 100 ||
            history.filter((r) => r.scenario === scenario).length >= 10
          }
          onClick={() => {
            setStarted(Date.now());
            setPhase(1);
            setClock(0);
            setApproval(null);
            setLiveAt(null);
          }}
        >
          Launch demo pair
        </button>
        <span>
          {done} / 100 demo deployments · proposed next order:{" "}
          {["A", "B", "B", "A"][done % 4]}
        </span>
      </div>
      <div className={s.lanes}>
        {(["A", "B"] as const).map((method) => (
          <article key={method}>
            <small>METHOD {method}</small>
            <h3>
              {method === "A" ? "Manual over SSH" : "GitLab CI/CD + Docker"}
            </h3>
            <strong>
              {clock.toFixed(1)} s elapsed ·{" "}
              {method === "A"
                ? phase >= 3
                  ? manual(scenario).length + (scenario === "S3" ? 7 : 0)
                  : phase >= 2
                    ? 1
                    : 0
                : started
                  ? approval
                    ? 2
                    : 1
                  : 0}{" "}
              human actions
            </strong>
            <ol>
              {(method === "A"
                ? [
                    "Dev handoff → Ops queue",
                    ...manual(scenario),
                    ...(scenario === "S3"
                      ? [
                          "Deliberate fault → restore last working tag",
                          "Reinstall → rebuild → PM2 restart → public health",
                        ]
                      : []),
                  ]
                : [
                    "Push / merge (human)",
                    "Validate",
                    "Test",
                    "Build Docker image",
                    "Deploy staging :3003",
                    "Staging health check",
                    "Production approval (human)",
                    "Deploy production :3002",
                    ...(scenario === "S3"
                      ? ["Deliberate fault → rollback last working image"]
                      : []),
                    "Production public health",
                  ]
              ).map((step, i) => (
                <li
                  key={step}
                  data-done={phase === 4 || (phase >= 2 && i === 0)}
                >
                  {step}
                </li>
              ))}
            </ol>
            <dl>
              {points.map((point, i) => (
                <div key={point}>
                  <dt>{point}</dt>
                  <dd>
                    {method === "B" && (i === 1 || i === 2)
                      ? "N/A"
                      : stamp(
                          !started
                            ? null
                            : i === 0
                              ? new Date(started).toISOString()
                              : i === 1
                                ? new Date(started + 1000).toISOString()
                                : i === 2 && phase >= 2
                                  ? new Date(started + 2000).toISOString()
                                  : i === 3 && liveAt
                                    ? new Date(liveAt).toISOString()
                                    : null,
                        )}
                  </dd>
                </div>
              ))}
            </dl>
            <p>
              Deployment:{" "}
              {phase === 4 && liveAt
                ? seconds((liveAt - started) / 1000 - (method === "A" ? 2 : 0))
                : "pending"}{" "}
              · Lead:{" "}
              {phase === 4 && liveAt
                ? seconds((liveAt - started) / 1000)
                : "pending"}{" "}
              · Wait:{" "}
              {method === "B" ? "N/A" : phase >= 2 ? "1.0 s (demo)" : "pending"}
            </p>
          </article>
        ))}
      </div>
      <div className={s.actions}>
        {phase === 1 && (
          <button
            onClick={() => {
              if (Date.now() < started + 2000) return;
              setPhase(2);
            }}
          >
            Ops starts fixed procedure (after 2 s)
          </button>
        )}
        {phase === 2 && (
          <button
            onClick={() => {
              setApproval(Date.now());
              setPhase(3);
            }}
          >
            Approve production · human action 2
          </button>
        )}
        {phase === 3 && (
          <button
            onClick={() => {
              setLiveAt(Date.now());
              setPhase(4);
              setDone((n) => n + 2);
              setHistory((rows) => [
                ...rows,
                {
                  scenario,
                  order: done % 4 === 0 ? "A-B" : "B-A",
                  finished: new Date().toISOString(),
                },
              ]);
              setBaseline(false);
            }}
          >
            Simulate correct public health response
            {scenario === "S3" ? " after recovery" : ""}
          </button>
        )}
        {phase === 4 && (
          <span>
            {scenario === "S3"
              ? "Rolled back · last working version verified"
              : "Finished · demo health answered correctly"}
          </span>
        )}
      </div>
      <div className={s.matrix}>
        {scenarios.map((name, i) => (
          <div key={name}>
            <h3>
              S{i + 1} · {name}
            </h3>
            {["A", "B"].map((method) => (
              <div key={method}>
                <b>{method}</b>
                {Array.from({ length: 10 }, (_, j) => (
                  <span
                    key={j}
                    data-state={
                      j <
                      history.filter((r) => r.scenario === `S${i + 1}`).length
                        ? "done"
                        : "empty"
                    }
                  >
                    {j <
                    history.filter((r) => r.scenario === `S${i + 1}`).length
                      ? "✓"
                      : "—"}
                  </span>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
      {history.length > 0 && (
        <details>
          <summary>Recorded demo pair order</summary>
          <ol>
            {history.map((r, i) => (
              <li key={i}>
                {r.scenario} · {r.order} · {stamp(r.finished)}
              </li>
            ))}
          </ol>
        </details>
      )}
      <button aria-expanded={showMap} onClick={() => setShowMap(!showMap)}>
        Toggle secondary 3D map
      </button>
      {showMap && (
        <div style={{ height: 420, position: "relative" }}>
          <Scene
            zoomRequest={{ id: 0, direction: 1 }}
            packets={[]}
            view={-1}
            resetKey={0}
            track={false}
            paused
            reduced
            onSelect={() => {}}
            onOrbit={() => {}}
          />
        </div>
      )}
      <p>
        Durations here are walkthrough timings only. No live KPIs or database
        records use them.
      </p>
    </section>
  );
}
function Distribution({ runs, metric }: { runs: Run[]; metric: string }) {
  const value = (r: Run): number | null =>
    metric === "failure"
      ? r.result === "failed" || r.result === "rolled_back"
        ? 100
        : good(r)
          ? 0
          : null
      : metric === "deployment"
        ? r.method === "A"
          ? r.manual_deployment_s
          : r.deployment_s
        : metric === "lead"
          ? r.lead_time_s
          : metric === "waiting"
            ? r.handoff_wait_s
            : r.recovery_s;
  const values = (method: string) =>
    runs
      .filter((r) => r.method === method)
      .map(value)
      .filter((v): v is number => v !== null && Number.isFinite(v))
      .sort((a, b) => a - b);
  const all = [...values("A"), ...values("B")];
  const max = Math.max(1, ...all);
  return (
    <div className={s.charts}>
      {["A", "B"].map((method) => {
        const xs = values(method);
        const avg = xs.length
          ? xs.reduce((a, b) => a + b, 0) / xs.length
          : null;
        const q = (p: number) => xs[Math.floor((xs.length - 1) * p)];
        return (
          <article key={method}>
            <h3>
              Method {method} · n={xs.length}
            </h3>
            <p>
              Mean{" "}
              {avg === null
                ? "—"
                : `${avg.toFixed(1)} ${metric === "failure" ? "%" : "s"}`}
            </p>
            <div className={s.bar} aria-label={`Mean ${avg ?? "unavailable"}`}>
              <i style={{ width: `${((avg ?? 0) / max) * 100}%` }} />
            </div>
            {xs.length > 0 ? (
              <svg
                viewBox="0 0 320 65"
                role="img"
                aria-label={`Box plot: min ${q(0)}, Q1 ${q(0.25)}, median ${q(0.5)}, Q3 ${q(0.75)}, max ${q(1)}`}
              >
                <line
                  x1={10 + (q(0) / max) * 300}
                  y1="32"
                  x2={10 + (q(1) / max) * 300}
                  y2="32"
                  stroke="currentColor"
                />
                <rect
                  x={10 + (q(0.25) / max) * 300}
                  y="18"
                  width={Math.max(2, ((q(0.75) - q(0.25)) / max) * 300)}
                  height="28"
                  fill="none"
                  stroke="currentColor"
                />
                <line
                  x1={10 + (q(0.5) / max) * 300}
                  x2={10 + (q(0.5) / max) * 300}
                  y1="15"
                  y2="49"
                  stroke="currentColor"
                />
              </svg>
            ) : (
              <p>No recorded measurements</p>
            )}
            <small>
              Min / Q1 / Median / Q3 / Max:{" "}
              {xs.length
                ? [0, 0.25, 0.5, 0.75, 1]
                    .map((p) => q(p).toFixed(1))
                    .join(" / ")
                : "—"}
            </small>
          </article>
        );
      })}
    </div>
  );
}
export default function ResearchDashboard() {
  const [inTransit, setInTransit] = useState<number | null>(null);
  const [mode, setMode] = useState("live");
  const [scenario, setScenario] = useState("S1");
  const [lang, setLang] = useState("en");
  const [theme, setTheme] = useState("light");
  const [drawer, setDrawer] = useState(false);
  const [runs, setRuns] = useState<Run[]>([]);
  const [error, setError] = useState("");
  const [fetched, setFetched] = useState("");
  const [metric, setMetric] = useState("deployment");
  useEffect(() => {
    setTheme(
      localStorage.getItem("research-theme") ||
        (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"),
    );
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang === "kh" ? "km" : "en";
  }, [lang]);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch("/api/evidence", {
          signal: controller.signal,
        });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error);
        setRuns(body.runs);
        setInTransit(body.inTransit);
        setFetched(body.fetchedAt);
        setError("");
      } catch (e) {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : "Evidence unavailable");
      }
    }
    load();
    const timer = setInterval(load, 20000);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, []);
  const text = (en: string, kh: string) => (lang === "kh" ? kh : en);
  const filtered = runs.filter((r) => r.scenario === scenario);
  const verified = runs.filter(good);
  const compared =
    verified.filter((r) =>
      verified.some(
        (other) =>
          other.scenario === r.scenario &&
          other.run_no === r.run_no &&
          other.method !== r.method,
      ),
    ).length / 2;
  function csv() {
    const columns: (keyof Run)[] = [
      "id",
      "scenario",
      "method",
      "run_no",
      "order_group",
      "t_commit",
      "t_handoff",
      "t_ops_start",
      "t_live",
      "deployment_s",
      "manual_deployment_s",
      "lead_time_s",
      "handoff_wait_s",
      "manual_steps",
      "result",
      "recovery_s",
      "health_check_ok",
      "reset_confirmed_at",
      "environment_error",
    ];
    const quote = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const blob = new Blob(
      [
        columns.join(",") +
          "\n" +
          filtered
            .map((r) => columns.map((k) => quote(r[k])).join(","))
            .join("\n"),
      ],
      { type: "text/csv;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `real-evidence-${scenario}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <main className={s.dashboard} data-theme={theme}>
      <header className={s.top}>
        <a href="#" className={s.brand}>
          N<span>NUM RESEARCH / DELIVERY LAB</span>
        </a>
        <div className={s.actions}>
          <button
            onClick={() => {
              const next = theme === "dark" ? "light" : "dark";
              setTheme(next);
              localStorage.setItem("research-theme", next);
            }}
            aria-label="Toggle light and dark theme"
          >
            {theme === "dark" ? "☀ Light" : "☾ Dark"}
          </button>
          <button
            onClick={() => setLang(lang === "en" ? "kh" : "en")}
            aria-label="Switch English and Khmer"
          >
            EN / ខ្មែរ
          </button>
        </div>
      </header>
      <div className={s.hero}>
        <small>
          {text(
            "MASTER’S THESIS · EXPERIMENT OBSERVATORY",
            "និក្ខេបបទអនុបណ្ឌិត · ការពិសោធន៍",
          )}
        </small>
        <h1>
          {text(
            "Better delivery. Measured.",
            "ការដាក់ឱ្យប្រើប្រាស់ប្រសើរជាងមុន។",
          )}
        </h1>
        <p>
          {text(
            "Manual deployment and DevOps in Cambodian SMEs. One controlled study, every step visible.",
            "ការប្រៀបធៀបការដាក់ឱ្យប្រើប្រាស់ដោយដៃ និង DevOps នៅសហគ្រាសកម្ពុជា។",
          )}
        </p>
        <div className={s.actions}>
          <span className={s.badge}>
            {mode === "live"
              ? "LIVE · GITLAB + POSTGRESQL"
              : "DEMO · ILLUSTRATIVE"}
          </span>
          <span>5 scenarios × 2 methods × 10 runs</span>
        </div>
      </div>
      <div className={s.actions}>
        <label>
          Scenario{" "}
          <select
            value={scenario}
            onChange={(e) => setScenario(e.target.value)}
          >
            {scenarios.map((name, i) => (
              <option key={name} value={`S${i + 1}`}>
                S{i + 1} · {name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <nav className={s.toolbar}>
        <div className={s.actions}>
          <button
            aria-pressed={mode === "live"}
            onClick={() => setMode("live")}
          >
            {text("Live GitLab", "GitLab ផ្ទាល់")}
          </button>
          <button
            aria-pressed={mode === "demo"}
            onClick={() => setMode("demo")}
          >
            {text("Demo simulation", "ការបង្ហាញសាកល្បង")}
          </button>
        </div>
        <button aria-expanded={drawer} onClick={() => setDrawer(!drawer)}>
          {text("Study controls", "ការកំណត់ការសិក្សា")} ☰
        </button>
      </nav>
      {drawer && (
        <aside className={s.card}>
          <label>
            {text("Scenario", "សេណារីយ៉ូ")}{" "}
            <select
              value={scenario}
              onChange={(e) => setScenario(e.target.value)}
            >
              {scenarios.map((name, i) => (
                <option key={name} value={`S${i + 1}`}>
                  S{i + 1} · {name}
                </option>
              ))}
            </select>
          </label>
          <p>
            Within-subject experiment · counterbalanced A–B–B–A · identical
            reset before each run.
          </p>
        </aside>
      )}
      {mode === "demo" ? (
        <Demo scenario={scenario} />
      ) : (
        <>
          <div className={s.kpis}>
            {[
              ["Verified finished", verified.length],
              ["In transit · Ops queue", inTransit ?? "—"],
              [
                "Failed / rolled back",
                runs.filter((r) => r.result !== "success").length,
              ],
              ["Compared pairs", compared],
            ].map(([label, value]) => (
              <article key={label}>
                <small>{label}</small>
                <strong>{fetched ? value : "—"}</strong>
                <span>LIVE · recorded study runs</span>
                {fetched && label !== "In transit · Ops queue" && (
                  <svg
                    viewBox="0 0 120 24"
                    role="img"
                    aria-label="Cumulative recorded-run trend"
                    style={{
                      width: "100%",
                      height: 24,
                      color: "var(--accent)",
                    }}
                  >
                    <polyline
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      points={Array.from({ length: 12 }, (_, i) => {
                        const history = runs.slice(
                          0,
                          Math.ceil((runs.length * (i + 1)) / 12),
                        );
                        const count =
                          label === "Verified finished"
                            ? history.filter(good).length
                            : label === "Failed / rolled back"
                              ? history.filter((r) => r.result !== "success")
                                  .length
                              : history.filter(
                                  (r) =>
                                    good(r) &&
                                    history.some(
                                      (o) =>
                                        good(o) &&
                                        o.scenario === r.scenario &&
                                        o.run_no === r.run_no &&
                                        o.method !== r.method,
                                    ),
                                ).length / 2;
                        return `${i * 10 + 5},${22 - (count / Math.max(1, Number(value))) * 20}`;
                      }).join(" ")}
                    />
                  </svg>
                )}
              </article>
            ))}
          </div>
          <LiveGitLab />
          <section className={s.card}>
            <div className={s.sectionTitle}>
              <div>
                <small>POSTGRESQL · EXPERIMENT COVERAGE</small>
                <h2>{verified.length} / 100 verified deployments</h2>
              </div>
              <span>Order: A–B–B–A protocol</span>
            </div>
            <p role="status">
              {error ||
                (fetched
                  ? `Last fetched: ${stamp(fetched)}`
                  : "Loading database evidence…")}
              {error && fetched ? " · Previous snapshot retained" : ""}
            </p>
            <p>
              Each cell is one recorded run. ✓ public health verified · ! failed
              / rolled back · ? evidence incomplete · — remaining.
            </p>
            <div className={s.matrix}>
              {scenarios.map((name, i) => (
                <div key={name}>
                  <h3>
                    S{i + 1} · {name}
                  </h3>
                  {(["A", "B"] as const).map((method) => (
                    <div key={method}>
                      <b>{method}</b>
                      {Array.from({ length: 10 }, (_, j) => {
                        const r = runs.find(
                          (x) =>
                            x.scenario === `S${i + 1}` &&
                            x.method === method &&
                            x.run_no === j + 1,
                        );
                        return (
                          <span
                            key={j}
                            data-state={
                              r ? (good(r) ? "done" : "recorded") : "empty"
                            }
                            title={`Run ${j + 1} · recorded order ${r?.order_group || "missing"} · reset ${r?.reset_confirmed_at || "unverified"}`}
                          >
                            {r
                              ? good(r)
                                ? "✓"
                                : r.result !== "success"
                                  ? "!"
                                  : "?"
                              : "—"}
                          </span>
                        );
                      })}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </section>
          <section className={s.card}>
            <div className={s.sectionTitle}>
              <div>
                <small>LIVE · EVIDENCE LAB & COMPARISON ARCHIVE</small>
                <h2>{text("Measure the difference", "វាស់វែងភាពខុសគ្នា")}</h2>
              </div>
              <button onClick={csv} disabled={!filtered.length}>
                Export CSV ↗
              </button>
            </div>
            <div className={s.actions}>
              <label>
                Scenario{" "}
                <select
                  value={scenario}
                  onChange={(e) => setScenario(e.target.value)}
                >
                  {scenarios.map((name, i) => (
                    <option key={name} value={`S${i + 1}`}>
                      S{i + 1} · {name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Measure{" "}
                <select
                  value={metric}
                  onChange={(e) => setMetric(e.target.value)}
                >
                  {["deployment", "lead", "waiting", "failure", "recovery"].map(
                    (m) => (
                      <option key={m} value={m}>
                        {m === "failure" ? "Failure rate" : `${m} time`}
                      </option>
                    ),
                  )}
                </select>
              </label>
            </div>
            <Distribution runs={filtered} metric={metric} />
            <p>
              Missing values remain missing. A deployment = Ops start → public
              health; lead = commit → public health; wait = handoff → Ops start.
              B deployment uses its recorded pipeline duration. Failure rate
              includes rolled-back releases; success without public health
              evidence stays unclassified.
            </p>
            <div className={s.table}>
              <table>
                <thead>
                  <tr>
                    {[
                      "Run",
                      "Order / reset",
                      "Outcome / health",
                      "Commit",
                      "Handoff",
                      "Ops start",
                      "Public health",
                      "Deployment",
                      "Lead",
                      "Wait",
                      "Steps",
                      "Recovery",
                      "Environment error",
                    ].map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id}>
                      <td>
                        {r.scenario}/{r.method}/{r.run_no}
                      </td>
                      <td>
                        {r.order_group || "Missing"} /{" "}
                        {r.reset_confirmed_at ? "confirmed" : "unverified"}
                      </td>
                      <td>
                        {r.result} / {r.health_check_ok ?? "unverified"}
                      </td>
                      {[r.t_commit, r.t_handoff, r.t_ops_start, r.t_live].map(
                        (v, i) => (
                          <td key={i}>
                            {r.method === "B" && (i === 1 || i === 2)
                              ? "N/A"
                              : stamp(v)}
                          </td>
                        ),
                      )}
                      <td>
                        {seconds(
                          r.method === "A"
                            ? r.manual_deployment_s
                            : r.deployment_s,
                        )}
                      </td>
                      <td>{seconds(r.lead_time_s)}</td>
                      <td>
                        {r.method === "B" ? "N/A" : seconds(r.handoff_wait_s)}
                      </td>
                      <td>{r.manual_steps}</td>
                      <td>{seconds(r.recovery_s)}</td>
                      <td>{r.environment_error ?? "unrecorded"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!filtered.length && <p>No real runs returned for {scenario}.</p>}
            </div>
          </section>
        </>
      )}
      <footer>
        NUM · Improving Web Application Delivery in Cambodian SMEs
        <br />
        Pipeline success and website health are separate evidence. No
        demonstration measurements enter live statistics.
      </footer>
    </main>
  );
}
