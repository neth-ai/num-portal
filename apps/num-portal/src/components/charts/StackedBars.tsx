// Lead time split into waiting, hands-on work (Method A) and pipeline time (Method B).

export type SplitRow = { scenario: string; wait: number; hands: number; pipe: number };

export default function StackedBars({ rows }: { rows: SplitRow[] }) {
  const max = Math.max(1, ...rows.map((r) => Math.max(r.wait + r.hands, r.pipe)));
  const width = (v: number) => `${(v / max) * 100}%`;

  return (
    <div className="bars" style={{ marginTop: 12 }}>
      {rows.map((r) => (
        <div key={r.scenario} style={{ display: 'contents' }}>
          <div className="bar">
            <span>{r.scenario} A<br /><b className="mono">{r.wait + r.hands} s</b></span>
            <div className="stk">
              <i className="k-wait" style={{ width: width(r.wait) }} />
              <i className="k-hand" style={{ width: width(r.hands) }} />
            </div>
          </div>
          <div className="bar">
            <span>{r.scenario} B<br /><b className="mono">{r.pipe} s</b></span>
            <div className="stk">
              <i className="k-pipe" style={{ width: width(r.pipe) }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
