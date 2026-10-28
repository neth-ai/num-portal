import PageHeader from '@/components/shell/PageHeader';
import { Panel, Pill } from '@/components/ui';
import { TITLES } from '@/lib/nav';
import { checkServices } from '@/lib/system';

export const dynamic = 'force-dynamic';

export default async function SystemHealthPage() {
  const [title, hint] = TITLES['/system-health'];
  const services = await checkServices();
  const checkedAt = new Date().toTimeString().slice(0, 8);

  return (
    <>
      <PageHeader title={title} hint={hint} />

      <Panel title={<>Services <span className="hint">checked at {checkedAt}</span></>}>
        <div className="health">
          {services.map((s) => (
            <div key={s.name}>
              <span>{s.name}<small>{s.where}</small></span>
              <Pill status={s.ok ? 'ok' : 'failed'} label={s.ok ? 'OK' : s.detail || 'down'} />
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Webhook">
        <p style={{ margin: 0 }}>GitLab sends push, pipeline and job events to this portal.
          The secret token is checked on every call, and a call without it is refused.</p>
      </Panel>
    </>
  );
}
