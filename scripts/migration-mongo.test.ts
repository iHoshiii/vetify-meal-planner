import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MongoClient, ObjectId, type Db } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { collections } from './migration/codec.js';
import { migrate } from './migration/engine.js';
import { assertDatabaseSeparation } from './migration/cli.js';
import { at, fixture, id } from './migration/fixtures.js';

describe('migration against isolated synthetic Mongo databases', () => {
  let server: MongoMemoryServer;
  let client: MongoClient;
  let legacy: Db;
  let planner: Db;

  beforeAll(async () => {
    server = await MongoMemoryServer.create({
      binary: { downloadDir: path.resolve('node_modules/.cache/mongodb-memory-server') },
      instance: { ip: '127.0.0.1' },
    });
    client = await new MongoClient(server.getUri(), {
      promoteValues: false,
      promoteLongs: false,
      bsonRegExp: true,
    }).connect();
    legacy = client.db('migration_fixture_source');
    planner = client.db('migration_fixture_target');
    const documents = fixture();
    for (const name of collections) await legacy.collection(name).insertMany(documents[name]);
  }, 60000);

  afterAll(async () => {
    await client?.close();
    await server?.stop();
  });

  it('preserves BSON and unique indexes, resumes identically, and rolls back live edits', async () => {
    await expect(assertDatabaseSeparation(legacy, client.db(legacy.databaseName))).rejects.toThrow(
      'same database namespace',
    );
    await expect(assertDatabaseSeparation(legacy, planner)).resolves.toBeUndefined();
    const dryRun = await migrate(legacy, planner, { direction: 'forward' });
    expect(dryRun).toMatchObject({ mode: 'dry-run', insert: 6, replace: 0 });
    expect(await planner.listCollections().toArray()).toHaveLength(0);
    const forward = await migrate(legacy, planner, { direction: 'forward', apply: true });
    expect(forward.source).toEqual(forward.target);
    const pet = await planner.collection('pets').findOne({ _id: id(10) });
    expect(pet?.ownerId).toBe(id(1).toHexString());
    expect(pet?._id).toBeInstanceOf(ObjectId);
    expect(pet?.createdAt).toEqual(at(1));
    expect(pet?.preserved.long.toString()).toBe('9007199254740993');
    expect(pet?.preserved.amount.toString()).toBe('1.2500');
    expect(pet?.preserved.binary.sub_type).toBe(128);
    expect(pet?.preserved.timestamp.toString()).toBe('85899345922');
    const indexes = await planner.collection('meal_plans').listIndexes().toArray();
    expect(indexes.filter((index) => index.unique)).toHaveLength(2);
    await expect(
      planner.collection('meal_plans').insertOne({
        ...(await planner.collection('meal_plans').findOne({ _id: id(20) })),
        _id: id(99),
      }),
    ).rejects.toThrow('E11000');
    expect(await migrate(legacy, planner, { direction: 'forward', apply: true })).toMatchObject({
      insert: 0,
      replace: 0,
      skipped: 6,
    });

    await planner
      .collection('pets')
      .updateOne({ _id: id(10) }, { $set: { weightKg: 9, updatedAt: at(2) } });
    await planner
      .collection('feeding_logs')
      .updateOne({ _id: id(30) }, { $set: { actualGrams: 44, extrasKcal: 7 } });
    await planner.collection('meal_plans').updateOne({ _id: id(20) }, { $set: { endedAt: at(2) } });
    const firstPlan = await planner.collection('meal_plans').findOne({ _id: id(20) });
    await planner.collection('meal_plans').insertOne({
      ...firstPlan,
      _id: id(22),
      version: 2,
      requestId: 'request-owner-a-002',
      activeFrom: at(2),
      endedAt: null,
      createdAt: at(2),
    });
    await planner.collection('feeding_logs').insertOne({
      _id: id(31),
      ownerId: id(1).toHexString(),
      planId: id(22),
      date: '2026-10-02',
      mealIndex: 1,
      actualGrams: 52,
      recordedAt: at(2),
    });
    await expect(migrate(planner, legacy, { direction: 'reverse', apply: true })).rejects.toThrow(
      'Conflicting target',
    );
    const reverse = await migrate(planner, legacy, {
      direction: 'reverse',
      reconcile: true,
      apply: true,
    });
    expect(reverse.source).toEqual(reverse.target);
    expect(reverse).toMatchObject({ insert: 2, replace: 3, skipped: 3 });
    const restoredPet = await legacy.collection('pets').findOne({ _id: id(10) });
    expect(restoredPet?.ownerId).toBeInstanceOf(ObjectId);
    expect(Number(restoredPet?.weightKg)).toBe(9);
    expect(
      Number((await legacy.collection('feeding_logs').findOne({ _id: id(30) }))?.actualGrams),
    ).toBe(44);
    expect((await legacy.collection('meal_plans').findOne({ _id: id(20) }))?.endedAt).toEqual(
      at(2),
    );
    expect(Number(await legacy.collection('meal_plans').countDocuments())).toBe(3);
    expect(
      await migrate(planner, legacy, { direction: 'reverse', reconcile: true, apply: true }),
    ).toMatchObject({ insert: 0, replace: 0, skipped: 8 });
  }, 30000);
});
