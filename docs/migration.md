# Planner data migration and rollback

No real source-data migration runs during initialization. The CLI is read-only unless `--apply` is supplied. It accesses only `pets`, `meal_plans`, `feeding_logs` and `nutrition_observations`; accounts, passwords and refresh sessions stay in main.

## Commands

Every URI must include its database name. Supply explicitly separate source and target namespaces. Use placeholder values below as a template, with credentials kept out of shell history and screenshots where possible.

```powershell
npm run migrate -- --source-uri "mongodb://localhost:27017/old_planner_rehearsal" --target-uri "mongodb://localhost:27017/new_planner_rehearsal"
npm run migrate -- --source-uri "mongodb://localhost:27017/old_planner_rehearsal" --target-uri "mongodb://localhost:27017/new_planner_rehearsal" --apply
```

Omitting `--apply` performs source/target inspection and preflight verification without writes or index changes. Run tests with `npm run test:migration`. Tests use synthetic collection adapters and isolated MongoMemoryServer databases to verify BSON preservation, actual unique indexes, dry-run behavior, identical reruns, conflicts, invalid references and rollback changes. They access no source application data and do not replace an Atlas staging rehearsal with the deployment's credentials and indexes.

Forward copy transforms only `ownerId` from BSON ObjectId to its lowercase main ID string. `_id`, `petId`, `planId`, dates, binary values, numeric BSON types, snapshots, age provenance and unknown fields are preserved. Reverse copy requires valid lowercase hexadecimal strings and restores BSON ObjectId owners. Driver reads disable BSON numeric promotion, and hashes use deterministic sorted canonical Extended JSON with only the owner representation normalized.

The tool loads four snapshots in memory. It is intended for the current low-volume planner. Inventory volume before production use. If snapshots exceed the available memory, implement bounded iteration/checkpointing and rehearse that version before scheduling cutover.

## What verification checks

- Counts per collection and owner, sorted canonical record hashes, and complete source/target hash agreement after copying.
- BSON document/reference IDs, expected owner representation and owner-matched pet/plan references.
- Unique owner/pet/version, owner/requestId and owner/plan/day/meal keys.
- Contiguous plan versions from 1, valid account-plan timezones, activation dates, nonoverlapping windows and calendar feeding/observation dates.

Apply creates the planner indexes before copying. Records are keyed by original `_id`. Identical target records are skipped. Conflicting records fail preflight before writes. Target-only records also fail because a cutover destination must be a clean copy or an identical resumed copy. The tool never deletes records.

Actual copying is not atomic across clusters. An interrupted insert copy can resume while the source remains frozen. Inspect a failed reverse reconciliation carefully because edited documents can temporarily have changed activation windows. Do not release either write freeze until final verification passes. The CLI suppresses raw connection errors to avoid logging URI credentials.

## Bounded write-freeze cutover

1. Inventory real source collections and take a recoverable backup. Restore that backup into an isolated rehearsal database and run the dry run. All pre-freeze operations against live data are read-only.
2. Complete real SSO, feature parity, index checks and staging browser validation. Schedule and announce the bounded planner write freeze.
3. Disable old pet/planner/observation writes at the main API, including clients calling those endpoints directly. Freeze before the first real `--apply` command. A hidden main navigation link alone does not freeze writes.
4. Dry-run frozen source against the separate clean destination. Investigate every dangling reference, duplicate, version/window problem or target conflict. Fix or explicitly reconcile the data under the freeze before continuing.
5. Apply, retain the JSON verification report, then rerun the dry run against the same frozen source. Require identical hashes and counts. Empty source collections need indexes and no backfill.
6. Switch main planner navigation and routes to the new service. Confirm only the new service accepts planner writes, then release that write freeze.
7. Retain old collections, recoverable backup and release evidence through the agreed rollback period. Do not delete source collections during initialization or cutover.

Exactly one service owns planner writes. An uninterrupted-write migration needs durable replay, idempotency and checkpoints first. Ad hoc dual writes are not part of this plan.

## Rollback after new writes

Before any new writes, routes can return to the unchanged old data. After cutover writes, freeze the new planner first. Back up both databases, then reverse-copy the new authoritative dataset into the old collections. Plain reverse mode still refuses edited target records. Explicit `--reconcile` allows replacing them while inserting records created after cutover.

```powershell
npm run migrate -- --source-uri "mongodb://localhost:27017/new_planner_rehearsal" --target-uri "mongodb://localhost:27017/old_planner_rehearsal" --direction reverse --reconcile
npm run migrate -- --source-uri "mongodb://localhost:27017/new_planner_rehearsal" --target-uri "mongodb://localhost:27017/old_planner_rehearsal" --direction reverse --reconcile --apply
```

These flags are deliberate operator actions after backups and write freezes, not startup behavior. Reconciliation replaces full documents so pet/log edits, plan end windows, snapshots, age metadata and new observations survive. It is restricted to reverse mode. Target-only records require manual investigation because the tool does not implement deletion propagation.

Rerun the reverse dry run, require identical normalized hashes/counts and verify owner isolation using the old service before switching routes back. Enable old writes only after disabling new writes. Preserve the new database and rollback reports. Never restore a stale old database as if it contained post-cutover updates.
