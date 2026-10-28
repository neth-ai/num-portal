// Central place for settings read from environment variables.
export const config = {
  sessionSecret: process.env.SESSION_SECRET || 'dev-only-secret-change-me',
  appVersion: process.env.APP_VERSION || 'dev',

  // GitLab (Method B). Without a token the portal still runs; the pipeline pages
  // then show only what the webhook has already delivered.
  gitlabUrl: (process.env.GITLAB_URL || 'https://gitlab.com').replace(/\/$/, ''),
  gitlabProjectId: process.env.GITLAB_PROJECT_ID || '',
  gitlabToken: process.env.GITLAB_TOKEN || '',
  gitlabDefaultBranch: process.env.GITLAB_DEFAULT_BRANCH || 'main',
  gitlabWebhookSecret: process.env.GITLAB_WEBHOOK_SECRET || '',
  gitlabProjectUrl: (process.env.GITLAB_PROJECT_URL || '').replace(/\/$/, ''),

  // Where the three deployed copies of the cafe site answer. The portal calls these itself,
  // so in Docker they are the addresses inside the compose network.
  methodAUrl: (process.env.METHOD_A_URL || 'http://127.0.0.1:3001').replace(/\/$/, ''),
  methodBUrl: (process.env.METHOD_B_URL || 'http://127.0.0.1:3002').replace(/\/$/, ''),
  stagingUrl: (process.env.STAGING_URL || 'http://127.0.0.1:3003').replace(/\/$/, ''),

  // The same three sites as the browser reaches them: shown on the Result page and opened in
  // a new tab. On the study server these are the public https addresses behind the tunnel.
  methodAPublicUrl: (process.env.METHOD_A_PUBLIC_URL || 'http://manual:3001').replace(/\/$/, ''),
  methodBPublicUrl: (process.env.METHOD_B_PUBLIC_URL || 'http://devops:3002').replace(/\/$/, ''),
  stagingPublicUrl: (process.env.STAGING_PUBLIC_URL || 'http://staging:3003').replace(/\/$/, ''),
  previewDomain: process.env.PREVIEW_DOMAIN || 'example.com',

  // The file both methods deploy.
  smeContentPath: process.env.SME_CONTENT_PATH || 'apps/sme-app/src/content/page.json',

  // The prototype's "let Ops continue" button is a demonstration aid only.
  demoMode: process.env.NEXT_PUBLIC_DEMO === '1',
};

export const isGitlabConfigured = () => Boolean(config.gitlabToken && config.gitlabProjectId);
