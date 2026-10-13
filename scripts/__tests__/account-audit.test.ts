import path from 'node:path';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { BSON, Binary, Decimal128, Long, MongoClient, ObjectId, type Db } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';
import {
  backupDatabase,
  restoreBackupIntoEmptyDatabase,
  verifyBackup,
} from '../account-audit/backup.js';
import {
  classifyDocument,
  inventoryDatabase,
  plannerCollections,
} from '../account-audit/inventory.js';
import { planIdentityMigration } from '../account-audit/identity-plan.js';

let server: MongoMemoryServer;
let client: MongoClient;
let database: Db;
let directory: string;
beforeAll(async () => {
  server = await MongoMemoryServer.create({
    binary: { downloadDir: path.resolve('node_modules/.cache/mongodb-memory-server') },
  });
  client = await new MongoClient(server.getUri(), {
    promoteValues: false,
    promoteLongs: false,
    bsonRegExp: true,
  }).connect();
  database = client.db('account_audit_fixture');
  directory = await mkdtemp(path.resolve('.local-data/account-audit-fixture-'));
}, 60000);
afterAll(async () => {
  await client?.close();
  await server?.stop();
});

it('backs up and restores all collections, BSON types, ownership, options and indexes', async () => {
  const petId = new ObjectId();
  for (const name of plannerCollections)
    await database.collection(name).insertOne({
      _id: new ObjectId(),
      name: 'Milo',
      ownerId: 'shared-professional',
      petId,
      planId: new ObjectId(),
      when: new Date('2026-01-01'),
      precision: Decimal128.fromString('1.23'),
      large: Long.fromString('9007199254740993'),
      binary: new Binary(Buffer.from([0, 1, 255])),
      unknownPreserved: { nested: true },
    });
  await database.createCollection('unrelated_website_records', {
    validator: { ownerId: { $type: 'string' } },
  });
  await database
    .collection('unrelated_website_records')
    .insertOne({ ownerId: 'old-owner', payload: 'retain' });
  await database
    .collection('unrelated_website_records')
    .createIndex({ ownerId: 1 }, { name: 'owner_unique', unique: true });
  await database.collection('subscriptions').insertOne({ user: new ObjectId(), plan: 'pro' });
  const inventory = await inventoryDatabase(database);
  expect(inventory.collections).toHaveLength(10);
  expect(inventory.cleanup.proposedDeletes).toEqual([]);
  expect(
    inventory.identities.find((identity) => identity.oldId === 'shared-professional')?.collections,
  ).toHaveLength(8);
  const backup = await backupDatabase(database, path.join(directory, 'backup'));
  expect(backup.collections).toHaveLength(10);
  const restored = client.db('account_audit_restore');
  await restoreBackupIntoEmptyDatabase(restored, path.join(directory, 'backup'));
  for (const item of backup.collections) {
    const original = await database.collection(item.name).find().toArray();
    const copy = await restored.collection(item.name).find().toArray();
    expect(copy.map((document) => BSON.EJSON.stringify(document, { relaxed: false }))).toEqual(
      original.map((document) => BSON.EJSON.stringify(document, { relaxed: false })),
    );
  }
  expect(
    await restored.collection('unrelated_website_records').listIndexes().toArray(),
  ).toContainEqual(expect.objectContaining({ name: 'owner_unique', unique: true }));
  expect(
    (
      await restored
        .listCollections({ name: 'unrelated_website_records' }, { nameOnly: false })
        .next()
    )?.options?.validator,
  ).toEqual({ ownerId: { $type: 'string' } });
  await expect(
    restoreBackupIntoEmptyDatabase(restored, path.join(directory, 'backup')),
  ).rejects.toThrow('empty isolated');
  const filename = path.join(
    directory,
    'backup',
    backup.collections.find((item) => item.file)!.file!,
  );
  const contents = await readFile(filename);
  await writeFile(filename, contents.subarray(0, contents.length - 1));
  await expect(verifyBackup(path.join(directory, 'backup'))).rejects.toThrow('checksum');
}, 30000);

it('uses record evidence and never marks a collection disposable by name', () => {
  expect(
    classifyDocument('pets', { _id: new ObjectId(), passwordHash: 'old', role: 'professional' }),
  ).toBe('authentication-review');
  expect(classifyDocument('users', { ownerId: 'owner', petId: new ObjectId(), history: [] })).toBe(
    'unknown-review',
  );
  expect(classifyDocument('pets', { name: 'Pet', ownerId: 'shared-id' })).toBe('planner-preserve');
});

it('requires evidence and flags conflicting professional and many-to-one mappings', () => {
  const legacy = [
    { oldId: 'old-a', collections: ['pets'], roles: ['professional'] },
    { oldId: 'old-b', collections: ['feeding_logs'], roles: ['user'] },
  ];
  const canonical = [{ id: 'shared', email: 'same@example.test', role: 'user' }];
  expect(planIdentityMigration(legacy, canonical).rows.map((row) => row.status)).toEqual([
    'pending-authority-proof',
    'pending-authority-proof',
  ]);
  const proof = {
    oldId: 'old-a',
    sharedId: 'shared',
    evidence: 'both-methods-authenticated' as const,
    reference: 'review-42',
  };
  expect(planIdentityMigration(legacy, canonical, [proof]).rows[0].status).toBe(
    'professional-conflict',
  );
  const many = planIdentityMigration(legacy, canonical, [proof, { ...proof, oldId: 'old-b' }]);
  expect(many.rows.map((row) => row.status)).toEqual(['many-to-one-review', 'many-to-one-review']);
  expect(many.applyAllowed).toBe(false);
  expect(
    planIdentityMigration(legacy, canonical, [{ ...proof, evidence: 'canonical-id' }]).rows[0]
      .status,
  ).toBe('invalid-proof');
  expect(
    planIdentityMigration(legacy, canonical, [{ ...proof, oldId: 'old-b' }]).rows[1].status,
  ).toBe('ready-for-review');
});
