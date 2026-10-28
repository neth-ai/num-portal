# Method A / Method B results – data check

Produced on **2026-10-20** by searching every location where the experiment writes results.
This is a historical snapshot; recheck current files before using its counts or conclusions.
Nothing in this file is invented: every number below was read from a file or from the portal
database, and every cell without a measurement says **Not yet measured**.

## 1. What was searched

| Location | Result |
|---|---|
| `/opt/numportal/metrics/manual-runs.csv` | the folder `/opt/numportal` does not exist on this machine |
| `.local-env/metrics/` (the fallback of `manual-session.sh`) | folder exists, **empty** |
| `*.csv` anywhere under `/Users/neth/Thesis` | only the files listed in §2 |
| portal database (`runs`, `handoffs`, `pipeline_runs`, `job_runs`, `releases`) | see §2 |

**`manual-session.sh` has never written a line.** There is no Method A run recorded by the
measuring helper, so the number of valid Method A runs is **0 of 50**.

## 2. What does exist, and why it is not thesis data

### 2.1 `runs` table, `is_dummy = true` – 10 rows

Five Method A and five Method B rows inserted by `apps/num-portal/scripts/seed.mjs --dummy`.
The script itself says *“Example rows so the pages have something to draw before the real runs
exist … never report them.”* They are the source of the round numbers (412 s, 138 s, 226 s, 96 s,
540 s, 71 s, 388 s, 124 s, 264 s, 103 s). **Never report these.**

### 2.2 `runs` table, `is_dummy = false` – 7 rows

| scenario | method | runs | n | deployment time | manual_steps | result |
|---|---|---|---|---|---|---|
| S2 | A | 4–10 | 7 | mean 8.8 s, median 6.0 s, SD 5.9 s, min 3.6 s, max 20.6 s | 8 (all rows) | 7 success, 0 failed |

Recorded on 19–20 October through the portal pages (**Change code → Handoff → Ops queue**), not by
`manual-session.sh`. They cannot be used as Method A measurements:

- **The duration is clicking, not deploying.** 3.6–20.6 seconds is the time to tick boxes in the
  Ops queue. One manual release of `apps/sme-app` cannot be done in six seconds.
- **`manual_steps = 8` for every row.** The procedure the thesis now reports has **11** steps
  (S1 first deployment and S2/S4/S5 normal release) or **7** (S3 rollback). These rows were
  recorded while the portal still showed the superseded eight-step list.
- **Run 8 contains a 23-minute handoff wait** (`handoff_wait_s = 1399.3`), which is a request left
  open in the browser, not a measured waiting time.
- Only S2 exists. S1, S3, S4 and S5 have no rows at all.

### 2.3 `.local-env/sites/deployments.csv` – 15 rows

Thirteen rows written by the local CI deployment script (`staging`, `devops`, `portal`,
19–20 October, 3–6 s each) and two rows from `publish-site.sh manual` written while the deployment
chain was being verified on 20 October. None of them carries a scenario or a run number, and they
were produced while the pipeline itself was being set up. They are **not** Method B experiment runs.

### 2.4 `pipeline_runs` and `job_runs` – 0 rows

No GitLab webhook event has ever reached the portal, so **Method B has no recorded run either**
(0 of 50). The Method B timing in the thesis comes from these tables.

## 3. Completeness against the plan (5 scenarios × 10 runs × 2 methods)

| Scenario | Method A valid runs | Method B valid runs | Missing |
|---|---|---|---|
| S1 | 0 / 10 | 0 / 10 | 20 |
| S2 | 0 / 10 | 0 / 10 | 20 |
| S3 | 0 / 10 | 0 / 10 | 20 |
| S4 | 0 / 10 | 0 / 10 | 20 |
| S5 | 0 / 10 | 0 / 10 | 20 |
| **Total** | **0 / 50** | **0 / 50** | **100** |

Outliers, ABBA order and the `steps` column cannot be checked before there are runs.

## 4. Blocking points found while checking (all verified on this machine)

| # | Finding | Consequence |
|---|---|---|
| 1 | The repository has **0 git tags** | SOP steps 4–5 (`git fetch --all --tags`, `git checkout <release-tag>`) cannot be typed. EXPERIMENT-GUIDE §1 “Prepare the releases” has not been done |
| 2 | **PM2 is not installed** and port 3001 is held by the `manual` Docker container | SOP step 10 (`pm2 restart sme-app-manual`) cannot be typed |
| 3 | `/opt/numportal/manual/app` does not exist | SOP steps 1–2 cannot be typed |
| 4 | Node on this machine is **v24**; the study server is expected to be Node 20 | Scenario S4 (environment mismatch) cannot fail as designed: `engines: ">=22"` is satisfied, so `npm ci` succeeds |

---

# Ready-to-paste tables

Nothing below contains a measured value, because no valid run exists yet.
Replace a cell only when the number comes from `manual-runs.csv` or from the portal export.

## Table 10: Deployment Time by Method and Scenario (successful runs, seconds)

| Scenario | Method A n | Mean ± SD | Median | Min–Max | Method B n | Mean ± SD | Median | Min–Max |
|---|---|---|---|---|---|---|---|---|
| S1 First deployment | 0 | Not yet measured | Not yet measured | Not yet measured | 0 | Not yet measured | Not yet measured | Not yet measured |
| S2 Feature update | 0 | Not yet measured | Not yet measured | Not yet measured | 0 | Not yet measured | Not yet measured | Not yet measured |
| S4 Environment mismatch | 0 | Not yet measured | Not yet measured | Not yet measured | 0 | Not yet measured | Not yet measured | Not yet measured |
| S5 Configuration change | 0 | Not yet measured | Not yet measured | Not yet measured | 0 | Not yet measured | Not yet measured | Not yet measured |
| **All** | **0** | Not yet measured | Not yet measured | Not yet measured | **0** | Not yet measured | Not yet measured | Not yet measured |

S3 is reported separately as recovery time (H3). `analysis/analyze.py` builds this table from
S1, S2, S4 and S5 only.

## Table 11: Deployment Failure Rate by Method and Scenario

| Scenario | Method A failed / n | % | Method B failed / n | % |
|---|---|---|---|---|
| S2 Feature update | 0 / 0 | Not yet measured | 0 / 0 | Not yet measured |
| S4 Environment mismatch | 0 / 0 | Not yet measured | 0 / 0 | Not yet measured |
| S5 Configuration change | 0 / 0 | Not yet measured | 0 / 0 | Not yet measured |
| **All** | **0 / 0** | Not yet measured | **0 / 0** | Not yet measured |

## Recovery time, Scenario S3 (H3)

| Measure | Method A | Method B |
|---|---|---|
| n | 0 | 0 |
| Mean recovery time ± SD | Not yet measured | Not yet measured |
| Median | Not yet measured | Not yet measured |

## Manual steps per release (H4)

| Measure | Method A | Method B |
|---|---|---|
| Steps defined by the procedure | 11 (S1, S2, S4, S5) · 7 (S3 rollback) | 2 (merge + approve) |
| Measured mean ± SD | Not yet measured | Not yet measured |

The step counts in the left column are the procedure itself (`docs/manual-deployment-sop.md` and
the Ops queue list), not a measurement.

## Table 12: Response Time and Apdex After Deployment

| Measure | Method A | Method B |
|---|---|---|
| Requests | Not yet measured | Not yet measured |
| Mean response time | Not yet measured | Not yet measured |
| p95 response time | Not yet measured | Not yet measured |
| Apdex (T = 0.5 s) | Not yet measured | Not yet measured |

No k6 run has been recorded: there is no `k6-manual.json` or `k6-devops.json` in the project.

## Table 13: Summary of Hypothesis Testing

| Hypothesis | Measure | Test | p-value | Result |
|---|---|---|---|---|
| H1 | Deployment time | Paired test over matched runs (Wilcoxon or paired t) | Not yet measured | Not yet measured |
| H2 | Failure rate | Fisher's exact test | Not yet measured | Not yet measured |
| H3 | Recovery time (S3) | Paired test over matched runs | Not yet measured | Not yet measured |
| H4 | Manual steps | Paired test over matched runs | Not yet measured | Not yet measured |

The test names are the ones `analysis/analyze.py` applies; which of Wilcoxon or the paired
t-test is reported depends on the Shapiro-Wilk check the script runs on the real data.

## Appendix G: Raw records

| date | method | scenario | run | result | seconds | steps |
|---|---|---|---|---|---|---|
| *No valid record yet* | | | | | | |

Source when the runs exist: `/opt/numportal/metrics/manual-runs.csv` (Method A) and the portal
export **Experiment data → Download CSV** (Method B).

---

# Draft paragraphs for Chapter V

Use these only until the real runs exist; each one states the status instead of a result.

**5.x Deployment time (H1).** At the time of writing, no valid deployment-time measurement has been
collected. The measurement instruments are in place and verified – `scripts/manual-session.sh`
records one line per Method A release, and the portal records Method B releases from GitLab
webhook events – but the 50 Method A runs and 50 Method B runs of the experimental plan have not
yet been executed. Table 10 is therefore reported as *not yet measured*.

**5.x Failure rate (H2).** No release has yet been recorded as either successful or failed under
experimental conditions, so the failure rates of the two methods cannot be compared. Table 11 is
reported as *not yet measured*.

**5.x Recovery time (H3).** Scenario S3 has not yet been run under either method. The mechanism
that the scenario measures has been verified on the local environment – the Method B deployment
script restores the previous version by itself after a failed health check, while Method A stays on
the broken version until a person runs the rollback procedure – but no recovery time has been
measured.

**5.x Manual steps (H4).** The two procedures define 11 manual steps for a Method A release
(S1, S2, S4, S5), 7 for the S3 rollback, and 2 human actions for a Method B release (merge and
approve). These are properties of the procedures, documented in `docs/manual-deployment-sop.md` and
`.gitlab-ci.yml`; the measured counts per run are *not yet measured*.

**5.x Response time and Apdex.** No load test has been run against either deployed copy of the
site. Table 12 is reported as *not yet measured*.
