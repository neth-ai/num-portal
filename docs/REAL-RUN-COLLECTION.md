# Collecting real Method A and Method B measurements

`analysis/REAL-RUN-COLLECTION-PLAN.csv` is a collection schedule, not an experimental results file. All 100 entries are marked `not_run`; timing, command counts and outcomes are blank. Do not import the plan as measurements.

The design is 5 scenarios × 10 matched repetitions × 2 methods = **100 total: 50 A + 50 B**. Each method has 10 runs of each scenario, S1–S5. The within-pair method order follows the sequence in the experiment guide: A first on runs 1, 4, 5, 8, 9; B first on runs 2, 3, 6, 7, 10.

## Current readiness, checked 2026-10-20

The Mac currently runs the manual website through Docker, not PM2. Node is v24.13.0, PM2 is not installed, `/opt/numportal/manual/app` does not exist, and the Git repository contains no release tags. These differ from the Linux/Node 20/SSH/PM2 conditions specified by the existing thesis SOP. Do not collect study results under those conditions and describe them as the specified server experiment.

The previous 50 automated local rehearsals remain under `.local-env/rehearsals/20261020-155302/`, labelled `A_rehearsal`. They are excluded from this plan's measured results. Do not change their labels, inflate their durations, or combine them with human manual measurements.

## Before measurement

1. Identify the actual study server and human operator. Record hardware, OS, Node version, network and cache/reset policy for both methods.
2. Prepare a separate server checkout for Method A, PM2 and port 3001. Do not delete or replace the current Mac services to simulate the server experiment.
3. Prepare and validate immutable release tags for S1–S5, including the intentionally faulty release, Node-version mismatch and missing-setting scenarios. Both methods must use the same intended release for each matched pair.
4. Validate the measurement boundaries before data collection: the current Bash timer measures commands in its own shell, not commands executed inside a separate SSH shell. Source it inside the operator's server session for deployment timing. Measure SSH/handoff time separately if the methodology includes it. Keep the helper outside the application checkout when S1 resets that checkout.
5. Verify failure attribution. A healthy OLD release does not prove that the attempted NEW release deployed successfully. Record failed install/build commands and the intended versus served version; a health-only timer result is not sufficient for S4 failure classification.
6. Define whether health polling is included in deployment/failure duration. The helper may wait up to 60 seconds on failure; retain that fact in the instrument definition rather than treating it as human recovery time.
7. Configure Method B's study-server runner, deployment target, webhook evidence and export. The active local Compose pipeline is a rehearsal setup, not yet the study-server setup described by the thesis. Record the actual human actions required by the current branch workflow instead of assuming two.

## One human Method A run

The HUMAN operator performs these actions individually; an agent or a loop must not execute them and label the result as human operation:

```bash
# In the human operator's server Bash session:
source /path/outside-reset-checkout/manual-session.sh
run_start S2 1
# Type the applicable SOP commands one at a time.
# Check the intended release and the real website result.
run_end
```

Follow `docs/manual-deployment-sop.md`. Do not simply start and end the timer. The normal-release SOP has up to 11 listed actions, with a configuration-edit action conditional on S5. The observed command count must come from the actual command log; do not force it to 11. Extra commands and errors should remain in the evidence.

Do not target or synthesize 10–15 minute durations. Record how long each real run actually takes, including unusually fast or slow results. At 10–15 minutes per Method A run, 50 A runs alone require approximately 8 hours 20 minutes–12 hours 30 minutes, plus setup and Method B work.

## Evidence per matched pair

Retain the scenario and repetition ID, release SHA/tag, operator, environment, timestamps, raw timing CSV, command log, command failures, observed application version and health result. For Method B retain pipeline/job links and deployment/rollback logs, separating approval wait according to the predefined protocol. For S3 measure recovery after introducing the faulty release, under the same starting conditions for both methods.

Mark a plan entry complete only after its evidence exists. Keep incomplete, failed and excluded runs visible with reasons. Populate thesis Tables 10–13 from verified measured exports, not this plan or rehearsal files.
