# Standard Operating Procedure – Manual Deployment (Method A)

Method A deploys **the cafe website `apps/sme-app`** – the same application Method B's pipeline deploys.
Only the way a version is put online differs: here a person types every command.

| | |
|---|---|
| Repository copy on the server | `/opt/numportal/manual/app` |
| Application folder | `apps/sme-app` |
| Process manager | PM2, process `sme-app-manual` (`apps/sme-app/ecosystem.config.cjs`) |
| Port | 3001 · public address `https://num-portal-manual.<domain>` |
| Settings file | `apps/sme-app/.env` |
| The file a release changes | `apps/sme-app/src/content/page.json` |

Every run is measured with `scripts/manual-session.sh` (see *Measuring a run* at the end).
Type the commands exactly as listed; the helper counts every command you type.

## First deployment (Scenario S1, empty server folder)

| Step | Command / action |
|---|---|
| 1 | `ssh researcher@server` |
| 2 | `git clone <gitlab-repo-url> /opt/numportal/manual/app` |
| 3 | `cd /opt/numportal/manual/app` |
| 4 | `git checkout <release-tag>` |
| 5 | `cd apps/sme-app` |
| 6 | `cp /opt/numportal/env/manual.env .env` |
| 7 | `npm ci` |
| 8 | `npm run build` |
| 9 | `pm2 start ecosystem.config.cjs` |
| 10 | `pm2 save` |
| 11 | `curl -f http://127.0.0.1:3001/api/health` and open the public address in a browser |

## Normal release (Scenarios S2, S4, S5)

| Step | Command / action |
|---|---|
| 1 | `ssh researcher@server` |
| 2 | `cd /opt/numportal/manual/app` |
| 3 | `cp -r /opt/numportal/manual/app /opt/numportal/manual/backup-$(date +%Y%m%d%H%M)` (backup) |
| 4 | `git fetch --all --tags` |
| 5 | `git checkout <release-tag>` |
| 6 | `cd apps/sme-app` |
| 7 | `npm ci` |
| 8 | `nano .env` – add the setting the release needs (**Scenario S5 only**) |
| 9 | `npm run build` |
| 10 | `pm2 restart sme-app-manual` |
| 11 | `curl -f http://127.0.0.1:3001/api/health` and open the public address in a browser |

The cafe website has no database, so there is no migration step. That is true for both methods, so it
takes nothing away from the comparison.

## Rollback after a faulty release (Scenario S3)

| Step | Command / action |
|---|---|
| 1 | `cd /opt/numportal/manual/app` |
| 2 | `git checkout <previous-working-tag>` |
| 3 | `cd apps/sme-app` |
| 4 | `npm ci` |
| 5 | `npm run build` |
| 6 | `pm2 restart sme-app-manual` |
| 7 | `curl -f http://127.0.0.1:3001/api/health` |

Nothing here happens by itself. Method B's `deploy.sh` restores the previous image on a failed health
check without being asked, and that difference is exactly what Scenario S3 measures.

## What each scenario does to the site

| Scenario | What the release contains | How it shows up in Method A |
|---|---|---|
| S2 | A new section in `page.json` | The section appears on the page after the restart |
| S3 | `page.json` with a deliberate syntax error | `/api/health` answers `503 bad-content`; the page stays broken until step *Rollback* is typed |
| S4 | `"engines": {"node": ">=22"}` and `.npmrc` with `engine-strict=true` | `npm ci` stops on the server's Node 20 – the run is a failure |
| S5 | A section that needs a new setting, marked with `NEEDS_DELIVERY_FEE=1` | `/api/health` answers `503 missing-settings` until `DELIVERY_FEE` is added with `nano .env` |

## Measuring a run

```bash
bash                                                        # the counter needs bash, not zsh
source /opt/numportal/manual/app/scripts/manual-session.sh
run_start S2 7        # scenario S2, run number 7 – the timer starts
# ... type the steps above ...
run_end               # waits for the health check, then writes one line to the CSV
```

The result goes to `/opt/numportal/metrics/manual-runs.csv` as
`date,A,scenario,run,result,seconds,steps`. If that folder is not writable (a laptop, for example) the
helper says so and records to `.local-env/metrics/manual-runs.csv` inside the repository instead.
`MANUAL_CSV` and `MANUAL_PORT` override both. Upload the file on the **Experiment data** page of
NUM Portal.

If a run fails – for example S4, where the build stops because the server has the wrong Node.js version –
still call `run_end`: the health check will not pass and the run is recorded as `failed`.

## Doing the same without a server

The three copies of the site also run locally as Docker containers (`manual`, `devops`, `staging`).
There is no SSH and no PM2 then, so the procedure shortens to: edit the release, then put it online by
hand with

```bash
scripts/publish-site.sh manual        # the local stand-in for steps 7-11 above
scripts/publish-site.sh manual --rollback    # the local stand-in for the rollback procedure
```

`run_start` / `run_end` work around those commands in the same way. Runs timed on a laptop are a
rehearsal, not thesis data: the hardware, the network and the number of typed commands all differ from
the study server. Label them as such and keep them out of the files you upload.

### macOS Bash

The message “The default interactive shell is now zsh” is a macOS notice. To open Bash without that notice for this session:

```bash
BASH_SILENCE_DEPRECATION_WARNING=1 bash
source ./scripts/manual-session.sh
run_start S2 1
# Perform the deployment steps above.
run_end
```

Sourcing the script loads the timer functions and prints “Manual timer ready”; it does not start a run. On macOS results go directly to `.local-env/metrics/manual-runs.csv`. Node.js is required for portable millisecond timestamps. Local rehearsals are not study-server measurements.

If your prompt starts with `➜`, you are usually in zsh. Instead of sourcing Bash functions there, open the prepared timer shell directly from the repository root:

```bash
/bin/bash ./scripts/manual-session.sh
```

Wait for the `manual-session` prompt, then run `run_start S2 1`. The launcher loads the functions automatically. Run `exit` when you want to return to zsh.

### Automated local deployment rehearsals

To exercise repeated local deployments without presenting them as human manual measurements:

```bash
python3 scripts/run-local-rehearsals.py --runs 50 --batch-minutes 10
```

This redeploys the current cafe content to the existing Compose `manual` service. It does not simulate new features or the full manual SOP. Each run starts and ends the measurement helper, executes one publish command, verifies a real container restart, and records health. Pacing between runs is excluded from deployment duration.

Results, logs and a summary are saved under `.local-env/rehearsals/<timestamp>/`. The exported method is `A_rehearsal` and the execution mode is `automated_local_rehearsal`; these results must not be imported as human Method A study measurements. The existing `.local-env/metrics/manual-runs.csv` is left unchanged.
