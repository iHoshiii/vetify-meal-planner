import type { FoodLabel } from '@vetify/planner-shared/foods';
import { ObjectId } from 'mongodb';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../app.js';
import { getDb } from '../config/db.js';
import { SAVED_FOODS_COLLECTION } from '../models/foods.js';
import { clearTestDb, startTestDb, stopTestDb } from './db-utils.js';
import { account, mockFetch, petInput, planInput, principals, testConfig } from './fixtures.js';

const app = createApp({ config: testConfig, fetcher: mockFetch });
beforeAll(startTestDb, 120_000);
afterEach(clearTestDb);
afterAll(stopTestDb);

async function petFor(token: string, name = 'Milo') {
  const created = await request(app)
    .post('/api/v1/pets')
    .auth(token, { type: 'bearer' })
    .send({ ...petInput, name });
  expect(created.status).toBe(201);
  return created.body.pet.id as string;
}

async function foodFor(token: string, petId: string, changes: Partial<FoodLabel> = {}) {
  const created = await request(app)
    .post('/api/v1/foods')
    .auth(token, { type: 'bearer' })
    .send({ petId, food: { ...planInput(petId).food, ...changes } });
  expect(created.status).toBe(201);
  return created.body.food;
}

describe('packaged food library', () => {
  it('starts with an empty catalog and stores, edits and removes the selected pet food', async () => {
    const token = await account();
    const petId = await petFor(token);
    const empty = await request(app)
      .get(`/api/v1/foods?petId=${petId}`)
      .auth(token, { type: 'bearer' });
    expect(empty.status).toBe(200);
    expect(empty.body).toEqual({ foods: [], catalog: [] });

    const saved = await foodFor(token, petId);
    expect(saved.petId).toBe(petId);
    expect(saved.food.calories).toBe(3500);
    expect(saved).not.toHaveProperty('ownerId');
    expect(saved.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    const revisedFood = {
      ...saved.food,
      name: 'Updated package label',
      form: 'wet',
      calorieBasis: 'package',
      calories: 125,
      packageGrams: 100,
    };
    const updated = await request(app)
      .put(`/api/v1/foods/${saved.id}`)
      .auth(token, { type: 'bearer' })
      .send({ petId, food: revisedFood });
    expect(updated.status).toBe(200);
    expect(updated.body.food.food).toEqual(revisedFood);
    expect(updated.body.food.createdAt).toBe(saved.createdAt);
    const listed = await request(app)
      .get(`/api/v1/foods?petId=${petId}`)
      .auth(token, { type: 'bearer' });
    expect(listed.body.foods).toEqual([updated.body.food]);

    const deleted = await request(app)
      .delete(`/api/v1/foods/${saved.id}`)
      .auth(token, { type: 'bearer' });
    expect(deleted.status).toBe(204);
    expect(deleted.text).toBe('');
    expect(
      (await request(app).get(`/api/v1/foods?petId=${petId}`).auth(token, { type: 'bearer' })).body
        .foods,
    ).toEqual([]);
  });

  it('keeps the same owner pets separate and refuses to move a food to another pet', async () => {
    const token = await account();
    const firstPetId = await petFor(token);
    const secondPetId = await petFor(token, 'Luna');
    const firstFood = await foodFor(token, firstPetId, { name: 'Milo package' });
    const secondFood = await foodFor(token, secondPetId, { name: 'Luna package' });
    const moved = await request(app)
      .put(`/api/v1/foods/${firstFood.id}`)
      .auth(token, { type: 'bearer' })
      .send({ petId: secondPetId, food: firstFood.food });
    expect(moved.status).toBe(404);
    const firstList = await request(app)
      .get(`/api/v1/foods?petId=${firstPetId}`)
      .auth(token, { type: 'bearer' });
    const secondList = await request(app)
      .get(`/api/v1/foods?petId=${secondPetId}`)
      .auth(token, { type: 'bearer' });
    expect(firstList.body.foods.map((food: { id: string }) => food.id)).toEqual([firstFood.id]);
    expect(secondList.body.foods.map((food: { id: string }) => food.id)).toEqual([secondFood.id]);
  });

  it('does not expose or mutate another owner food, even using the stranger own pet ID', async () => {
    const owner = await account();
    const stranger = await account();
    const petId = await petFor(owner);
    const otherPetId = await petFor(stranger);
    const saved = await foodFor(owner, petId);
    const listed = await request(app)
      .get(`/api/v1/foods?petId=${petId}`)
      .auth(stranger, { type: 'bearer' });
    expect(listed.status).toBe(404);
    const created = await request(app)
      .post('/api/v1/foods')
      .auth(stranger, { type: 'bearer' })
      .send({ petId, food: saved.food });
    expect(created.status).toBe(404);
    for (const requestedPetId of [petId, otherPetId]) {
      const edited = await request(app)
        .put(`/api/v1/foods/${saved.id}`)
        .auth(stranger, { type: 'bearer' })
        .send({ petId: requestedPetId, food: { ...saved.food, name: 'Not my food' } });
      expect(edited.status).toBe(404);
    }
    const deleted = await request(app)
      .delete(`/api/v1/foods/${saved.id}`)
      .auth(stranger, { type: 'bearer' });
    expect(deleted.status).toBe(404);
    const unchanged = await request(app)
      .get(`/api/v1/foods?petId=${petId}`)
      .auth(owner, { type: 'bearer' });
    expect(unchanged.body.foods).toEqual([saved]);
  });

  it('requires a current owned parent pet for saved-food mutations', async () => {
    const token = await account();
    const petId = await petFor(token);
    const saved = await foodFor(token, petId);
    await getDb()
      .collection('pets')
      .deleteOne({ _id: new ObjectId(petId) });
    const update = await request(app)
      .put(`/api/v1/foods/${saved.id}`)
      .auth(token, { type: 'bearer' })
      .send({ petId, food: saved.food });
    expect(update.status).toBe(404);
    const remove = await request(app)
      .delete(`/api/v1/foods/${saved.id}`)
      .auth(token, { type: 'bearer' });
    expect(remove.status).toBe(404);
    expect(await getDb().collection(SAVED_FOODS_COLLECTION).countDocuments()).toBe(1);
  });

  it('rejects owner, identity and timestamp mass assignment', async () => {
    const token = await account();
    const petId = await petFor(token);
    const food = planInput(petId).food;
    for (const extra of [
      { ownerId: new ObjectId().toHexString() },
      { id: new ObjectId().toHexString() },
      { createdAt: '2020-01-01T00:00:00.000Z' },
      { $set: { ownerId: 'somebody-else' } },
    ]) {
      const response = await request(app)
        .post('/api/v1/foods')
        .auth(token, { type: 'bearer' })
        .send({ petId, food, ...extra });
      expect(response.status).toBe(400);
    }
    const nested = await request(app)
      .post('/api/v1/foods')
      .auth(token, { type: 'bearer' })
      .send({ petId, food: { ...food, ownerId: 'somebody-else' } });
    expect(nested.status).toBe(400);
    expect(await getDb().collection(SAVED_FOODS_COLLECTION).countDocuments()).toBe(0);
  });

  it('validates label numbers, real dates and the calorie/package relationship on create and edit', async () => {
    const token = await account();
    const petId = await petFor(token);
    const saved = await foodFor(token, petId);
    for (const changes of [
      { calories: 0 },
      { calories: 10001 },
      { packageGrams: -1 },
      { labelCheckedOn: '2026-02-30' },
      { labelCheckedOn: '2999-01-01' },
      { calorieBasis: 'package', calories: 100, packageGrams: null },
    ]) {
      const body = { petId, food: { ...saved.food, ...changes } };
      expect(
        (await request(app).post('/api/v1/foods').auth(token, { type: 'bearer' }).send(body))
          .status,
      ).toBe(400);
      expect(
        (
          await request(app)
            .put(`/api/v1/foods/${saved.id}`)
            .auth(token, { type: 'bearer' })
            .send(body)
        ).status,
      ).toBe(400);
    }
    const unchanged = await request(app)
      .get(`/api/v1/foods?petId=${petId}`)
      .auth(token, { type: 'bearer' });
    expect(unchanged.body.foods).toEqual([saved]);
  });

  it('preserves unknown label calories without manufacturing a calorie value', async () => {
    const token = await account();
    const petId = await petFor(token);
    const saved = await foodFor(token, petId, {
      calories: null,
      adequacy: 'unknown',
      labelSource: '',
      labelCheckedOn: null,
    });
    expect(saved.food.calories).toBeNull();
    expect(saved.food.labelCheckedOn).toBeNull();
  });

  it('exports saved labels only for the requesting owner', async () => {
    const owner = await account();
    const stranger = await account();
    const petId = await petFor(owner);
    const otherPetId = await petFor(stranger);
    const saved = await foodFor(owner, petId, { name: 'Owner package' });
    await foodFor(stranger, otherPetId, { name: 'Other owner package' });
    const exported = await request(app).get('/api/v1/export').auth(owner, { type: 'bearer' });
    expect(exported.status).toBe(200);
    expect(exported.body.saved_foods).toHaveLength(1);
    expect(exported.body.saved_foods[0]._id).toBe(saved.id);
    expect(exported.body.saved_foods[0].ownerId).toBe(principals.get(owner)?.user.id);
    expect(exported.body.saved_foods[0].food.name).toBe('Owner package');
  });

  it('rejects malformed, missing and unknown pet or food IDs', async () => {
    const token = await account();
    const petId = await petFor(token);
    const food = planInput(petId).food;
    for (const query of ['', '?petId=bad', '?petId[]=bad']) {
      expect(
        (await request(app).get(`/api/v1/foods${query}`).auth(token, { type: 'bearer' })).status,
      ).toBe(400);
    }
    const unknownPet = new ObjectId().toHexString();
    expect(
      (await request(app).get(`/api/v1/foods?petId=${unknownPet}`).auth(token, { type: 'bearer' }))
        .status,
    ).toBe(404);
    expect(
      (
        await request(app)
          .post('/api/v1/foods')
          .auth(token, { type: 'bearer' })
          .send({ petId: unknownPet, food })
      ).status,
    ).toBe(404);
    for (const id of ['bad', new ObjectId().toHexString()]) {
      expect(
        (
          await request(app)
            .put(`/api/v1/foods/${id}`)
            .auth(token, { type: 'bearer' })
            .send({ petId, food })
        ).status,
      ).toBe(404);
      expect(
        (await request(app).delete(`/api/v1/foods/${id}`).auth(token, { type: 'bearer' })).status,
      ).toBe(404);
    }
  });

  it('requires authentication for every food-library endpoint', async () => {
    const petId = new ObjectId().toHexString();
    const foodId = new ObjectId().toHexString();
    const body = { petId, food: planInput(petId).food };
    expect((await request(app).get(`/api/v1/foods?petId=${petId}`)).status).toBe(401);
    expect((await request(app).post('/api/v1/foods').send(body)).status).toBe(401);
    expect((await request(app).put(`/api/v1/foods/${foodId}`).send(body)).status).toBe(401);
    expect((await request(app).delete(`/api/v1/foods/${foodId}`)).status).toBe(401);
  });
});
