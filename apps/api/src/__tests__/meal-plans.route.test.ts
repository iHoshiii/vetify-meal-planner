import { testConfig, mockFetch } from './fixtures.js';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../app.js';
import { clearTestDb, startTestDb, stopTestDb } from './db-utils.js';
import { account, petInput, planInput, today } from './fixtures.js';

const app = createApp({ config: testConfig, fetcher: mockFetch });
beforeAll(startTestDb, 120_000);
afterEach(clearTestDb);
afterAll(stopTestDb);

describe('meal plans', () => {
  it('previews without saving, then saves and logs a feeding', async () => {
    const token = await account();
    const createdPet = await request(app)
      .post('/api/v1/pets')
      .auth(token, { type: 'bearer' })
      .send(petInput);
    const petId = createdPet.body.pet.id as string;
    const input = planInput(petId);
    const preview = await request(app)
      .post('/api/v1/meal-plans/preview')
      .auth(token, { type: 'bearer' })
      .send(input);
    expect(preview.status).toBe(200);
    expect(preview.body.preview.blockers).toEqual([]);
    const before = await request(app)
      .get(`/api/v1/meal-plans?petId=${petId}`)
      .auth(token, { type: 'bearer' });
    expect(before.body.plans).toEqual([]);

    const saved = await request(app)
      .post('/api/v1/meal-plans')
      .auth(token, { type: 'bearer' })
      .send(input);
    expect(saved.status).toBe(201);
    expect(saved.body.plan.preview.dailyGrams).toBeGreaterThan(0);
    const repeated = await request(app)
      .post('/api/v1/meal-plans')
      .auth(token, { type: 'bearer' })
      .send(input);
    expect(repeated.body.plan.id).toBe(saved.body.plan.id);
    const planId = saved.body.plan.id as string;
    const log = await request(app)
      .put(`/api/v1/meal-plans/${planId}/logs`)
      .auth(token, { type: 'bearer' })
      .send({
        date: today,
        mealIndex: 0,
        status: 'partial',
        actualGrams: 20,
        extrasKcal: 0,
        note: 'Left some',
      });
    expect(log.status).toBe(200);
    const logs = await request(app)
      .get(`/api/v1/meal-plans/${planId}/logs?date=${today}`)
      .auth(token, { type: 'bearer' });
    expect(logs.body.logs).toHaveLength(1);
    expect(logs.body.logs[0].actualGrams).toBe(20);
    const revised = await request(app)
      .post('/api/v1/meal-plans')
      .auth(token, { type: 'bearer' })
      .send({
        ...input,
        requestId: '22345678-1234-1234-1234-123456789abc',
        mode: 'manual',
        manualDailyGrams: 110,
      });
    expect(revised.status).toBe(201);
    expect(revised.body.plan.version).toBe(2);
    const history = await request(app)
      .get(`/api/v1/meal-plans?petId=${petId}`)
      .auth(token, { type: 'bearer' });
    expect(history.body.plans).toHaveLength(2);
    expect(history.body.plans[1].endedAt).not.toBeNull();
    const oldLogs = await request(app)
      .get(`/api/v1/meal-plans/${planId}/logs?date=${today}`)
      .auth(token, { type: 'bearer' });
    expect(oldLogs.body.logs[0].actualGrams).toBe(20);
  });

  it('blocks unsafe estimates but permits an existing amount and protects ownership', async () => {
    const owner = await account();
    const stranger = await account();
    const createdPet = await request(app)
      .post('/api/v1/pets')
      .auth(owner, { type: 'bearer' })
      .send({ ...petInput, healthConditions: ['diabetes'] });
    const petId = createdPet.body.pet.id as string;
    const estimate = await request(app)
      .post('/api/v1/meal-plans')
      .auth(owner, { type: 'bearer' })
      .send(planInput(petId));
    expect(estimate.status).toBe(400);
    const manual = await request(app)
      .post('/api/v1/meal-plans')
      .auth(owner, { type: 'bearer' })
      .send({
        ...planInput(petId),
        mode: 'manual',
        manualDailyGrams: 100,
        food: { ...planInput(petId).food, adequacy: 'unknown', calories: null },
      });
    expect(manual.status).toBe(201);
    expect(manual.body.plan.preview.dailyKcal).toBeNull();
    const otherList = await request(app)
      .get(`/api/v1/meal-plans?petId=${petId}`)
      .auth(stranger, { type: 'bearer' });
    expect(otherList.status).toBe(404);
    const otherLog = await request(app)
      .put(`/api/v1/meal-plans/${manual.body.plan.id}/logs`)
      .auth(stranger, { type: 'bearer' })
      .send({ date: today, mealIndex: 0, status: 'fed', actualGrams: 50, extrasKcal: 0, note: '' });
    expect(otherLog.status).toBe(404);
  });

  it('stores dated weight and nine-point condition observations for the owner only', async () => {
    const owner = await account();
    const stranger = await account();
    const createdPet = await request(app)
      .post('/api/v1/pets')
      .auth(owner, { type: 'bearer' })
      .send(petInput);
    const petId = createdPet.body.pet.id as string;
    const recorded = await request(app)
      .post('/api/v1/nutrition-observations')
      .auth(owner, { type: 'bearer' })
      .send({ petId, weightKg: 6.4, measuredOn: today, conditionScore: 5, observer: 'owner' });
    expect(recorded.status).toBe(201);
    const listed = await request(app)
      .get(`/api/v1/nutrition-observations?petId=${petId}`)
      .auth(owner, { type: 'bearer' });
    expect(listed.body.observations).toHaveLength(1);
    expect(listed.body.observations[0].conditionScore).toBe(5);
    const hidden = await request(app)
      .get(`/api/v1/nutrition-observations?petId=${petId}`)
      .auth(stranger, { type: 'bearer' });
    expect(hidden.status).toBe(404);
    const invalid = await request(app)
      .post('/api/v1/nutrition-observations')
      .auth(owner, { type: 'bearer' })
      .send({ petId, weightKg: 6.4, measuredOn: today, conditionScore: 10, observer: 'owner' });
    expect(invalid.status).toBe(400);
  });
});
