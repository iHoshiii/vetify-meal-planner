import { render, screen } from '@testing-library/react';
import type { FeedingLog, MealPlan } from '@vetify/planner-shared/meal-plans';
import { describe, expect, it } from 'vitest';

import { DailyBudget } from '../features/planner/daily-budget';

const plan = {
  mode: 'manual',
  food: { calorieBasis: 'kg', calories: 2500, packageGrams: null },
  preview: { dailyKcal: 250, dailyGrams: 100 },
  extrasKcal: 0,
} as MealPlan;

function fed(grams: number): FeedingLog {
  return { actualGrams: grams, extrasKcal: 0, status: 'fed' } as FeedingLog;
}

describe('daily intake display', () => {
  it('shows the calories left after a logged meal', () => {
    render(<DailyBudget plan={plan} logs={[fed(40)]} />);
    expect(screen.getByText('150 kcal left')).toBeInTheDocument();
    expect(screen.getByText('100 / 250 kcal')).toBeInTheDocument();
  });

  it('shows overage instead of a negative remaining value', () => {
    render(<DailyBudget plan={plan} logs={[fed(120)]} />);
    expect(screen.getByText('50 kcal over')).toBeInTheDocument();
  });
});
