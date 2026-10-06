# Deployment preparation

Initialization creates local builds and deployment configuration. Deploying, DNS changes and production data migration are separate release actions. Complete the main contract in [core-integration.md](core-integration.md) before release.

For local development without Docker, run `npm run db:local` in its own terminal. It starts loopback Mongo on port 27018 and persists development data in `.local-data/mongo`. Keep that terminal running and use `mongodb://127.0.0.1:27018/vetify_meal_planner`. The first start may download MongoDB's development binary. Docker Compose supplies the alternative documented in the README. Run `npm run seed:demo` only against the guarded local planner database.

## Two Vercel projects

Create two projects from this repository, rooted at `apps/web` and `apps/api`. Enable access to files outside each project root so npm workspaces and `packages/shared` resolve. Install from the committed root lockfile using `npm ci`. Configure Node 24 where supported by the deployment account.

| Setting         | Web project                                 | API project                                |
| --------------- | ------------------------------------------- | ------------------------------------------ |
| Framework       | Vite                                        | Express                                    |
| Build           | Root workspace `npm run build:web`          | Root workspace `npm run build:api`         |
| Output          | `apps/web/dist` relative to repository root | Supported Express app export in `apps/api` |
| Public hostname | `planner.vetify.com`                        | Dedicated configurable API hostname        |

Vercel interprets root-relative working directories differently depending on project configuration. Adjust build/output paths to the selected root, keep the shared package build before each consumer, and verify actual preview logs and emitted Node imports. The local API listener and exported Express application are separate.

Bind the web `/api/v1/:path*` rewrite to the deployed API hostname before deploying. Preserve the `/api/v1` prefix, method, body and authorization header. Replace the hostname placeholder in `apps/web/vercel.json` with the actual API URL. API paths must be evaluated before the SPA fallback so error responses are not replaced with `index.html`.

## Environment

Set web build variables from `apps/web/.env.example`. Use `/api/v1` for planner calls through the rewrite. Set `VITE_MAIN_API_URL` to the real versioned main URL and `VITE_MAIN_LOGIN_URL` to its login screen. Vite variables are public and must contain no secrets.

Set API runtime variables from `apps/api/.env.example`: `NODE_ENV=production`, `AUTH_MODE=main`, a separate planner `PLANNER_MONGODB_URI`, real `MAIN_API_URL`, the exact allowed web origins, bounded introspection timeout and cache TTL. Main and planner API bases end `/api/v1` without a trailing slash. Production startup rejects mock configuration. Never configure the core JWT signing secret on the planner.

Provision separate Atlas credentials limited to the planner database. A different database on the existing cluster does not isolate cluster outages. Use a separate production Atlas deployment for fault isolation and configure its network access for the hosting runtime. Use a separate staging database and credentials.

The API caches the Mongo connection promise per runtime instance, shares concurrent initialization and resets failed attempts. Deploy indexes explicitly using the documented index command. Do not run migration or seed commands automatically on function startup. No background jobs, Socket.IO process, clinic scheduler or appointment scheduler belongs in this service.

## Staging and installability

Use HTTPS sibling staging domains for main and planner to exercise the intended same-site refresh-cookie flow. Local mock or `vercel.app` preview success does not establish production cookie behavior. Validate credentialed CORS, exact return URLs, direct API calls and timeout/fail-closed behavior.

The PWA manifest uses standalone display and install icons. The service worker caches shell assets only. Auth/data endpoints remain online and must never enter cache storage. On offline launch, the shell displays connection guidance. Feeding writes require connectivity and are not queued.

Test browser install, login, logout and installed-app relaunch on the supported desktop, Android and iOS browsers. Verify scope, manifest, icons, service-worker activation and that auth/API responses are absent from cache storage. Browser containers can differ in session handling. Native app-store readiness is outside this initialization.

## Release evidence

1. Run root lint, typecheck, tests and production builds. Start the built API and verify health, authenticated session and a planner request.
2. Exercise two-owner create/preview/save/retry/log/extras/history/observation behavior and cross-owner refusal against a staging database.
3. Prove real main login, refresh, account switching, logout/relaunch, blocked status, entitlement enforcement and main survival during planner failure.
4. Rehearse dry-run migration and reverse reconciliation on synthetic fixtures, then verify a recoverable production backup before the scheduled freeze.
5. Follow [migration.md](migration.md), switch the main planner navigation after frozen-source verification, and leave exactly one planner service accepting writes.

Keep hosting, auth and database rollback procedures with the release record. Restoring an old deployment without reconciling post-cutover data can lose writes.
