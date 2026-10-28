#!/usr/bin/env bash
# deploy.sh <environment> <image:tag> <host-port>
# Pulls an image, applies database migrations, replaces the running container,
# checks health and rolls back automatically if the new version is not healthy.
set -euo pipefail

ENV_NAME="$1"; IMAGE="$2"; PORT="$3"
NAME="numportal-$ENV_NAME"
BASE=/opt/numportal
ENV_FILE="$BASE/env/$ENV_NAME.env"
STATE="$BASE/state"; METRICS="$BASE/metrics/deployments.csv"
mkdir -p "$STATE" "$(dirname "$METRICS")"
[ -f "$ENV_FILE" ] || ENV_FILE="$BASE/env/preview.env"

START=$(date +%s.%N)
CURRENT=$(cat "$STATE/$ENV_NAME.current" 2>/dev/null || true)   # last image that passed its health check

docker pull "$IMAGE" 2>/dev/null || true   # preview images are built locally

# Database migrations (portal only – the template site has no migrations folder)
if docker run --rm --entrypoint sh "$IMAGE" -c 'test -f /app/scripts/migrate.mjs' 2>/dev/null; then
  docker run --rm --env-file "$ENV_FILE" --network host --entrypoint node "$IMAGE" scripts/migrate.mjs
fi

docker rm -f "$NAME" >/dev/null 2>&1 || true
docker run -d --name "$NAME" --restart unless-stopped \
  --env-file "$ENV_FILE" --memory 512m --cpus 1 \
  -p "127.0.0.1:$PORT:3000" "$IMAGE" >/dev/null

OK=0
for _ in $(seq 1 30); do
  if curl -fs "http://127.0.0.1:$PORT/api/health" >/dev/null; then OK=1; break; fi
  sleep 2
done

END=$(date +%s.%N)
SECONDS_TAKEN=$(awk "BEGIN {printf \"%.1f\", $END - $START}")

if [ "$OK" -ne 1 ]; then
  echo "Health check failed after deployment of $IMAGE"
  echo "$(date -Is),$ENV_NAME,$IMAGE,failed,$SECONDS_TAKEN" >> "$METRICS"
  if [ -n "$CURRENT" ]; then bash "$(dirname "$0")/rollback.sh" "$ENV_NAME" "$PORT"; fi
  exit 1
fi

if [ -n "$CURRENT" ] && [ "$CURRENT" != "$IMAGE" ]; then echo "$CURRENT" > "$STATE/$ENV_NAME.previous"; fi
echo "$IMAGE" > "$STATE/$ENV_NAME.current"
echo "$(date -Is),$ENV_NAME,$IMAGE,success,$SECONDS_TAKEN" >> "$METRICS"
echo "Deployed $IMAGE to $ENV_NAME in ${SECONDS_TAKEN}s"
