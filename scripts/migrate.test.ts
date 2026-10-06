import { describe, expect, it } from 'vitest';
import { ObjectId } from 'mongodb';
import { hashDocument, snapshotSummary } from './migration/codec.js';
import { migrate } from './migration/engine.js';
import { at, fixture, id, MemoryDatabase } from './migration/fixtures.js';

describe('planner data migration on synthetic memory databases', () => {
  it('defaults to a read-only dry run, preserves BSON and is idempotent on rerun', async () => {
    const original = fixture();
    const source = new MemoryDatabase(original);
    const target = new MemoryDatabase();
    const before = snapshotSummary(original);
    const dryRun = await migrate(source, target, { direction: 'forward' });
    expect(dryRun).toMatchObject({ mode: 'dry-run', insert: 6, replace: 0, skipped: 0 });
    expect(target.writes).toBe(0);
    expect(target.indexWrites).toBe(0);
    const applied = await migrate(source, target, { direction: 'forward', apply: true });
    expect(applied.source).toEqual(applied.target);
    expect(target.indexWrites).toBe(4);
    expect(target.records.pets[0].ownerId).toBe(id(1).toHexString());
    expect(target.records.pets[0]._id).toBe(original.pets[0]._id);
    expect(target.records.pets[0].preserved).toBe(original.pets[0].preserved);
    expect(target.records.pets[0].createdAt).toBe(original.pets[0].createdAt);
    expect(target.records.pets[0].bodyConditionScore).toBe(10);
    expect(target.records.meal_plans[0].conditionScore).toBe(9);
    expect(snapshotSummary(original)).toEqual(before);
    const rerun = await migrate(source, target, { direction: 'forward', apply: true });
    expect(rerun).toMatchObject({ insert: 0, replace: 0, skipped: 6 });
    expect(target.writes).toBe(6);
  });

  it('refuses conflicting records before any writes or index creation', async () => {
    const source = new MemoryDatabase(fixture());
    const target = new MemoryDatabase();
    await migrate(source, target, { direction: 'forward', apply: true });
    target.records.pets[0] = { ...target.records.pets[0], weightKg: 11 };
    const writes = target.writes;
    const indexes = target.indexWrites;
    await expect(migrate(source, target, { direction: 'forward', apply: true })).rejects.toThrow(
      'Conflicting target pets',
    );
    expect(target.writes).toBe(writes);
    expect(target.indexWrites).toBe(indexes);
  });

  it('reverse reconciliation restores new records and edits after cutover', async () => {
    const legacy = new MemoryDatabase(fixture());
    const planner = new MemoryDatabase();
    await migrate(legacy, planner, { direction: 'forward', apply: true });
    const ownerId = id(1).toHexString();
    planner.records.pets[0] = { ...planner.records.pets[0], weightKg: 9, updatedAt: at(2) };
    planner.records.feeding_logs[0] = {
      ...planner.records.feeding_logs[0],
      actualGrams: 43,
      extrasKcal: 7,
      recordedAt: at(2),
    };
    planner.records.meal_plans[0] = { ...planner.records.meal_plans[0], endedAt: at(2) };
    planner.records.meal_plans.push({
      ...planner.records.meal_plans[0],
      _id: id(22),
      version: 2,
      requestId: 'request-owner-a-002',
      activeFrom: at(2),
      endedAt: null,
      createdAt: at(2),
    });
    planner.records.feeding_logs.push({
      _id: id(31),
      ownerId,
      planId: id(22),
      date: '2026-10-02',
      mealIndex: 1,
      actualGrams: 52,
      extrasKcal: null,
      recordedAt: at(2),
    });
    planner.records.nutrition_observations.push({
      _id: id(41),
      ownerId,
      petId: id(10),
      measuredOn: '2026-10-02',
      weightKg: 9,
      conditionScore: 8,
      createdAt: at(2),
    });
    await expect(migrate(planner, legacy, { direction: 'reverse', apply: true })).rejects.toThrow(
      'Conflicting target',
    );
    const dryRun = await migrate(planner, legacy, { direction: 'reverse', reconcile: true });
    expect(dryRun).toMatchObject({ insert: 3, replace: 3, skipped: 3 });
    expect(legacy.records.pets[0].weightKg).toBe(8);
    const result = await migrate(planner, legacy, {
      direction: 'reverse',
      apply: true,
      reconcile: true,
    });
    expect(result.source).toEqual(result.target);
    expect(legacy.records.pets[0].weightKg).toBe(9);
    expect(legacy.records.feeding_logs[0]).toMatchObject({ actualGrams: 43, extrasKcal: 7 });
    expect(legacy.records.meal_plans[0].endedAt).toEqual(at(2));
    expect(legacy.records.meal_plans).toHaveLength(3);
    expect(legacy.records.nutrition_observations).toHaveLength(2);
    expect(legacy.records.pets.every((pet) => pet.ownerId instanceof ObjectId)).toBe(true);
    const rerun = await migrate(planner, legacy, {
      direction: 'reverse',
      reconcile: true,
      apply: true,
    });
    expect(rerun).toMatchObject({ insert: 0, replace: 0, skipped: 9 });
  });

  it('hashes are stable across key/document order and distinguish BSON values', () => {
    const first = fixture();
    const reversed = {
      ...first,
      pets: [...first.pets].reverse(),
      meal_plans: [...first.meal_plans].reverse(),
    };
    expect(snapshotSummary(first)).toEqual(snapshotSummary(reversed));
    const document = first.pets[0];
    expect(hashDocument(document)).toBe(
      hashDocument(Object.fromEntries(Object.entries(document).reverse())),
    );
    expect(hashDocument(document)).not.toBe(
      hashDocument({ ...document, createdAt: document.createdAt.toISOString() }),
    );
    expect(hashDocument(document)).not.toBe(
      hashDocument({ ...document, preserved: { amount: 1.25 } }),
    );
  });
});
