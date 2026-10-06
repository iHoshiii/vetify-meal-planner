# vetify-meal-planner

Standalone pet meal planner with a React frontend, Express API and its own MongoDB database. Vetify main provides accounts, sessions and subscriptions. This repository includes a local mock of that account service so development does not depend on unfinished main integration.

## Run locally

Use Node 24 and npm. Install and build the shared package:

On Windows, use `npm.cmd` and `npx.cmd` if PowerShell blocks the corresponding `.ps1` wrappers.

```powershell
npm install
npm run build:shared
```

Start the planner database in one terminal:

```powershell
npm run db:local
```

This starts a local MongoDB process on port 27018 and keeps its data in the ignored `.local-data/mongo` directory. The first run may download the MongoDB development binary. If Docker is available, `docker compose up -d mongo` is an alternative. Use only one of these database options at a time.

In a second terminal:

```powershell
npm run dev
```

Open **http://127.0.0.1:5174**. The app redirects to the local demo login. Choose either account. Each account owns separate planner data. Optional starter pets can be added with `npm run seed:demo`.

| Service         | Local URL                      |
| --------------- | ------------------------------ |
| Frontend        | `http://127.0.0.1:5174`        |
| Planner API     | `http://127.0.0.1:8001/api/v1` |
| Mock main login | `http://127.0.0.1:8002/login`  |
| Mock main API   | `http://127.0.0.1:8002/api/v1` |

Default development settings work without creating `.env`. The app/API `.env.example` files describe configuration. Configure environment variables in your shell or hosting provider when overriding defaults. Keep the same loopback hostname across the web app and mock login so browser cookies work.

## Features

- Multiple pet profiles with separate ownership, age provenance and nutrition observations.
- Existing-amount schedules and starting portion estimates for eligible adult pets.
- Guided setup, calorie-label conversion, server preview, explicit save and version history.
- Today/week schedules, feeding and extras logs, daily calorie budget and review prompts.
- Installable web app with a static offline shell. Auth and feeding writes require connectivity.
- Owner-scoped export and dry-run-first database migration tools.

Legacy pet condition scores and newer nine-point observations remain distinct. This extraction preserves existing calculations and warnings.

## Repository

```text
apps/web/       React, Vite and PWA frontend
apps/api/       Express API and planner Mongo repositories
packages/shared/  Planner schemas, calculations and main API contract
tools/mock-main/  Loopback-only development account service
scripts/       Local database, demo seed and migration tools
docs/          Main integration, deployment and cutover instructions
```

`AGENT.MD`, the discoverable `AGENTS.md`, and `CLAUDE.md` copy the source repository instructions. Commits use conventional prefixes after the requested initial commit.

## Checks

```powershell
npm run lint
npm run typecheck
npm run build
npm test
npm run test:e2e
```

Browser checks need Chromium installed with `npx playwright install chromium`. API integration tests use disposable MongoDB databases. Built API startup is `npm run start:api`, after a build and with the database/account services available.

## Production integration

The local mock is development-only. Production configuration rejects mock authentication and a loopback main API. The original Vetify application still needs token introspection, subscriptions/capabilities, allowed planner origins and validated login return navigation. Existing planner endpoints retain authenticated access until a Pro capability policy is agreed.

See [main integration](docs/core-integration.md), [deployment](docs/deployment.md) and [data migration/rollback](docs/migration.md). A separate Vercel frontend/API and a dedicated production database are prepared for deployment. Real data migration, DNS changes and deployment remain separate operations.
