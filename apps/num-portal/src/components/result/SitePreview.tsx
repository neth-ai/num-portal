// The cafe website as each method published it.
// LiveSite shows the deployed site itself; SitePreview draws it, for when the site is not running.
// The highlighted box is the new feature; if it is missing, that method is still on the old version.
import { FEATURE, type ScenarioId } from '@/lib/scenarios';

export function BrowserFrame({ url, children }: { url: string; children: React.ReactNode }) {
  return (
    <div className="browser">
      <div className="bar2">{url}</div>
      {children}
    </div>
  );
}

/** The deployed site itself, loaded from the address the method published it at. */
export function LiveSite({ url, name }: { url: string; name: string }) {
  return <iframe src={url} title={name} loading="lazy" />;
}

export function SitePreview({ scenario, featureLive, empty }: { scenario: ScenarioId; featureLive: boolean; empty?: boolean }) {
  if (empty) return <div className="cv"><p>Nothing is online yet.</p></div>;
  const [name, detail] = FEATURE[scenario];
  return (
    <div className="cv">
      <h3>Sokha Cafe</h3>
      <p>Fresh coffee in Phnom Penh</p>
      <div><span>Coffee</span><span>Tea</span><span>Cake</span></div>
      {featureLive ? (
        <div style={{ border: '2px solid #0b6b64', background: '#e4efee', borderRadius: 8, padding: '8px 12px', marginTop: 6 }}>
          <b>{name}</b><br />{detail}
        </div>
      ) : null}
    </div>
  );
}
