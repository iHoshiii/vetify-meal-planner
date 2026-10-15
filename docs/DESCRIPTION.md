# Vetify Meal Planner: application description

Updated 14 October 2026. This repository already contains an Expo/React Native
application, TypeScript API, shared packages and tests. It is not an empty web
scaffold. Existing README and deployment/integration docs define actual commands.

## Purpose and users

Help pet owners manage pet profiles, food records, meal plans, feeding intake
and nutrition observations. Android/iOS are the intended native clients; the
browser preview serves development/test use and currently uses mock auth.
Plans and observations are support tools, not a substitute for veterinary review.

## Feature scope and ownership

Own pet profiles, meal planning/calculations, feeding records, saved foods,
diet entries, assessments, targets and nutrition observations as implemented.
Keep calorie/amount/unit validation, birth-month age, time-zone/calendar handling,
owner isolation and separation of planned meals from actual recorded intake.
Do not silently change formulas or infer that a scheduled meal was consumed.

The feature database owns `pets`, `meal_plans`, `feeding_logs`,
`nutrition_observations`, `saved_foods`, `diet_entries`, `diet_assessments`
and `diet_target_snapshots`. Credentials must have access only to that database.
Preserve the database names/configuration defined by this repository's reviewed
audit rather than substituting main's connection or credentials.

Main owns users, passwords, provider linking, verification, account status,
professional approval, subscription authority and canonical sessions.
Planner uses immutable main user IDs and does not create its own users collection.
Features enforce ownership and any approved entitlement policy server-side.

## Current shared-account integration

Native clients use main's native auth/session APIs and handoff/QR integration.
The current Planner docs require introspection **version 2**, while inspected
main returns **version 1**. Issuer/audience and provider/email-verification
attributes need coordinated main work and joint tests before release.
See [the shared-account audit](shared-account-audit.md) and
[core integration](core-integration.md) for the actual versioned contract.
Never receive the main JWT signing secret or access its database directly.

Signup from either app must reach the same main identity. Keep six-digit signup
verification, five-minute expiry, sixty-second resend and code replacement.
Unknown login: `Create an account first to use the app.`
Duplicate signup: `Account already exist. Please login`
Matching provider emails require main's explicit linking, not automatic merging.
Disabled/revoked/unverified accounts cannot retain protected feature access.

## Architecture and deployment

Use the existing `apps/mobile`, API and shared-package organization.
Follow [README](../README.md) for Node/npm versions and local mobile commands,
and [deployment](deployment.md) for the established service configuration.
Do not replace the scaffold with the embedded main web Planner.
If useful legacy functionality is ported from main, produce a parity map first.

Native sessions and external browser SSO are different integrations. A future
`planner.vetify.page` host is only a proposal and does not imply deployed hosting.
Production rejects mock authority and must use real verified main integration.

## Acceptance and migration

Verify supported calculations, calendar boundaries, validation, ownership,
feeding/observation writes and concurrent updates with isolated test storage.
Run joint main/Planner checks for signup in either direction, duplicates,
verification, linked providers, refresh/revocation, account switching and outages.
Current main tests do not establish the new v2 contract automatically.

Retain audited backups and owner reconciliation. Main's historical Planner data
has not been declared disposable; migration needs authorized export, verified
identity proof and review. Email equality is not a canonical ownership mapping.
An independent database does not by itself limit an overprivileged Atlas user.

## Exclusions

Professional applications, main appointments/messages/calls, AI Vet Assistant,
Books, Anatomy and Blog are not Planner services. Main account QR/handoff and
central subscription checks remain main infrastructure.
