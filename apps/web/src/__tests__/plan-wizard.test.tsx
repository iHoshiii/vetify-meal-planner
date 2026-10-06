import type { Pet } from '@vetify/planner-shared/pets';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PlanWizard } from '../features/planner/plan-wizard';
import { previewPlan, saveMealPlan } from '../services/meal-plans.service';

vi.mock('../services/meal-plans.service', () => ({ previewPlan: vi.fn(), saveMealPlan: vi.fn() }));

const pet: Pet = {
  id: '507f1f77bcf86cd799439011',
  name: 'Milo',
  species: 'dog',
  otherSpecies: '',
  breed: 'Shih Tzu',
  birthMonth: '2020-01',
  ageYearsAtReference: 6,
  ageMonthsAtReference: 0,
  registeredOn: '2026-01-01',
  ageReferenceOn: '2026-01-01',
  sex: 'male',
  neuterStatus: 'yes',
  weightKg: 6.2,
  allergies: [],
  healthConditions: [],
  foodPreferences: '',
  currentFood: '',
  activityLevel: 'moderate',
  bodyConditionScore: null,
  feedingGoal: 'maintain',
  pregnantOrNursing: 'no',
  createdAt: '',
  updatedAt: '',
};

describe('meal plan confirmation', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  it('previews on the final Next and saves only after Save plan', async () => {
    vi.mocked(previewPlan).mockResolvedValue({
      mode: 'manual',
      dailyGrams: 100,
      dailyKcal: null,
      foodKcal: null,
      factor: null,
      mealGrams: [50, 50],
      warnings: [],
      blockers: [],
    });
    vi.mocked(saveMealPlan).mockResolvedValue({ id: 'plan' } as never);
    const onSaved = vi.fn();
    render(
      <QueryClientProvider client={new QueryClient()}>
        <PlanWizard pet={pet} onCancel={vi.fn()} onSaved={onSaved} />
      </QueryClientProvider>,
    );

    fireEvent.change(screen.getByLabelText(/Date Milo was weighed/), {
      target: { value: '2026-09-25' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Next/ }));
    fireEvent.change(screen.getByLabelText(/Exact food name/), { target: { value: 'Adult food' } });
    fireEvent.click(screen.getByRole('button', { name: /Next/ }));
    fireEvent.change(screen.getByLabelText(/Existing daily food amount/), {
      target: { value: '100' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Next/ }));

    expect(await screen.findByRole('heading', { name: 'Review and save' })).toBeInTheDocument();
    expect(previewPlan).toHaveBeenCalledTimes(1);
    expect(saveMealPlan).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /Save plan/ }));
    await waitFor(() => expect(saveMealPlan).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
  });
});
