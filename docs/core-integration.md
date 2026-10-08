# Connect the planner to Vetify main

The planner is independently initialized. Production SSO and subscriptions require the following main-repository work. The source application currently has no `/api/v1/auth/introspect` implementation or subscription authority. Local mock success does not establish production SSO.

## Required main API

Implement `POST /api/v1/auth/introspect` using the presented main-issued Bearer token. Main verifies signature, token expiry, current account state and subscription validity. Its response is the versioned contract in `packages/shared`, with these fields:

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

To test real main after implementing this contract, use `AUTH_MODE=main`, point backend `MAIN_API_URL` to port 8000, change the web `/main-api` proxy target to 8000 and set `VITE_MAIN_LOGIN_URL` to real main's login screen. Keep versioned bases ending `/api/v1` without a trailing slash. Main must allow the web origin and validated return URL. Changing URLs alone cannot supply its missing endpoints.

Mock main binds to loopback and uses a unique httpOnly demo cookie. It owns deterministic demo identities. The planner has no users collection. Production configuration rejects mock mode. Mock credentials and capability settings are development fixtures only.

## Account lifecycle and export

At cutover, change main account export to include core data and a planner export link. Planner `GET /api/v1/export` authenticates independently and returns only the caller's four planner collections. Main must finish its own export when the planner is unavailable.

Deactivation retains planner data and blocks access through main account checks. Future deletion/anonymization requires durable authenticated lifecycle delivery with retries and idempotent planner cleanup. Main should record pending delivery and finish its account operation even while the planner is down. Account deletion is outside initialization.

Before cutover, verify native login, refresh, logout/relaunch, active/blocked account behavior, entitlement refusal, account timezone boundaries, ownership enforcement and main availability during a planner outage. The native app stores refresh tokens with Expo SecureStore. Main must provide the native authentication protocol, and production native sign-in still needs integration.
