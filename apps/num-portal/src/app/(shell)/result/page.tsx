import Link from 'next/link';
import PageHeader from '@/components/shell/PageHeader';
import Diff from '@/components/release/Diff';
import { BrowserFrame, LiveSite, SitePreview } from '@/components/result/SitePreview';
import { Mini, Note, Panel, Pill } from '@/components/ui';
import { config } from '@/lib/config';
import { one } from '@/lib/db';
import { findHandoff } from '@/lib/handoffs-db';
import { TITLES } from '@/lib/nav';
import { jobsOf, latestPipeline, stageView } from '@/lib/pipelines';
import { BASE_CODE, FEATURE, type ScenarioId } from '@/lib/scenarios';
import { siteCheck, type SiteCheck } from '@/lib/system';

export const dynamic = 'force-dynamic';

const STATE_LABEL: Record<string, [string, string]> = {
  new: ['New feature live', 'success'],
  old: ['Rolled back, old version online', 'waiting'],
  failed: ['Deploy failed, old version online', 'failed'],
  wait: ['Deploying, old version online', 'running'],
};

export default async function ResultPage() {
  const [title, hint] = TITLES['/result'];

  const release = await one<{ scenario: ScenarioId; message: string; code: string; sha: string | null; handoff_id: number | null }>(
    'SELECT scenario, message, code, sha, handoff_id FROM releases ORDER BY id DESC LIMIT 1');

  if (!release) {
    return (
      <>
        <PageHeader title={title} hint={hint} />
        <Panel title="No release yet">
          <p className="hint" style={{ margin: '0 0 10px' }}>
            Change the code and deploy to both methods. The website of each method will appear here.
          </p>
          <Link className="btn pri" href="/change-code">Change code and deploy</Link>
        </Panel>
      </>
    );
  }

  const handoff = release.handoff_id ? await findHandoff(release.handoff_id) : null;

  // The gate: nothing is shown until Operations has put Method A online.
  if (!handoff || handoff.status !== 'live') {
    const failed = handoff?.status === 'failed';
    return (
      <>
        <PageHeader title={title} hint={hint} />
        <Panel title={<>Method A is not finished yet <Pill status={failed ? 'failed' : handoff?.status === 'deploying' ? 'deploying' : 'waiting'} /></>}>
          <p className="hint" style={{ margin: '0 0 10px' }}>
            {failed
              ? 'Ops reported a failed health check. Fix the code and resend. The result appears after Method A is live.'
              : 'The result of both methods is shown after the Operations team has put Method A online.'}
          </p>
          <div className="tools">
            {failed ? (
              <Link className="btn pri" href="/change-code">Fix and resend</Link>
            ) : (
              <>
                <Link className="btn pri" href="/ops-queue">Open the Ops queue</Link>
                <Link className="btn" href="/change-code">Back to Change code</Link>
              </>
            )}
          </div>
        </Panel>
      </>
    );
  }

  const pipeline = await latestPipeline();
  const jobs = pipeline ? await jobsOf(pipeline.id) : [];
  const { rolledBack } = stageView(jobs);

  const aState = 'new';
  const bState = !pipeline ? 'wait' : rolledBack ? 'old' : pipeline.status === 'success' ? 'new' : pipeline.status === 'failed' ? 'failed' : 'wait';

  const aLead = handoff.finishedAt
    ? Math.round((new Date(handoff.finishedAt).getTime() - new Date(handoff.sentAt).getTime()) / 1000)
    : null;

  // The three deployed copies of the site are asked directly, so the page shows the real one
  // whenever it is running and falls back to the drawn picture only when it is not.
  const [aSite, bSite, stagingSite] = await Promise.all([
    siteCheck(config.methodAUrl),
    siteCheck(config.methodBUrl),
    siteCheck(config.stagingUrl),
  ]);

  const frame = (
    name: string, url: string, site: SiteCheck, state: string,
    lead: string, steps: number, handoffs: number, featureLive: boolean, footer?: React.ReactNode,
  ) => (
    <Panel
      title={<>{name} <Pill status={STATE_LABEL[state][1]} label={STATE_LABEL[state][0]} /></>}
      extra={<a className="btn sm" href={url} target="_blank" rel="noreferrer">Open the website</a>}
    >
      <BrowserFrame url={url}>
        {site.ok ? (
          <LiveSite url={url} name={name} />
        ) : (
          <SitePreview scenario={release.scenario} featureLive={featureLive}
            empty={release.scenario === 'S1' && !featureLive} />
        )}
      </BrowserFrame>
      {site.ok ? null : (
        <p className="hint" style={{ margin: '8px 0 0' }}>
          This address does not answer ({site.detail}), so the picture above is a drawing of the
          released version, not the site itself.
        </p>
      )}
      <Mini items={[['Lead time', lead], ['Manual steps', steps], ['Handoffs', handoffs]]} />
      {footer}
    </Panel>
  );

  const stagingFooter = (
    <p className="hint" style={{ margin: '8px 0 0' }}>
      Staging first: <Pill status={stagingSite.ok ? 'ok' : 'failed'} label={stagingSite.ok ? 'online' : stagingSite.detail || 'down'} />{' '}
      <a href={config.stagingPublicUrl} target="_blank" rel="noreferrer">{config.stagingPublicUrl}</a>
    </p>
  );

  return (
    <>
      <PageHeader title={title} hint={hint} />
      <Note tone="accent">
        Released: <b>{FEATURE[release.scenario][0]}</b> · commit <b className="mono">{release.sha ?? 'local'}</b> · {release.message}
      </Note>

      <div className="cols2">
        {frame('Method A: Manual', config.methodAPublicUrl, aSite, aState,
          aLead !== null ? `${aLead} s` : '...', handoff.stepsDone.length, handoff.tries, true)}
        {frame('Method B: DevOps', config.methodBPublicUrl, bSite, bState,
          pipeline?.durationSec != null ? `${Math.round(pipeline.durationSec)} s` : '...', 1, 0, bState === 'new', stagingFooter)}
      </div>

      <Panel title="What changed in the code">
        <Diff before={BASE_CODE} after={release.code} />
        <p className="hint" style={{ margin: '10px 0 0' }}>
          The highlighted box on a website is the new feature. If it is missing, that method has not put the
          new version online.
        </p>
      </Panel>
    </>
  );
}
