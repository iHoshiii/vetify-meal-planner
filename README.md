# vetify-meal-planner

Native pet meal planner for Android and iOS using Expo and React Native, with an Express API and its own MongoDB database. The browser client is for local development and tests. Production distributes a mobile app and hosts the backend API. Vetify main provides the shared accounts and sessions. The browser preview uses a local mock account service.

## Run locally

Use Node 24 and npm 11.18 or newer for workspace dependency overrides. Run these commands from the repository root:

On Windows, use `npm.cmd` and `npx.cmd` if PowerShell blocks the corresponding `.ps1` wrappers.

```powershell
npx.cmd npm@11.18.0 install
npm.cmd run build:shared
```

Start the mobile app and its local services with one command:

```powershell
npm.cmd run dev:mobile:local
```

This starts the planner MongoDB on port 27018, the planner API on 8001, the real Vetify account API on 8000 and Expo Go. Planner data persists in the ignored `.local-data/mongo` directory. The first run may download the MongoDB development binary. An existing healthy Vetify API is reused.

Expo starts after the planner API reports its database is connected. If local Mongo stops, the command reports the failure and stops its own services. Ctrl+C waits for those services to exit before stopping Mongo; a database started by another command is left running.

The Vetify repository must be next to this repository, with its dependencies and existing database/server configuration ready. Set `PLANNER_MAIN_ROOT` if its folder is elsewhere. Mobile startup runs Vetify's development API entry without its scheduled background jobs; it uses Vetify's existing account database. `npm.cmd run dev` starts the same services with an already running planner database, such as `npm.cmd run db:local` or Docker Compose.

The Expo project lives in `apps/mobile`, so direct CLI startup from the repository root is `npx.cmd expo start apps/mobile`.

Install Expo Go on your Android phone or iPhone and connect the phone and computer to the same Wi-Fi network. Scan the terminal QR code using Expo Go on Android or the Camera app on iPhone. On iPhone, sign in to Expo Go and run `npx.cmd expo login` on the computer with the same Expo account. See [Expo's device startup instructions](https://docs.expo.dev/get-started/start-developing/).

Log in with your Vetify email and password, or sign up in the app. Both applications use the same accounts. Check **Remember me** to stay signed in after closing and reopening the app; leave it unchecked to require login after a full restart. To connect an account already signed in on a computer, scan its personal connection QR from Vetify Settings. This connection QR is separate from the Expo development QR and the app download QR.

For the same dummy consumer account as Vetify, run `npm.cmd run seed:account` here. It creates `user@gmail.com` with password `password123` in Vetify's configured development account database. Both apps can log in with it. Repeated runs keep an existing account unchanged, and the command refuses to run in production.

Facebook, Google and TikTok buttons use Vetify's configured social providers. Social sign-in requires a development build or installed APK; Expo Go supports email/password testing. The main `SERVER_URL` must be reachable from the phone, match the mobile main API origin, and have its provider callback URLs registered. TikTok can sign in an existing linked account; Vetify currently cannot create a new social account when its provider supplies no email. See [Expo's authentication guide](https://docs.expo.dev/guides/authentication/).

To test social login on Android, install a development build once. With Android Studio's SDK and Java configured, connect the phone by USB, enable USB debugging, and run `npm.cmd run build:android:dev`. This compiles and installs the app without starting another Metro server. If you prefer a cloud build, run `npm.cmd run build:android:dev:cloud` after signing in to EAS, then install its APK; an Expo account and available build quota are required. Neither route publishes to Google Play. See [Expo's development build instructions](https://docs.expo.dev/develop/development-builds/introduction/).

After installing the development app, start its database, APIs and development server with:

```powershell
npm.cmd run dev:mobile:client:local
```

Scan this command's QR code in the installed development app. `dev:mobile:local` continues to target Expo Go. Before testing a provider, configure one phone-reachable main API origin for both main's `SERVER_URL` and mobile's `EXPO_PUBLIC_MAIN_API_URL` (the latter ends with `/api/v1`), and register that origin's `/api/v1/auth/{provider}/callback` in the provider console. Use HTTPS for provider callbacks that require it. A `localhost` callback refers to the phone when opened there, and the Expo tunnel only carries Metro traffic. The main account API and its database must also be running and reachable.

If the phone cannot reach Metro over Wi-Fi, run `npm.cmd run dev:mobile:local -- --tunnel`. The tunnel carries Expo traffic; the phone still needs Wi-Fi access to the account and planner APIs on ports 8000 and 8001.

If a VPN or multiple network adapters cause the wrong address to be selected, stop the development command and set the computer's Wi-Fi IPv4 address before restarting:

```powershell
$env:PLANNER_DEV_HOST = '192.168.1.20'
npm.cmd run dev:mobile:local
```

Replace the example address with your computer's address. `npm.cmd run dev:mobile` starts only Expo when the API and account services are already running and reachable from the phone.

If email/password login cannot connect, open the printed **Vetify account API** URL with `/health` appended in the phone's browser. It must return `status: ok` and `db: connected`. After updating startup scripts, stop the old stack with Ctrl+C and restart `npm.cmd run dev:mobile:local`. A running mock account service on port 8002 does not provide the mobile app's shared accounts on port 8000.

On Windows, check for enabled inbound Block rules for Node.js on the active network profile. Explicit Block rules override port Allow rules. For a trusted Private Wi-Fi network, allow Node.js TCP ports 8000, 8001 and 8081 from the local subnet. See [Windows Firewall rule precedence](https://learn.microsoft.com/en-us/windows/security/operating-system-security/network-security/windows-firewall/rules).

Failed account requests produce development logs prefixed `[auth]` with the endpoint and failure category or HTTP status, without credentials or response bodies. To inspect a warning shown at the bottom of Expo Go, tap it for details or press `j` in the Expo terminal and open the React Native DevTools Console. See [Expo's logging instructions](https://docs.expo.dev/workflow/logging/).

The real Vetify API needs its existing MongoDB connection. If startup reports an Atlas connection or TLS failure, check that the cluster is running and that the computer's current public IP is allowed in Atlas Network Access. These are checks for possible causes; a TLS alert alone does not identify the cause. See [Atlas connection troubleshooting](https://www.mongodb.com/docs/atlas/troubleshoot-connection/).

For an Android emulator, install Android Studio, start an emulator and press `a` in the Expo terminal. The iOS simulator requires macOS and Xcode. An iPhone with Expo Go works with this Windows development setup.

## Local browser preview

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
- A selected pet in the mobile header, with a pet switcher and separate user account actions for Pets, Export my data and Log out.
- Mobile Foods, Tracker and Progress tabs: saved packaged-food labels, daily feeding logs and monthly recorded progress.
- Custom food labels stored per pet and available during meal-plan setup. Built-in catalog entries can be added to `packages/shared/src/foods.ts` after verifying their package calories, species, life stage and label source. The initial catalog is empty.
- Existing-amount schedules and starting portion estimates for eligible adult pets.
- Guided setup, calorie-label conversion, server preview, explicit save and version history.
- Feeding and extras logs, daily calorie budget and review prompts. Monthly progress preserves historical food density and plan versions; missing intake stays unknown.
- Native Android and iOS screens with optional secure session storage. Auth and feeding writes require connectivity.
- The browser client remains an installable PWA with a static offline shell.
- Owner-scoped export and dry-run-first database migration tools.

Legacy pet condition scores and newer nine-point observations remain distinct. This extraction preserves existing calculations and warnings.

## Repository

```text
apps/mobile/    Expo and React Native Android/iOS app
apps/web/       Local browser preview and automated tests
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

`npm.cmd run build` builds shared code, native JavaScript bundles and the API. `npm.cmd run build:mobile` verifies Android and iOS bundles but does not create an installer. `npm.cmd run build:apk` requests an Android APK through EAS Build after account, signing and API configuration. See [mobile distribution](docs/deployment.md) for Google Drive downloads and later store releases.

## Production integration

The local mock is development-only. Production configuration rejects mock authentication and a loopback main API. Deploy the matching Vetify backend changes for token introspection, native email/password login, registration, refresh, logout and personal QR connection. Both apps use the same main account and subscription; the mobile Account screen displays its verified Free or Pro plan and refreshes it on resume and at the authorization validity boundary. Existing planner endpoints retain authenticated access until a paid feature policy is agreed.

See [main integration](docs/core-integration.md), [deployment](docs/deployment.md) and [data migration/rollback](docs/migration.md). Deploy the API with a dedicated production database and distribute the native app. The main application's QR code points to the APK download now and the app-store listings later. Real data migration, DNS changes, signed native builds and deployment remain separate operations.
