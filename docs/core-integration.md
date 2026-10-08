# Connect the planner to Vetify main

The planner has its own database and uses Vetify main as its account authority. The matching Vetify backend implements `/api/v1/auth/introspect` and native sessions. Deploy both repositories together for these integrations. Subscription authority and paid capability policy remain separate work.

## Native login and registration

The app calls `POST /api/v1/auth/native/login` with email and password, or `/auth/native/signup` with name, email, password and confirmPassword. Main uses the same account validation, password hashing and account collection as its browser login and registration. Both routes return a native access token, rotating refresh token and user. The planner never stores passwords or creates its own users collection.

Social login starts with `POST /auth/native/oauth/start` using the provider, app state and S256 proof challenge. The browser uses main's existing registered provider callback. A verified native callback returns a 60-second, single-use code to `vetify-planner://auth/social`; `/auth/native/oauth/exchange` requires the app's verifier before creating its native session. Access and refresh tokens do not enter callback URLs, and ordinary browser OAuth keeps its existing behavior. Expo Go cannot receive this app scheme; use an installed development or release build.

For a user already signed in on a computer, Vetify Settings creates a short-lived, single-use personal connection QR. The mobile app exchanges its code through `/auth/native/exchange`. This creates an independent native session. `/auth/native/refresh` rotates its credential; `/auth/native/logout` revokes the native session. A public app-download QR does not carry a personal login session.

## Required main API

`POST /api/v1/auth/introspect` uses the presented main-issued Bearer token. Main verifies signature, token expiry, native session validity and current account state. Its response is the versioned contract in `packages/shared`, with these fields:

```json
{
  "version": 1,
  "user": { "id": "MAIN_USER_ID", "role": "user", "status": "active" },
  "region": { "timeZone": "Asia/Manila" },
  "subscription": { "plan": "free", "status": "active", "expiresAt": null },
  "entitlements": [],
  "tokenExpiresAt": "2026-10-07T01:00:00.000Z",
  "validUntil": "2026-10-07T01:00:00.000Z"
}
```

These dates illustrate the format. Compute actual dates from the verified credential and current authority. `validUntil` must not exceed token expiry or the next entitlement/account validity boundary. IDs are strings over HTTP. Never return passwords, refresh sessions or signing secrets.

Return 401 for invalid/expired credentials, 403 for blocked accounts, and 503 for unavailable authority. The planner validates the response and caches positive authorization for at most 30 seconds, capped by `validUntil`. It hashes cache keys, bounds cache size and rejects expired cache during outages. Subscription changes and account bans therefore take effect within that window.

Maintain subscription state and capabilities in main. Roles and subscription plans are separate. Admin-managed test subscriptions are sufficient until a payment system is chosen. Decide the actual paid capability policy before adding entitlement gates to currently accessible planner routes. `requireEntitlement` is implemented and tested, but extraction alone does not define a new paid feature.

## Browser login and refresh

Allow exact configured planner origins for credentialed auth requests and OPTIONS. Keep `CLIENT_ORIGIN` as the canonical URL for emails. Add a separate `ALLOWED_ORIGINS` list rather than replacing it with a comma-separated canonical origin.

Accept `returnTo` on login and OAuth completion only after parsing it and matching its origin against an exact HTTPS allowlist. Reject URL credentials, protocol-relative URLs, lookalike hosts and arbitrary subdomains. Allow exact local origins independently. Preserve only validated return state through OAuth.

The planner calls main login/refresh/logout with credentials, stores access tokens only in memory, and calls planner data routes with Bearer headers. On each launch it attempts main refresh before deciding to redirect. Concurrent 401s share one refresh and retry a request at most once. A 403 or 503 does not trigger logout. Query data and drafts are scoped to the main user and cleared on identity changes.

A host-only refresh cookie on the main API host supports credentialed calls from same-site sibling apps. A shared `.vetify.com` cookie is optional. If main chooses one, clear precisely its domain/path on logout and account for the session reset when changing scope. Production uses HTTPS sibling domains. A `vercel.app` preview is cross-site and cannot prove a SameSite=Lax production flow.

## Local integration

| Service            | Local URL                      |
| ------------------ | ------------------------------ |
| Planner web        | `http://localhost:5174`        |
| Planner API        | `http://localhost:8001/api/v1` |
| Mock main          | `http://localhost:8002/api/v1` |
| Existing real main | `http://localhost:8000/api/v1` |

The web dev proxy forwards `/api` unchanged to 8001 and rewrites `/main-api` to `/api` on 8002. Web defaults are `VITE_PLANNER_API_URL=/api/v1`, `VITE_MAIN_API_URL=/main-api/v1` and `VITE_MAIN_LOGIN_URL=http://localhost:8002/login`. Backend `MAIN_API_URL` is `http://localhost:8002/api/v1`.

`npm run dev:mobile:local` starts or reuses real main on port 8000 and configures the planner with `AUTH_MODE=main`. It starts Vetify's development API entry without its scheduled background jobs. Main must have its dependencies and database/server configuration ready. Native clients use the computer's LAN address; versioned bases end `/api/v1` without a trailing slash. The browser preview keeps the mock service. Testing it against real main also requires changing its proxy/login URLs and configuring allowed browser origins and return navigation.

Mock main binds to loopback and uses a unique httpOnly demo cookie. It owns deterministic demo identities. The planner has no users collection. Production configuration rejects mock mode. Mock credentials and capability settings are development fixtures only.

## Account lifecycle and export

At cutover, change main account export to include core data and a planner export link. Planner `GET /api/v1/export` authenticates independently and returns only the caller's four planner collections. Main must finish its own export when the planner is unavailable.

Deactivation retains planner data and blocks access through main account checks. Future deletion/anonymization requires durable authenticated lifecycle delivery with retries and idempotent planner cleanup. Main should record pending delivery and finish its account operation even while the planner is down. Account deletion is outside initialization.

Before cutover, verify native registration, login, QR connection, refresh, logout/relaunch, active/blocked account behavior, entitlement refusal, account timezone boundaries, ownership enforcement and main availability during a planner outage. The native app stores refresh tokens with Expo SecureStore. Deploy and verify the matching main authentication routes against staging before release.
