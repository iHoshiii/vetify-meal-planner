# Prompt: initialize the separate Meal Planner repository

Paste everything below into the coding agent in `vetify-meal-planner`.

---

Build the separate Vetify Meal Planner application by porting the existing
implementation, preserving its behavior. This is an independent repository and
deployment, with its own feature database and shared accounts through main Vetify.
Main source is `C:\Users\Administrator\OneDrive\Desktop\Vetify`.
Read source without changing main, accessing its real `.env`, running seeders
against live databases, or copying credentials. If source access is unavailable,
ask for a source export before inventing missing behavior.

## Source to inspect and port

- `src/client/pages/planner/`, pet/planner UI components and hooks it imports.
- `src/client/services/pets.service.ts`, `meal-plans.service.ts` and
  `nutrition-observations.service.ts`.
- `src/shared/pets.ts`, `pet-age.ts`, `meal-plans.ts`, `meal-calculation.ts`,
  `meal-intake.ts`, `nutrition-observations.ts`, `planner-date.ts`.
- `src/server/routes/v1/pets.route.ts`, `meal-plans.route.ts`,
  `nutrition-observations.route.ts` and their feature-only helpers.
- `src/server/models/pets.ts`, `meal-plans.ts`, `feeding-logs.ts`,
  `nutrition-observations.ts` and related calculations/queries.
- Existing Planner, pet, feeding, nutrition and calculation tests; inventory
  transitive files and schema imports before copying.
- This repository's `docs/meal-planner-product-plan.md` and `docs/meal-planner-research.md` for
  context, distinguishing planned work from implemented behavior.

Preserve pet ownership, planning/preview calculations, saved plans, daily meal
intake and feeding logs, observations, account time zones and validations that
actually exist. Do not silently simplify formulas or change saved-data semantics.

## Independent architecture

Use the existing React/TypeScript/Vite UI and a TypeScript server API for the web
implementation. If this workspace is already the native Meal Planner repository,
keep its established platform and port only the necessary backend/contracts.
Avoid replacing an existing app scaffold. Use Node 24 where compatible with its
existing tooling, npm, a lockfile and bounded modular files.

The feature database owns pets, plans, feeding logs and nutrition observations.
It does not own users, passwords, provider identities, professional approvals,
subscriptions or main browser/native sessions. Never point its MongoDB URI at
the main Vetify database. A shared immutable main user ID identifies each owner.

Use `docs/main-deployment/shared-auth.md` in main as the authentication contract.
Main already has native session/handoff and introspection endpoints. Preserve
and consume their actual documented behavior for native clients. Web SSO needs
the main additions described in that contract; do not pretend they already exist.
Keep main JWT/social-provider secrets exclusively in main.

Login/signup initiated here must authenticate/register with main. Keep main's
unknown-account message `Create an account first to use the app.` and duplicate
signup message `Account already exist. Please login`. Do not automatically link
accounts by email. Deactivated/banned/revoked users lose protected access.

## Environment and deployment

Create safe sample environment files with placeholders:

```dotenv
NODE_ENV=development
PORT=8101
MONGODB_URI=<meal_planner_database_only>
MAIN_AUTH_ORIGIN=http://localhost:8000
AUTH_CLIENT_ID=vetify-meal-planner
AUTH_CALLBACK_URL=http://localhost:5174/auth/callback
CLIENT_ORIGIN=http://localhost:5174
VITE_API_URL=/api/v1
```

These names define the new repository's config contract; implement and validate
them. Production uses `https://planner.vetify.page`, main `https://vetify.page`
and its registered callback. Never expose server secrets in VITE variables.
Supply independent dev/build/test commands and API documentation.
Prepare deployment separately; do not create cloud resources in this task.

## Deliverables and tests

1. Produce a port manifest mapping original files to this repository and state
   any feature that cannot be copied yet. Preserve existing useful tests.
2. Implement an auth adapter behind a mockable interface. Use real main auth
   only after its contract is available; label mock/demo auth explicitly.
3. Enforce ownership server-side. Client-supplied user IDs cannot access another
   owner's pets, plans, meals or observations.
4. Verify calculation parity, units, validation, calendar/time-zone boundaries,
   leading/empty data cases and concurrent writes against isolated test MongoDB.
5. Test main-to-Planner and Planner-to-main account reuse without duplicating
   users, invalid tokens, session revocation and API-unavailable behavior.
6. Provide a migration proposal for existing feature data only. Inventory counts,
   owner IDs and wrong-cluster duplicates. Do not delete or migrate live data.
7. Include setup instructions, safe env samples, health endpoint, error handling,
   pagination where needed and a README explaining this service's boundaries.
8. Report actual commands/results and unresolved integration requirements.

Do not import main appointment, chat, realtime or professional onboarding code.
