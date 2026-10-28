// PM2 settings for the manual copy of the cafe website (Method A).
// Start once with:  pm2 start ecosystem.config.cjs   then use: pm2 restart sme-app-manual
//
// Method B runs the same site as a Docker container; Method A runs it here, by hand, so that
// the two methods differ only in how a version is put online.
module.exports = {
  apps: [
    {
      name: 'sme-app-manual',
      cwd: __dirname,
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3001 -H 127.0.0.1',
      env: {
        NODE_ENV: 'production',
        // Printed at the bottom of the page, so a screenshot shows which copy it is.
        SITE_ENV: 'Method A - manual deployment',
        APP_VERSION: 'manual',
      },
      max_memory_restart: '512M',
    },
  ],
};
