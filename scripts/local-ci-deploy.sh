#!/usr/bin/env sh
# Run the deployment script against this Mac's Docker Desktop daemon.
set -eu
: "${NUM_PORTAL_HOST_ROOT:?Local runner must set NUM_PORTAL_HOST_ROOT to the host repository path}"
[ -f scripts/deploy-local-compose.sh ] || { echo 'Run from the CI repository root'; exit 1; }
docker run --rm -i \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v "$NUM_PORTAL_HOST_ROOT:$NUM_PORTAL_HOST_ROOT" \
  -w "$NUM_PORTAL_HOST_ROOT" \
  -e NUM_PORTAL_HOST_ROOT \
  docker:27-cli sh -c 'apk add --no-cache bash coreutils >/dev/null && exec bash -s -- "$@"' sh "$@" \
  < scripts/deploy-local-compose.sh
