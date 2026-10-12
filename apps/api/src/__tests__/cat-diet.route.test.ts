import { randomUUID } from 'node:crypto';
import {
  catIngredientCatalog,
  catPackagedFoodCatalog,
} from '@vetify/planner-shared/cat-food-catalog';
import {
  estimateDailyDietTargets,
  summarizeDailyDiet,
  type DietAssessmentInput,
  type DietEntry,
  type DietEntryInput,
} from '@vetify/planner-shared/daily-diet';
import { defaultIngredientCatalog } from '@vetify/planner-shared/ingredient-catalog';
import type { Pet } from '@vetify/planner-shared/pets';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../app.js';
import { getDb } from '../config/db.js';
import { DIET_ENTRIES_COLLECTION } from '../models/diet-entries.js';
import { clearTestDb, startTestDb, stopTestDb } from './db-utils.js';
import { account, mockFetch, petInput, principals, testConfig, today } from './fixtures.js';

const app = createApp({ config: testConfig, fetcher: mockFetch });
const chicken = catIngredientCatalog[0]!;
const packaged = catPackagedFoodCatalog[0]!;
const month = today.slice(0, 7);

beforeAll(startTestDb, 120_000);
afterEach(clearTestDb);
afterAll(stopTestDb);

async function petFor(token: string, changes = {}): Promise<Pet> {
  const created = await request(app)
    .post('/api/v1/pets')
    .auth(token, { type: 'bearer' })
    .send({
      ...petInput,
      name: 'Nori',
      species: 'cat',
      breed: '',
      birthMonth: `${Number(today.slice(0, 4)) - 2}-01`,
      ageYears: 2,
      ageMonths: 0,
      weightKg: 4,
      bodyConditionScore: 5,
      ...changes,
    });
  expect(created.status).toBe(201);
  return created.body.pet as Pet;
}

function portion(petId: string, changes: Partial<DietEntryInput> = {}): DietEntryInput {
  return {
    requestId: randomUUID(),
    petId,
    date: today,
    source: 'catalog',
    foodId: chicken.id,
    grams: 50,
    ...changes,
  };
}

function add(token: string, input: DietEntryInput) {
  return request(app).post('/api/v1/diet-entries').auth(token, { type: 'bearer' }).send(input);
}

function diary(token: string, petId: string) {
  return request(app)
    .get(`/api/v1/diet-entries?petId=${petId}&date=${today}`)
    .auth(token, { type: 'bearer' });
}

function progress(token: string, petId: string) {
  return request(app)
    .get(`/api/v1/progress?petId=${petId}&month=${month}`)
    .auth(token, { type: 'bearer' });
}

describe('feline catalog and diary integration', () => {
  it('uses cat USDA values and labeled packaged energy through retries, export and monthly progress', async () => {
    const token = await account();
    const pet = await petFor(token);
    const library = await request(app)
      .get(`/api/v1/foods?petId=${pet.id}`)
      .auth(token, { type: 'bearer' });
    expect(library.status).toBe(200);
    expect(library.body.foods).toEqual([]);
    expect(library.body.catalog).toEqual([...catIngredientCatalog, ...catPackagedFoodCatalog]);
    expect(library.body.catalog).toHaveLength(7);
    const catIds = new Set(library.body.catalog.map((item: { id: string }) => item.id));
    expect(defaultIngredientCatalog.every(({ id }) => !catIds.has(id))).toBe(true);

    const input = portion(pet.id);
    const retries = await Promise.all([add(token, input), add(token, input)]);
    expect(retries.map((response) => response.status)).toEqual([201, 201]);
    expect(retries[0]!.body.entry).toEqual(retries[1]!.body.entry);
    const recorded = retries[0]!.body.entry as DietEntry;
    expect(recorded).toMatchObject({
      ...input,
      food: chicken.food,
      details: chicken.details,
      timeZone: 'Asia/Manila',
      nutrition: { kcal: 82.5, proteinG: 15.51, fatG: 1.785, carbsG: 0 },
    });
    expect(recorded.details.nutritionPer100g.proteinG).toBe(31.02);
    expect(defaultIngredientCatalog[0]!.details.nutritionPer100g.proteinG).toBe(31);
    expect(recorded.food.calories).toBeNull();
    expect(recorded.food.adequacy).toBe('supplemental');
    expect(recorded).not.toHaveProperty('ownerId');

    const can = await add(token, portion(pet.id, { foodId: packaged.id, grams: 10 }));
    expect(can.status).toBe(201);
    expect(can.body.entry).toMatchObject({
      food: { species: 'cat', adequacy: 'complete', calories: 1080 },
      nutrition: { kcal: 10.8, proteinG: null, fatG: null, carbsG: null },
    });
    expect(await getDb().collection(DIET_ENTRIES_COLLECTION).countDocuments()).toBe(2);
    const listed = await diary(token, pet.id);
    expect(listed.status).toBe(200);
    expect(listed.body.entries).toEqual([recorded, can.body.entry]);
    const totals = summarizeDailyDiet(listed.body.entries as DietEntry[], {
      kcal: null,
      proteinG: null,
      fatG: null,
      carbsG: null,
    });
    expect(totals.kcal.total).toBeCloseTo(93.3, 8);
    expect(totals.proteinG).toMatchObject({ known: 15.51, total: null, missingEntries: 1 });
    expect(totals.carbsG).toMatchObject({ known: 0, total: null, missingEntries: 1 });

    const monthly = await progress(token, pet.id);
    expect(monthly.status).toBe(200);
    const day = monthly.body.progress.days.find((item: { date: string }) => item.date === today);
    expect(day).toMatchObject({
      status: 'recorded',
      mealsLogged: 0,
      foodsLogged: 2,
      grams: 60,
      foodEntries: [recorded, can.body.entry],
    });
    expect(day.kcal).toBeCloseTo(93.3, 8);
    expect(monthly.body.progress.summary).toMatchObject({
      recordedDays: 1,
      loggedMeals: 0,
      loggedFoods: 2,
      loggedGrams: 60,
      unknownCalorieDays: 0,
    });
    expect(monthly.body.progress.summary.knownLoggedKcal).toBeCloseTo(93.3, 8);

    const exported = await request(app).get('/api/v1/export').auth(token, { type: 'bearer' });
    expect(exported.status).toBe(200);
    expect(exported.body.diet_entries).toHaveLength(2);
    const exportedChicken = exported.body.diet_entries.find(
      (entry: Pick<DietEntry, 'requestId'>) => entry.requestId === input.requestId,
    );
    const exportedCan = exported.body.diet_entries.find(
      (entry: Pick<DietEntry, 'requestId'>) => entry.requestId === can.body.entry.requestId,
    );
    expect(exportedChicken).toMatchObject({
      ownerId: principals.get(token)!.user.id,
      petId: pet.id,
      foodId: chicken.id,
      food: chicken.food,
      details: chicken.details,
      nutrition: recorded.nutrition,
    });
    expect(exportedCan.nutrition.proteinG).toBeNull();
  });

  it('keeps built-in records authoritative and immutable across invalid edits and nutrition claims', async () => {
    const token = await account();
    const pet = await petFor(token);
    for (const item of [chicken, packaged]) {
      expect(
        (
          await request(app)
            .put(`/api/v1/foods/${item.id}`)
            .auth(token, { type: 'bearer' })
            .send({
              petId: pet.id,
              food: { ...item.food, name: 'Changed built-in' },
              details: item.details,
            })
        ).status,
      ).toBe(404);
      expect(
        (await request(app).delete(`/api/v1/foods/${item.id}`).auth(token, { type: 'bearer' }))
          .status,
      ).toBe(404);
    }
    const claimed = await request(app)
      .post('/api/v1/diet-entries')
      .auth(token, { type: 'bearer' })
      .send({ ...portion(pet.id), nutrition: { kcal: 1, proteinG: 1, fatG: 0, carbsG: 0 } });
    expect(claimed.status).toBe(400);
    expect(await getDb().collection(DIET_ENTRIES_COLLECTION).countDocuments()).toBe(0);
    const library = await request(app)
      .get(`/api/v1/foods?petId=${pet.id}`)
      .auth(token, { type: 'bearer' });
    expect(library.body.catalog).toEqual([...catIngredientCatalog, ...catPackagedFoodCatalog]);
    expect((await add(token, portion(pet.id))).body.entry.details.nutritionPer100g.proteinG).toBe(
      31.02,
    );
  });

  it('preserves custom-food snapshots after edits/deletion and reverses only deleted diary portions', async () => {
    const token = await account();
    const pet = await petFor(token);
    const customFood = { ...chicken.food, name: 'My plain cooked chicken' };
    const customDetails = {
      ...chicken.details,
      notes: 'My batch estimate; supplemental only.',
      nutritionPer100g: { kcal: 170, proteinG: 30, fatG: 4, carbsG: 0 },
    };
    const created = await request(app)
      .post('/api/v1/foods')
      .auth(token, { type: 'bearer' })
      .send({ petId: pet.id, food: customFood, details: customDetails });
    expect(created.status).toBe(201);
    const foodId = created.body.food.id as string;
    const input = portion(pet.id, { source: 'saved', foodId });
    const original = await add(token, input);
    expect(original.status).toBe(201);
    expect(original.body.entry.nutrition).toEqual({ kcal: 85, proteinG: 15, fatG: 2, carbsG: 0 });

    const revisedFood = { ...customFood, name: 'My newer cooked batch' };
    const revisedDetails = {
      ...customDetails,
      nutritionPer100g: { kcal: 180, proteinG: 29, fatG: 5, carbsG: 1 },
    };
    const updated = await request(app)
      .put(`/api/v1/foods/${foodId}`)
      .auth(token, { type: 'bearer' })
      .send({ petId: pet.id, food: revisedFood, details: revisedDetails });
    expect(updated.status).toBe(200);
    expect(updated.body.food.details).toEqual(revisedDetails);
    expect((await add(token, input)).body.entry).toEqual(original.body.entry);
    const newer = await add(token, portion(pet.id, { source: 'saved', foodId, grams: 20 }));
    expect(newer.status).toBe(201);
    expect(newer.body.entry.nutrition.kcal).toBe(36);
    expect(newer.body.entry.nutrition.proteinG).toBeCloseTo(5.8, 8);

    const removed = await request(app)
      .delete(`/api/v1/foods/${foodId}`)
      .auth(token, { type: 'bearer' });
    expect(removed.status).toBe(204);
    expect((await add(token, input)).body.entry).toEqual(original.body.entry);
    expect((await add(token, portion(pet.id, { source: 'saved', foodId }))).status).toBe(404);
    const conflict = await add(token, { ...input, grams: 51 });
    expect(conflict.status).toBe(409);
    expect(conflict.body.reason).toBe('request-conflict');
    expect((await diary(token, pet.id)).body.entries).toEqual([
      original.body.entry,
      newer.body.entry,
    ]);
    const exported = await request(app).get('/api/v1/export').auth(token, { type: 'bearer' });
    expect(exported.body.saved_foods).toEqual([]);
    expect(exported.body.diet_entries).toHaveLength(2);
    expect(
      exported.body.diet_entries.find(
        (entry: Pick<DietEntry, 'requestId'>) => entry.requestId === input.requestId,
      ),
    ).toMatchObject({
      food: customFood,
      details: customDetails,
      nutrition: original.body.entry.nutrition,
    });
    expect(
      exported.body.diet_entries.find(
        (entry: Pick<DietEntry, 'requestId'>) => entry.requestId === newer.body.entry.requestId,
      ),
    ).toMatchObject({
      food: revisedFood,
      details: revisedDetails,
    });
    const monthly = await progress(token, pet.id);
    expect(monthly.body.progress.summary).toMatchObject({
      loggedFoods: 2,
      loggedGrams: 70,
      knownLoggedKcal: 121,
    });

    expect(
      (
        await request(app)
          .delete(`/api/v1/diet-entries/${original.body.entry.id}`)
          .auth(token, { type: 'bearer' })
      ).status,
    ).toBe(204);
    expect((await progress(token, pet.id)).body.progress.summary).toMatchObject({
      loggedFoods: 1,
      loggedGrams: 20,
      knownLoggedKcal: 36,
    });
    expect((await diary(token, pet.id)).body.entries).toEqual([newer.body.entry]);
  });

  it('enforces species, owner and selected-pet boundaries for cat entries and exports', async () => {
    const owner = await account();
    const stranger = await account();
    const cat = await petFor(owner);
    const secondCat = await petFor(owner, { name: 'Miso' });
    const foreignCat = await petFor(stranger);
    const dog = await petFor(owner, {
      name: 'Milo',
      species: 'dog',
      breed: 'Shih Tzu',
      weightKg: 6.2,
    });
    expect(
      (await add(owner, portion(cat.id, { foodId: defaultIngredientCatalog[0]!.id }))).status,
    ).toBe(400);
    expect((await add(owner, portion(dog.id))).status).toBe(400);
    expect((await add(owner, portion(dog.id, { foodId: packaged.id }))).status).toBe(400);
    expect((await add(stranger, portion(cat.id))).status).toBe(404);
    expect((await diary(stranger, cat.id)).status).toBe(404);
    expect((await progress(stranger, cat.id)).status).toBe(404);

    const custom = await request(app)
      .post('/api/v1/foods')
      .auth(owner, { type: 'bearer' })
      .send({ petId: cat.id, food: chicken.food, details: chicken.details });
    expect(custom.status).toBe(201);
    const foodId = custom.body.food.id as string;
    expect((await add(owner, portion(secondCat.id, { source: 'saved', foodId }))).status).toBe(404);
    expect((await add(stranger, portion(foreignCat.id, { source: 'saved', foodId }))).status).toBe(
      404,
    );
    const own = await add(owner, portion(cat.id, { source: 'saved', foodId }));
    expect(own.status).toBe(201);
    expect(
      (
        await request(app)
          .delete(`/api/v1/diet-entries/${own.body.entry.id}`)
          .auth(stranger, { type: 'bearer' })
      ).status,
    ).toBe(404);
    expect((await diary(owner, secondCat.id)).body.entries).toEqual([]);
    const privateExport = await request(app)
      .get('/api/v1/export')
      .auth(stranger, { type: 'bearer' });
    expect(privateExport.body.saved_foods).toEqual([]);
    expect(privateExport.body.diet_entries).toEqual([]);
    expect(await getDb().collection(DIET_ENTRIES_COLLECTION).countDocuments()).toBe(1);
  });

  it('stores the explicit cat assessment and keeps missing muscle confirmation out of estimates', async () => {
    const token = await account();
    const pet = await petFor(token);
    const input: DietAssessmentInput = {
      petId: pet.id,
      weightKg: 4,
      weightMeasuredOn: today,
      conditionScore: 5,
      stableWeight: true,
      growing: false,
      healthConcern: false,
      prescribedDiet: false,
      appetiteChange: false,
      muscleCondition: 'normal',
    };
    const saved = await request(app)
      .put(`/api/v1/diet-assessments/${pet.id}`)
      .auth(token, { type: 'bearer' })
      .send(input);
    expect(saved.status).toBe(200);
    const loaded = await request(app)
      .get(`/api/v1/diet-assessments/${pet.id}`)
      .auth(token, { type: 'bearer' });
    expect(loaded.status).toBe(200);
    expect(loaded.body.assessment).toEqual(saved.body.assessment);
    expect(loaded.body.assessment.muscleCondition).toBe('normal');
    const targets = estimateDailyDietTargets(pet, today, loaded.body.assessment);
    expect(targets).toMatchObject({
      status: 'estimated',
      profile: 'fediaf2025.cat-adult75',
      factor: 1.2,
      weightKg: 4,
      carbsG: null,
    });
    expect(targets.kcal).toBeCloseTo(237.587878, 6);
    expect(targets.proteinG).toBeCloseTo((83.3 * 237.587878) / 1000, 6);
    expect(targets.fatG).toBeCloseTo((22.5 * 237.587878) / 1000, 6);

    const { muscleCondition: _muscle, ...unconfirmed } = input;
    const cleared = await request(app)
      .put(`/api/v1/diet-assessments/${pet.id}`)
      .auth(token, { type: 'bearer' })
      .send(unconfirmed);
    expect(cleared.status).toBe(200);
    const result = estimateDailyDietTargets(pet, today, cleared.body.assessment);
    expect(result.status).toBe('needs-review');
    expect(result.kcal).toBeNull();
    expect(result.blockers.join(' ')).toContain('muscle condition');
  });
});
