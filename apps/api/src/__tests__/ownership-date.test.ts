import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createApp } from '../app.js';
import { connectDb, getDb } from '../config/db.js';
import { clearTestDb, startTestDb, stopTestDb } from './db-utils.js';
import { account, mockFetch, petInput, principals, testConfig } from './fixtures.js';

const app = createApp({ config: testConfig, fetcher: mockFetch });
beforeAll(startTestDb, 120000);
afterEach(async () => {
  vi.useRealTimers();
  await clearTestDb();
});
afterAll(stopTestDb);

describe('standalone planner data boundaries', () => {
  it('exports one owner and never creates a mirrored account collection', async () => {
    const owner = await account();
    const stranger = await account();
    const created = await request(app)
      .post('/api/v1/pets')
      .auth(owner, { type: 'bearer' })
      .send({ ...petInput, ownerId: principals.get(stranger)!.user.id });
    expect(created.status).toBe(201);
    const document = await getDb().collection('pets').findOne({});
    expect(document?.ownerId).toBe(principals.get(owner)!.user.id);
    expect(typeof document?.ownerId).toBe('string');
    const ownExport = await request(app).get('/api/v1/export').auth(owner, { type: 'bearer' });
    const otherExport = await request(app).get('/api/v1/export').auth(stranger, { type: 'bearer' });
    expect(ownExport.body.pets).toHaveLength(1);
    expect(ownExport.body.pets[0]._id).toBe(created.body.pet.id);
    expect(otherExport.body.pets).toEqual([]);
    expect((await getDb().listCollections().toArray()).map((entry) => entry.name).sort()).toEqual([
      'feeding_logs',
      'meal_plans',
      'nutrition_observations',
      'pets',
      'saved_foods',
    ]);
  });
  it('applies account calendar dates at opposing timezone boundaries', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-07T12:30:00Z'));
    const token = await account();
    const value = principals.get(token)!;
    value.region.timeZone = 'Pacific/Kiritimati';
    const created = await request(app)
      .post('/api/v1/pets')
      .auth(token, { type: 'bearer' })
      .send(petInput);
    expect(created.body.pet.registeredOn).toBe('2026-10-08');
    const input = {
      petId: created.body.pet.id,
      weightKg: 6.2,
      measuredOn: '2026-10-08',
      conditionScore: 5,
      observer: 'owner',
    };
    expect(
      (
        await request(app)
          .post('/api/v1/nutrition-observations')
          .auth(token, { type: 'bearer' })
          .send(input)
      ).status,
    ).toBe(201);
    value.region.timeZone = 'Pacific/Honolulu';
    expect(
      (
        await request(app)
          .post('/api/v1/nutrition-observations')
          .auth(token, { type: 'bearer' })
          .send(input)
      ).status,
    ).toBe(400);
  });
  it('reuses concurrent initialization and creates source-equivalent unique indexes', async () => {
    const first = connectDb(testConfig.PLANNER_MONGODB_URI);
    expect(connectDb(testConfig.PLANNER_MONGODB_URI)).toBe(first);
    const indexes = await getDb().collection('meal_plans').indexes();
    expect(indexes.filter((index) => index.unique).map((index) => index.key)).toEqual(
      expect.arrayContaining([
        { ownerId: 1, petId: 1, version: -1 },
        { ownerId: 1, requestId: 1 },
      ]),
    );
    const logs = await getDb().collection('feeding_logs').indexes();
    expect(logs.find((index) => index.unique)?.key).toEqual({
      ownerId: 1,
      planId: 1,
      date: 1,
      mealIndex: 1,
    });
  });
});
