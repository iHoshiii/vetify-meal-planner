// @vitest-environment jsdom
import { createElement, type ChangeEvent, type ReactNode } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { FeedingLog, FeedingLogInput, MealPlan } from '@vetify/planner-shared/meal-plans';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ save: vi.fn() }));

vi.mock('react-native', () => ({
  View: ({ children, accessibilityRole }: { children: ReactNode; accessibilityRole?: string }) =>
    createElement('div', { role: accessibilityRole }, children),
  Text: ({ children, accessibilityRole }: { children: ReactNode; accessibilityRole?: string }) =>
    createElement('span', { role: accessibilityRole }, children),
  Pressable: ({
    accessibilityRole,
    accessibilityLabel,
    accessibilityState,
    disabled,
    onPress,
    children,
  }: {
    accessibilityRole?: string;
    accessibilityLabel?: string;
    accessibilityState?: { disabled?: boolean; checked?: boolean };
    disabled?: boolean;
    onPress: () => void;
    children: ReactNode;
  }) =>
    createElement(
      'button',
      {
        role: accessibilityRole,
        'aria-label': accessibilityLabel,
        'aria-checked': accessibilityState?.checked,
        disabled: disabled || accessibilityState?.disabled,
        onClick: onPress,
      },
      children,
    ),
  TextInput: ({
    accessibilityLabel,
    value,
    onChangeText,
  }: {
    accessibilityLabel: string;
    value: string;
    onChangeText: (value: string) => void;
  }) =>
    createElement('input', {
      'aria-label': accessibilityLabel,
      value,
      onChange: (event: ChangeEvent<HTMLInputElement>) => onChangeText(event.target.value),
    }),
  Switch: () => null,
  StyleSheet: { create: <T>(styles: T) => styles },
}));

vi.mock('../../components/app-icon', () => ({ AppIcon: () => null }));
vi.mock('../../auth/session', () => ({
  ownerQueryKey: (...parts: unknown[]) => ['owner', 'owner-1', ...parts],
}));
vi.mock('../../services/meal-plans.service', () => ({ saveFeedingLog: api.save }));

import { MealLogRow } from './meal-log-row';

const date = '2026-10-10';
const plan: MealPlan = {
  id: 'plan-1',
  ownerId: 'owner-1',
  requestId: 'plan-request-0001',
  petId: '0123456789abcdef01234567',
  petName: 'Milo',
  petWeightKg: 10,
  weightKg: 10,
  weightMeasuredOn: date,
  conditionScore: 5,
  stableWeight: true,
  growing: false,
  healthConcern: false,
  prescribedDiet: false,
  appetiteChange: false,
  mode: 'manual',
  food: {
    name: 'Adult dog food',
    form: 'dry',
    adequacy: 'complete',
    species: 'dog',
    lifeStage: 'adult',
    calorieBasis: 'kg',
    calories: 4000,
    packageGrams: null,
    labelSource: 'Package',
    labelCheckedOn: date,
  },
  extrasKcal: 0,
  manualDailyGrams: 200,
  mealTimes: ['08:00', '18:00'],
  preview: {
    mode: 'manual',
    dailyGrams: 200,
    dailyKcal: 800,
    foodKcal: 800,
    factor: null,
    mealGrams: [100, 100],
    warnings: [],
    blockers: [],
  },
  version: 1,
  timeZone: 'Asia/Manila',
  activeFrom: date,
  endedAt: null,
  createdAt: `${date}T00:00:00.000Z`,
};

let queryClient: QueryClient;

beforeEach(() => {
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  api.save.mockReset().mockImplementation(async (planId: string, input: FeedingLogInput) => ({
    ...input,
    id: 'log-1',
    planId,
    recordedAt: `${date}T08:00:00.000Z`,
  }));
});

afterEach(() => {
  cleanup();
  queryClient.clear();
});

function mount(log?: FeedingLog, index = 0) {
  return render(
    createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(MealLogRow, { plan, date, index, log }),
    ),
  );
}

function enter(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

it('opens the entry fields only after Log meal is selected', () => {
  mount();
  expect(screen.queryByRole('textbox')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Save meal 1' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Log meal 1' }));
  expect((screen.getByLabelText('Meal 1 amount eaten (g)') as HTMLInputElement).value).toBe('100');
  expect((screen.getByLabelText('Treats or extras, kcal') as HTMLInputElement).value).toBe('0');
  expect(screen.getByLabelText('Meal note')).toBeTruthy();
  expect(api.save).not.toHaveBeenCalled();
});

it('identifies each meal action separately for assistive technology', () => {
  mount();
  mount(undefined, 1);
  expect(screen.getByRole('button', { name: 'Log meal 1' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Skip meal 1' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Skip meal 2' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Log meal 2' }));
  expect(screen.getByLabelText('Meal 2 amount eaten (g)')).toBeTruthy();
  expect(screen.queryByLabelText('Meal 1 amount eaten (g)')).toBeNull();
  expect(screen.getByRole('button', { name: 'Save meal 2' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Close meal 2' }));
  expect(screen.queryByRole('textbox')).toBeNull();
});

it('prefills an existing entry when Edit meal is selected', () => {
  mount({
    id: 'log-1',
    planId: plan.id,
    date,
    mealIndex: 0,
    status: 'partial',
    actualGrams: 75,
    extrasKcal: 12,
    note: 'A small treat',
    recordedAt: `${date}T08:00:00.000Z`,
  });
  expect(screen.queryByRole('textbox')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Edit meal 1' }));
  expect((screen.getByLabelText('Meal 1 amount eaten (g)') as HTMLInputElement).value).toBe('75');
  expect((screen.getByLabelText('Treats or extras, kcal') as HTMLInputElement).value).toBe('12');
  expect((screen.getByLabelText('Meal note') as HTMLInputElement).value).toBe('A small treat');
});

it('saves the edited amounts, refreshes daily logs and closes the form', async () => {
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
  mount();
  fireEvent.click(screen.getByRole('button', { name: 'Log meal 1' }));
  enter('Meal 1 amount eaten (g)', '80');
  enter('Treats or extras, kcal', '20');
  enter('Meal note', 'Breakfast');
  fireEvent.click(screen.getByRole('button', { name: 'Save meal 1' }));
  await waitFor(() => expect(screen.queryByRole('textbox')).toBeNull());
  expect(api.save).toHaveBeenCalledExactlyOnceWith(plan.id, {
    date,
    mealIndex: 0,
    status: 'partial',
    actualGrams: 80,
    extrasKcal: 20,
    note: 'Breakfast',
  });
  expect(invalidate).toHaveBeenCalledWith({
    queryKey: ['owner', 'owner-1', 'feeding-logs', plan.id, date],
  });
  expect(invalidate).toHaveBeenCalledWith({
    queryKey: ['owner', 'owner-1', 'monthly-progress', plan.petId],
  });
});

it('allows a meal to be skipped without opening its entry fields', async () => {
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
  mount();
  fireEvent.click(screen.getByRole('button', { name: 'Skip meal 1' }));
  await waitFor(() => expect(invalidate).toHaveBeenCalledTimes(2));
  expect(api.save).toHaveBeenCalledExactlyOnceWith(plan.id, {
    date,
    mealIndex: 0,
    status: 'skipped',
    actualGrams: 0,
    extrasKcal: 0,
    note: '',
  });
  expect(screen.queryByRole('textbox')).toBeNull();
});

it('keeps amount and extra validation and supports unknown extra calories', async () => {
  mount();
  fireEvent.click(screen.getByRole('button', { name: 'Log meal 1' }));
  enter('Meal 1 amount eaten (g)', '0');
  expect(screen.getByRole('button', { name: 'Save meal 1' }).hasAttribute('disabled')).toBe(true);
  expect(screen.getByRole('button', { name: 'Skip meal 1' }).hasAttribute('disabled')).toBe(false);
  enter('Meal 1 amount eaten (g)', '100');
  enter('Treats or extras, kcal', '5001');
  expect(screen.getByRole('alert').textContent).toBe(
    'Extras must be between 0 and 5000 kcal, or left blank.',
  );
  expect(screen.getByRole('button', { name: 'Save meal 1' }).hasAttribute('disabled')).toBe(true);
  expect(screen.getByRole('button', { name: 'Skip meal 1' }).hasAttribute('disabled')).toBe(true);
  expect(api.save).not.toHaveBeenCalled();
  enter('Treats or extras, kcal', '');
  expect(screen.queryByRole('alert')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Save meal 1' }));
  await waitFor(() => expect(screen.queryByRole('textbox')).toBeNull());
  expect(api.save).toHaveBeenCalledExactlyOnceWith(plan.id, {
    date,
    mealIndex: 0,
    status: 'fed',
    actualGrams: 100,
    extrasKcal: null,
    note: '',
  });
});

it('keeps the entry open after a failed save and allows retry', async () => {
  api.save.mockRejectedValueOnce(new Error('Could not save this meal.'));
  mount();
  fireEvent.click(screen.getByRole('button', { name: 'Log meal 1' }));
  enter('Meal 1 amount eaten (g)', '90');
  fireEvent.click(screen.getByRole('button', { name: 'Save meal 1' }));
  await waitFor(() =>
    expect(screen.getByRole('alert').textContent).toBe('Could not save this meal.'),
  );
  expect((screen.getByLabelText('Meal 1 amount eaten (g)') as HTMLInputElement).value).toBe('90');
  expect(screen.getByRole('button', { name: 'Save meal 1' }).hasAttribute('disabled')).toBe(false);
  fireEvent.click(screen.getByRole('button', { name: 'Save meal 1' }));
  await waitFor(() => expect(screen.queryByRole('textbox')).toBeNull());
  expect(api.save).toHaveBeenCalledTimes(2);
  expect(screen.queryByRole('alert')).toBeNull();
});
