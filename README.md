# vetify-meal-planner

Standalone pet meal planner for Android and iOS using Expo and React Native, with an Express API and its own MongoDB database. A React browser client is also retained. Vetify main provides accounts, sessions and subscriptions. A local mock account service supports development while main integration is unfinished.

## Run locally

Use Node 24 and npm 11.18 or newer for workspace dependency overrides. Run these commands from the repository root:

On Windows, use `npm.cmd` and `npx.cmd` if PowerShell blocks the corresponding `.ps1` wrappers.

```powershell
npx.cmd npm@11.18.0 install
npm.cmd run build:shared
```

Start the planner database in one terminal:

```powershell
npm.cmd run db:local
```

This starts a local MongoDB process on port 27018 and keeps its data in the ignored `.local-data/mongo` directory. The first run may download the MongoDB development binary. If Docker is available, `docker compose up -d mongo` is an alternative. Use only one of these database options at a time.

In a second terminal:

```powershell
npm.cmd run dev
```

This starts the planner API, local mock account service and Expo development server. Default settings work without creating `.env`.

Install Expo Go on your Android phone or iPhone and connect the phone and computer to the same Wi-Fi network. Scan the terminal QR code using Expo Go on Android or the Camera app on iPhone. On iPhone, sign in to Expo Go and run `npx.cmd expo login` on the computer with the same Expo account. See [Expo's device startup instructions](https://docs.expo.dev/get-started/start-developing/).

Choose a demo account in the native app. Each account owns separate planner data. Optional starter pets can be added with `npm.cmd run seed:demo`.

If a VPN or multiple network adapters cause the wrong address to be selected, stop the second terminal and set the computer's Wi-Fi IPv4 address before restarting:

```powershell
$env:PLANNER_DEV_HOST = '192.168.1.20'
npm.cmd run dev
```

Replace the example address with your computer's address. `npm.cmd run dev:mobile` starts only Expo when the API and account services are already running and reachable from the phone.

For an Android emulator, install Android Studio, start an emulator and press `a` in the Expo terminal. The iOS simulator requires macOS and Xcode. An iPhone with Expo Go works with this Windows development setup.

## Browser client

Run `npm.cmd run dev:web:stack` to start the browser client and its API/account services. Open **http://127.0.0.1:5174** and choose an account on the local demo login page.

| Service         | Local URL                      |
| --------------- | ------------------------------ |
| Frontend        | `http://127.0.0.1:5174`        |
| Planner API     | `http://127.0.0.1:8001/api/v1` |
| Mock main login | `http://127.0.0.1:8002/login`  |
| Mock main API   | `http://127.0.0.1:8002/api/v1` |

The app/API `.env.example` files describe configuration. Configure environment variables in your shell or hosting provider when overriding defaults. Keep the same loopback hostname across the browser client and mock login so browser cookies work. Stop an existing stack before starting another stack on the same ports.

## Features

- Multiple pet profiles with separate ownership, age provenance and nutrition observations.
- Existing-amount schedules and starting portion estimates for eligible adult pets.
- Guided setup, calorie-label conversion, server preview, explicit save and version history.
- Today/week schedules, feeding and extras logs, daily calorie budget and review prompts.
- Native Android and iOS screens with secure session storage. Auth and feeding writes require connectivity.
- The browser client remains an installable PWA with a static offline shell.
- Owner-scoped export and dry-run-first database migration tools.

Legacy pet condition scores and newer nine-point observations remain distinct. This extraction preserves existing calculations and warnings.

## Repository

```text
apps/mobile/    Expo and React Native Android/iOS app
apps/web/       React, Vite and PWA browser client
apps/api/       Express API and planner Mongo repositories
packages/shared/  Planner schemas, calculations and main API contract
tools/mock-main/  Development account service
scripts/       Local database, demo seed and migration tools
docs/          Main integration, deployment and cutover instructions
```

`AGENT.MD`, the discoverable `AGENTS.md`, and `CLAUDE.md` copy the source repository instructions. Commits use conventional prefixes after the requested initial commit.

## Checks

```powershell
npm run lint
npm run typecheck
npm run build
npm run build:mobile
npm test
npm run test:e2e
```

Browser checks need Chromium installed with `npx playwright install chromium`. API integration tests use disposable MongoDB databases. Built API startup is `npm run start:api`, after a build and with the database/account services available.

`npm.cmd run build:mobile` exports and verifies the Android and iOS JavaScript bundles. APK/IPA installation packages require a native build. Follow [Expo's development build instructions](https://docs.expo.dev/develop/development-builds/introduction/) when preparing device builds.

## Production integration

The local mock is development-only. Production configuration rejects mock authentication and a loopback main API. The original Vetify application still needs token introspection, subscriptions/capabilities, allowed planner origins and validated login return navigation. Native production login and refresh also require main-service integration. Existing planner endpoints retain authenticated access until a Pro capability policy is agreed.

See [main integration](docs/core-integration.md), [deployment](docs/deployment.md) and [data migration/rollback](docs/migration.md). A separate Vercel frontend/API and a dedicated production database are prepared for deployment. Real data migration, DNS changes and deployment remain separate operations.
