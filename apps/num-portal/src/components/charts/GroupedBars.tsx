// Mean deployment time per scenario, Method A above Method B.
// The value is printed inside each bar, exactly as the prototype draws it.

export type ScenarioBar = { scenario: string; a: number; b: number };

export default function GroupedBars({ rows }: { rows: ScenarioBar[] }) {
  const max = Math.max(1, ...rows.flatMap((r) => [r.a, r.b]));
  return (
    <div className="bars" style={{ marginTop: 12 }}>
      {rows.map((r) => (
        <div className="bar" key={r.scenario}>
          <span>{r.scenario}</span>
          <div className="track">
            <div className="a" style={{ width: `${(r.a / max) * 100}%` }}>{r.a}</div>
            <div className="b" style={{ width: `${(r.b / max) * 100}%` }}>{r.b}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
