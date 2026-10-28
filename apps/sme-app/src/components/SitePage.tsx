import type { PageContent } from '@/lib/content';

const box = { border: '2px solid #0b6b64', background: '#e4efee', borderRadius: 8, padding: '10px 14px', marginTop: 10 };
const sheet = { maxWidth: 560, margin: '40px auto', padding: 20, background: '#fff', borderRadius: 12 };
const footer = { marginTop: 18, paddingTop: 10, borderTop: '1px solid #e2e7ec', color: '#6b7884', fontSize: 12 };

/** The line at the bottom tells the evaluator which copy of the site they are looking at. */
function Stamp({ env, version }: { env?: string; version?: string }) {
  if (!env && !version) return null;
  return (
    <p style={footer}>
      {env ?? 'site'}
      {version ? <> · version <b>{version}</b></> : null}
    </p>
  );
}

export default function SitePage({ content, env, version }: { content: PageContent; env?: string; version?: string }) {
  return (
    <main style={sheet}>
      <h1 style={{ margin: 0, fontSize: 28 }}>{content.title}</h1>
      <p style={{ color: '#46525e', marginTop: 4 }}>Fresh coffee in Phnom Penh</p>

      {content.sections.map((section, i) => {
        if (section.type === 'menu') {
          return (
            <div key={i} style={{ marginTop: 10 }}>
              {section.items.map((item) => (
                <span key={item} style={{ display: 'inline-block', background: '#e4efee', color: '#0b6b64', borderRadius: 99, padding: '2px 10px', marginRight: 6 }}>
                  {item}
                </span>
              ))}
            </div>
          );
        }
        if (section.type === 'hours') return <div key={i} style={box}><b>Opening hours</b><br />{section.text}</div>;
        if (section.type === 'offer') return <div key={i} style={box}><b>Special offer</b><br />{section.text}</div>;
        if (section.type === 'order') return <div key={i} style={box}><b>Order online</b><br />Button: {section.button}</div>;
        if (section.type === 'delivery') return <div key={i} style={box}><b>Delivery fee</b><br />{section.fee}</div>;
        return null;
      })}

      <Stamp env={env} version={version} />
    </main>
  );
}

/** Shown while this environment has nothing deployed, which is where Scenario S1 starts. */
export function EmptySite({ env }: { env?: string }) {
  return (
    <main style={sheet}>
      <h1 style={{ margin: 0, fontSize: 20, color: '#46525e' }}>Nothing is online here yet</h1>
      <p style={{ color: '#6b7884', marginTop: 6, fontSize: 14 }}>
        This environment has no deployed version of the cafe website. The page appears here after a
        deployment puts it online.
      </p>
      <Stamp env={env} />
    </main>
  );
}
