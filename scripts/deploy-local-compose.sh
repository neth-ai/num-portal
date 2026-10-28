#!/usr/bin/env bash
# Invoked inside a Linux helper by local-ci-deploy.sh; keeps existing Compose services.
# deploy|rollback staging|devops|portal [image] [version]
set -euo pipefail
ACTION="${1:?action required}"; SERVICE="${2:?service required}"
IMAGE="${3:-}"; VERSION="${4:-dev}"
ROOT="${NUM_PORTAL_HOST_ROOT:?host root required}"
case "$SERVICE" in staging|devops|portal) ;; *) echo 'Invalid Compose service'; exit 2;; esac
case "$ACTION" in deploy|rollback) ;; *) echo 'Invalid action'; exit 2;; esac
STATE="$ROOT/.local-env/ci-deploy/$SERVICE"
mkdir -p "$STATE"
OVERRIDE=$(mktemp "$STATE/compose.XXXXXX.yml")
BACKUP=$(mktemp "$STATE/content.XXXXXX")
trap 'rm -f "$OVERRIDE" "$BACKUP"' EXIT
METRICS="$ROOT/.local-env/sites/deployments.csv"
START=$(date +%s)
CONTENT="$ROOT/.local-env/sites/$SERVICE/page.json"
HAD_CONTENT=0
if [ "$SERVICE" != portal ] && [ -f "$CONTENT" ]; then
  HAD_CONTENT=1; cp "$CONTENT" "$BACKUP"
fi
compose() {
  docker compose --project-name num-portal --project-directory "$ROOT" \
    --env-file "$ROOT/.local-env/.env" -f "$ROOT/docker-compose.yml" -f "$OVERRIDE" "$@"
}
container() {
  docker ps -aq --filter label=com.docker.compose.project=num-portal \
    --filter "label=com.docker.compose.service=$SERVICE" --filter label=com.docker.compose.oneoff=False
}
ID=$(container)
[ -n "$ID" ] || { echo "Existing Compose service $SERVICE was not found"; exit 1; }
OLD_IMAGE=$(docker inspect --format '{{.Config.Image}}' "$ID")
OLD_VERSION=$(docker inspect --format '{{range .Config.Env}}{{println .}}{{end}}' "$ID" | sed -n 's/^APP_VERSION=//p')
if [ "$ACTION" = rollback ]; then
  [ -s "$STATE/previous-image" ] || { echo 'No previous release recorded'; exit 1; }
  IMAGE=$(cat "$STATE/previous-image")
  VERSION=$(cat "$STATE/previous-version")
fi
[ -n "$IMAGE" ] || { echo 'Image required'; exit 2; }
# Authentication is performed by the CI job. Images are already present in Docker Desktop.
docker image inspect "$IMAGE" >/dev/null
apply() {
  local image="$1" version="$2"
  # Values come from CI registry paths and commit SHAs; JSON quoting is valid YAML.
  printf 'services:\n  %s:\n    image: "%s"\n    environment:\n      APP_VERSION: "%s"\n' "$SERVICE" "$image" "$version" > "$OVERRIDE"
  # Portal deployments require PostgreSQL even when the app is replaced with --no-deps.
  # Reuse the existing named volume; never reset experiment data.
  if [ "$SERVICE" = portal ]; then
    compose up -d --wait db || return $?
  fi
  compose up -d --no-deps --no-build --pull never "$SERVICE"
}
healthy() {
  local id answer
  id=$(container)
  for _ in $(seq 1 30); do
    if answer=$(docker exec "$id" node -e 'fetch("http://127.0.0.1:3000/api/health").then(async r => { console.log(await r.text()); process.exit(r.ok ? 0 : 1); }).catch(() => process.exit(2));' 2>/dev/null); then return 0; fi
    case "$answer" in *bad-content*|*missing-settings*) return 1;; esac
    sleep 2
  done
  return 1
}
restore_content() {
  [ "$SERVICE" != portal ] || return 0
  if [ "$HAD_CONTENT" -eq 1 ]; then cp "$BACKUP" "$CONTENT"; else rm -f "$CONTENT"; fi
}
record() {
  mkdir -p "$(dirname "$METRICS")"
  printf '%s,%s,%s,%s,%s\n' "$(date -Iseconds)" "$SERVICE" "$ACTION" "$1" "$(( $(date +%s) - START ))" >> "$METRICS"
}
if [ "$SERVICE" != portal ]; then
  mkdir -p "$(dirname "$CONTENT")"
  CANDIDATE=$(mktemp "$STATE/candidate.XXXXXX")
  if [ "$ACTION" = rollback ] && [ -f "$STATE/previous-content" ]; then
    cp "$STATE/previous-content" "$CANDIDATE"
  else
    if ! docker run --rm --entrypoint cat "$IMAGE" /app/src/content/page.json > "$CANDIDATE"; then
      rm -f "$CANDIDATE"; exit 1
    fi
  fi
  mv "$CANDIDATE" "$CONTENT"
  chmod 644 "$CONTENT"
fi
if apply "$IMAGE" "$VERSION" && healthy; then
  printf '%s\n' "$OLD_IMAGE" > "$STATE/previous-image"
  printf '%s\n' "$OLD_VERSION" > "$STATE/previous-version"
  if [ "$HAD_CONTENT" -eq 1 ]; then cp "$BACKUP" "$STATE/previous-content"; else rm -f "$STATE/previous-content"; fi
  printf '%s\n' "$IMAGE" > "$STATE/current-image"
  record success
  echo "$ACTION succeeded: $SERVICE -> $IMAGE"
else
  echo "Release failed; restoring $SERVICE"
  restore_content
  if apply "$OLD_IMAGE" "$OLD_VERSION" && healthy; then
    record rolled_back
    echo 'Previous release restored and healthy'
  else
    record failed
    echo 'Previous configuration restored; its health check also failed'
  fi
  exit 1
fi
