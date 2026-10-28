#!/usr/bin/env bash
# Tests scripts/deploy.sh and scripts/rollback.sh with a fake docker command.
# Usage (Linux, needs write access to /opt/numportal):  sudo bash tests/deploy-scripts/run.sh
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"; ROOT="$HERE/../.."
BIN=$(mktemp -d); cp "$HERE/fake-docker" "$BIN/docker"; export PATH="$BIN:$PATH"
rm -rf /opt/numportal/state /opt/numportal/metrics; mkdir -p /opt/numportal/env; touch /opt/numportal/env/preview.env
export FAKE_DOCKER_STATE=$(mktemp -d)
pass=0; fail=0
check() { if eval "$2"; then echo "PASS $1"; pass=$((pass+1)); else echo "FAIL $1"; fail=$((fail+1)); fi; }
P=3999
bash "$ROOT/scripts/deploy.sh" testenv reg/portal:v1 $P >/dev/null; check "first deployment succeeds" '[ "$(cat /opt/numportal/state/testenv.current)" = reg/portal:v1 ]'
bash "$ROOT/scripts/deploy.sh" testenv reg/portal:v2 $P >/dev/null; check "update succeeds and remembers previous" '[ "$(cat /opt/numportal/state/testenv.previous)" = reg/portal:v1 ]'
bash "$ROOT/scripts/deploy.sh" testenv reg/portal:v3-broken $P >/dev/null; rc=$?
check "faulty release returns an error" '[ $rc -ne 0 ]'
check "automatic rollback restored v2" 'curl -s 127.0.0.1:$P/ | grep -q "reg/portal:v2"'
check "log has failed + rollback rows" 'grep -q ",failed," /opt/numportal/metrics/deployments.csv && grep -q ",rollback," /opt/numportal/metrics/deployments.csv'
bash "$ROOT/scripts/rollback.sh" testenv $P >/dev/null; check "manual rollback goes one version back (v1)" 'curl -s 127.0.0.1:$P/ | grep -q "reg/portal:v1"'
docker rm -f numportal-testenv >/dev/null
cat /opt/numportal/metrics/deployments.csv
echo "$pass passed, $fail failed"; [ "$fail" -eq 0 ]
