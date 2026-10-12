// @vitest-environment jsdom
import { createElement, type ReactNode } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { DailyDietAssessment, DietEntry } from '@vetify/planner-shared/daily-diet';
import { defaultIngredientCatalog } from '@vetify/planner-shared/ingredient-catalog';
import type { MealPlan } from '@vetify/planner-shared/meal-plans';
import type { Pet } from '@vetify/planner-shared/pets';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  entries: vi.fn(),
  assessment: vi.fn(),
  feeding: vi.fn(),
  remove: vi.fn(),
  save: vi.fn(),
  reset: vi.fn(),
  refetch: vi.fn(),
}));
vi.mock('@tanstack/react-query', () => ({ useQueries: mocks.feeding }));
vi.mock('../../services/diet-queries', () => ({
  useDietEntries: mocks.entries,
  useDietAssessment: mocks.assessment,
  useRemoveDietEntry: () => ({ mutate: mocks.remove, isPending: false, error: null }),
  useSaveDietAssessment: () => ({
    mutate: mocks.save,
    reset: mocks.reset,
    isPending: false,
    error: null,
  }),
}));
vi.mock('../../services/meal-plans.service', () => ({ getFeedingLogs: vi.fn() }));
vi.mock('../../auth/session', () => ({
  ownerQueryKey: (...parts: unknown[]) => ['owner', ...parts],
}));
vi.mock('../../components/app-icon', () => ({ AppIcon: () => null }));
vi.mock('./diet-assessment-form', () => ({
  DietAssessmentForm: () =>
    createElement('div', { role: 'form', 'aria-label': 'Daily assessment' }),
}));
vi.mock('react-native', () => ({
  View: ({ children, accessibilityLabel }: { children: ReactNode; accessibilityLabel?: string }) =>
    createElement('div', { 'aria-label': accessibilityLabel }, children),
  Text: ({ children, accessibilityRole }: { children: ReactNode; accessibilityRole?: string }) =>
    createElement(
      'span',
      { role: accessibilityRole === 'header' ? 'heading' : accessibilityRole },
      children,
    ),
  Pressable: ({
    children,
    onPress,
    disabled,
    accessibilityLabel,
  }: {
    children: ReactNode;
    onPress: () => void;
    disabled?: boolean;
    accessibilityLabel?: string;
  }) =>
    createElement(
      'button',
      { onClick: onPress, disabled, 'aria-label': accessibilityLabel },
      children,
    ),
  ActivityIndicator: ({ accessibilityLabel }: { accessibilityLabel: string }) =>
    createElement('div', { role: 'status', 'aria-label': accessibilityLabel }),
  Switch: () => null,
  Linking: { openURL: vi.fn() },
  StyleSheet: { create: <T>(styles: T) => styles, hairlineWidth: 1 },
}));
import { DailyDietTracker } from './daily-diet-tracker';

const today = '2026-10-11';
const pet: Pet = {
  id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
  name: 'Milo',
  species: 'dog',
  birthMonth: '2023-01',
  ageReferenceOn: '2026-01-01',
  ageYearsAtReference: 3,
  ageMonthsAtReference: 0,
  pregnantOrNursing: 'no',
  feedingGoal: 'maintain',
  healthConditions: [],
  allergies: [],
  neuterStatus: 'yes',
  activityLevel: 'moderate',
  weightKg: 6,
  otherSpecies: '',
  breed: 'Mixed',
  sex: 'male',
  foodPreferences: '',
  currentFood: '',
  bodyConditionScore: null,
  registeredOn: '2026-01-01',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};
const assessment: DailyDietAssessment = {
  weightKg: 6,
  weightMeasuredOn: today,
  conditionScore: 5,
  stableWeight: true,
  growing: false,
  healthConcern: false,
  prescribedDiet: false,
  appetiteChange: false,
};
const chicken: DietEntry = {
  ...defaultIngredientCatalog[0],
  id: 'bbbbbbbbbbbbbbbbbbbbbbbb',
  requestId: 'f31b9322-f9d2-4f6e-8f34-0f5ec3ea76ac',
  petId: pet.id,
  date: today,
  source: 'catalog',
  foodId: defaultIngredientCatalog[0].id,
  grams: 50,
  timeZone: 'Asia/Singapore',
  createdAt: `${today}T08:00:00.000Z`,
  nutrition: { kcal: 82.5, proteinG: 15.5, fatG: 1.8, carbsG: 0 },
};
const loaded = (data: unknown) => ({ data, isPending: false, error: null, refetch: mocks.refetch });
function mount(plans: MealPlan[] = [], selectedPet = pet) {
  const onFoods = vi.fn();
  return {
    ...render(createElement(DailyDietTracker, { pet: selectedPet, today, plans, onFoods })),
    onFoods,
  };
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.entries.mockReturnValue(loaded([chicken]));
  mocks.assessment.mockReturnValue(loaded(assessment));
  mocks.feeding.mockReturnValue([]);
});
afterEach(cleanup);

it('shows the daily reference and scaled remaining values without requiring a meal plan', () => {
  const { onFoods } = mount();
  expect(screen.getByRole('heading', { name: 'Tracker' })).toBeTruthy();
  expect(
    screen.getByLabelText('Calories: target 375.7 kcal, added 82.5 kcal, remaining 293.2 kcal'),
  ).toBeTruthy();
  expect(
    screen.getByLabelText('Protein min.: target 19.6 g, added 15.5 g, remaining 4.1 g'),
  ).toBeTruthy();
  expect(
    screen.getByLabelText('Fat min.: target 5.2 g, added 1.8 g, remaining 3.4 g'),
  ).toBeTruthy();
  expect(screen.getByLabelText('Carbs: target — g, added 0 g, remaining — g')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Add food' }));
  expect(onFoods).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole('button', { name: `Remove: ${chicken.food.name}` }));
  expect(mocks.remove).toHaveBeenCalledWith(chicken.id);
  expect(mocks.entries).toHaveBeenCalledWith(pet.id, today);
});

it('includes current and earlier same-day feeding once and keeps their missing macros unknown', () => {
  const current = {
    ...assessment,
    id: 'cccccccccccccccccccccccc',
    petId: pet.id,
    endedAt: null,
    timeZone: 'Asia/Singapore',
    food: { ...chicken.food, calories: 3700 },
  } as MealPlan;
  const earlier = {
    ...current,
    id: 'dddddddddddddddddddddddd',
    endedAt: `${today}T04:00:00.000Z`,
    food: { ...current.food, calories: 900 },
  };
  const previousDay = {
    ...current,
    id: 'eeeeeeeeeeeeeeeeeeeeeeee',
    endedAt: '2026-10-10T04:00:00.000Z',
  };
  mocks.feeding.mockReturnValue([
    loaded([{ status: 'fed', actualGrams: 10, extrasKcal: 0 }]),
    loaded([{ status: 'fed', actualGrams: 10, extrasKcal: 0 }]),
  ]);
  mount([current, earlier, previousDay]);
  expect(mocks.feeding.mock.calls[0][0].queries).toHaveLength(2);
  expect(
    screen.getByLabelText('Calories: target 375.7 kcal, added 128.5 kcal, remaining 247.2 kcal'),
  ).toBeTruthy();
  expect(
    screen.getByLabelText('Protein min.: target 19.6 g, added ? g, remaining — g'),
  ).toBeTruthy();
  expect(screen.getByText('? includes a food with missing nutrition data.')).toBeTruthy();
});

it('allows a food diary with unconfirmed targets and opens the explicit assessment', () => {
  mocks.assessment.mockReturnValue(loaded(null));
  mount();
  expect(
    screen.getByLabelText('Calories: target — kcal, added 82.5 kcal, remaining — kcal'),
  ).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Set target' }));
  expect(screen.getByRole('form', { name: 'Daily assessment' })).toBeTruthy();
});

it('does not show incomplete loading or failed intake as zero', () => {
  mocks.entries.mockReturnValue({ ...loaded(undefined), isPending: true });
  const rendered = mount();
  expect(screen.getByRole('status', { name: 'Loading daily diet' })).toBeTruthy();
  expect(screen.queryByText('Daily target')).toBeNull();
  mocks.entries.mockReturnValue({
    ...loaded(undefined),
    error: new Error('Diet could not be loaded'),
  });
  rendered.rerender(createElement(DailyDietTracker, { pet, today, plans: [], onFoods: vi.fn() }));
  expect(screen.getByRole('alert').textContent).toBe('Diet could not be loaded');
  expect(screen.queryByText('Daily target')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(mocks.refetch).toHaveBeenCalledTimes(2);
});

it('keeps a cat diary available without applying the dog target or setup', () => {
  const cat = { ...pet, species: 'cat' } as Pet;
  mocks.entries.mockReturnValue(
    loaded([{ ...chicken, food: { ...chicken.food, name: 'Cat food', species: 'cat' } }]),
  );
  mount([], cat);
  expect(screen.getByText('Cat food')).toBeTruthy();
  expect(
    screen.getByLabelText('Calories: target — kcal, added 82.5 kcal, remaining — kcal'),
  ).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Set target' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Update' })).toBeNull();
});
