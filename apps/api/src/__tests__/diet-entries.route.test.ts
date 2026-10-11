import { randomUUID } from 'node:crypto';
import {
  summarizeDailyDiet,
  type DietAssessmentInput,
  type DietEntryInput,
} from '@vetify/planner-shared/daily-diet';
import {
  defaultFoodDetails,
  type FoodDetails,
  type FoodLabel,
  type SavedFood,
} from '@vetify/planner-shared/foods';
import { defaultIngredientCatalog } from '@vetify/planner-shared/ingredient-catalog';
import { ObjectId } from 'mongodb';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createApp } from '../app.js';
import { getDb } from '../config/db.js';
import { DIET_ASSESSMENTS_COLLECTION } from '../models/diet-assessments.js';
import { DIET_ENTRIES_COLLECTION } from '../models/diet-entries.js';
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
const chicken = defaultIngredientCatalog[0]!;
beforeAll(startTestDb, 120_000);
afterEach(async () => {
  vi.useRealTimers();
  await clearTestDb();
});
afterAll(stopTestDb);

async function petFor(token: string, changes = {}) {
  const result = await request(app)
    .post('/api/v1/pets')
    .auth(token, { type: 'bearer' })
    .send({ ...petInput, ...changes });
  expect(result.status).toBe(201);
  return result.body.pet.id as string;
}

function entryInput(petId: string, overrides: Partial<DietEntryInput> = {}): DietEntryInput {
  return {
    requestId: randomUUID(),
    petId,
    date: today,
    source: 'catalog',
    foodId: chicken.id,
    grams: 50,
    ...overrides,
  };
}

function assessmentInput(
  petId: string,
  overrides: Partial<DietAssessmentInput> = {},
): DietAssessmentInput {
  const {
    weightKg,
    weightMeasuredOn,
    conditionScore,
    stableWeight,
    growing,
    healthConcern,
    prescribedDiet,
    appetiteChange,
  } = planInput(petId);
  return {
    petId,
    weightKg,
    weightMeasuredOn,
    conditionScore,
    stableWeight,
    growing,
    healthConcern,
    prescribedDiet,
    appetiteChange,
    ...overrides,
  };
}

async function foodFor(
  token: string,
  petId: string,
  changes: Partial<FoodLabel> = {},
  details = defaultFoodDetails(),
): Promise<SavedFood> {
  const result = await request(app)
    .post('/api/v1/foods')
    .auth(token, { type: 'bearer' })
    .send({ petId, food: { ...planInput(petId).food, ...changes }, details });
  expect(result.status).toBe(201);
  return result.body.food as SavedFood;
}

function add(token: string, input: DietEntryInput) {
  return request(app).post('/api/v1/diet-entries').auth(token, { type: 'bearer' }).send(input);
}

function list(token: string, petId: string, date = today) {
  return request(app)
    .get(`/api/v1/diet-entries?petId=${petId}&date=${date}`)
    .auth(token, { type: 'bearer' });
}

describe('daily food entries', () => {
  it('resolves catalog composition on the server and stores a scaled immutable snapshot', async () => {
    const token = await account();
    const petId = await petFor(token);
    const input = entryInput(petId);
    const created = await add(token, input);
    expect(created.status).toBe(201);
    expect(created.body.entry).toMatchObject({
      ...input,
      timeZone: 'Asia/Manila',
      food: chicken.food,
      details: chicken.details,
      nutrition: { kcal: 82.5, proteinG: 15.5, fatG: 1.8, carbsG: 0 },
    });
    expect(created.body.entry).not.toHaveProperty('ownerId');
    const saved = await getDb().collection(DIET_ENTRIES_COLLECTION).findOne({});
    expect(saved?.ownerId).toBe(principals.get(token)!.user.id);
    expect(saved?.petId).toEqual(new ObjectId(petId));
    expect((await list(token, petId)).body.entries).toEqual([created.body.entry]);
  });

  it('prefers a package energy label and keeps missing macros separate from known zero', async () => {
    const token = await account();
    const petId = await petFor(token);
    const details: FoodDetails = {
      ...defaultFoodDetails(),
      nutritionPer100g: { kcal: 100, proteinG: null, fatG: 0, carbsG: 20 },
    };
    const food = await foodFor(
      token,
      petId,
      { calorieBasis: 'package', calories: 125, packageGrams: 100 },
      details,
    );
    const result = await add(
      token,
      entryInput(petId, { source: 'saved', foodId: food.id, grams: 40 }),
    );
    expect(result.status).toBe(201);
    expect(result.body.entry.nutrition).toEqual({ kcal: 50, proteinG: null, fatG: 0, carbsG: 8 });
  });

  it('retains snapshots after a source edit or deletion and reuses the original request safely', async () => {
    const token = await account();
    const petId = await petFor(token);
    const food = await foodFor(token, petId);
    const input = entryInput(petId, { source: 'saved', foodId: food.id });
    const first = await add(token, input);
    expect(first.status).toBe(201);
    const edit = await request(app)
      .put(`/api/v1/foods/${food.id}`)
      .auth(token, { type: 'bearer' })
      .send({ petId, food: { ...food.food, name: 'Revised bag', calories: 5000 } });
    expect(edit.status).toBe(200);
    expect((await add(token, input)).body.entry).toEqual(first.body.entry);
    expect(
      (await request(app).delete(`/api/v1/foods/${food.id}`).auth(token, { type: 'bearer' }))
        .status,
    ).toBe(204);
    expect((await add(token, input)).body.entry).toEqual(first.body.entry);
    expect((await list(token, petId)).body.entries).toEqual([first.body.entry]);
    const changed = await add(token, { ...input, grams: input.grams + 1 });
    expect(changed.status).toBe(409);
    expect(changed.body.reason).toBe('request-conflict');
    expect(await getDb().collection(DIET_ENTRIES_COLLECTION).countDocuments()).toBe(1);
  });

  it('deduplicates concurrent retries without merging another owner request', async () => {
    const token = await account();
    const petId = await petFor(token);
    const input = entryInput(petId);
    const responses = await Promise.all([add(token, input), add(token, input)]);
    expect(responses.map((response) => response.status)).toEqual([201, 201]);
    expect(responses[0]!.body.entry.id).toBe(responses[1]!.body.entry.id);
    const other = await account();
    const otherPet = await petFor(other);
    const independent = await add(other, { ...input, petId: otherPet });
    expect(independent.status).toBe(201);
    expect(independent.body.entry.id).not.toBe(responses[0]!.body.entry.id);
    expect(await getDb().collection(DIET_ENTRIES_COLLECTION).countDocuments()).toBe(2);
  });

  it('isolates owners, selected pets and days and prevents borrowing another pet food', async () => {
    const token = await account();
    const stranger = await account();
    const petId = await petFor(token);
    const secondPet = await petFor(token, { name: 'Luna' });
    const strangerPet = await petFor(stranger);
    const food = await foodFor(token, petId);
    const own = await add(token, entryInput(petId, { source: 'saved', foodId: food.id }));
    expect(own.status).toBe(201);
    expect(
      (await add(token, entryInput(secondPet, { source: 'saved', foodId: food.id }))).status,
    ).toBe(404);
    expect(
      (await add(stranger, entryInput(strangerPet, { source: 'saved', foodId: food.id }))).status,
    ).toBe(404);
    expect((await add(stranger, entryInput(petId))).status).toBe(404);
    expect((await list(stranger, petId)).status).toBe(404);
    expect((await list(token, secondPet)).body.entries).toEqual([]);
    const yesterday = new Date(`${today}T00:00:00.000Z`);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    expect((await list(token, petId, yesterday.toISOString().slice(0, 10))).body.entries).toEqual(
      [],
    );
    expect(
      (
        await request(app)
          .delete(`/api/v1/diet-entries/${own.body.entry.id}`)
          .auth(stranger, { type: 'bearer' })
      ).status,
    ).toBe(404);
    const exported = await request(app).get('/api/v1/export').auth(stranger, { type: 'bearer' });
    expect(exported.body.diet_entries).toEqual([]);
    const ownExport = await request(app).get('/api/v1/export').auth(token, { type: 'bearer' });
    expect(ownExport.body.diet_entries[0].food).toEqual(food.food);
  });

  it('checks species and a current owned parent for every mutation', async () => {
    const token = await account();
    const petId = await petFor(token);
    const catId = await petFor(token, { name: 'Nori', species: 'cat', breed: '' });
    expect((await add(token, entryInput(catId))).status).toBe(400);
    const dogFoodForCat = await foodFor(token, catId);
    expect(
      (await add(token, entryInput(catId, { source: 'saved', foodId: dogFoodForCat.id }))).status,
    ).toBe(400);
    const entry = await add(token, entryInput(petId));
    expect(entry.status).toBe(201);
    await getDb()
      .collection('pets')
      .deleteOne({ _id: new ObjectId(petId) });
    expect((await add(token, entryInput(petId))).status).toBe(404);
    expect((await list(token, petId)).status).toBe(404);
    expect(
      (
        await request(app)
          .delete(`/api/v1/diet-entries/${entry.body.entry.id}`)
          .auth(token, { type: 'bearer' })
      ).status,
    ).toBe(404);
    expect(await getDb().collection(DIET_ENTRIES_COLLECTION).countDocuments()).toBe(1);
  });

  it('rejects invalid portions, future or impossible dates and client nutrition/ownership claims', async () => {
    const token = await account();
    const petId = await petFor(token);
    const body = entryInput(petId);
    for (const changes of [
      { grams: 0 },
      { grams: -1 },
      { grams: 10001 },
      { requestId: 'invalid' },
      { date: '2026-02-30' },
      { date: '2999-01-01' },
      { ownerId: 'another' },
      { nutrition: { kcal: 1 } },
      { food: chicken.food },
      { details: chicken.details },
      { createdAt: '2020-01-01' },
    ]) {
      expect(
        (
          await request(app)
            .post('/api/v1/diet-entries')
            .auth(token, { type: 'bearer' })
            .send({ ...body, ...changes })
        ).status,
      ).toBe(400);
    }
    expect((await add(token, { ...body, source: 'saved', foodId: 'bad' })).status).toBe(400);
    expect((await add(token, { ...body, foodId: 'missing-catalog-food' })).status).toBe(404);
    for (const query of [
      `date=${today}`,
      `petId=bad&date=${today}`,
      `petId=${petId}&date=2026-02-30`,
      `petId=${petId}&date=2999-01-01`,
    ]) {
      expect(
        (await request(app).get(`/api/v1/diet-entries?${query}`).auth(token, { type: 'bearer' }))
          .status,
      ).toBe(400);
    }
    expect(await getDb().collection(DIET_ENTRIES_COLLECTION).countDocuments()).toBe(0);
  });

  it('uses the account civil date instead of the computer UTC date', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-07T12:30:00Z'));
    const token = await account();
    const principal = principals.get(token)!;
    principal.region.timeZone = 'Pacific/Kiritimati';
    const petId = await petFor(token);
    const input = entryInput(petId, { date: '2026-10-08' });
    const added = await add(token, input);
    expect(added.status).toBe(201);
    expect(added.body.entry.timeZone).toBe('Pacific/Kiritimati');
    principal.region.timeZone = 'Pacific/Honolulu';
    expect((await add(token, { ...input, requestId: randomUUID() })).status).toBe(400);
  });

  it('removes only the selected record and derives restored totals without replacing unknown values by zero', async () => {
    const token = await account();
    const petId = await petFor(token);
    const known = await add(token, entryInput(petId));
    const unknownFood = await foodFor(token, petId, { calories: null });
    const unknown = await add(
      token,
      entryInput(petId, { source: 'saved', foodId: unknownFood.id }),
    );
    expect(known.status).toBe(201);
    expect(unknown.status).toBe(201);
    const targets = { kcal: 500, proteinG: 30, fatG: 10, carbsG: null };
    const before = summarizeDailyDiet((await list(token, petId)).body.entries, targets);
    expect(before.kcal).toMatchObject({
      known: 82.5,
      total: null,
      missingEntries: 1,
      remaining: null,
    });
    expect(
      (
        await request(app)
          .delete(`/api/v1/diet-entries/${unknown.body.entry.id}`)
          .auth(token, { type: 'bearer' })
      ).status,
    ).toBe(204);
    const after = summarizeDailyDiet((await list(token, petId)).body.entries, targets);
    expect(after.kcal).toMatchObject({ total: 82.5, remaining: 417.5 });
    expect(after.proteinG).toMatchObject({ total: 15.5, remaining: 14.5 });
    expect(
      (
        await request(app)
          .delete(`/api/v1/diet-entries/${known.body.entry.id}`)
          .auth(token, { type: 'bearer' })
      ).status,
    ).toBe(204);
    expect((await list(token, petId)).body.entries).toEqual([]);
  });

  it('requires authentication and returns no record for malformed or missing deletion IDs', async () => {
    const id = new ObjectId().toHexString();
    expect((await request(app).get(`/api/v1/diet-entries?petId=${id}&date=${today}`)).status).toBe(
      401,
    );
    expect((await request(app).post('/api/v1/diet-entries').send(entryInput(id))).status).toBe(401);
    expect((await request(app).delete(`/api/v1/diet-entries/${id}`)).status).toBe(401);
    const token = await account();
    for (const entryId of ['bad', id])
      expect(
        (
          await request(app)
            .delete(`/api/v1/diet-entries/${entryId}`)
            .auth(token, { type: 'bearer' })
        ).status,
      ).toBe(404);
  });
});

describe('explicit daily diet assessments', () => {
  it('starts empty and replaces one owner/pet assessment while preserving explicit screening flags', async () => {
    const token = await account();
    const petId = await petFor(token);
    const secondPet = await petFor(token, { name: 'Luna' });
    expect(
      (await request(app).get(`/api/v1/diet-assessments/${petId}`).auth(token, { type: 'bearer' }))
        .body,
    ).toEqual({ assessment: null });
    const input = assessmentInput(petId);
    const result = await request(app)
      .put(`/api/v1/diet-assessments/${petId}`)
      .auth(token, { type: 'bearer' })
      .send(input);
    expect(result.status).toBe(200);
    const { petId: _petId, ...expected } = input;
    expect(result.body).toEqual({ assessment: expected });
    const revised = { ...input, healthConcern: true };
    expect(
      (
        await request(app)
          .put(`/api/v1/diet-assessments/${petId}`)
          .auth(token, { type: 'bearer' })
          .send(revised)
      ).status,
    ).toBe(200);
    expect(
      (await request(app).get(`/api/v1/diet-assessments/${petId}`).auth(token, { type: 'bearer' }))
        .body.assessment.healthConcern,
    ).toBe(true);
    expect(
      (
        await request(app)
          .get(`/api/v1/diet-assessments/${secondPet}`)
          .auth(token, { type: 'bearer' })
      ).body,
    ).toEqual({ assessment: null });
    expect(await getDb().collection(DIET_ASSESSMENTS_COLLECTION).countDocuments()).toBe(1);
  });

  it('expires both stale measurements and old confirmations without deleting the audit record', async () => {
    const token = await account();
    const petId = await petFor(token);
    const input = assessmentInput(petId);
    expect(
      (
        await request(app)
          .put(`/api/v1/diet-assessments/${petId}`)
          .auth(token, { type: 'bearer' })
          .send(input)
      ).status,
    ).toBe(200);
    const old = new Date(`${today}T00:00:00.000Z`);
    old.setUTCDate(old.getUTCDate() - 31);
    const stale = old.toISOString().slice(0, 10);
    const collection = getDb().collection(DIET_ASSESSMENTS_COLLECTION);
    await collection.updateOne({}, { $set: { confirmedOn: stale } });
    expect(
      (await request(app).get(`/api/v1/diet-assessments/${petId}`).auth(token, { type: 'bearer' }))
        .body.assessment,
    ).toBeNull();
    await collection.updateOne(
      {},
      { $set: { confirmedOn: today, 'assessment.weightMeasuredOn': stale } },
    );
    expect(
      (await request(app).get(`/api/v1/diet-assessments/${petId}`).auth(token, { type: 'bearer' }))
        .body.assessment,
    ).toBeNull();
    expect(await collection.countDocuments()).toBe(1);
  });

  it('enforces authentication, owner and matching parent IDs and never exports another owner assessment', async () => {
    const owner = await account();
    const stranger = await account();
    const petId = await petFor(owner);
    const otherPet = await petFor(stranger);
    const input = assessmentInput(petId);
    expect((await request(app).get(`/api/v1/diet-assessments/${petId}`)).status).toBe(401);
    expect((await request(app).put(`/api/v1/diet-assessments/${petId}`).send(input)).status).toBe(
      401,
    );
    expect(
      (
        await request(app)
          .get(`/api/v1/diet-assessments/${petId}`)
          .auth(stranger, { type: 'bearer' })
      ).status,
    ).toBe(404);
    expect(
      (
        await request(app)
          .put(`/api/v1/diet-assessments/${petId}`)
          .auth(stranger, { type: 'bearer' })
          .send(input)
      ).status,
    ).toBe(404);
    expect(
      (
        await request(app)
          .put(`/api/v1/diet-assessments/${otherPet}`)
          .auth(owner, { type: 'bearer' })
          .send(input)
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app)
          .put(`/api/v1/diet-assessments/${petId}`)
          .auth(owner, { type: 'bearer' })
          .send(input)
      ).status,
    ).toBe(200);
    expect(
      (await request(app).get('/api/v1/export').auth(stranger, { type: 'bearer' })).body
        .diet_assessments,
    ).toEqual([]);
    const exported = await request(app).get('/api/v1/export').auth(owner, { type: 'bearer' });
    expect(exported.body.diet_assessments[0]).toMatchObject({
      petId,
      ownerId: principals.get(owner)!.user.id,
      confirmedOn: today,
      timeZone: 'Asia/Manila',
      assessment: { weightKg: input.weightKg },
    });
    await getDb()
      .collection('pets')
      .deleteOne({ _id: new ObjectId(petId) });
    expect(
      (
        await request(app)
          .put(`/api/v1/diet-assessments/${petId}`)
          .auth(owner, { type: 'bearer' })
          .send(input)
      ).status,
    ).toBe(404);
  });

  it('rejects unconfirmed flags, extra authority fields and invalid or future measurements', async () => {
    const token = await account();
    const petId = await petFor(token);
    const input = assessmentInput(petId);
    for (const changes of [
      { stableWeight: undefined },
      { weightMeasuredOn: '2026-02-30' },
      { weightMeasuredOn: '2999-01-01' },
      { weightKg: 0 },
      { ownerId: 'another' },
      { confirmedOn: today },
      { updatedAt: '2020-01-01' },
    ]) {
      expect(
        (
          await request(app)
            .put(`/api/v1/diet-assessments/${petId}`)
            .auth(token, { type: 'bearer' })
            .send({ ...input, ...changes })
        ).status,
      ).toBe(400);
    }
    expect(await getDb().collection(DIET_ASSESSMENTS_COLLECTION).countDocuments()).toBe(0);
  });
});
