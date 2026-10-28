#!/usr/bin/env bash
# Usage: bash scripts/local-runner.sh start|register|verify|status|stop
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CONFIG_DIR="$ROOT/.local-env/gitlab-runner"
TOKEN_FILE="$ROOT/.local-env/runner-token"
COMPOSE_FILE="$ROOT/infra/docker-compose.runner.yml"
NAME=num-portal-gitlab-runner
umask 077
mkdir -p "$CONFIG_DIR"
if [ ! -f "$CONFIG_DIR/config.toml" ]; then
  printf 'concurrent = 1\ncheck_interval = 3\nshutdown_timeout = 30\n' > "$CONFIG_DIR/config.toml"
fi
case "${1:-status}" in
  start)
    docker compose -f "$COMPOSE_FILE" up -d
    ;;
  register)
    [ -s "$TOKEN_FILE" ] || { echo "Save the GitLab runner authentication token to $TOKEN_FILE first."; exit 1; }
    if grep -q '^\[\[runners\]\]' "$CONFIG_DIR/config.toml"; then
      echo 'A runner is already registered. Use verify or status.'
      exit 1
    fi
    chmod 600 "$TOKEN_FILE"
    CI_SERVER_TOKEN="$(tr -d '\r\n' < "$TOKEN_FILE")"
    case "$CI_SERVER_TOKEN" in glrt-*) ;; *) echo 'Expected a glrt- runner authentication token.'; exit 1 ;; esac
    export CI_SERVER_TOKEN
    # CI_SERVER_TOKEN is read by the register command; no secret is passed in argv.
    docker compose -f "$COMPOSE_FILE" run --rm -T -e CI_SERVER_TOKEN runner register \
      --non-interactive --url https://gitlab.com \
      --name num-portal-local --executor docker --docker-image node:20-alpine \
      --docker-volumes /var/run/docker.sock:/var/run/docker.sock --docker-volumes /cache \
      --env "NUM_PORTAL_HOST_ROOT=$ROOT" --limit 1 --request-concurrency 2
    unset CI_SERVER_TOKEN
    docker compose -f "$COMPOSE_FILE" up -d
    docker exec "$NAME" gitlab-runner verify
    ;;
  verify)
    grep -q '^\[\[runners\]\]' "$CONFIG_DIR/config.toml" || { echo 'Not registered with GitLab yet.'; exit 1; }
    docker exec "$NAME" gitlab-runner verify
    ;;
  status)
    docker compose -f "$COMPOSE_FILE" ps
    if grep -q '^\[\[runners\]\]' "$CONFIG_DIR/config.toml"; then
      echo 'Local runner configuration is registered. Use verify to check GitLab connectivity.'
    else
      echo 'Runner installed locally; GitLab authentication token is still required to register it.'
    fi
    ;;
  stop)
    docker compose -f "$COMPOSE_FILE" stop
    ;;
  *) echo 'Usage: bash scripts/local-runner.sh start|register|verify|status|stop'; exit 1 ;;
esac
