# GitLab CI/CD on this Mac

## Branch flow

`dev/* -> staging -> main`

Develop on `dev/neth` or a short-lived `dev/neth/<change>` branch. Open a merge request to staging; merge reviewed changes after passing checks. Staging builds both Docker images and updates the existing local Compose staging service automatically. After verifying it, promote staging to main through a merge request. Main builds release images and provides manual production and portal deployment jobs.

The branch policy job rejects development merge requests targeting main directly. Development pushes and merge requests run portal lint, unit tests and production build, plus cafe lint and production build. Duplicate development push pipelines are suppressed when an MR is open. Keep staging after release; use merge commits for promotion.

## Local runner

Docker Desktop must be running, and the Mac must remain awake. The runner is a Docker executor container named `num-portal-gitlab-runner`:

```bash
bash scripts/local-runner.sh start
bash scripts/local-runner.sh status
bash scripts/local-runner.sh verify
```

Create the project runner in GitLab and name it `num-portal-local`. Set its tag to `num-portal-local`, turn off **Paused**, and leave **Protected** off so development and MR jobs can run. **Run untagged jobs** is optional for the current pipeline because every job has the local tag. Save its authentication token to the ignored `.local-env/runner-token` file, then run `bash scripts/local-runner.sh register` once.

The runner configuration mounts Docker Desktop's socket into jobs and sets `NUM_PORTAL_HOST_ROOT` to the absolute host repository path. One job runs at a time. Image builds and deployments use this same Docker daemon. Docker-in-Docker is not used. All jobs use the runner tag `num-portal-local`. The old `num-portal-runner` tag is no longer used.

The runner image is pinned in `infra/docker-compose.runner.yml`. Authentication and configuration remain in `.local-env/gitlab-runner/`; do not commit that directory. Runner tags, the untagged-job setting and protection flags are GitLab server settings, not local configuration options.

## Existing Compose services

Start the local application stack first:

```bash
docker compose --env-file .local-env/.env up -d --build
```

The CI deployment wrapper `scripts/local-ci-deploy.sh` starts a Linux Docker helper with the host repository mounted at its original absolute path. It executes `scripts/deploy-local-compose.sh` from the CI checkout. That script updates the existing `num-portal` Compose project:

| CI job | Compose service | Host port |
|---|---|---|
| `deploy_staging` | `staging` | 3003 |
| `deploy_production` | `devops` | 3002 |
| `deploy_live_portal` | `portal` | 3000 |

The helper preserves existing network names, published ports, database settings and Cloudflare routing. It supplies the registry image and commit version through a temporary Compose override. For cafe releases it copies the new image's bundled page content into the environment's existing host content directory before replacing the service.

Health checks run inside the replaced container. A failed update restores the previous image and content and checks its health. The job still fails after a successful automatic rollback. `rollback_production` restores the recorded previous production image and content manually. Deployment and rollback jobs share one resource group per environment.

State is stored in `.local-env/ci-deploy/<service>/`; metrics append to `.local-env/sites/deployments.csv`. The manual website is not changed by CI. Keep the local repository and its `.local-env` directory available at the configured host path.

## GitLab settings and credentials

Enable the project's Container Registry. GitLab supplies registry credentials automatically through `CI_REGISTRY`, `CI_REGISTRY_USER`, `CI_REGISTRY_PASSWORD` and `CI_REGISTRY_IMAGE`.

Protect staging and main, disable direct pushes, allow Maintainers to merge, enable **Pipelines must succeed**, and require resolved discussions. Keep main as default branch. Before merging CI changes, review them: jobs on this private local runner have Docker Desktop access.

The active local workflow uses the existing Compose environment files. It does not install `SITE_ENV_STAGING`, `SITE_ENV_PRODUCTION` or `PORTAL_ENV_LIVE` into `/opt/numportal`; those belong to the separate Linux study-server workflow. `.local-env/.env` must contain dotenv settings only, such as `CLOUDFLARE_TOKEN`; shell registration commands do not belong there.

Configure `/api/webhooks/gitlab` on the public portal URL with the matching `GITLAB_WEBHOOK_SECRET` and push, pipeline and job events. Portal API settings are configured separately from runner authentication.

## Testing and troubleshooting

```bash
NUM_PORTAL_HOST_ROOT="$PWD" sh scripts/local-ci-deploy.sh deploy staging sme-app:ci-check local-test
```

This requires a locally built `sme-app:ci-check` image and updates staging. Inspect `http://localhost:3003/api/health` afterwards.

**Pending** means a job is waiting for an eligible runner: check online status, the `num-portal-local` tag, protection and pause settings. **Created** means it is waiting for earlier jobs. After changing pipeline YAML, use a new pipeline; retrying an old job uses that pipeline's original configuration.

Local images are ARM64 on this Apple Silicon Mac. Main builds images for its own commit; the workflow does not promote the exact staging image digest. Production approval remains manual.

For a future Linux study server, the original `scripts/deploy.sh`, `scripts/rollback.sh` and `scripts/server-setup.sh` remain available, but require a separate server runner and pipeline configuration.
