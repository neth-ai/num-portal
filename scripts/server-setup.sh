#!/usr/bin/env bash
# server-setup.sh – prepares one Ubuntu 22.04/24.04 server for the NUM Portal study.
# Run once as root:   sudo DOMAIN=example.com bash scripts/server-setup.sh
# It is safe to run again (existing settings are kept).
#
# What it does:
#  1. installs Docker, Git, curl, Node.js 20 and PM2 (PM2 is used by Method A)
#  2. starts PostgreSQL 16 in Docker, reachable from the host and from containers at 172.17.0.1:5432
#  3. creates one database per environment: live, staging, production, manual
#  4. creates /opt/numportal/{env,state,metrics,manual} and the settings files
#  5. installs GitLab Runner and cloudflared (registration/login are done by hand, see docs/)
set -euo pipefail

DOMAIN="${DOMAIN:-example.com}"   # your own domain on Cloudflare
BASE=/opt/numportal
DB_PASSWORD_FILE="$BASE/env/.db_password"

[ "$(id -u)" -eq 0 ] || { echo "Please run as root (sudo)"; exit 1; }
echo "==> Domain: $DOMAIN"

echo "==> 1. Packages"
apt-get update -y
apt-get install -y ca-certificates curl git gnupg openssl
if ! command -v docker >/dev/null; then curl -fsSL https://get.docker.com | sh; fi
systemctl enable --now docker
if ! command -v node >/dev/null || ! node -v | grep -q '^v20'; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
command -v pm2 >/dev/null || npm install -g pm2

echo "==> 2. Folders"
mkdir -p "$BASE/env" "$BASE/state" "$BASE/metrics" "$BASE/manual"
chmod 750 "$BASE/env"

echo "==> 3. PostgreSQL 16 (Docker, listening on the Docker bridge 172.17.0.1)"
[ -f "$DB_PASSWORD_FILE" ] || openssl rand -hex 16 > "$DB_PASSWORD_FILE"
DB_PASSWORD=$(cat "$DB_PASSWORD_FILE")
if ! docker ps -a --format '{{.Names}}' | grep -qx numportal-db; then
  docker run -d --name numportal-db --restart unless-stopped \
    -e POSTGRES_USER=numportal -e POSTGRES_PASSWORD="$DB_PASSWORD" -e POSTGRES_DB=numportal_live \
    -v numportal-pgdata:/var/lib/postgresql/data \
    -p 172.17.0.1:5432:5432 postgres:16-alpine
  echo "    waiting for PostgreSQL..."; sleep 8
fi
for db in numportal_staging numportal_production numportal_manual; do
  docker exec numportal-db psql -U numportal -d numportal_live -tc "SELECT 1 FROM pg_database WHERE datname='$db'" | grep -q 1 \
    || docker exec numportal-db psql -U numportal -d numportal_live -c "CREATE DATABASE $db"
done

echo "==> 4. Settings files in $BASE/env"
write_env() { # name database extra-lines
  local f="$BASE/env/$1.env"
  if [ -f "$f" ]; then echo "    keeping $f"; return; fi
  {
    echo "DATABASE_URL=postgresql://numportal:$DB_PASSWORD@172.17.0.1:5432/$2"
    echo "SESSION_SECRET=$(openssl rand -hex 32)"
    echo "GITLAB_DEFAULT_BRANCH=main"
    echo "PREVIEW_DOMAIN=$DOMAIN"
    printf '%b' "${3:-}"
  } > "$f"
  chmod 600 "$f"; echo "    created $f"
}
write_env live numportal_live "# --- fill these in for the live portal (see docs/SETUP-GITLAB-CICD.md) ---\nGITLAB_URL=https://gitlab.com\nGITLAB_PROJECT_ID=\nGITLAB_TOKEN=\nGITLAB_WEBHOOK_SECRET=$(openssl rand -hex 16)\nGITLAB_PROJECT_URL=\nANTHROPIC_API_KEY=\nANTHROPIC_MODEL=claude-sonnet-4-5\n"
write_env staging numportal_staging
write_env production numportal_production
write_env manual numportal_manual "PORT=3001\n"
[ -f "$BASE/env/preview.env" ] || { echo "APP_VERSION=preview" > "$BASE/env/preview.env"; chmod 600 "$BASE/env/preview.env"; }
touch "$BASE/metrics/deployments.csv" "$BASE/metrics/manual-runs.csv"

echo "==> 5. GitLab Runner"
if ! command -v gitlab-runner >/dev/null; then
  curl -L "https://packages.gitlab.com/install/repositories/runner/gitlab-runner/script.deb.sh" | bash
  apt-get install -y gitlab-runner
fi
usermod -aG docker gitlab-runner
chown -R gitlab-runner:gitlab-runner "$BASE/env" "$BASE/state" "$BASE/metrics"
chmod 664 "$BASE/metrics/"*.csv
# the researcher account (Method A) also needs to write the metrics files
if [ -n "${SUDO_USER:-}" ]; then
  usermod -aG gitlab-runner "$SUDO_USER"
  chown -R "$SUDO_USER" "$BASE/manual" "$BASE/env/manual.env"
fi

echo "==> 6. cloudflared"
if ! command -v cloudflared >/dev/null; then
  mkdir -p --mode=0755 /usr/share/keyrings
  curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null
  echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared any main" > /etc/apt/sources.list.d/cloudflared.list
  apt-get update -y && apt-get install -y cloudflared
fi

cat <<EOF

Server is ready. Next steps:
  1. Register the runner:   sudo gitlab-runner register   (executor: shell, tag: num-portal-runner)
                            -> docs/SETUP-GITLAB-CICD.md
  2. Create the tunnel:     cloudflared tunnel login && cloudflared tunnel create numportal
                            -> docs/SETUP-CLOUDFLARE-TUNNEL.md
  3. Fill in $BASE/env/live.env (GitLab token, project id, Claude API key)
  4. Run the first pipeline, press "deploy_live_portal", then create the accounts:
       docker exec -it numportal-live node scripts/seed.mjs
EOF
