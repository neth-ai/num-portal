#!/bin/sh
# Applies the migrations, makes sure the two accounts exist, then starts the portal.
set -e
node scripts/migrate.mjs
node scripts/seed.mjs ${SEED_ARGS:-}
exec node server.js
