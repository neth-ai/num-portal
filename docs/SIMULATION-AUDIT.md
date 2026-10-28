# Simulation alignment

Source: user's supplied Chapter III facts; Google Doc could not be retrieved.
Table 8 exact wording remains unverified. Manual steps use docs/manual-deployment-sop.md.

- Branch guard is a real .gitlab-ci.yml implementation detail, not a separate thesis stage. The thesis overview uses Validate.
- Staging and production health checks are separate evidence checkpoints, not additional CI stages.
- Production approval is a human action. Demo waits for an explicit click.
- Added handoff request and Ops queue to Method A; PM2 and port 3001 remain explicit.
- Added 5 × 2 × 10 matrix and order-group display. Never infer actual recorded order from animation.
- Demo runs start with baseline reset confirmation; no demo output is written to PostgreSQL.
- Real evidence excludes is_dummy and out-of-protocol run numbers.
- Existing schema has timestamps and order_group, but lacks explicit public health verification, reset confirmation and environment-error evidence. Proposed SQL is not applied automatically.
- Method B deployment duration currently comes from recorded deployment_s; pipeline-start timestamp is proposed to permit independent recomputation. Lead and waiting time are recomputed from timestamps.
- Pipeline list and commits are bounded snapshots, not all-time counts; 17/11/7/4/0 are never hard-coded.
- A successful CI job alone never counts as verified website health.

## Validation and remaining integration work

- Production build includes TypeScript and ESLint validation.
- HTTP smoke checks: dashboard 200; public GitLab snapshot 200 with fetchedAt; invalid pipeline ID 400; missing DATABASE_URL 503 with explicit error.
- Existing running environment: no PostgreSQL container, portal restarting. No running study containers were rebuilt or reset.
- Configure DATABASE_URL and GITLAB_TOKEN on the server before deployment. Public GitLab reads were available during smoke testing.
- EN/KH toggle currently translates primary navigation and headings. Detailed research descriptions and GitLab labels remain English.
- New verification fields still require approval of the proposed migration and integration into run-collection writers. Existing manual_steps is displayed as recorded rather than silently changed to two for Method B.
- The 3D view is secondary. Zone-label collision avoidance now also applies before stage-label placement.
- Demo timings are explicitly illustrative. Pair order is recorded for the walkthrough; it is not proof of a counterbalanced real experiment.
