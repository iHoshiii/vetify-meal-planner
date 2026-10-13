# Shared account integration audit

Planner uses main's authentication API and canonical ownership IDs, with its own database. This repository now requires introspection version 2. The inspected main backend implements version 1. Coordinated backend changes and joint application testing remain pending.

## Database results

The original configured connection selected an empty `test` database, with zero collections/documents. The user identified `Vetify` as main's database and requested a new planner database. Created `vetify_meal_planner` with indexes for all eight runtime collections: `pets`, `meal_plans`, `feeding_logs`, `nutrition_observations`, `saved_foods`, `diet_entries`, `diet_assessments`, `diet_target_snapshots`. Its inventory contains zero documents. Updated the ignored planner `.env`; startup now loads it, with shell/hosting variables taking precedence.

Verified private artifacts are in `.local-data/account-audit/reference-test/` and `.local-data/account-audit/dedicated-planner/`, each containing `report.ejson` and `backup/manifest.ejson` plus BSON files. Privilege evidence is `.local-data/account-audit/database-access.json`.

The supplied credential has `atlasAdmin` privileges. Runtime now rejects broad/main-database data privileges, implicit database names and the main `Vetify` namespace. An Atlas operator must create a separate user with `readWrite` only on `vetify_meal_planner`, replace the planner URI credential and verify startup. Selecting a separate database does not restrict the old credential. Planner has no reason to receive main database credentials or JWT signing secrets.

**Cleanup proposal: delete nothing.** Preserve `Vetify`. No main account collection was read, changed or deleted. Main's historical planner data was not audited or declared disposable. If it must move, obtain a planner-only export through main's authorized service boundary, have its operator back up the source, inventory records and review all ownership mappings before writes. No destructive cleanup is proposed for the inspected empty namespace.

## Audit, backup and reconciliation tools

`npm run db:audit-accounts -- --config apps/api/.env` only reads MongoDB and writes ignored local artifacts. It inventories every collection, field presence, indexes, options and ownership references. Document evidence and runtime model shape inform classification. Unknown records, subscriptions and old credential records remain preserved; collection names do not justify deletion.

Backups store exact BSON document frames, options/indexes and SHA-256 checksums. Verification reads every frame and checks counts. `restoreBackupIntoEmptyDatabase` refuses a nonempty destination. Tests restore all eight collections, subscriptions and unknown website records, including ObjectIds, dates, binary, decimal and 64-bit numbers. Captures are per collection: freeze writers and repeat before a real cutover, then rehearse restoration. Keep artifacts private if historical credentials are present.

Optional `--canonical-export` accepts summaries from an authorized main API/export, never its MongoDB. `--proofs` accepts reviewed identity evidence. Every discovered ownership ID gets an old-ID-to-shared-ID proposal. Email equality is never proof. Missing evidence, conflicting destinations, professional conflicts and many-to-one mappings require review. There is no apply mode.

Canonical export and proof formats:

```json
[{ "id": "CANONICAL_ID", "email": "owner@example.test", "role": "professional" }]
```

```json
[
  {
    "oldId": "LEGACY_ID",
    "sharedId": "CANONICAL_ID",
    "evidence": "both-methods-authenticated",
    "reference": "review-ticket-or-authenticated-proof-reference"
  }
]
```

Current mapping: zero rows because the new database has no records. No canonical export was supplied and no accounts were reconciled. Future approved migration changes only proven ownership references across all collections and preserves `_id`, pet/plan/food references, snapshots, subscriptions, unknown fields and history. Never overwrite shared names, methods or roles. The older four-collection `migrate` CLI only converts an ObjectId to its existing hex ID; it cannot reconcile independent accounts.

## Inspected real endpoints

Source inspected: sibling `Vetify/src/server`. Routes below already exist, under `/api/v1`.

| Route                                                               | Contract                                                                                                   |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `POST /auth/native/signup`                                          | `{name,email,password,confirmPassword}` returns access/refresh tokens, public user and `emailVerification` |
| `POST /auth/native/login`                                           | `{email,password}` returns access/refresh tokens and public user                                           |
| `POST /auth/native/refresh`, `/auth/native/logout`                  | `{refreshToken}`                                                                                           |
| `POST /auth/native/email/verify`                                    | Bearer token, `{code:"012345"}`, returns `{user}`                                                          |
| `POST /auth/native/email/resend`                                    | Bearer token, returns `{sent,expiresAt,resendAvailableAt}`                                                 |
| `POST /auth/native/oauth/start`, `/auth/native/oauth/exchange`      | Existing app state, S256 PKCE, client and redirect contract                                                |
| `POST /auth/introspect`                                             | Bearer token, currently returns version 1 principal                                                        |
| `POST /auth/signup`, `/auth/login`, `/auth/refresh`, `/auth/logout` | Main website account routes using browser refresh cookie                                                   |

Main already enforces six digits, five-minute expiry, 60-second resend, replacement invalidation, single consumption and limited guesses. Its middleware blocks unverified local access to introspection/protected website routes. Planner now displays confirmation before protected features, retains server timing through refresh, clears old input on resend and distinguishes verification/account refusal from connection failure.

Planner preserves exact duplicate/missing messages and maps incorrect passwords to `Invalid credentials`. Network, timeout and 5xx errors are connection errors. Ownership guards reject results completing after account switching/logout. Shared professional/admin roles grant no Planner administrative capabilities.

## Exact main changes still required

| Main source                                                                                                 | Required change                                                                                                                                                                                                                                                                                                        |
| ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/server/config/env.ts`                                                                                  | Configure a canonical JWT issuer and permitted audiences. Local coordinated issuer is `http://127.0.0.1:8000`; production needs an explicit stable issuer in both services.                                                                                                                                            |
| `src/server/services/auth.service.ts`, `native-session.service.ts`                                          | Mint signed `iss`, intended `aud`, required `exp` and canonical `sub`. Planner audience is `vetify-meal-planner`. Browser refresh used by Planner must issue an intended Planner token, or an explicit multi-audience token. Reject arbitrary caller-selected audiences.                                               |
| `src/server/middleware/introspection-guard.ts`, `optionalAuth.ts`, `realtime/socket.ts` and other verifiers | Verify algorithm/signature, required expiry, issuer, audience and subject. Introspection must also check native session, status, verification and subscription boundaries. Retire old tokens missing these claims through a controlled session reset.                                                                  |
| `src/server/routes/v1/auth-introspection.route.ts`                                                          | Return version 2 below only after verifying the token for Planner. Derive issuer/audience from verified claims/server configuration and provider/verification from the canonical account. Preserve existing validity boundaries.                                                                                       |
| `src/server/services/local-auth.service.ts`                                                                 | Set wrong-password text to exactly `Invalid credentials` for both interfaces. Missing and duplicate messages already match.                                                                                                                                                                                            |
| `src/server/services/auth.service.ts`, `findOrCreateOAuthUser`                                              | Preserve every existing name, ID, role and linked method during login. Current code replaces ordinary names from provider data and may replace professional names from licence data.                                                                                                                                   |
| Website/native OAuth start and callback                                                                     | Distinguish explicit signup intent from login. Current unknown-identity OAuth login may create an account when email is available. Login must return `signup-required`; signup may create a shared account. Support the explicit intent parameter described below and bind it through OAuth state.                     |
| Main password-reset service/routes/mail                                                                     | No recovery API exists. `/account/password` changes a known password. Implement authoritative recovery request/confirmation with expiring single-use hashed secrets, rate limits, mail and browser/native revocation. Finalize actual routes/schemas before Planner integrates. No reset endpoints were invented here. |

Required response, with example dates:

Planner now sends `intent: "login" | "signup"` to the existing native OAuth start endpoint. The main backend must add this field to `src/shared/native-auth.ts` and bind it into signed state through callback. Its old strict schema rejects this request, preventing accidental account creation until the backend change is deployed. Website OAuth needs the same distinction. No endpoint name changed.

```json
{
  "version": 2,
  "issuer": "http://127.0.0.1:8000",
  "audience": "vetify-meal-planner",
  "user": {
    "id": "CANONICAL_ID",
    "role": "professional",
    "status": "active",
    "provider": "local",
    "emailVerified": true
  },
  "region": { "timeZone": "Asia/Manila" },
  "subscription": { "plan": "free", "status": null, "expiresAt": null },
  "entitlements": [],
  "tokenExpiresAt": "2026-10-13T15:15:00.000Z",
  "validUntil": "2026-10-13T15:00:30.000Z"
}
```

Set Planner `MAIN_TOKEN_ISSUER` to main's exact issuer. Unsupported version/missing verification/wrong audience fails closed as an invalid authority response. Wrong issuer/expired tokens are unauthorized. Positive caching lasts at most 30 seconds, capped by account/token/subscription validity.

Explicit linking stays in main Settings > Security (`/settings/security`). Google/Facebook linking uses `POST /account/login-methods/:provider`, current password, a matching authenticated browser session and authenticated OAuth proof. Social-first password addition uses provider reauthentication and a short-lived session-bound proof. Planner shows linking instructions and never merges by email. TikTok can sign in an existing linked identity; the inspected Settings API does not offer TikTok linking.

## Validation and release gate

Final repository verification: 609 tests passed in 69 suites, including full ownership isolation and backup restoration; one Chromium end-to-end test passed with the mock authority. Lint, TypeScript, Prettier, API/browser production builds and Android/iOS JavaScript bundles passed. Evidence is retained in `.local-data/shared-account-tests.log`, `shared-account-e2e.log`, `shared-account-mobile-build.log` and `shared-account-format.log`. No signed app or deployment was produced.

The inspected main backend passed 125 tests across 18 existing suites using temporary MongoDB, test credentials and disabled real `.env` loading. Evidence: `.audit-main-tests/result.log`. These cover website/native signup/login in both directions, duplicates/missing accounts, professional preservation, verification boundaries/security, social collisions/both-method linking, switching, expiration, refresh and revocation. They validate existing main behavior, not the new contract or absent recovery flow.

Repository tests cover contract refusal, unverified denial, profile preservation, connection errors, switching, user isolation, confirmation UI and full BSON restoration. Release still requires both actual applications tested together with main version 2, restricted Planner credentials, working email delivery, real social callbacks and finalized recovery API. Test signup in each then login in the other, duplicate/missing/wrong-password/outage cases, code replacement/expiry/cooldown, linked methods, expiration/revocation, switching and cross-user read/write/export denial. Updated cross-app authentication has not been established.
