#!/usr/bin/env bash
# rollback.sh <environment> <host-port>
# Returns the environment to a working version.
#  - If the running version is broken (automatic rollback after a failed deployment),
#    the last image that passed its health check ("current") is started again.
#  - If the running version is healthy (a person asked to go back), the version
#    before it ("previous") is started.
set -euo pipefail

ENV_NAME="$1"; PORT="$2"
NAME="numportal-$ENV_NAME"
BASE=/opt/numportal; STATE="$BASE/state"; METRICS="$BASE/metrics/deployments.csv"
ENV_FILE="$BASE/env/$ENV_NAME.env"
[ -f "$ENV_FILE" ] || ENV_FILE="$BASE/env/preview.env"

CURRENT=$(cat "$STATE/$ENV_NAME.current" 2>/dev/null || true)
PREVIOUS=$(cat "$STATE/$ENV_NAME.previous" 2>/dev/null || true)
if curl -fs "http://127.0.0.1:$PORT/api/health" >/dev/null 2>&1; then
  TARGET="$PREVIOUS"          # healthy now: go one version back
else
  TARGET="$CURRENT"           # broken now: restore the last good version
fi
[ -n "$TARGET" ] || { echo "No earlier image recorded"; exit 1; }

START=$(date +%s.%N)
docker rm -f "$NAME" >/dev/null 2>&1 || true
docker run -d --name "$NAME" --restart unless-stopped \
  --env-file "$ENV_FILE" --memory 512m --cpus 1 \
  -p "127.0.0.1:$PORT:3000" "$TARGET" >/dev/null

OK=0
for _ in $(seq 1 30); do
  if curl -fs "http://127.0.0.1:$PORT/api/health" >/dev/null; then OK=1; break; fi
  sleep 2
done
END=$(date +%s.%N)
SECONDS_TAKEN=$(awk "BEGIN {printf \"%.1f\", $END - $START}")

if [ "$OK" -ne 1 ]; then
  echo "$(date -Is),$ENV_NAME,$TARGET,failed,$SECONDS_TAKEN" >> "$METRICS"
  echo "Rollback to $TARGET did not pass the health check"; exit 1
fi
if [ "$TARGET" != "$CURRENT" ]; then
  echo "$CURRENT" > "$STATE/$ENV_NAME.previous.undone"
  echo "$TARGET" > "$STATE/$ENV_NAME.current"
fi
echo "$(date -Is),$ENV_NAME,$TARGET,rollback,$SECONDS_TAKEN" >> "$METRICS"
echo "Rolled back $ENV_NAME to $TARGET in ${SECONDS_TAKEN}s"
