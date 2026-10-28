// The five scenarios of the experiment, with the code preset and the feature text
// each one puts on the cafe website. Wording comes from the prototype.

export type ScenarioId = 'S1' | 'S2' | 'S3' | 'S4' | 'S5';

export const SCENARIOS: [ScenarioId, string][] = [
  ['S1', 'First deployment'],
  ['S2', 'Feature update'],
  ['S3', 'Faulty release'],
  ['S4', 'Environment mismatch'],
  ['S5', 'Configuration change'],
];

export const SCENARIO_NOTE: Record<ScenarioId, string> = {
  S1: 'Deploy to an empty environment.',
  S2: 'A small new section. Expected to pass.',
  S3: 'Contains a deliberate fault. The health check fails and the pipeline rolls back by itself.',
  S4: 'Needs a newer Node.js than the server has. The Docker image carries its own version, so it passes.',
  S5: 'Needs a new setting. The setting is stored as a protected variable.',
};

/** The base page.json of the cafe site, used as the left side of every diff. */
export const BASE_CODE = [
  '{',
  '  "title": "Sokha Cafe",',
  '  "sections": [',
  '    { "type": "menu", "items": ["Coffee", "Tea", "Cake"] }',
  '  ]',
  '}',
];

const withSection = (line: string) => [
  '{',
  '  "title": "Sokha Cafe",',
  '  "sections": [',
  '    { "type": "menu", "items": ["Coffee", "Tea", "Cake"] },',
  line,
  '  ]',
  '}',
];

export const PRESET: Record<ScenarioId, string[]> = {
  S1: BASE_CODE.slice(),
  S2: withSection('    { "type": "hours", "text": "Open 7am to 9pm every day" }'),
  // S3 is deliberately invalid JSON (no closing brace) so the health check fails.
  S3: withSection('    { "type": "offer", "text": "2 for 1 coffee on Fridays" '),
  S4: withSection('    { "type": "order", "button": "Order now", "node": ">=22" }'),
  S5: withSection('    { "type": "delivery", "fee": "$DELIVERY_FEE" }'),
};

export const COMMIT_MESSAGE: Record<ScenarioId, string> = {
  S1: 'First deployment of the cafe site',
  S2: 'Add opening hours section',
  S3: 'Add special offer (faulty release)',
  S4: 'Add online order button',
  S5: 'Add delivery fee setting',
};

/** What a visitor sees on the website once the change is live. */
export const FEATURE: Record<ScenarioId, [string, string]> = {
  S1: ['Site is online', 'The cafe website is live for the first time'],
  S2: ['Opening hours', 'Open 7am to 9pm every day'],
  S3: ['Special offer', '2 for 1 coffee on Fridays'],
  S4: ['Order online', 'Button: Order now'],
  S5: ['Delivery fee', '$1.50 within the city'],
};

/**
 * The eleven manual commands the Operations team types for one release (Method A).
 * Same list, same order as the "Normal release" table in docs/manual-deployment-sop.md: the
 * recorded step count has to be the procedure the researcher actually follows.
 * The cafe site has no database, so there is no migration step.
 */
export const SOP: [string, string][] = [
  ['Connect to the server', 'ssh researcher@server'],
  ['Go to the repository copy', 'cd /opt/numportal/manual/app'],
  ['Back up the current version', 'cp -r . ../backup-$(date +%Y%m%d%H%M)'],
  ['Fetch the release tags', 'git fetch --all --tags'],
  ['Check out the release', 'git checkout <release-tag>'],
  ['Go to the application', 'cd apps/sme-app'],
  ['Install packages', 'npm ci'],
  ['Update the settings', 'nano .env (scenario S5 only)'],
  ['Build the application', 'npm run build'],
  ['Restart the application', 'pm2 restart sme-app-manual'],
  ['Check the health address', 'curl -f :3001/api/health'],
];

/** The seven pipeline stages of Method B, with the duration the prototype shows. */
export const PIPELINE_STEPS: [string, number][] = [
  ['Push to GitLab', 2],
  ['Guard', 6],
  ['Test', 21],
  ['Build', 48],
  ['Deploy staging', 24],
  ['Deploy production', 12],
  ['Health check', 5],
];

export const isScenario = (v: unknown): v is ScenarioId =>
  typeof v === 'string' && ['S1', 'S2', 'S3', 'S4', 'S5'].includes(v);
