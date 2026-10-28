"use client";
import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCodeBranch, faRotateLeft, faChartLine } from '@fortawesome/free-solid-svg-icons';
import { stepIcons } from './step-icons';
import { devopsStep, devopsSteps, DEVOPS_END, EVIDENCE_AT, packetStatus, type Packet } from './model';
import s from './ThesisMap.module.css';
export default function DevOpsRoadmap({ packets, recent }: { packets: Packet[]; recent: Packet[] }) {
  const [selected, setSelected] = useState<number | null>(null);
  const journeys = [...packets, ...recent].filter(p => p.method === 'B');
  const nextId = journeys.some(p => p.id === selected) ? selected : journeys[0]?.id ?? null;
  useEffect(() => { setSelected(nextId); }, [nextId]);
  const packet = journeys.find(p => p.id === selected) || journeys[0];
  const current = packet ? devopsStep(packet.progress) : -1;
  const failed = packet?.outcome === 'fail' && packet.progress >= DEVOPS_END;
  return <section className={s.devopsRoadmap} aria-label="Method B step-by-step roadmap">
    <div className={s.devopsHeading}><div><span>ZONE 03 · METHOD B</span><h4><FontAwesomeIcon icon={faCodeBranch} aria-hidden="true" /> Follow your commit through DevOps</h4><p>One illustrative release journey across dev/* → staging → main. These are separate pipelines in GitLab; merge commits can have different SHAs.</p></div>
      <label>Follow commit replay<select aria-label="Follow commit replay" value={packet?.id || ''} onChange={e => setSelected(Number(e.target.value))}>{!journeys.length && <option value="">Launch a demo pair first</option>}{journeys.map(p => <option key={p.id} value={p.id}>#{p.id} · {p.artifact} · S{p.scenario + 1}</option>)}</select></label>
    </div>
    <div className={s.devopsCommit}><b>{packet ? packet.commitMessage : 'Waiting for a commit'}</b><span>{packet ? `${packet.source?.sha.slice(0, 8) || packet.artifact} · source branch: ${packet.branch} · ${packetStatus(packet)}` : 'Choose a GitLab commit above and launch a pair.'}</span>{packet?.source && <a href={packet.source.url} target="_blank" rel="noreferrer">Original commit ↗</a>}</div>
    <ol className={s.devopsSteps}>{devopsSteps.map((step, i) => {
      const status = !packet || current < i ? 'waiting' : current === i ? 'active' : failed && i === 9 ? 'failed' : 'complete';
      return <li key={step.title} data-state={status} aria-current={status === 'active' ? 'step' : undefined}>
        <div><small>{step.phase} · {status === 'complete' ? 'demo complete' : status}</small></div><h5><span className={s.devopsIcon}><FontAwesomeIcon icon={stepIcons[i]} aria-hidden="true" /></span>{step.title}</h5><p>{step.detail}</p>
        {status === 'active' && <div className={s.stepCommit}><span>COMMIT IN THIS STEP</span><strong>{packet?.commitMessage}</strong><small>{packet?.source?.sha.slice(0, 8) || packet?.artifact}</small></div>}
      </li>;
    })}</ol>
    <div className={s.devopsExit}><div data-active={Boolean(failed)}><strong><FontAwesomeIcon icon={faRotateLeft} aria-hidden="true" /> Safety route · automatic rollback</strong><p>{failed ? 'Simulated health check failure: restore the previous healthy image and send failure/recovery evidence to 04.' : 'A failed health check restores the previous healthy image. Select the failure outcome above to replay this route.'}</p></div><div data-active={Boolean(packet && packet.progress >= EVIDENCE_AT)}><strong><FontAwesomeIcon icon={faChartLine} aria-hidden="true" /> 04 Evidence → 05 Comparison</strong><p>{packet && packet.progress >= EVIDENCE_AT ? failed ? 'Failure and recovery evidence reached 04. This replay stops here.' : 'All ten DevOps steps completed in the replay. Evidence can now enter the comparison walkthrough.' : 'The commit reaches 04 only after all ten steps and any failure recovery walkthrough.'}</p></div></div>
    <p className={s.disclaimer}>Step completion, approval and timing here are simulated. Real commit metadata does not prove a deployment or generate thesis measurements. This repository uses branch-policy checks; evaluator preview and webhook features from the reference are not configured here.</p>
  </section>;
}
