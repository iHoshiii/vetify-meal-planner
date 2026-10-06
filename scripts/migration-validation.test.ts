import { describe, expect, it } from 'vitest';
import { migrate } from './migration/engine.js';
import { migrationArguments } from './migration/cli.js';
import { at, fixture, id, MemoryDatabase } from './migration/fixtures.js';

describe('migration preflight validation', () => {
  it.each([
    'cross-owner',
    'dangling',
    'duplicate request',
    'duplicate log',
    'version gap',
    'overlap',
    'bad date',
  ])('rejects %s before writing', async (condition) => {
    const documents = fixture();
    if (condition === 'cross-owner') documents.meal_plans[0].petId = id(11);
    if (condition === 'dangling') documents.nutrition_observations[0].petId = id(999);
    if (condition === 'duplicate request')
      documents.meal_plans.push({ ...documents.meal_plans[0], _id: id(23), version: 2 });
    if (condition === 'duplicate log')
      documents.feeding_logs.push({ ...documents.feeding_logs[0], _id: id(32) });
    if (condition === 'version gap') documents.meal_plans[0].version = 2;
    if (condition === 'overlap')
      documents.meal_plans.push({
        ...documents.meal_plans[0],
        _id: id(23),
        version: 2,
        requestId: 'request-owner-a-002',
        activeFrom: at(2),
      });
    if (condition === 'bad date') documents.feeding_logs[0].date = '2026-02-30';
    const target = new MemoryDatabase();
    await expect(
      migrate(new MemoryDatabase(documents), target, { direction: 'forward', apply: true }),
    ).rejects.toThrow();
    expect(target.writes).toBe(0);
    expect(target.indexWrites).toBe(0);
  });

  it('rejects malformed reverse owner IDs and target-only records', async () => {
    const source = new MemoryDatabase(fixture());
    const planner = new MemoryDatabase();
    await migrate(source, planner, { direction: 'forward', apply: true });
    planner.records.pets[0].ownerId = 'not-an-object-id';
    await expect(
      migrate(planner, source, { direction: 'reverse', reconcile: true }),
    ).rejects.toThrow('ownerId');
    planner.records.pets[0].ownerId = id(1).toHexString();
    planner.records.pets.push({ _id: id(99), ownerId: id(1).toHexString() });
    await expect(migrate(source, planner, { direction: 'forward' })).rejects.toThrow('Target-only');
  });

  it('requires two distinct explicit database namespaces and constrains reconcile', () => {
    expect(() => migrationArguments([])).toThrow('Both --source-uri');
    expect(() =>
      migrationArguments([
        '--source-uri',
        'mongodb://localhost',
        '--target-uri',
        'mongodb://localhost/target',
      ]),
    ).toThrow('Use explicit');
    expect(() =>
      migrationArguments([
        '--source-uri',
        'mongodb://alice:password@localhost/source',
        '--target-uri',
        'mongodb://bob:password@127.0.0.1:27017/source',
      ]),
    ).toThrow('separate database');
    expect(() =>
      migrationArguments([
        '--source-uri',
        'mongodb://localhost/source',
        '--target-uri',
        'mongodb://localhost/target',
        '--reconcile',
      ]),
    ).toThrow('restricted');
    expect(
      migrationArguments([
        '--source-uri',
        'mongodb://localhost/source',
        '--target-uri',
        'mongodb://localhost/target',
      ]),
    ).toMatchObject({
      direction: 'forward',
      apply: false,
      reconcile: false,
    });
    expect(
      migrationArguments([
        '--source-uri',
        'mongodb://localhost/new',
        '--target-uri',
        'mongodb://localhost/old',
        '--direction',
        'reverse',
        '--reconcile',
        '--apply',
      ]),
    ).toMatchObject({ direction: 'reverse', apply: true, reconcile: true });
  });
});
