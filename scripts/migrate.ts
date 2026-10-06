import { runMigration } from './migration/cli.js';

runMigration(process.argv.slice(2)).catch((cause: unknown) => {
  const safeMessages =
    /^(Both --|Use explicit|Source and target|--direction|--reconcile|Unexpected |ownerId |Planner |Invalid |Duplicate |Dangling |Plan |Missing |Target-only |Conflicting |Normalized |Post-copy)/;
  const message =
    cause instanceof Error && safeMessages.test(cause.message)
      ? cause.message
      : 'Migration failed. Check connectivity/permissions and database state without exposing connection credentials.';
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
