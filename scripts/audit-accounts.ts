import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs, parseEnv } from 'node:util';
import { MongoClient, BSON } from 'mongodb';
import { inventoryDatabase } from './account-audit/inventory.js';
import { backupDatabase } from './account-audit/backup.js';
import {
  planIdentityMigration,
  type CanonicalIdentity,
  type IdentityProof,
} from './account-audit/identity-plan.js';

const { values } = parseArgs({
  options: {
    config: { type: 'string' },
    'output-dir': { type: 'string' },
    'canonical-export': { type: 'string' },
    proofs: { type: 'string' },
  },
  strict: true,
});
const config = values.config ? parseEnv(await readFile(values.config, 'utf8')) : {};
const uri = process.env.PLANNER_MONGODB_URI ?? config.PLANNER_MONGODB_URI;
if (!uri) throw new Error('Supply PLANNER_MONGODB_URI or --config with the Planner connection.');
const directory = path.resolve(
  values['output-dir'] ??
    `.local-data/account-audit/${new Date().toISOString().replace(/[:.]/g, '-')}`,
);
const client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });
try {
  await client.connect();
  await mkdir(directory, { recursive: true });
  const db = client.db();
  const inventory = await inventoryDatabase(db);
  const backup = await backupDatabase(db, path.join(directory, 'backup'));
  const canonical: CanonicalIdentity[] = values['canonical-export']
    ? JSON.parse(await readFile(values['canonical-export'], 'utf8'))
    : [];
  const proofs: IdentityProof[] = values.proofs
    ? JSON.parse(await readFile(values.proofs, 'utf8'))
    : [];
  const report = {
    inventory,
    backup,
    migration: planIdentityMigration(inventory.identities, canonical, proofs),
  };
  await writeFile(
    path.join(directory, 'report.ejson'),
    BSON.EJSON.stringify(report, { relaxed: false }),
    { flag: 'wx', mode: 0o600 },
  );
  console.log(
    JSON.stringify({
      database: db.databaseName,
      collections: inventory.collections.length,
      records: inventory.collections.reduce((sum, collection) => sum + collection.count, 0),
      backupVerified: true,
      report: path.join(directory, 'report.ejson'),
    }),
  );
} catch {
  console.error(
    'Account audit failed. No database records were changed. Check connection and backup access.',
  );
  process.exitCode = 1;
} finally {
  await client.close();
}
