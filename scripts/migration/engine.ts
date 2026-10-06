import type { Document, IndexDescription } from 'mongodb';
import {
  collections,
  convertOwner,
  documentKey,
  hashDocument,
  snapshotSummary,
  type Direction,
  type Snapshot,
} from './codec.js';
import { verifySnapshot } from './verify.js';

export interface MigrationDatabase {
  collection(name: string): {
    find(): { toArray(): Promise<Document[]> };
    createIndexes(indexes: IndexDescription[]): Promise<unknown>;
    insertOne(document: Document): Promise<unknown>;
    replaceOne(filter: Document, document: Document): Promise<unknown>;
  };
}

const indexes: Record<string, IndexDescription[]> = {
  pets: [{ key: { ownerId: 1, createdAt: 1 } }],
  meal_plans: [
    { key: { ownerId: 1, petId: 1, version: -1 }, unique: true },
    { key: { ownerId: 1, requestId: 1 }, unique: true },
  ],
  feeding_logs: [{ key: { ownerId: 1, planId: 1, date: 1, mealIndex: 1 }, unique: true }],
  nutrition_observations: [{ key: { ownerId: 1, petId: 1, measuredOn: -1, createdAt: -1 } }],
};

async function read(database: MigrationDatabase): Promise<Snapshot> {
  const snapshot = {} as Snapshot;
  for (const name of collections) snapshot[name] = await database.collection(name).find().toArray();
  return snapshot;
}

export async function migrate(
  source: MigrationDatabase,
  target: MigrationDatabase,
  options: {
    direction: Direction;
    apply?: boolean;
    reconcile?: boolean;
  },
) {
  if (options.reconcile && options.direction !== 'reverse')
    throw new Error('--reconcile is restricted to reverse rollback');
  const [original, existing] = await Promise.all([read(source), read(target)]);
  verifySnapshot(original, options.direction === 'forward' ? 'object' : 'string');
  const proposed = {} as Snapshot;
  const operations: { name: string; document: Document; previous?: Document }[] = [];
  let skipped = 0;
  let replaced = 0;
  for (const name of collections) {
    proposed[name] = original[name].map((document) => convertOwner(document, options.direction));
    const sourceIds = new Set(proposed[name].map(documentKey));
    const targetRecords = new Map(
      existing[name].map((document) => [documentKey(document), document]),
    );
    if (targetRecords.size !== existing[name].length)
      throw new Error(`Duplicate target _id in ${name}`);
    for (const id of targetRecords.keys()) {
      if (!sourceIds.has(id))
        throw new Error(`Target-only ${name} record; reconcile explicitly before migrating`);
    }
    for (const document of proposed[name]) {
      const previous = targetRecords.get(documentKey(document));
      if (previous && hashDocument(previous, false) === hashDocument(document, false)) {
        skipped += 1;
        continue;
      }
      if (previous && !options.reconcile)
        throw new Error(`Conflicting target ${name} record; no records were written`);
      if (previous) replaced += 1;
      operations.push({ name, document, previous });
    }
  }
  verifySnapshot(proposed, options.direction === 'forward' ? 'string' : 'object');
  const sourceSummary = snapshotSummary(original);
  const report = {
    mode: options.apply ? 'apply' : 'dry-run',
    direction: options.direction,
    insert: operations.length - replaced,
    replace: replaced,
    skipped,
    source: sourceSummary,
    target: snapshotSummary(proposed),
  };
  if (JSON.stringify(sourceSummary) !== JSON.stringify(report.target))
    throw new Error('Normalized source and proposed target hashes differ');
  if (!options.apply) return report;
  for (const name of collections) await target.collection(name).createIndexes(indexes[name]);
  for (const operation of operations) {
    const collection = target.collection(operation.name);
    if (operation.previous)
      await collection.replaceOne({ _id: operation.document._id }, operation.document);
    else await collection.insertOne(operation.document);
  }
  const copied = await read(target);
  verifySnapshot(copied, options.direction === 'forward' ? 'string' : 'object');
  report.target = snapshotSummary(copied);
  if (JSON.stringify(sourceSummary) !== JSON.stringify(report.target))
    throw new Error('Post-copy verification failed; keep the write freeze and investigate');
  return report;
}
