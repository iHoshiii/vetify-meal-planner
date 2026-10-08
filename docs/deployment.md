# Mobile deployment preparation

The deployed planner is an Android/iOS app with a hosted API and its own database. The main Vetify application supplies a QR code linking to the app download. The browser client is retained for local development and testing only.

Build configuration does not publish an app, create a download link or deploy the API. Complete the main contract in [core-integration.md](core-integration.md) before release.

For local development without Docker, run `npm run db:local` in its own terminal. It starts loopback Mongo on port 27018 and persists development data in `.local-data/mongo`. Keep that terminal running and use `mongodb://127.0.0.1:27018/vetify_meal_planner`. The first start may download MongoDB's development binary. Docker Compose supplies the alternative documented in the README. Run `npm run seed:demo` only against the guarded local planner database.

## API hosting

Create one Vercel project rooted at `apps/api`. Enable access to files outside the project root so npm workspaces and `packages/shared` resolve. Install from the committed root lockfile using `npm ci`. Configure Node 24 where supported by the deployment account. Do not create a planner frontend hosting project.

| Setting         | API project                                           |
| --------------- | ----------------------------------------------------- |
| Framework       | Express                                               |
| Build           | `npm run build:shared && npm run build:api` from root |
| Output          | Supported Express app export in `apps/api`            |
| Public hostname | Dedicated HTTPS API hostname                          |

Vercel interprets root-relative working directories differently depending on project configuration. The API's Vercel configuration builds the shared package before the API. Verify actual preview logs and emitted Node imports. The local API listener and exported Express application are separate. Native clients call the API directly.

## Environment

Set `EXPO_PUBLIC_PLANNER_API_URL` and `EXPO_PUBLIC_MAIN_API_URL` in the EAS `production` environment to the deployed planner and main HTTPS API bases. Both APK and store profiles use this environment and Node 24.13.0. Both URL bases must end with `/api/v1`. These values are included in the app and must contain no secrets. The release app requires configured HTTPS URLs.

Set API runtime variables from `apps/api/.env.example`: `NODE_ENV=production`, `AUTH_MODE=main`, a separate planner `PLANNER_MONGODB_URI`, real `MAIN_API_URL`, bounded introspection timeout and cache TTL. Set `ALLOWED_ORIGINS` only for browser clients that are actually allowed to call the API. Native requests do not require a planner website origin. Main and planner API bases end `/api/v1` without a trailing slash. Production startup rejects mock configuration. Never configure the core JWT signing secret on the planner.

Provision separate Atlas credentials limited to the planner database. A different database on the existing cluster does not isolate cluster outages. Use a separate production Atlas deployment for fault isolation and configure its network access for the hosting runtime. Use a separate staging database and credentials.

The API caches the Mongo connection promise per runtime instance, shares concurrent initialization and resets failed attempts. Deploy indexes explicitly using the documented index command. Do not run migration or seed commands automatically on function startup. No background jobs, Socket.IO process, clinic scheduler or appointment scheduler belongs in this service.

## Android download through Google Drive

The `apk` profile in `apps/mobile/eas.json` creates an installable Android APK. An APK can be shared without a Google Play developer account. `npm run build` and `npm run build:mobile` export JavaScript bundles for verification and do not produce an APK. See [Expo's APK build instructions](https://docs.expo.dev/build-reference/apk/).

Sign into an Expo account, then run these commands from the repository root:

```powershell
npx eas-cli@latest login
npm run build:apk
```

Follow the first-build prompts to link the app to an EAS project and configure Android signing. EAS supports free accounts, subject to its plan limits. The workspace build runs from `apps/mobile`, and its post-install hook builds `packages/shared`. See [EAS setup](https://docs.expo.dev/build/setup/) and [monorepo builds](https://docs.expo.dev/build-reference/build-with-monorepos/).

After a successful build, download the `.apk`, upload it to Google Drive and give intended users download access. Put that Drive file link in the main application's QR code. Verify the link from a phone using the intended sharing permissions. Android users download the APK and permit installation from the app that opens it. Preserve the signing key for future updates.

Google Drive hosts the installation file only. The app still needs reachable planner and main account APIs. A release APK does not include the local database or demo account service.

## Future Google Play and Apple App Store release

The `production` EAS profile creates store builds. After configuring developer accounts, signing and public API URLs, run:

```powershell
cd apps/mobile
npx eas-cli@latest build --platform all --profile production
```

Submit the resulting builds through the respective stores and replace the main application's QR targets with the published download links. Android store builds use an AAB rather than the APK shared through Drive. Building does not submit an app or complete store review. See [Expo's store build prerequisites](https://docs.expo.dev/build/setup/).

An iPhone cannot install an Android APK or an unsigned IPA downloaded from Drive. iOS device distribution requires valid Apple signing and provisioning, such as TestFlight/App Store or ad hoc installation on registered devices. EAS ad hoc distribution requires a paid Apple Developer account. Until that route is available, use Expo Go for local iPhone development. See [Expo's iOS distribution requirements](https://docs.expo.dev/build/internal-distribution/).

## Native authentication before release

The mobile login screen uses Vetify's native email/password login and registration endpoints. It also accepts a personal connection QR from a signed-in Vetify computer session. Deploy the matching Vetify backend changes for these routes, token introspection, refresh and logout before distributing the app. Accounts registered in either app are shared. The client stores its native refresh token in SecureStore; its session is independent of the computer's browser session.

Deploy the native OAuth start/exchange routes and configure the existing Facebook, Google and TikTok providers to enable social sign-in. Main's public `SERVER_URL` must match the mobile main API origin, and each provider must register `/api/v1/auth/{provider}/callback` on that origin. Test the return to `vetify-planner://auth/social` in a development build or APK, rather than Expo Go. Vetify's current account model requires an email for new social accounts, so TikTok only signs in already linked identities.

Use HTTPS staging APIs to verify registration, native sign-in, personal QR connection, direct planner calls, secure credential storage, logout/relaunch and timeout/fail-closed behavior. Local test success does not prove deployment configuration. Feeding writes require connectivity and are not queued.

## Release evidence

1. Run root lint, typecheck, tests and production builds. Start the built API and verify health, authenticated session and a planner request.
2. Exercise two-owner create/preview/save/retry/log/extras/history/observation behavior and cross-owner refusal against a staging database.
3. Prove real main login, refresh, account switching, logout/relaunch, blocked status, entitlement enforcement and main survival during planner failure.
4. Rehearse dry-run migration and reverse reconciliation on synthetic fixtures, then verify a recoverable production backup before the scheduled freeze.
5. Follow [migration.md](migration.md), verify the APK download and installation through the main application's QR code, and leave exactly one planner service accepting writes after frozen-source verification.

Keep hosting, auth and database rollback procedures with the release record. Restoring an old deployment without reconciling post-cutover data can lose writes.
