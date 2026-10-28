// Fastest to slowest run per scenario, with the mean as a dot. Method A above Method B.

export type Range = { min: number; mean: number; max: number } | null;
export type RangeRow = { scenario: string; a: Range; b: Range };

const ROW_HEIGHT = 64;
const LEFT = 60;

export default function RangePlot({ rows }: { rows: RangeRow[] }) {
  const values = rows.flatMap((r) => [r.a, r.b]).filter(Boolean).flatMap((r) => [r!.min, r!.max]);
  if (!values.length) return <p className="hint" style={{ margin: 0 }}>No run recorded yet.</p>;

  const max = Math.max(...values);
  const ticks = Array.from({ length: 7 }, (_, i) => Math.round((max / 6) * i));
  const scale = (v: number) => LEFT + (v / Math.max(1, max)) * 460;
  const height = rows.length * ROW_HEIGHT + 30;

  return (
    <div className="tbl">
      <svg viewBox={`0 0 540 ${height}`} width="100%" style={{ minWidth: 440 }} role="img"
        aria-label="Range and mean of deployment time per scenario">
        {ticks.map((t) => (
          <g key={t}>
            <line className="g-line" x1={scale(t)} x2={scale(t)} y1={6} y2={rows.length * ROW_HEIGHT} />
            <text className="g-lbl" x={scale(t)} y={rows.length * ROW_HEIGHT + 18} textAnchor="middle">{t}</text>
          </g>
        ))}
        {rows.map((row, i) => {
          const y = i * ROW_HEIGHT + 18;
          return (
            <g key={row.scenario}>
              <text className="g-row" x={4} y={y + 22}>{row.scenario}</text>
              {([[row.a, 'a', y], [row.b, 'b', y + 24]] as const).map(([r, series, yy], k) =>
                r ? (
                  <g key={series}>
                    <line className={`rl ln-${series}`} style={{ animationDelay: `${i * 0.1 + k * 0.05}s` }}
                      x1={scale(r.min)} x2={scale(r.max)} y1={yy} y2={yy}
                      strokeWidth={6} strokeLinecap="round" opacity={0.4} />
                    <circle className={`pt dot-${series}`} style={{ animationDelay: `${i * 0.1 + 0.5}s` }}
                      cx={scale(r.mean)} cy={yy} r={6} />
                  </g>
                ) : null,
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
