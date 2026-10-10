import request from 'supertest';
import { ObjectId } from 'mongodb';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../app.js';
import { getDb } from '../config/db.js';
import { clearTestDb, startTestDb, stopTestDb } from './db-utils.js';
import {
  account,
  mockFetch,
  petInput,
  planInput,
  principals,
  testConfig,
  today,
} from './fixtures.js';

const app = createApp({ config: testConfig, fetcher: mockFetch });
const month = today.slice(0, 7);
const first = `${month}-01`;
beforeAll(startTestDb, 120_000);
afterEach(clearTestDb);
afterAll(stopTestDb);

async function makePet(token: string) {
  const response = await request(app)
    .post('/api/v1/pets')
    .auth(token, { type: 'bearer' })
    .send(petInput);
  expect(response.status).toBe(201);
  return response.body.pet.id as string;
}
async function makePlan(token: string, petId: string, calories = 3500, grams = 100) {
  const input = planInput(petId);
  const response = await request(app)
    .post('/api/v1/meal-plans')
    .auth(token, { type: 'bearer' })
    .send({
      ...input,
      requestId: new ObjectId().toHexString(),
      mode: 'manual',
      manualDailyGrams: grams,
      food: { ...input.food, calories },
    });
  expect(response.status).toBe(201);
  return response.body.plan.id as string;
}

describe('monthly progress', () => {
  it('requires authentication', async () => {
    expect(
      (await request(app).get(`/api/v1/progress?petId=${new ObjectId()}&month=${month}`)).status,
    ).toBe(401);
  });

  it('rejects malformed IDs, calendar months and future months', async () => {
    const token = await account();
    const petId = await makePet(token);
    const future = new Date(`${month}-01T12:00:00.000Z`);
    future.setUTCMonth(future.getUTCMonth() + 1);
    for (const query of [
      `month=${month}`,
      `petId=not-an-id&month=${month}`,
      `petId=${petId}&month=2026-13`,
      `petId=${petId}&month=2026-02-01`,
      `petId=${petId}&month=2026-2`,
      `petId=${petId}&month=${month}&month=${month}`,
      `petId=${petId}&month=${future.toISOString().slice(0, 7)}`,
    ])
      expect(
        (await request(app).get(`/api/v1/progress?${query}`).auth(token, { type: 'bearer' }))
          .status,
      ).toBe(400);
  });

  it('checks pet ownership before returning progress', async () => {
    const owner = await account();
    const stranger = await account();
    const petId = await makePet(owner);
    const hidden = await request(app)
      .get(`/api/v1/progress?petId=${petId}&month=${month}`)
      .auth(stranger, { type: 'bearer' });
    expect(hidden.status).toBe(404);
    expect(hidden.body.progress).toBeUndefined();
    const missing = await request(app)
      .get(`/api/v1/progress?petId=${new ObjectId()}&month=${month}`)
      .auth(owner, { type: 'bearer' });
    expect(missing.status).toBe(404);
  });

  it('returns the real account calendar and no invented intake for an empty past month', async () => {
    const token = await account();
    const petId = await makePet(token);
    const result = await request(app)
      .get(`/api/v1/progress?petId=${petId}&month=2024-02`)
      .auth(token, { type: 'bearer' });
    expect(result.status).toBe(200);
    expect(result.body.progress).toMatchObject({
      petId,
      month: '2024-02',
      today,
      timeZone: 'Asia/Manila',
      summary: { recordedDays: 0, loggedMeals: 0, knownLoggedKcal: null, loggedGrams: null },
      measurements: [],
    });
    expect(result.body.progress.days).toHaveLength(29);
    expect(
      result.body.progress.days.every(
        (day: { status: string; kcal: number | null }) =>
          day.status === 'unlogged' && day.kcal === null,
      ),
    ).toBe(true);
  });

  it('combines original food labels across versions with one target and isolates owners and pets', async () => {
    const token = await account();
    const ownerId = principals.get(token)!.user.id;
    const petId = await makePet(token);
    const oldId = await makePlan(token, petId);
    const newId = await makePlan(token, petId, 5000, 200);
    const plans = getDb().collection('meal_plans');
    await plans.updateOne(
      { _id: new ObjectId(oldId) },
      {
        $set: {
          activeFrom: new Date(`${first}T00:00:00.000Z`),
          endedAt: new Date(`${first}T06:00:00.000Z`),
        },
      },
    );
    await plans.updateOne(
      { _id: new ObjectId(newId) },
      { $set: { activeFrom: new Date(`${first}T06:00:00.000Z`) } },
    );
    for (const [id, amount] of [
      [oldId, 10],
      [newId, 20],
    ] as const) {
      const logged = await request(app)
        .put(`/api/v1/meal-plans/${id}/logs`)
        .auth(token, { type: 'bearer' })
        .send({
          date: first,
          mealIndex: 0,
          status: 'fed',
          actualGrams: amount,
          extrasKcal: 0,
          note: '',
        });
      expect(logged.status).toBe(200);
    }
    const otherPet = await makePet(token);
    const otherPlan = await makePlan(token, otherPet);
    await getDb()
      .collection('feeding_logs')
      .insertMany([
        {
          _id: new ObjectId(),
          ownerId: 'other-owner',
          planId: new ObjectId(newId),
          date: first,
          mealIndex: 1,
          status: 'fed',
          actualGrams: 999,
          extrasKcal: 0,
          note: '',
          recordedAt: new Date(),
        },
        {
          _id: new ObjectId(),
          ownerId,
          planId: new ObjectId(otherPlan),
          date: first,
          mealIndex: 1,
          status: 'fed',
          actualGrams: 999,
          extrasKcal: 0,
          note: '',
          recordedAt: new Date(),
        },
      ]);
    const response = await request(app)
      .get(`/api/v1/progress?petId=${petId}&month=${month}`)
      .auth(token, { type: 'bearer' });
    expect(response.status).toBe(200);
    expect(response.body.progress.days[0]).toMatchObject({
      status: 'recorded',
      mealsLogged: 2,
      grams: 30,
      kcal: 135,
      targetPlanVersion: 2,
      targetGrams: 200,
      targetKcal: 1000,
      recordedPlanVersions: [1, 2],
    });
    expect(response.body.progress.summary).toMatchObject({
      recordedDays: 1,
      loggedMeals: 2,
      knownLoggedKcal: 135,
    });
  });

  it('bounds measurements to the requested month and the account current date', async () => {
    const token = await account();
    const petId = await makePet(token);
    const ownerId = principals.get(token)!.user.id;
    const otherPet = await makePet(token);
    const previous = new Date(`${first}T00:00:00.000Z`);
    previous.setUTCDate(0);
    const future = new Date(`${today}T00:00:00.000Z`);
    future.setUTCDate(future.getUTCDate() + 1);
    const observations = getDb().collection('nutrition_observations');
    const common = {
      ownerId,
      petId: new ObjectId(petId),
      weightKg: 6.2,
      conditionScore: 5,
      observer: 'owner',
      createdAt: new Date(),
    };
    await observations.insertMany([
      { ...common, _id: new ObjectId(), measuredOn: first },
      { ...common, _id: new ObjectId(), measuredOn: previous.toISOString().slice(0, 10) },
      { ...common, _id: new ObjectId(), measuredOn: future.toISOString().slice(0, 10) },
      { ...common, _id: new ObjectId(), petId: new ObjectId(otherPet), measuredOn: first },
      { ...common, _id: new ObjectId(), ownerId: 'other-owner', measuredOn: first },
    ]);
    const response = await request(app)
      .get(`/api/v1/progress?petId=${petId}&month=${month}`)
      .auth(token, { type: 'bearer' });
    expect(response.status).toBe(200);
    expect(response.body.progress.measurements).toHaveLength(1);
    expect(response.body.progress.measurements[0]).toMatchObject({
      petId,
      measuredOn: first,
      weightKg: 6.2,
    });
  });
});
