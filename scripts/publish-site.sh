#!/usr/bin/env bash
# publish-site.sh <manual|devops|staging> [options]
#
# Puts the current cafe page online in one environment. This is the local stand-in for the
# deployment step of the experiment:
#   Method A  a person runs it by hand, as one step of docs/manual-deployment-sop.md
#   Method B  the pipeline runs it, staging first and production after it
#
# Options
#   --source <file>   what to publish (default apps/sme-app/src/content/page.json)
#   --auto-rollback   put the previous version back when the health check fails. This is what
#                     Method B does by itself; Method A has no such step, so leave it out there.
#   --rollback        put the previous version back now, without publishing (manual recovery)
#   --no-restart      only replace the file, do not restart the container
#
# Every run appends one line to .local-env/sites/deployments.csv:
#   date,environment,action,result,seconds
set -euo pipefail

ENV_NAME="${1:-}"; shift || true
case "$ENV_NAME" in
  manual)  PORT=3001 ;;
  devops)  PORT=3002 ;;
  staging) PORT=3003 ;;
  *) echo "usage: publish-site.sh <manual|devops|staging> [--source FILE] [--auto-rollback] [--rollback] [--no-restart]" >&2; exit 2 ;;
esac

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SOURCE="$ROOT/apps/sme-app/src/content/page.json"
AUTO_ROLLBACK=0; ROLLBACK_ONLY=0; RESTART=1

while [ $# -gt 0 ]; do
  case "$1" in
    --source) SOURCE="$2"; shift 2 ;;
    --auto-rollback) AUTO_ROLLBACK=1; shift ;;
    --rollback) ROLLBACK_ONLY=1; shift ;;
    --no-restart) RESTART=0; shift ;;
    *) echo "unknown option: $1" >&2; exit 2 ;;
  esac
done

SITE="$ROOT/.local-env/sites/$ENV_NAME"
LIVE="$SITE/page.json"
PREVIOUS="$SITE/page.previous.json"
METRICS="${DEPLOYMENT_METRICS_CSV:-$ROOT/.local-env/sites/deployments.csv}"
mkdir -p "$SITE" "$(dirname "$METRICS")"

# The tunnel service needs its token at file-parse time, so pass the env file when it exists.
compose() {
  local args=(-f "$ROOT/docker-compose.yml")
  if [ -f "$ROOT/.local-env/.env" ]; then args+=(--env-file "$ROOT/.local-env/.env"); fi
  docker compose "${args[@]}" "$@"
}

# The container reads the file on every request; the restart is here because a deployment
# restarts the application, and because new settings are only read at start-up.
restart_site() {
  [ "$RESTART" -eq 1 ] || return 0
  compose restart "$ENV_NAME" >/dev/null 2>&1 || echo "note: could not restart the $ENV_NAME container, the file was replaced anyway"
}

# Waits for the site to report itself online. A site that answers "bad-content" or
# "missing-settings" has already made its decision, so there is nothing left to wait for.
healthy() {
  local i answer
  for i in $(seq 1 30); do
    if curl -fsS "http://127.0.0.1:$PORT/api/health" >/dev/null 2>&1; then return 0; fi
    answer=$(curl -s "http://127.0.0.1:$PORT/api/health" || true)
    case "$answer" in
      *bad-content*|*missing-settings*) return 1 ;;
    esac
    sleep 1
  done
  return 1
}

record() {   # record <action> <result> <seconds>
  # %z rather than date -Is: the researcher's Mac has BSD date, the study server has GNU date.
  echo "$(date +%Y-%m-%dT%H:%M:%S%z),$ENV_NAME,$1,$2,$3" >> "$METRICS"
}

elapsed() { awk "BEGIN {printf \"%.1f\", $(node -p 'Date.now() / 1000') - $START}"; }

START=$(node -p 'Date.now() / 1000')

if [ "$ROLLBACK_ONLY" -eq 1 ]; then
  [ -f "$PREVIOUS" ] || { echo "No earlier version was recorded for $ENV_NAME"; exit 1; }
  cp "$PREVIOUS" "$LIVE"
  restart_site
  if healthy; then
    SECS=$(elapsed); record rollback success "$SECS"
    echo "Rolled $ENV_NAME back to the previous version in ${SECS}s"
    exit 0
  fi
  SECS=$(elapsed); record rollback failed "$SECS"
  echo "The previous version did not pass the health check either (http://127.0.0.1:$PORT/api/health)"
  exit 1
fi

[ -f "$SOURCE" ] || { echo "Nothing to publish: $SOURCE does not exist" >&2; exit 1; }

if [ -f "$LIVE" ]; then cp "$LIVE" "$PREVIOUS"; fi    # keep the version this one replaces
cp "$SOURCE" "$LIVE"
restart_site

if healthy; then
  SECS=$(elapsed); record deploy success "$SECS"
  echo "Published to $ENV_NAME in ${SECS}s - http://${ENV_NAME}:${PORT}"
  exit 0
fi

# The health check failed: the content is broken, or a setting the new version needs is missing.
DETAIL=$(curl -s "http://127.0.0.1:$PORT/api/health" || true)
echo "Health check failed for $ENV_NAME: ${DETAIL:-no answer}"

if [ "$AUTO_ROLLBACK" -eq 1 ] && [ -f "$PREVIOUS" ]; then
  cp "$PREVIOUS" "$LIVE"
  restart_site
  SECS=$(elapsed)
  if healthy; then
    record deploy rolled_back "$SECS"
    echo "Rolled $ENV_NAME back to the previous version by itself after ${SECS}s"
  else
    record deploy failed "$SECS"
    echo "The rollback did not come up either; $ENV_NAME is down"
  fi
  exit 1
fi

SECS=$(elapsed); record deploy failed "$SECS"
echo "$ENV_NAME is still on the broken version. Run: scripts/publish-site.sh $ENV_NAME --rollback"
exit 1
