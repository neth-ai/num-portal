// Small building blocks shared by every page. Class names and wording come from the prototype.
import type { ReactNode } from 'react';

const PILL_CLASS: Record<string, string> = {
  success: 'p-ok', Success: 'p-ok', live: 'p-ok', ok: 'p-ok', OK: 'p-ok',
  failed: 'p-bad', Failed: 'p-bad', 'rolling back': 'p-bad',
  running: 'p-run', deploying: 'p-run',
  waiting: 'p-wait', rolled_back: 'p-wait', 'Rolled back': 'p-wait',
  idle: 'p-n',
  A: 'p-a', B: 'p-b',
};

export const pillClass = (status: string) => PILL_CLASS[status] ?? 'p-n';

export function Pill({ status, label }: { status: string; label?: string }) {
  return <span className={`pill ${pillClass(status)}`}>{label ?? status}</span>;
}

export function Panel({ title, extra, children }: { title?: ReactNode; extra?: ReactNode; children: ReactNode }) {
  return (
    <section className="panel">
      {title ? <h2>{title}{extra}</h2> : null}
      {children}
    </section>
  );
}

export function Kpi({ label, value, sub }: { label: string; value: string | number; sub: string }) {
  return (
    <div className="kpi">
      <span>{label}</span>
      <b>{value}</b>
      <br />
      <small>{sub}</small>
    </div>
  );
}

export type VsRow = { owner: string; text: string; state?: '' | 'ok' | 'run' | 'bad'; time?: string };

/** The step list used by both process columns (Method A and Method B). */
export function VsList({ rows }: { rows: VsRow[] }) {
  return (
    <ul className="vs">
      {rows.map((r, i) => (
        <li key={i} className={r.state || ''}>
          <span className="own">{r.owner}</span>
          <span>{r.text}</span>
          <span className="mono hint">{r.time || ''}</span>
        </li>
      ))}
    </ul>
  );
}

export function Mini({ items }: { items: [string, string | number][] }) {
  return (
    <div className="mini">
      {items.map(([label, value]) => (
        <div key={label}>
          <span>{label}</span>
          <b>{value}</b>
        </div>
      ))}
    </div>
  );
}

export function Note({ tone = 'warn', children }: { tone?: 'warn' | 'accent' | 'bad'; children: ReactNode }) {
  const style = tone === 'accent'
    ? { background: 'var(--accent-soft)', color: 'var(--accent)' }
    : tone === 'bad'
      ? { background: 'var(--bad-soft)', color: 'var(--bad)' }
      : undefined;
  return <div className="note" style={style}>{children}</div>;
}

export function Legend({ items }: { items: [string, string][] }) {
  return (
    <div className="legend">
      {items.map(([color, label]) => (
        <span key={label}><i style={{ background: color }} />{label}</span>
      ))}
    </div>
  );
}
