import type { FeedingLog, MealPlan } from '@vetify/planner-shared/meal-plans';
import type { NutritionObservation } from '@vetify/planner-shared/nutrition-observations';
import {
  progressMonthDates,
  summarizeMonthlyProgress,
  validProgressMonth,
} from '@vetify/planner-shared/monthly-progress';
import { describe, expect, it } from 'vitest';

const petId = 'pet-1';
function plan(overrides: Partial<MealPlan> = {}): MealPlan {
  return {
    id: 'plan-1',
    petId,
    version: 1,
    mode: 'manual',
    timeZone: 'Asia/Manila',
    activeFrom: '2026-09-01T00:00:00.000Z',
    endedAt: null,
    food: { name: 'Original food', calorieBasis: 'kg', calories: 2500, packageGrams: null },
    preview: { dailyGrams: 100, dailyKcal: 250 },
    extrasKcal: 0,
    ...overrides,
  } as MealPlan;
}
function log(overrides: Partial<FeedingLog> = {}): FeedingLog {
  return {
    id: 'log-1',
    planId: 'plan-1',
    date: '2026-10-03',
    mealIndex: 0,
    status: 'fed',
    actualGrams: 40,
    extrasKcal: 0,
    note: '',
    recordedAt: '2026-10-03T00:00:00.000Z',
    ...overrides,
  };
}
function summary(
  plans = [plan()],
  logs: FeedingLog[] = [],
  measurements: NutritionObservation[] = [],
) {
  return summarizeMonthlyProgress({
    petId,
    month: '2026-10',
    today: '2026-10-10',
    timeZone: 'Asia/Manila',
    plans,
    logs,
    measurements,
  });
}

describe('monthly feeding summaries', () => {
  it('uses real calendar months including leap years and rejects malformed months', () => {
    expect(progressMonthDates('2024-02')).toHaveLength(29);
    expect(progressMonthDates('2025-02')).toHaveLength(28);
    expect(progressMonthDates('2026-04')).toHaveLength(30);
    for (const invalid of ['2026-00', '2026-13', '2026-1', '2026-10-01', 'garbage'])
      expect(validProgressMonth(invalid)).toBe(false);
    expect(() => progressMonthDates('2026-13')).toThrow('Choose a valid month');
  });

  it('distinguishes unlogged and future days without treating missing intake as zero', () => {
    const result = summary([plan()], [log(), log({ date: '2026-10-11' })]);
    expect(result.days).toHaveLength(31);
    expect(result.days[0]).toMatchObject({
      status: 'unlogged',
      kcal: null,
      grams: null,
      mealsLogged: 0,
    });
    expect(result.days[2]).toMatchObject({ status: 'recorded', kcal: 100, grams: 40 });
    expect(result.days[10]).toMatchObject({
      status: 'future',
      kcal: null,
      grams: null,
      mealsLogged: 0,
    });
    expect(result.summary).toMatchObject({ recordedDays: 1, loggedMeals: 1, knownLoggedKcal: 100 });
    expect(summary().summary.knownLoggedKcal).toBeNull();
  });

  it('keeps original food density for same-day plan versions and uses only one daily target', () => {
    const old = plan({ endedAt: '2026-10-03T06:00:00.000Z' });
    const latest = plan({
      id: 'plan-2',
      version: 2,
      activeFrom: old.endedAt!,
      food: { ...old.food, name: 'New food', calories: 5000 },
      preview: { ...old.preview, dailyGrams: 80, dailyKcal: 400 },
    });
    const result = summary(
      [latest, old],
      [log(), log({ id: 'log-2', planId: 'plan-2', actualGrams: 10, extrasKcal: 5 })],
    );
    expect(result.days[1].targetPlanVersion).toBe(1);
    expect(result.days[2]).toMatchObject({
      grams: 50,
      kcal: 155,
      targetKcal: 400,
      targetGrams: 80,
      targetPlanVersion: 2,
      recordedPlanVersions: [1, 2],
    });
    expect(
      result.days[2].entries.map((entry) => [entry.planVersion, entry.foodName, entry.kcal]),
    ).toEqual([
      [1, 'Original food', 100],
      [2, 'New food', 55],
    ]);
    expect(result.summary.recordedDays).toBe(1);
  });

  it('retains unknown calories and summarizes only days with fully known recorded calories', () => {
    const result = summary([plan()], [log(), log({ date: '2026-10-04', extrasKcal: null })]);
    expect(result.days[3]).toMatchObject({ status: 'recorded', grams: 40, kcal: null });
    expect(result.summary).toMatchObject({
      recordedDays: 2,
      knownCalorieDays: 1,
      unknownCalorieDays: 1,
      knownLoggedKcal: 100,
      loggedGrams: 80,
    });
    const unknown = plan({ food: { ...plan().food, calories: null } });
    expect(summary([unknown], [log()]).summary.knownLoggedKcal).toBeNull();
    expect(summary([plan()], [log({ actualGrams: null })]).days[2]).toMatchObject({
      grams: null,
      kcal: null,
    });
  });

  it('does not count a partly known day as an exact calorie total', () => {
    const result = summary([plan()], [log(), log({ id: 'log-2', mealIndex: 1, extrasKcal: null })]);
    expect(result.days[2].kcal).toBeNull();
    expect(result.summary.knownLoggedKcal).toBeNull();
    expect(result.summary.unknownCalorieDays).toBe(1);
  });

  it('counts an explicitly skipped meal as a record with a known zero amount', () => {
    const result = summary([plan()], [log({ status: 'skipped', actualGrams: 0 })]);
    expect(result.days[2]).toMatchObject({
      status: 'recorded',
      grams: 0,
      kcal: 0,
      skippedMeals: 1,
    });
    expect(result.summary).toMatchObject({
      recordedDays: 1,
      knownCalorieDays: 1,
      knownLoggedKcal: 0,
    });
  });

  it('keeps historical targets on their saved civil dates after an account time zone changes', () => {
    const started = '2026-10-01T01:00:00.000Z';
    const original = plan({ endedAt: started });
    const replacement = plan({ id: 'plan-2', version: 2, activeFrom: started });
    const result = summarizeMonthlyProgress({
      petId,
      month: '2026-09',
      today: '2026-10-01',
      timeZone: 'America/Los_Angeles',
      plans: [replacement, original],
      logs: [log({ date: '2026-09-30' })],
    });
    expect(result.days[28].targetPlanVersion).toBe(1);
    expect(result.days[29].targetPlanVersion).toBe(1);
    expect(result.days[29].kcal).toBe(100);
    expect(
      summarizeMonthlyProgress({
        petId,
        month: '2026-10',
        today: '2026-10-01',
        timeZone: 'America/Los_Angeles',
        plans: [replacement, original],
        logs: [],
      }).days[0].targetPlanVersion,
    ).toBe(2);
    const notStarted = summary([plan({ activeFrom: '2026-10-03T23:00:00.000Z' })]);
    expect(notStarted.days[2].targetPlanId).toBeNull();
    expect(notStarted.days[3].targetPlanVersion).toBe(1);
  });

  it('filters foreign pet plans, off-month logs and off-month or future measurements', () => {
    const measurement = {
      id: 'measurement-1',
      petId,
      weightKg: 6.2,
      conditionScore: 5,
      observer: 'owner',
      measuredOn: '2026-10-02',
      createdAt: '2026-10-02T00:00:00.000Z',
    } as NutritionObservation;
    const result = summary(
      [plan(), plan({ id: 'foreign-plan', petId: 'pet-2' })],
      [log(), log({ planId: 'foreign-plan' }), log({ date: '2026-09-30' })],
      [
        measurement,
        { ...measurement, measuredOn: '2026-09-30' },
        { ...measurement, measuredOn: '2026-10-11' },
        { ...measurement, petId: 'pet-2' },
      ],
    );
    expect(result.summary.loggedMeals).toBe(1);
    expect(result.measurements).toEqual([measurement]);
  });

  it('derives legacy manual targets from the saved food label without changing intake', () => {
    const saved = plan({ preview: { ...plan().preview, dailyKcal: null } });
    expect(summary([saved], [log()]).days[2]).toMatchObject({ targetKcal: 250, kcal: 100 });
  });
});
