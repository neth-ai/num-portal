'use client';
import { useRouter } from 'next/navigation';
import { Panel, Pill } from '@/components/ui';

type Listed = { id: number; status: string; message: string; sha: string };
type Stage = { name: string; status: string; seconds: number | null };
type Selected = { id: number; status: string; sha: string; message: string; stages: Stage[]; rolledBack: boolean };
type Job = { name: string; status: string; log: string | null };

const stageClass = (status: string) =>
  status === 'success' ? 'ok' : status === 'running' ? 'run' : status === 'failed' ? 'bad' : '';

const stageText = (s: Stage) =>
  s.status === 'success' ? (s.seconds != null ? `${Math.round(s.seconds)}s` : 'done')
    : s.status === 'running' ? 'running'
      : s.status === 'failed' ? 'failed' : 'waiting';

export default function PipelineView({ pipelines, selected, jobs }: { pipelines: Listed[]; selected: Selected; jobs: Job[] }) {
  const router = useRouter();
  const log = jobs.map((j) => j.log).filter(Boolean).join('\n');

  return (
    <div className="split">
      <Panel title="Pipelines">
        <div id="pl">
          {pipelines.map((p) => (
            <button key={p.id} type="button" className="pitem" aria-pressed={p.id === selected.id}
              onClick={() => router.push(`/pipelines?id=${p.id}`)}>
              <span className="mono">#{p.id}</span>
              <span>{p.message || p.sha.slice(0, 7)}</span>
              <Pill status={p.status} />
            </button>
          ))}
        </div>
      </Panel>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
        <Panel title={<>Pipeline #{selected.id} <Pill status={selected.status} /></>}>
          <p className="hint" style={{ margin: '0 0 12px' }}>
            commit <span className="mono">{selected.sha.slice(0, 7)}</span> · {selected.message}
          </p>
          <div className="graph">
            {selected.stages.map((s, i) => (
              <div key={s.name} className={`gn ${stageClass(s.status)}`} style={{ ['--i' as string]: i }}>
                <b>{s.name}</b>
                <span className="hint">{stageText(s)}</span>
              </div>
            ))}
          </div>
          {selected.rolledBack ? (
            <div className="note" style={{ marginTop: 12, background: 'var(--bad-soft)', color: 'var(--bad)' }}>
              The health check failed, so the pipeline rolled back to the last good version.
            </div>
          ) : null}
          <div className="tools" style={{ marginTop: 14 }}>
            <button className="btn danger" type="button" disabled>Roll back</button>
            <span className="hint">Production deploys automatically. Roll back only in an emergency.</span>
          </div>
        </Panel>

        <Panel title="Job log">
          <div className="term" id="term">
            {log
              ? log.split('\n').map((line, i) => (
                <div key={i} className={`tl ${/ERROR|failed/.test(line) ? 'er' : /OK|succeeded|Successfully/.test(line) ? 'g' : ''}`}>
                  <time>{String(i).padStart(2, '0')}</time>
                  <span>{line}</span>
                </div>
              ))
              : <div className="tl"><time>--</time><span>No log has arrived for this pipeline yet.</span></div>}
          </div>
        </Panel>
      </div>
    </div>
  );
}
