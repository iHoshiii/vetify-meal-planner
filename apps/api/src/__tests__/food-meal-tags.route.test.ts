import { defaultIngredientCatalog } from '@vetify/planner-shared/ingredient-catalog';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { createApp } from '../app.js';
import { clearTestDb, startTestDb, stopTestDb } from './db-utils.js';
import { account, mockFetch, petInput, testConfig } from './fixtures.js';

const app = createApp({ config: testConfig, fetcher: mockFetch });
beforeAll(startTestDb, 120_000);
afterEach(clearTestDb);
afterAll(stopTestDb);

it('persists meal tags in the selected pet library, preserves them on older-client edits and exports them', async () => {
  const token = await account();
  const pet = await request(app)
    .post('/api/v1/pets')
    .auth(token, { type: 'bearer' })
    .send(petInput);
  expect(pet.status).toBe(201);
  const petId = pet.body.pet.id as string;
  const original = defaultIngredientCatalog[0]!;
  const details = { ...original.details, mealTypes: ['breakfast', 'dinner'] };
  const created = await request(app)
    .post('/api/v1/foods')
    .auth(token, { type: 'bearer' })
    .send({ petId, food: original.food, details });
  expect(created.status).toBe(201);
  expect(created.body.food.details).toEqual(details);
  const updated = await request(app)
    .put(`/api/v1/foods/${created.body.food.id}`)
    .auth(token, { type: 'bearer' })
    .send({ petId, food: { ...original.food, name: 'My chicken' } });
  expect(updated.status).toBe(200);
  expect(updated.body.food.details).toEqual(details);
  const listed = await request(app)
    .get(`/api/v1/foods?petId=${petId}`)
    .auth(token, { type: 'bearer' });
  expect(listed.body.foods[0].details.mealTypes).toEqual(['breakfast', 'dinner']);
  expect(listed.body.catalog).toEqual(defaultIngredientCatalog);
  const exported = await request(app).get('/api/v1/export').auth(token, { type: 'bearer' });
  expect(exported.body.saved_foods[0].details.mealTypes).toEqual(['breakfast', 'dinner']);
  const revised = await request(app)
    .put(`/api/v1/foods/${created.body.food.id}`)
    .auth(token, { type: 'bearer' })
    .send({ petId, food: updated.body.food.food, details: { ...details, mealTypes: ['lunch'] } });
  expect(revised.status).toBe(200);
  expect(revised.body.food.details.mealTypes).toEqual(['lunch']);
  expect(revised.body.food.details.nutritionPer100g).toEqual(original.details.nutritionPer100g);
});
