// Apdex gauge. A null value means the k6 load test has not been imported yet.

export default function Gauge({ value, series, label }: { value: number | null; series: 'a' | 'b'; label: string }) {
  const shown = value ?? 0;
  return (
    <div style={{ textAlign: 'center' }}>
      <svg className="gauge" viewBox="0 0 140 84" width={150} role="img"
        aria-label={value === null ? `${label} Apdex not measured yet` : `${label} Apdex ${shown}`}>
        <path className="gb" d="M10 74 A60 60 0 0 1 130 74" fill="none" strokeWidth={12} strokeLinecap="round" />
        {value !== null ? (
          <path className={`fg gf-${series}`} d="M10 74 A60 60 0 0 1 130 74" fill="none"
            strokeWidth={12} strokeLinecap="round" strokeDashoffset={(188.5 * (1 - shown)).toFixed(1)} />
        ) : null}
        <text className="gt" x={70} y={70} textAnchor="middle">{value === null ? '--' : shown.toFixed(2)}</text>
      </svg>
      <div className="hint">{label}</div>
    </div>
  );
}
