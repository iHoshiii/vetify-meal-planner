import { randomUUID } from 'node:crypto';
import { catPackagedFoodCatalog } from '@vetify/planner-shared/cat-food-catalog';
import {
  summarizeDailyDiet,
  type DailyDietAssessment,
  type DailyDietTargets,
  type DietAssessmentInput,
  type DietEntry,
} from '@vetify/planner-shared/daily-diet';
import { defaultFoodDetails } from '@vetify/planner-shared/foods';
import type { MonthlyProgress, MonthlyProgressDay } from '@vetify/planner-shared/monthly-progress';
import type { Pet, PetInput } from '@vetify/planner-shared/pets';
import { ObjectId } from 'mongodb';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../app.js';
import { getDb } from '../config/db.js';
import { DIET_TARGET_SNAPSHOTS_COLLECTION } from '../models/diet-target-snapshots.js';
import { clearTestDb, startTestDb, stopTestDb } from './db-utils.js';
import {
  account,
  mockFetch,
  petInput,
  planInput,
  principal,
  principals,
  testConfig,
} from './fixtures.js';

const app = createApp({ config: testConfig, fetcher: mockFetch });
const packaged = catPackagedFoodCatalog[0]!;
const catInput: PetInput = {
  ...petInput,
  name: 'Nori',
  species: 'cat',
  breed: '',
  birthMonth: '2024-01',
  ageYears: 2,
  ageMonths: 9,
  weightKg: 4,
  bodyConditionScore: 5,
};

type Revision = {
  _id: ObjectId;
  ownerId: string;
  petId: ObjectId;
  pet: Pet;
  assessment: DailyDietAssessment | null;
  timeZone: string;
  validFrom: string;
  validThrough: string;
  recordedAt: Date;
  days: { date: string; targets: DailyDietTargets }[];
};

beforeAll(startTestDb, 120_000);
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-10T12:00:00Z'));
});
afterEach(async () => {
  vi.useRealTimers();
  await clearTestDb();
});
afterAll(stopTestDb);

function travel(date: string, ...tokens: string[]) {
  vi.setSystemTime(new Date(date.includes('T') ? date : `${date}T12:00:00Z`));
  // Renew introspection timestamps without changing the owner or account zone.
  for (const token of tokens) {
    const current = principals.get(token)!;
    const refreshed = principal(current.user.id);
    refreshed.region = { ...current.region };
    principals.set(token, refreshed);
  }
}

async function makeCat(token: string, changes: Partial<PetInput> = {}): Promise<Pet> {
  const response = await request(app)
    .post('/api/v1/pets')
    .auth(token, { type: 'bearer' })
    .send({ ...catInput, ...changes });
  expect(response.status).toBe(201);
  return response.body.pet as Pet;
}

function assessment(
  petId: string,
  date: string,
  changes: Partial<DietAssessmentInput> = {},
): DietAssessmentInput {
  return {
    petId,
    weightKg: 4,
    weightMeasuredOn: date,
    conditionScore: 5,
    stableWeight: true,
    growing: false,
    healthConcern: false,
    prescribedDiet: false,
    appetiteChange: false,
    muscleCondition: 'normal',
    ...changes,
  };
}

function confirm(token: string, input: DietAssessmentInput) {
  return request(app)
    .put(`/api/v1/diet-assessments/${input.petId}`)
    .auth(token, { type: 'bearer' })
    .send(input);
}

function currentAssessment(token: string, petId: string) {
  return request(app).get(`/api/v1/diet-assessments/${petId}`).auth(token, { type: 'bearer' });
}

async function monthly(token: string, petId: string, month = '2026-11'): Promise<MonthlyProgress> {
  const response = await request(app)
    .get(`/api/v1/progress?petId=${petId}&month=${month}`)
    .auth(token, { type: 'bearer' });
  expect(response.status).toBe(200);
  return response.body.progress as MonthlyProgress;
}

function day(progress: MonthlyProgress, date: string): MonthlyProgressDay {
  const found = progress.days.find((item) => item.date === date);
  expect(found).toBeDefined();
  return found!;
}

function revisions(token: string, petId: string) {
  return getDb()
    .collection<Revision>(DIET_TARGET_SNAPSHOTS_COLLECTION)
    .find({ ownerId: principals.get(token)!.user.id, petId: new ObjectId(petId) })
    .sort({ recordedAt: 1, _id: 1 })
    .toArray();
}

describe('feline daily-target revision history', () => {
  it('freezes assessment context and reference versions without backfilling earlier days or changing history', async () => {
    const token = await account();
    const cat = await makeCat(token);
    const firstInput = assessment(cat.id, '2026-11-10');
    expect((await confirm(token, firstInput)).status).toBe(200);
    const first = (await revisions(token, cat.id))[0]!;
    expect(first).toMatchObject({
      ownerId: principals.get(token)!.user.id,
      petId: new ObjectId(cat.id),
      pet: cat,
      timeZone: 'Asia/Manila',
      validFrom: '2026-11-10',
      validThrough: '2026-12-10',
    });
    const { petId: _petId, ...expectedAssessment } = firstInput;
    expect(first.assessment).toEqual(expectedAssessment);
    expect(first.days).toHaveLength(31);
    expect(first.days[0]).toMatchObject({
      date: '2026-11-10',
      targets: {
        status: 'estimated',
        factor: 1.2,
        profile: 'fediaf2025.cat-adult75',
        carbsG: null,
      },
    });
    expect(first.days[0]!.targets.kcal).toBeCloseTo(237.59, 2);
    const initial = await monthly(token, cat.id);
    expect(day(initial, '2026-11-09').targetKcal).toBeNull();
    expect(day(initial, '2026-11-10').targetKcal).toBeCloseTo(237.59, 2);
    expect(day(initial, '2026-11-10').targetDietReference).toMatchObject({
      revisionId: first._id.toHexString(),
      version: 'vetify-cat-maintenance-v1',
      profile: 'fediaf2025.cat-adult75',
      reference: 'AAHA 2021 · FEDIAF September 2025 · Adult Cat 75',
      timeZone: 'Asia/Manila',
    });
    expect(day(initial, '2026-11-11').targetKcal).toBeNull();
    expect(day(initial, '2026-11-10').kcal).toBeNull();
    expect(initial.summary.recordedDays).toBe(0);

    travel('2026-11-11', token);
    expect((await confirm(token, assessment(cat.id, '2026-11-11', { weightKg: 5 }))).status).toBe(
      200,
    );
    const stored = await revisions(token, cat.id);
    expect(stored).toHaveLength(2);
    expect(stored[0]).toEqual(first);
    const revised = await monthly(token, cat.id);
    expect(day(revised, '2026-11-10').targetKcal).toBeCloseTo(237.59, 2);
    expect(day(revised, '2026-11-10').targetDietReference?.revisionId).toBe(
      first._id.toHexString(),
    );
    expect(day(revised, '2026-11-11').targetKcal).toBeGreaterThan(237.59);
    expect(day(revised, '2026-11-11').targetDietReference?.revisionId).toBe(
      stored[1]!._id.toHexString(),
    );
    const exported = await request(app).get('/api/v1/export').auth(token, { type: 'bearer' });
    expect(exported.status).toBe(200);
    expect(exported.body.diet_target_snapshots).toHaveLength(2);
    expect(
      exported.body.diet_target_snapshots.find(
        (item: { _id: string }) => item._id === first._id.toHexString(),
      ),
    ).toMatchObject({
      validFrom: '2026-11-10',
      validThrough: '2026-12-10',
      assessment: expectedAssessment,
      pet: cat,
    });
  });

  it.each(['blocked', 'shorter-lived'] as const)(
    'never restores an earlier month projection after a %s replacement',
    async (replacement) => {
      travel('2026-11-20');
      const token = await account();
      const cat = await makeCat(token);
      expect((await confirm(token, assessment(cat.id, '2026-11-20'))).status).toBe(200);
      const original = (await revisions(token, cat.id))[0]!;
      expect(original.validThrough).toBe('2026-12-20');
      expect(original.days.find(({ date }) => date === '2026-12-05')!.targets.status).toBe(
        'estimated',
      );

      travel('2026-12-01', token);
      const input =
        replacement === 'blocked'
          ? assessment(cat.id, '2026-12-01', { healthConcern: true })
          : assessment(cat.id, '2026-11-03', { weightKg: 5 });
      expect((await confirm(token, input)).status).toBe(200);
      const stored = await revisions(token, cat.id);
      expect(stored).toHaveLength(2);
      expect(stored[0]).toEqual(original);
      const latest = stored[1]!;
      expect(latest.validFrom).toBe('2026-12-01');
      expect(latest.validThrough).toBe(replacement === 'blocked' ? '2026-12-31' : '2026-12-03');
      expect(day(await monthly(token, cat.id), '2026-11-20').targetKcal).toBeCloseTo(237.59, 2);
      const start = day(await monthly(token, cat.id, '2026-12'), '2026-12-01');
      if (replacement === 'blocked') expect(start.targetKcal).toBeNull();
      else expect(start.targetKcal).toBeGreaterThan(237.59);

      travel('2026-12-05', token);
      const after = await monthly(token, cat.id, '2026-12');
      expect(day(after, '2026-12-05').targetKcal).toBeNull();
      expect(day(after, '2026-12-05').targetPlanId).toBeNull();
      if (replacement === 'shorter-lived') {
        expect(day(after, '2026-12-03').targetKcal).toBeGreaterThan(237.59);
        expect(day(after, '2026-12-04').targetKcal).toBeNull();
        expect((await currentAssessment(token, cat.id)).body.assessment).toBeNull();
      }
    },
  );

  it('uses the earlier weight expiry inclusively and freezes the seven-year transition per civil day', async () => {
    const token = await account();
    const cat = await makeCat(token);
    expect((await confirm(token, assessment(cat.id, '2026-10-20'))).status).toBe(200);
    const revision = (await revisions(token, cat.id))[0]!;
    expect(revision.validFrom).toBe('2026-11-10');
    expect(revision.validThrough).toBe('2026-11-19');
    expect(revision.days).toHaveLength(10);
    travel('2026-11-19', token);
    expect((await currentAssessment(token, cat.id)).body.assessment).not.toBeNull();
    expect(day(await monthly(token, cat.id), '2026-11-19').targetKcal).toBeCloseTo(237.59, 2);
    travel('2026-11-20', token);
    expect((await currentAssessment(token, cat.id)).body.assessment).toBeNull();
    const expired = await monthly(token, cat.id);
    expect(day(expired, '2026-11-19').targetKcal).toBeCloseTo(237.59, 2);
    expect(day(expired, '2026-11-20').targetKcal).toBeNull();

    travel('2026-11-29', token);
    const olderCat = await makeCat(token, {
      name: 'Miso',
      birthMonth: '2019-11',
      ageYears: 6,
      ageMonths: 11,
    });
    expect((await confirm(token, assessment(olderCat.id, '2026-11-29'))).status).toBe(200);
    const aging = (await revisions(token, olderCat.id))[0]!;
    expect(aging.days.find(({ date }) => date === '2026-11-29')!.targets.status).toBe('estimated');
    expect(aging.days.find(({ date }) => date === '2026-11-30')!.targets).toMatchObject({
      status: 'needs-review',
      kcal: null,
      profile: null,
    });
    travel('2026-11-30', token);
    const boundary = await monthly(token, olderCat.id);
    expect(day(boundary, '2026-11-29').targetKcal).toBeCloseTo(237.59, 2);
    expect(day(boundary, '2026-11-30').targetKcal).toBeNull();
  });

  it('protects target authority and owner scope in confirmations, progress and export', async () => {
    const owner = await account();
    const stranger = await account();
    const cat = await makeCat(owner);
    const other = await makeCat(stranger);
    const input = assessment(cat.id, '2026-11-10');
    expect((await request(app).put(`/api/v1/diet-assessments/${cat.id}`).send(input)).status).toBe(
      401,
    );
    expect((await confirm(stranger, input)).status).toBe(404);
    for (const authority of [
      { ownerId: principals.get(stranger)!.user.id },
      { targets: { kcal: 9999, proteinG: 9999 } },
      { days: [{ date: '2026-11-10', targets: { kcal: 9999 } }] },
      { validThrough: '2999-12-31' },
    ]) {
      expect(
        (
          await request(app)
            .put(`/api/v1/diet-assessments/${cat.id}`)
            .auth(owner, { type: 'bearer' })
            .send({ ...input, ...authority })
        ).status,
      ).toBe(400);
    }
    expect(await getDb().collection(DIET_TARGET_SNAPSHOTS_COLLECTION).countDocuments()).toBe(0);
    expect((await confirm(owner, input)).status).toBe(200);
    expect(
      (await confirm(stranger, assessment(other.id, '2026-11-10', { weightKg: 5 }))).status,
    ).toBe(200);
    expect(
      (
        await request(app)
          .get(`/api/v1/progress?petId=${cat.id}&month=2026-11`)
          .auth(stranger, { type: 'bearer' })
      ).status,
    ).toBe(404);
    const exported = await request(app).get('/api/v1/export').auth(owner, { type: 'bearer' });
    expect(exported.body.diet_target_snapshots).toHaveLength(1);
    expect(exported.body.diet_target_snapshots[0]).toMatchObject({
      ownerId: principals.get(owner)!.user.id,
      petId: cat.id,
    });
    expect(day(await monthly(owner, cat.id), '2026-11-10').targetKcal).toBeCloseTo(237.59, 2);
  });

  it('preserves a renamed cat assessment but captures a blocked revision after a clinical profile edit', async () => {
    const token = await account();
    const cat = await makeCat(token);
    expect((await confirm(token, assessment(cat.id, '2026-11-10'))).status).toBe(200);
    const original = (await revisions(token, cat.id))[0]!;
    const renamed = await request(app)
      .put(`/api/v1/pets/${cat.id}`)
      .auth(token, { type: 'bearer' })
      .send({ ...catInput, name: 'Nori the cat' });
    expect(renamed.status).toBe(200);
    expect(await revisions(token, cat.id)).toEqual([original]);
    expect((await currentAssessment(token, cat.id)).body.assessment).not.toBeNull();
    travel('2026-11-11', token);
    const changed = await request(app)
      .put(`/api/v1/pets/${cat.id}`)
      .auth(token, { type: 'bearer' })
      .send({ ...catInput, name: 'Nori the cat', healthConditions: ['Kidney disease'] });
    expect(changed.status).toBe(200);
    expect((await currentAssessment(token, cat.id)).body.assessment).toBeNull();
    const stored = await revisions(token, cat.id);
    expect(stored).toHaveLength(2);
    expect(stored[0]).toEqual(original);
    expect(stored[1]).toMatchObject({ assessment: null, validFrom: '2026-11-11' });
    expect(stored[1]!.days[0]!.targets.status).toBe('needs-review');
    const result = await monthly(token, cat.id);
    expect(day(result, '2026-11-10').targetKcal).toBeCloseTo(237.59, 2);
    expect(day(result, '2026-11-11').targetKcal).toBeNull();
    expect(day(result, '2026-11-11').targetDietReference?.revisionId).toBe(
      stored[1]!._id.toHexString(),
    );
  });

  it('requires reconfirmation after a timezone change and keeps earlier dates in their captured zone', async () => {
    const token = await account();
    const cat = await makeCat(token);
    expect((await confirm(token, assessment(cat.id, '2026-11-10'))).status).toBe(200);
    const original = (await revisions(token, cat.id))[0]!;
    travel('2026-11-11', token);
    principals.get(token)!.region.timeZone = 'Pacific/Honolulu';
    expect((await currentAssessment(token, cat.id)).body.assessment).toBeNull();
    const invalid = await monthly(token, cat.id);
    expect(invalid.today).toBe('2026-11-11');
    expect(day(invalid, '2026-11-10').targetKcal).toBeCloseTo(237.59, 2);
    expect(day(invalid, '2026-11-10').targetDietReference?.timeZone).toBe('Asia/Manila');
    expect(day(invalid, '2026-11-11').targetKcal).toBeNull();
    expect((await confirm(token, assessment(cat.id, '2026-11-11'))).status).toBe(200);
    expect((await currentAssessment(token, cat.id)).body.assessment).not.toBeNull();
    const updated = await monthly(token, cat.id);
    expect(day(updated, '2026-11-11').targetKcal).toBeCloseTo(237.59, 2);
    expect(day(updated, '2026-11-11').targetDietReference?.timeZone).toBe('Pacific/Honolulu');
    expect((await revisions(token, cat.id))[0]).toEqual(original);
  });

  it('orders revisions by capture time when a new timezone moves confirmation to an earlier civil date', async () => {
    travel('2026-11-12T10:30:00Z');
    const token = await account();
    principals.get(token)!.region.timeZone = 'Pacific/Kiritimati';
    const cat = await makeCat(token);
    expect((await confirm(token, assessment(cat.id, '2026-11-13'))).status).toBe(200);
    const old = (await revisions(token, cat.id))[0]!;
    expect(old.validFrom).toBe('2026-11-13');
    travel('2026-11-12T11:30:00Z', token);
    principals.get(token)!.region.timeZone = 'Pacific/Honolulu';
    expect((await confirm(token, assessment(cat.id, '2026-11-12', { weightKg: 5 }))).status).toBe(
      200,
    );
    const current = (await revisions(token, cat.id))[1]!;
    expect(current.validFrom).toBe('2026-11-12');
    expect(current.recordedAt.getTime()).toBeGreaterThan(old.recordedAt.getTime());
    travel('2026-11-14', token);
    const result = await monthly(token, cat.id);
    for (const date of ['2026-11-12', '2026-11-13', '2026-11-14']) {
      expect(day(result, date).targetKcal).toBeGreaterThan(237.59);
      expect(day(result, date).targetDietReference?.revisionId).toBe(current._id.toHexString());
    }
    expect((await revisions(token, cat.id))[0]).toEqual(old);
  });

  it('uses the last captured revision when confirmations share the same date and timestamp', async () => {
    const token = await account();
    const cat = await makeCat(token);
    expect((await confirm(token, assessment(cat.id, '2026-11-10'))).status).toBe(200);
    expect((await confirm(token, assessment(cat.id, '2026-11-10', { weightKg: 5 }))).status).toBe(
      200,
    );
    const stored = await revisions(token, cat.id);
    expect(stored).toHaveLength(2);
    expect(stored[0]!.recordedAt).toEqual(stored[1]!.recordedAt);
    const result = day(await monthly(token, cat.id), '2026-11-10');
    expect(result.targetKcal).toBeGreaterThan(237.59);
    expect(result.targetDietReference?.revisionId).toBe(stored[1]!._id.toHexString());
  });

  it('keeps target references distinct from incomplete diary nutrition and unknown monthly intake', async () => {
    const token = await account();
    const cat = await makeCat(token);
    expect((await confirm(token, assessment(cat.id, '2026-11-10'))).status).toBe(200);
    const input = {
      requestId: randomUUID(),
      petId: cat.id,
      date: '2026-11-10',
      source: 'catalog',
      foodId: packaged.id,
      grams: 10,
    };
    const known = await request(app)
      .post('/api/v1/diet-entries')
      .auth(token, { type: 'bearer' })
      .send(input);
    expect(known.status).toBe(201);
    const result = await monthly(token, cat.id);
    expect(result.summary.knownLoggedKcal).toBe(10.8);
    const recorded = day(result, '2026-11-10');
    expect(recorded.targetKcal).toBeCloseTo(237.59, 2);
    expect(recorded.foodEntries[0]!.nutrition).toEqual({
      kcal: 10.8,
      proteinG: null,
      fatG: null,
      carbsG: null,
    });
    const snapshot = (await revisions(token, cat.id))[0]!;
    expect(
      summarizeDailyDiet(recorded.foodEntries, snapshot.days[0]!.targets).proteinG,
    ).toMatchObject({
      total: null,
      missingEntries: 1,
      remaining: null,
    });

    const custom = await request(app)
      .post('/api/v1/foods')
      .auth(token, { type: 'bearer' })
      .send({
        petId: cat.id,
        food: {
          ...packaged.food,
          name: 'My unknown-label cat food',
          calories: null,
          adequacy: 'unknown',
          labelSource: '',
          labelCheckedOn: null,
        },
        details: defaultFoodDetails(),
      });
    expect(custom.status).toBe(201);
    const unknown = await request(app)
      .post('/api/v1/diet-entries')
      .auth(token, { type: 'bearer' })
      .send({ ...input, requestId: randomUUID(), source: 'saved', foodId: custom.body.food.id });
    expect(unknown.status).toBe(201);
    const incomplete = await monthly(token, cat.id);
    expect(incomplete.summary).toMatchObject({
      knownLoggedKcal: null,
      unknownCalorieDays: 1,
      loggedFoods: 2,
      loggedGrams: 20,
    });
    expect(day(incomplete, '2026-11-10').kcal).toBeNull();
    expect(day(incomplete, '2026-11-10').targetKcal).toBeCloseTo(237.59, 2);
    expect(
      day(incomplete, '2026-11-10').foodEntries.find(
        (entry: DietEntry) => entry.id === unknown.body.entry.id,
      )?.nutrition.kcal,
    ).toBeNull();
    expect(await revisions(token, cat.id)).toEqual([snapshot]);
  });

  it('captures an estimated commercial cat plan once and suppresses its old budget after reference expiry', async () => {
    travel('2026-11-20');
    const token = await account();
    const cat = await makeCat(token);
    const input = {
      ...planInput(cat.id),
      ...assessment(cat.id, '2026-11-20'),
      requestId: randomUUID(),
      food: packaged.food,
      extrasKcal: 0,
    };
    const saved = await request(app)
      .post('/api/v1/meal-plans')
      .auth(token, { type: 'bearer' })
      .send(input);
    expect(saved.status).toBe(201);
    expect(saved.body.plan.preview).toMatchObject({ mode: 'estimate', factor: 1.2, blockers: [] });
    expect(saved.body.plan.preview.dailyKcal).toBeCloseTo(237.59, 2);
    const original = (await revisions(token, cat.id))[0]!;
    expect((await currentAssessment(token, cat.id)).body.assessment.muscleCondition).toBe('normal');
    travel('2026-11-21', token);
    const retried = await request(app)
      .post('/api/v1/meal-plans')
      .auth(token, { type: 'bearer' })
      .send(input);
    expect(retried.status).toBe(201);
    expect(retried.body.plan).toEqual(saved.body.plan);
    expect(await revisions(token, cat.id)).toEqual([original]);
    const exported = await request(app).get('/api/v1/export').auth(token, { type: 'bearer' });
    expect(exported.body.diet_assessments).toEqual([]);
    expect(exported.body.diet_target_snapshots).toHaveLength(1);
    expect(exported.body.diet_target_snapshots[0]).toMatchObject({
      validFrom: '2026-11-20',
      validThrough: '2026-12-20',
      assessment: { muscleCondition: 'normal', weightMeasuredOn: '2026-11-20' },
    });
    travel('2026-12-21', token);
    const expired = await monthly(token, cat.id, '2026-12');
    expect(day(expired, '2026-12-20').targetKcal).toBeCloseTo(237.59, 2);
    expect(day(expired, '2026-12-21').targetKcal).toBeNull();
    expect((await currentAssessment(token, cat.id)).body.assessment).toBeNull();
  });
});
