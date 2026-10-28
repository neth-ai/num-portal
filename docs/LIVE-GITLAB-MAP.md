# Live GitLab map

The student hub defaults to **Live GitLab**. It reads project `neth-ai/num-portal` through the same-origin `/api/gitlab/live` endpoint. The browser polls every 20 seconds; the server caches successful snapshots for 15 seconds. The pipeline picker includes the 12 most recent pipelines. Commit history shows the default branch; the selected pipeline also shows its exact commit.

Jobs link to their actual GitLab logs. Missing stages are displayed as “not included”, and manual, skipped, failed and canceled states remain distinct. The 3D marker represents an observed stage; it does not simulate job completion. A successful deployment job is not an independent website health check. Deployment records are project-wide, not filtered to the selected pipeline. Method A human runs are not collected here.

The public project currently exposes pipelines, jobs and commits without authentication. The deployments endpoint requires authentication. To enable it, set `GITLAB_READ_TOKEN` to a GitLab project access token with `read_api` and sufficient project access in the ignored `.local-env/.env` file. Never commit or paste the token into chat. Recreate the local service:

```sh
docker compose --env-file .local-env/.env up -d --no-deps devops
```

For a non-Docker server, set the same variable in its server environment and restart. The token stays server-side and is never returned by the API. The integration performs GET requests only; it cannot push commits, retry jobs or deploy. API failures are shown explicitly; any retained snapshot is labelled stale. Job lists are capped at 100 with a truncation notice.

**Demo simulation** remains a separate view with illustrative automatic traffic. Its counters and events are not GitLab data or thesis measurements.

## Thesis replay with real commit messages

In **Demo simulation**, the default commit source is **Real GitLab commit**. Choose a recent pipeline to load its actual commit title, SHA and branch, then launch a pair. Auto traffic replays that selected commit across illustrative scenarios. Each packet retains its source when another pipeline is selected; completed journeys link to the original commit. Use **Refresh commits** to fetch a new snapshot. If GitLab is unavailable, real-source launches wait instead of substituting invented messages. **Custom demonstration** remains an explicit alternative.

The roadmap is `01 Prepare → 02 Method A / 03 Method B → 04 Evidence → 05 Comparison`. Method B explains validate/test, Docker builds, staging and production. The two methods are parallel study routes. Replaying a real commit does not assert that a human performed Method A, that a deployment occurred, or that a scenario was measured. Outcomes and transit times remain illustrative and are never exported as study measurements.

### Expanded Method B route

The 3D route and radar now traverse ten numbered Method B checkpoints, also shown in the step-by-step panel: code change, push, branch guard, test, build/registry, staging deployment, staging health, production approval, production deployment and production health. A commit pauses at each checkpoint; its message and SHA stay attached. Choose a replay in **Follow commit replay** to retain that journey while other packets move.

This is a release lifecycle across separate dev, staging and main pipelines, not a claim that one real pipeline runs every step or that merges preserve the SHA. The approval step advances automatically only in the simulation. Method B uses 40 illustrative seconds at 1× speed and reaches Evidence at 90% of its route, after all checkpoints. The failure outcome demonstrates a production-health failure and rollback before handing failure evidence to 04; it does not proceed to 05. This change does not configure evaluator previews, webhooks, CI jobs or any real deployment action.
