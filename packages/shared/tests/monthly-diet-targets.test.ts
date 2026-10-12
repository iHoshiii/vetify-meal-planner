import type { DailyDietTargets } from '@vetify/planner-shared/daily-diet';
import type { DietTargetSnapshot } from '@vetify/planner-shared/diet-target-snapshots';
import { summarizeMonthlyProgress } from '@vetify/planner-shared/monthly-progress';
import type { MealPlan } from '@vetify/planner-shared/meal-plans';
import { describe, expect, it } from 'vitest';

const petId = 'cat-1';
const targets: DailyDietTargets = {
  kcal: 237.58787847868,
  proteinG: 19.791070277274,
  fatG: 5.34572726577,
  carbsG: null,
  status: 'estimated',
  factor: 1.2,
  rerKcal: 197.989898732233,
  weightKg: 4,
  profile: 'fediaf2025.cat-adult75',
  blockers: [],
  notes: [],
  reference: 'Saved feline reference',
  version: 'vetify-cat-maintenance-v1',
  sources: { energy: 'AAHA', nutrients: 'FEDIAF' },
};

function snapshot(patch: Partial<DietTargetSnapshot> = {}): DietTargetSnapshot {
  return {
    revisionId: '000000000000000000000001',
    petId,
    date: '2026-10-03',
    timeZone: 'Asia/Manila',
    validFrom: '2026-10-03',
    validThrough: '2026-11-02',
    recordedAt: '2026-10-03T00:00:00Z',
    targets,
    ...patch,
  };
}

const savedPlan = {
  id: 'plan-1',
  petId,
  version: 1,
  mode: 'estimate',
  timeZone: 'Asia/Manila',
  activeFrom: '2026-10-01T00:00:00Z',
  endedAt: null,
  food: { name: 'Original label', calorieBasis: 'kg', calories: 4000, packageGrams: null },
  preview: { dailyGrams: 75, dailyKcal: 300 },
  extrasKcal: 0,
} as MealPlan;

function progress(targetSnapshots: DietTargetSnapshot[], plans: MealPlan[] = []) {
  return summarizeMonthlyProgress({
    petId,
    month: '2026-10',
    today: '2026-10-10',
    timeZone: 'Asia/Manila',
    targetSnapshots,
    plans,
    logs: [],
  });
}

describe('historical daily references in monthly progress', () => {
  it('uses frozen references without inventing intake or backfilling earlier dates', () => {
    const result = progress([snapshot()]);
    expect(result.days[2]).toMatchObject({
      status: 'unlogged',
      kcal: null,
      targetKcal: targets.kcal,
      targetPlanId: null,
      targetPlanVersion: null,
      targetDietReference: { version: targets.version, profile: targets.profile },
    });
    expect(result.days[1]!.targetKcal).toBeNull();
    expect(result.summary.recordedDays).toBe(0);
    expect(result.summary.knownLoggedKcal).toBeNull();
  });

  it('keeps an expired reference from falling back to an older automatic plan', () => {
    const result = progress([snapshot({ expired: true })], [savedPlan]);
    expect(result.days[2]).toMatchObject({
      targetKcal: null,
      targetGrams: null,
      targetPlanVersion: null,
      targetDietReference: { revisionId: snapshot().revisionId },
    });
    expect(result.days[1]!.targetPlanVersion).toBe(1);
  });

  it('retains recorded civil dates and zone while withholding a current-zone mismatch', () => {
    const result = progress([
      snapshot({ timeZone: 'Pacific/Honolulu' }),
      snapshot({ date: '2026-10-10', timeZone: 'Pacific/Honolulu' }),
    ]);
    expect(result.days[2]!.targetKcal).toBe(targets.kcal);
    expect(result.days[2]!.targetDietReference?.timeZone).toBe('Pacific/Honolulu');
    expect(result.days[9]!.targetKcal).toBeNull();
  });

  it('uses the newer same-day revision and ignores references for another pet or future day', () => {
    const result = progress([
      snapshot(),
      snapshot({
        revisionId: '000000000000000000000002',
        targets: { ...targets, status: 'needs-review', kcal: null },
      }),
      snapshot({ revisionId: '000000000000000000000099', petId: 'another-cat' }),
      snapshot({ date: '2026-10-11' }),
    ]);
    expect(result.days[2]!.targetKcal).toBeNull();
    expect(result.days[2]!.targetDietReference?.revisionId).toBe('000000000000000000000002');
    expect(result.days[10]).toMatchObject({ status: 'future', targetDietReference: null });
  });
});
