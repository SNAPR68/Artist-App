# Full Audit Report: `artist-booking-platform`

## Purpose
This document is a delivery handoff for engineering planning. It summarizes the current state of the monorepo, the highest-risk issues found during audit, and the recommended fix plan for both frontend and backend work.

The goal is to help the team:
- build an implementation board
- prioritize release blockers
- assign work by subsystem
- close the gap to a release-ready state

## Repo Scope Audited
- `apps/web`
- `apps/api`
- `packages/shared`
- `packages/ui`
- `packages/db`
- `e2e`
- root monorepo tooling and CI-facing scripts

## Executive Summary
The repo is not release-ready in its current state.

The most important issues are:
- payment document authorization gaps in the API
- fragile Razorpay webhook validation that can reject legitimate events
- production database migrations that seed demo users, including an admin
- broken root quality gates (`lint`, `type-check`, `test`)
- frontend build/deploy instability caused by config drift and network-dependent prerender/build behavior
- very limited frontend automated regression coverage despite large active UI changes

## Audit Method
- reviewed monorepo structure and package scripts
- inspected key frontend, backend, auth, payment, config, middleware, and migration files
- ran repo health checks and selected package-level checks
- reviewed existing unit/e2e coverage inventory
- validated audit findings against current source and command output

## Verification Summary
### Commands run
- `pnpm lint`
- `pnpm type-check`
- `pnpm test`
- `pnpm --filter @artist-booking/web build`
- `pnpm --filter @artist-booking/api test`
- `pnpm --filter @artist-booking/shared test`

### Current results
- `pnpm lint`: fails
- `pnpm type-check`: fails
- `pnpm test`: fails
- `pnpm --filter @artist-booking/web build`: builds, but logs prerender/network warnings
- `pnpm --filter @artist-booking/api test`: partially passes, but fails due to config/test drift
- `pnpm --filter @artist-booking/shared test`: passes

## Release Blockers
These should be treated as board priority `P0`/`P1`.

### 1. Payment document access control is insufficient
Severity: High

Authenticated users can fetch invoices and contracts without ownership checks.

Affected paths:
- `apps/api/src/modules/payment/payment.routes.ts`
- `apps/api/src/modules/payment/payment.service.ts`

Why this matters:
- exposes invoices/contracts across accounts
- leaks private financial and booking information
- creates a direct authorization failure on sensitive documents

Recommended fix:
- require ownership checks for invoice, contract, and payment-detail endpoints
- enforce authorization in the service layer, not just route handlers
- verify that the caller is the payment owner, booking participant, or admin
- add tests for allowed and denied access paths

Acceptance criteria:
- non-owner authenticated users receive `403`
- owners and admins can access documents
- unit/integration tests cover invoice and contract authorization

### 2. Razorpay webhook validation is unreliable
Severity: High

Webhook IP validation currently uses naive string prefix matching for CIDR ranges and likely rejects valid provider traffic.

Affected paths:
- `apps/api/src/modules/payment/payment.routes.ts`
- `apps/api/src/app.ts`

Why this matters:
- missed webhooks can leave payments stuck in incorrect states
- capture/refund reconciliation becomes unreliable
- support load and finance reconciliation risk increase

Problems found:
- CIDR ranges are matched using `startsWith`
- `request.ip` may reflect proxy infrastructure instead of provider origin
- no clear proxy trust setup in app bootstrap

Recommended fix:
- replace prefix logic with proper CIDR matching
- configure Fastify proxy trust if deployed behind a proxy/load balancer
- keep webhook signature validation as the primary security control
- make IP allowlisting optional and correct, not approximate
- log rejected webhook diagnostics without leaking secrets

Acceptance criteria:
- valid webhook requests from known provider ranges are accepted
- invalid signature requests are rejected
- webhook route behavior is covered with tests

### 3. Production migrations include demo users and an admin account
Severity: High

The main migration chain seeds demo users with known phone numbers, including an admin account.

Affected path:
- `packages/db/migrations/20260401000077_add_demo_users.ts`

Related path:
- `apps/api/src/modules/admin/admin.routes.ts`

Why this matters:
- production schema migrations should not create demo identities
- introduces avoidable security and data integrity risk
- requires a manual follow-up repair endpoint to correct seed hashes

Recommended fix:
- remove demo-user creation from production migrations
- move demo users to a dev-only seed flow
- delete or tightly restrict one-time repair logic once migration history is corrected
- document environment-safe data bootstrapping

Acceptance criteria:
- running migrations in production does not create demo accounts
- demo data is only created in local/dev/staging via explicit seed commands
- no production path depends on `fix-seed-hashes`

## Major Backend Issues

### 4. Logout does not reliably revoke refresh tokens
Severity: Medium

The client logs out without sending the refresh token, while the server only revokes refresh tokens if one is provided.

Affected paths:
- `apps/web/src/lib/auth.ts`
- `apps/api/src/modules/auth/auth.routes.ts`
- `apps/api/src/modules/auth/auth.service.ts`

Impact:
- user sessions remain partially valid after logout
- refresh tokens survive local logout until expiry

Recommended fix:
- send refresh token during logout, or
- move refresh tokens to secure cookies and revoke server-side consistently
- verify refresh token rotation and revocation behavior with tests

Acceptance criteria:
- logout invalidates access and refresh token paths
- refresh after logout fails

### 5. Test/runtime config bootstrap is too brittle
Severity: Medium

API config rejects `NODE_ENV=test` and exits the process during import.

Affected path:
- `apps/api/src/config/index.ts`

Impact:
- test suites fail before exercising business logic
- local and CI confidence are reduced

Recommended fix:
- allow `test` in env schema
- avoid `process.exit` inside import-time config loading for test contexts
- provide test-safe defaults or test setup injection

Acceptance criteria:
- API tests run under `NODE_ENV=test`
- invalid config failures are surfaced as testable errors, not hard process exits

### 6. Type-checking is failing in API
Severity: Medium

Observed issues:
- missing `pdfkit` declarations
- unused symbol failures

Affected paths include:
- `apps/api/src/modules/document/pdf.renderer.ts`
- `apps/api/src/modules/workspace/presentation-pdf.service.ts`

Recommended fix:
- add `@types/pdfkit` or a local declaration
- clear unused-symbol errors
- make root `pnpm type-check` green

Acceptance criteria:
- `pnpm type-check` passes from repo root

### 7. Review tests are stale relative to implementation
Severity: Medium

The service checks `booking.state`, but tests still mock `status`.

Affected paths:
- `apps/api/src/modules/review/review.service.ts`
- `apps/api/src/modules/review/__tests__/review.service.test.ts`

Impact:
- false-negative test failures
- lower confidence in review and booking-state logic

Recommended fix:
- update tests to current booking shape
- confirm expected order of validations

Acceptance criteria:
- review tests reflect current domain model
- failures represent real regressions only

## Major Frontend Issues

### 8. Web build/deploy configuration is inconsistent
Severity: High

Next output is configured to write to `/tmp/next-build-out`, while Vercel expects `apps/web/.next`.

Affected paths:
- `apps/web/next.config.js`
- `vercel.json`

Impact:
- deployment output may be mis-collected
- local and CI build assumptions drift

Recommended fix:
- choose one output strategy and align Next + Vercel config
- validate with a clean production build in CI

Acceptance criteria:
- build output path is consistent across local and deployment environments

### 9. Build depends on external network resources
Severity: Medium

Frontend build currently:
- loads Google Fonts via `<link>`
- fetches API data during prerender/metadata generation

Affected paths:
- `apps/web/src/app/layout.tsx`
- `apps/web/src/app/sitemap.ts`
- `apps/web/src/app/(public)/artists/[id]/page.tsx`

Impact:
- build is vulnerable to transient network/DNS failures
- prerender metadata can fail or degrade unpredictably

Recommended fix:
- prefer `next/font` or a stable self-hosted font strategy
- make metadata/sitemap fetches fault-tolerant and deployment-aware
- avoid hard dependency on live API during build unless guaranteed available

Acceptance criteria:
- `pnpm --filter @artist-booking/web build` succeeds without external fetch failures
- metadata/sitemap degrade gracefully when API is unavailable

### 10. Frontend automated coverage is effectively absent
Severity: Medium

`apps/web` defines a test script, but no actual tests are present.

Affected path:
- `apps/web/package.json`

Impact:
- large UI changes have little automated regression protection
- active landing-page redesign is high-risk to merge blindly

Recommended fix:
- add smoke tests for:
  - auth initialization
  - route guard behavior
  - search form and filters
  - homepage render
- if tests are intentionally absent, stop advertising failing `vitest run` in CI

Acceptance criteria:
- either meaningful tests exist, or the package test script no longer fails misleadingly

### 11. Current frontend worktree has elevated regression risk
Severity: Medium

Observed risk themes:
- landing page redesign is large
- motion-heavy components may affect accessibility and performance
- current web package lacks direct test coverage
- image optimization was disabled
- monitoring/config behavior changed

Areas to re-review carefully:
- `apps/web/src/app/page.tsx`
- `apps/web/src/app/layout.tsx`
- `apps/web/src/components/landing/*`
- `apps/web/src/components/layout/*`
- `apps/web/src/components/search/*`
- `apps/web/src/styles/globals.css`
- `apps/web/next.config.js`

Recommended fix:
- do a focused pre-merge review of the current dirty `apps/web` diff
- restore or intentionally replace removed monitoring/security behavior
- add at least smoke-level visual/interaction coverage

## Tooling and Monorepo Issues

### 12. Root lint is broken
Severity: High

ESLint config imports `typescript-eslint`, but the workspace does not provide that package.

Affected paths:
- `eslint.config.mjs`
- root `package.json`

Recommended fix:
- either install the correct package expected by the config, or
- rewrite the config to use installed dependencies only

Acceptance criteria:
- `pnpm lint` passes from root

### 13. Test scripts give false confidence
Severity: Medium

Packages such as `apps/web` and `packages/ui` define `vitest run` with no tests.

Affected paths:
- `apps/web/package.json`
- `packages/ui/package.json`
- root `package.json`

Impact:
- root `pnpm test` fails for structural reasons instead of product regressions
- CI signal is noisy and less actionable

Recommended fix:
- add tests, or
- replace with an explicit no-op until coverage exists, or
- exclude these packages from root test orchestration temporarily

Acceptance criteria:
- root test command reflects real quality signal

## Database and Migration Recommendations

### Key concerns
- production and demo data are mixed in migration history
- rollback safety appears uneven across the large migration surface
- migration changes are broad and likely under-tested as a sequence

### Recommended actions
- separate schema migrations from demo/dev data seeding
- validate full migrate-up and rollback behavior in disposable databases
- document migration ordering assumptions
- add CI or nightly verification for migrate-up from empty DB

## Test Coverage Inventory

### Existing backend unit coverage
- auth
- booking
- calendar
- payment
- review
- search
- artist
- agent

### Existing e2e coverage
- admin
- API endpoints
- booking lifecycle
- booking flows
- artist onboarding
- dashboard flows
- workspace flows

### Coverage gaps
- frontend package-level tests are absent
- ownership/authorization tests around payment document access are missing
- logout refresh revocation coverage is missing
- webhook validation behavior is not sufficiently verified
- migration execution/rollback validation is not visible in automated checks

## Recommended Board Structure

### Column suggestions
- Backlog
- Ready
- In Progress
- Blocked
- In Review
- QA
- Done

### Epic 1: Security and Access Control
Tasks:
- lock down invoice download authorization
- lock down contract download authorization
- review payment detail endpoints for IDOR patterns
- review auth/logout refresh revocation behavior
- review public/private route assumptions in frontend middleware

Definition of done:
- all sensitive document routes enforce ownership/admin access
- automated tests cover allowed/denied access

### Epic 2: Payments and Webhook Reliability
Tasks:
- replace naive Razorpay CIDR matching
- configure proxy trust correctly
- improve webhook logging/observability
- verify payment state transitions on webhook capture/refund
- add reconciliation test coverage

Definition of done:
- webhook route works reliably in deployed environment
- payment status transitions are deterministic and tested

### Epic 3: Database and Seed Safety
Tasks:
- remove demo-user migration from production path
- move demo data into explicit dev seeds
- deprecate or remove `fix-seed-hashes` operational dependency
- verify migrate-up and rollback in isolated DB

Definition of done:
- production schema migrations no longer create demo identities

### Epic 4: Monorepo Health and CI
Tasks:
- fix root ESLint configuration
- fix API type errors
- add `pdfkit` types
- allow test environment in config
- make root `lint`, `type-check`, and `test` pass

Definition of done:
- root quality gates are green and trustworthy

### Epic 5: Frontend Build and Deployment Stability
Tasks:
- reconcile Next `distDir` and Vercel output
- remove or harden build-time network dependencies
- review metadata/sitemap fetch strategy
- re-evaluate font loading strategy

Definition of done:
- clean production build succeeds consistently in CI and deployment

### Epic 6: Frontend Regression Coverage
Tasks:
- add auth/session smoke tests
- add homepage render smoke test
- add search/filter interaction tests
- add dashboard route guard coverage
- review current landing-page redesign for accessibility/performance regressions

Definition of done:
- critical frontend flows have baseline automated coverage

## Recommended Fix Order

### Phase 1: Immediate
- payment document authorization
- webhook validation/proxy correctness
- remove production demo-user path

### Phase 2: Stabilization
- fix root lint/type/test
- fix API config/test bootstrap
- fix logout token revocation

### Phase 3: Frontend reliability
- align web build/deploy config
- remove fragile build-time fetch dependencies
- review active frontend redesign risks

### Phase 4: Coverage and hardening
- add frontend smoke tests
- add backend authorization/webhook tests
- add migration verification in CI

## Acceptance Criteria for “Audit Closed”
- root `pnpm lint` passes
- root `pnpm type-check` passes
- root `pnpm test` passes or is intentionally scoped to real coverage only
- invoice/contract access control is enforced and tested
- webhook handling is production-safe and tested
- demo users are not created by production migrations
- web build is stable and deployment config is consistent
- baseline frontend regression coverage exists for critical flows

## Notes for Team Leads
- treat the current `apps/web` dirty worktree as a separate merge-risk review item
- do not merge frontend visual/config changes until the build/deploy path is stabilized
- prioritize security and payment reliability before UI polish or feature expansion
- use this report to split work between platform, backend, frontend, and QA owners

## Suggested Owners
- Backend: auth, payments, webhook reliability, service-layer authorization
- Frontend: build config, metadata/sitemap strategy, route guards, smoke tests
- Platform/Infra: CI health, deployment validation, environment/config behavior
- Data/Backend: migration safety, seed strategy, DB verification flows
- QA: regression matrix for payment, auth, search, dashboard, and document download flows
