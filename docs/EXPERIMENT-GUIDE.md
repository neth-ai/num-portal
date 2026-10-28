# Running the experiment and collecting real data

This guide follows Chapter III (Methodology). Each of the five scenarios is run **10 times with each method**
(5 × 10 × 2 = 100 deployments). The order of the methods alternates **A B B A** to spread learning effects:
runs 1, 4, 5, 8, 9 start with Method A; runs 2, 3, 6, 7, 10 start with Method B.

| | Method A – manual | Method B – DevOps |
|---|---|---|
| What is deployed | `apps/sme-app`, the cafe website | `apps/sme-app`, the same website |
| Address | `num-portal-manual.<domain>` (port 3001, PM2) | `num-portal-devops.<domain>` (port 3002, Docker), staging on 3003 |
| How a release is done | Follow `docs/manual-deployment-sop.md` over SSH | Merge request into `main`, then press ▶ `deploy_production` |
| Time is measured by | `scripts/manual-session.sh` (start → health check OK) | GitLab events → NUM Portal (pipeline start → production health OK, minus the waiting time for approval) |
| Saved in | `/opt/numportal/metrics/manual-runs.csv` | NUM Portal database (automatic) + `/opt/numportal/metrics/deployments.csv` |

## 0. Rehearsing a run on your own computer

The study server is where the data comes from, but the whole comparison also runs locally, with the three
deployed copies of the cafe website that `docker compose` starts:
`http://manual:3001` (Method A), `http://staging:3003` and `http://devops:3002` (Method B).
Add them to `/etc/hosts` once (`127.0.0.1  manual devops staging`) and start everything with
`docker compose --env-file .local-env/.env up -d --build`.

One rehearsal of a run:

1. NUM Portal → **Change code** → pick the scenario → *Commit and deploy to both*. This writes
   `apps/sme-app/src/content/page.json`.
2. Method B: `scripts/publish-site.sh staging` then `scripts/publish-site.sh devops --auto-rollback`.
3. Method A: work through `docs/manual-deployment-sop.md`, with `scripts/publish-site.sh manual` in place of
   the `pm2 restart` step, and tick the steps in the **Ops queue**.
4. NUM Portal → **Result on the website** shows both real sites next to each other, and
   `.local-env/sites/deployments.csv` holds the time of every publish.

Runs rehearsed this way are **not** thesis data: the timings come from a laptop, not from the study server
with a GitLab runner. Delete them before collecting real runs.

## 1. Prepare the releases (once)

Create one Git tag per release so both methods deploy exactly the same code:

| Scenario | What to prepare | Tag example |
|---|---|---|
| S1 First deployment | The base version. Before each run, empty the environment: A → `pm2 delete sme-app-manual && rm -rf /opt/numportal/manual/app`; B → `docker rm -f numportal-production && rm /opt/numportal/state/production.*` | `v1.0.0` |
| S2 Normal feature update | A small visible change, e.g. a new line on the home page | `v1.1.0`, `v1.2.0`, … (alternate between two tags) |
| S3 Faulty release | A `page.json` with a deliberate syntax error (the `S3` preset on the **Change code** page). `/api/health` answers `503 bad-content`. Deploy it, then **recover** | `v1.3.0-broken` |
| S4 Environment mismatch | A version that needs a newer Node.js: in `apps/sme-app/package.json` add `"engines": {"node": ">=22"}` and a file `.npmrc` with `engine-strict=true`; in its `Dockerfile` use `node:22-alpine`. The server keeps Node 20, so the manual `npm ci` fails while the image still builds | `v1.4.0-node22` |
| S5 Configuration change | A version that needs a new setting: the `S5` preset plus `NEEDS_DELIVERY_FEE=1`, so `/api/health` answers `503 missing-settings` until `DELIVERY_FEE` exists. A: add it with `nano .env`; B: add it to the GitLab File variable `SITE_ENV_PRODUCTION` | `v1.5.0-setting` |

## 2. One Method A run

```bash
ssh researcher@server
bash                                                          # the step counter needs bash, not zsh
source /opt/numportal/manual/app/scripts/manual-session.sh    # S1: use a copy of the script outside the app folder
run_start S2 3
#   follow docs/manual-deployment-sop.md step by step
run_end
```

`run_end` waits up to 60 s for `http://127.0.0.1:3001/api/health`, then writes
`date,A,S2,3,success|failed,seconds,steps` to `manual-runs.csv`.
For **S3**, deploy the broken tag first (not timed), then `run_start S3 n`, follow the *Rollback* procedure, `run_end`
– the measured time is the **recovery time**.

## 3. One Method B run

1. Create a branch from the release tag and open a **merge request** into `main`.
2. **Put the tag of the run in the merge-request title**, for example `Release v1.1.0 [S2-03]`
   (the merge commit message then contains `[S2-03]`; NUM Portal reads it and files the run automatically).
3. Merge → the pipeline runs test → build → staging and waits. Press ▶ **deploy_production**.
4. The run appears on **Experiment data** as `B S2 3` with the seconds calculated from the GitLab job times
   (time waiting for your approval is not counted). Steps = 2 (merge + approve).

For **S3**, merge the broken version with tag `[S3-n]`. `deploy.sh` detects the failed health check and rolls back
automatically. After the session, download `/opt/numportal/metrics/deployments.csv` and upload it on the
**Experiment data** page → the rollback time becomes the recovery time of `B S3 n`.

To reset `main` after a run (so the next run deploys the same change again), revert the merge with another merge
request tagged `[skip]`, or alternate between two release tags as in the table above.

## 4. Collecting and checking the data

1. Copy the CSV files from the server to your computer:
   `scp researcher@server:/opt/numportal/metrics/*.csv .`
2. NUM Portal → sign in as `researcher` → **Experiment data**:
   - upload `manual-runs.csv` (Method A),
   - upload `deployments.csv` (Method B, S3 recovery times),
   - check that every scenario shows 10 runs for A and 10 for B; correct or add a run with the form if needed
     (for example when a run had to be repeated – note the reason).
3. **Download CSV for analysis**.

## 5. Response time and Apdex (Table 12)

Install k6 (https://k6.io) on your computer and run, after both methods are on the same version:

```bash
k6 run -e TARGET=https://manual.<domain> tests/load/apdex.js  && mv apdex-summary.json k6-manual.json
k6 run -e TARGET=https://devops.<domain> tests/load/apdex.js  && mv apdex-summary.json k6-devops.json
```

## 6. Statistics for Chapter V

```bash
pip install -r analysis/requirements.txt
python analysis/analyze.py experiment-runs.csv --apdex-a k6-manual.json --apdex-b k6-devops.json
```

`analysis/output/report.md` contains Tables 10–13 with the test names, p-values and effect sizes, ready to copy into
Chapter V; `figure_deployment_time.png` and `figure_failure_rate.png` can be inserted as figures.
`analysis/sample-data/DUMMY-experiment-runs.csv` is **invented test data** only for checking that the script works
– never report numbers from it.

## 7. Demonstration sessions with evaluators (section 5.7)

Give each evaluator their account line from `scripts/seed.mjs`. Everything they do is recorded automatically:
requests (with the AI summary), commits, pipelines, preview deployments and rejected requests.
The **Live dashboard** shows the totals; for the thesis note the number of requests, successful previews, the mean
time from request to live page (pipeline duration on `tester-N` branches) and the number of blocked requests.
