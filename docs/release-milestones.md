# Release milestones — MozEmpresas

## Objective

Group implementation work into technical milestones and release only a consolidated, tested commit. GitHub Actions remains enabled on pushes and pull requests; Vercel deployments are separately gated.

## Vercel deployment gate

The Vercel project `moz-empresas` has the Ignored Build Step configured as:

```sh
git diff --quiet HEAD^ HEAD -- .vercel-release
```

Vercel's ignored-build semantics are: exit code 0 skips the deployment; exit code 1 continues the build. Therefore normal source, documentation, and test commits do not consume Vercel builds. A release commit must change the root-level `.vercel-release` file together with the approved release contents. Do not create or edit that marker during ordinary work. One marker change = one intentional Vercel deployment.

Before a release marker is changed:
1. All relevant milestone acceptance criteria are checked.
2. GitHub Actions is green on the exact release commit.
3. Production migrations and compatibility are reviewed.
4. Rollback and post-release smoke checks are documented.
5. The release is explicitly approved.

Do not disable GitHub Actions. Do not use a Vercel deployment as a substitute for CI.

## Milestone tracking issues

GitHub milestone CRUD is not exposed in the connected GitHub actions. To preserve traceability, the following GitHub issues are used as milestone tracking records (not native GitHub Milestone objects):

| Milestone | Scope | Tracking |
|---|---|---|
| B6.1 | Financial integrity and isolated payment lifecycle tests | [Issue #6](https://github.com/Alinvest-Lda/MozEmpresas/issues/6) |
| B6.2 | Authenticated advertising/payment E2E | [Issue #7](https://github.com/Alinvest-Lda/MozEmpresas/issues/7) |
| B6.3 | Telemetry, inventory and placements | [Issue #8](https://github.com/Alinvest-Lda/MozEmpresas/issues/8) |
| B6.4 | UX, accessibility and release readiness | [Issue #9](https://github.com/Alinvest-Lda/MozEmpresas/issues/9) |
| Release | Consolidated production publication | [Issue #10](https://github.com/Alinvest-Lda/MozEmpresas/issues/10) |

## Operating rules

- Work can continue in small commits on `main`; Vercel skips them unless the release marker changes. Prefer grouped commits for coherent changes.
- CI is allowed to run on every push; it does not consume Vercel deployment quota.
- Production database operations require independent review and evidence; a Vercel release marker does not authorize database changes.
- Do not create synthetic financial data in production.
- Only change `.vercel-release` after explicit release approval and successful milestone gates.
- After release, verify deployment READY, key public routes, authenticated critical flows, logs, and database scheduler health.
