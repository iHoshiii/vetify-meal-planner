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
  DietAssessmentForm: ({
    onSave,
    onCancel,
  }: {
    onSave: (assessment: DailyDietAssessment) => void;
    onCancel: () => void;
  }) =>
    createElement(
      'div',
      { role: 'form', 'aria-label': 'Daily assessment' },
      createElement('button', { onClick: () => onSave(catAssessment) }, 'Save assessment'),
      createElement('button', { onClick: onCancel }, 'Cancel'),
    ),
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
const cat: Pet = {
  ...pet,
  id: 'cccccccccccccccccccccccc',
  name: 'Nori',
  species: 'cat',
  weightKg: 4,
};
const catAssessment: DailyDietAssessment = {
  ...assessment,
  weightKg: 4,
  muscleCondition: 'normal',
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
  mocks.save.mockReset();
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
  expect(screen.getByLabelText('Carbs: target N/A g, added 0 g, remaining N/A g')).toBeTruthy();
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
    screen.getByLabelText('Protein min.: target 19.6 g, added Unknown g, remaining N/A g'),
  ).toBeTruthy();
  expect(screen.queryByText('? includes a food with missing nutrition data.')).toBeNull();
});

it('projects a complete saved dog meal plan to its assessment fields before calculating a daily reference', () => {
  const selectedPet = pet;
  const confirmed = assessment;
  const plan = {
    ...confirmed,
    id: 'dddddddddddddddddddddddd',
    ownerId: 'owner',
    requestId: 'stored-plan-request-id',
    petId: selectedPet.id,
    endedAt: null,
    mode: 'estimate',
    version: 1,
    timeZone: 'Asia/Singapore',
    food: { ...chicken.food, species: 'dog', calories: 3700 },
    mealTimes: ['08:00', '18:00'],
    extrasKcal: 0,
    preview: { dailyKcal: 500 },
  } as MealPlan;
  mocks.assessment.mockReturnValue(loaded(null));
  mocks.entries.mockReturnValue(loaded([]));
  mocks.feeding.mockReturnValue([loaded([])]);
  mount([plan], selectedPet);
  const kcal = '375.7';
  expect(
    screen.getByLabelText(`Calories: target ${kcal} kcal, added 0 kcal, remaining ${kcal} kcal`),
  ).toBeTruthy();
  expect(mocks.assessment).toHaveBeenCalledWith(
    selectedPet.id,
    today,
    selectedPet.updatedAt,
    undefined,
  );
});

it('does not invent normal muscle condition while projecting a legacy cat meal plan', () => {
  const plan = {
    ...assessment,
    weightKg: 4,
    id: 'dddddddddddddddddddddddd',
    petId: cat.id,
    endedAt: null,
    timeZone: 'Asia/Singapore',
    food: { ...chicken.food, species: 'cat', calories: 3700 },
  } as MealPlan;
  mocks.assessment.mockReturnValue(loaded(null));
  mocks.entries.mockReturnValue(loaded([]));
  mocks.feeding.mockReturnValue([loaded([])]);
  mount([plan], cat);
  expect(
    screen.getByLabelText('Calories: target N/A kcal, added 0 kcal, remaining N/A kcal'),
  ).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Set target' })).toBeTruthy();
});

it('requires a current server cat assessment even when a saved plan has normal muscle condition', () => {
  const plan = {
    ...catAssessment,
    id: 'dddddddddddddddddddddddd',
    petId: cat.id,
    endedAt: null,
    timeZone: 'Asia/Singapore',
    food: { ...chicken.food, species: 'cat', calories: 3700 },
  } as MealPlan;
  mocks.assessment.mockReturnValue(loaded(null));
  mocks.entries.mockReturnValue(loaded([]));
  mocks.feeding.mockReturnValue([loaded([])]);
  mount([plan], cat);
  expect(
    screen.getByLabelText('Calories: target N/A kcal, added 0 kcal, remaining N/A kcal'),
  ).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Set target' })).toBeTruthy();
});

it('allows a food diary with unconfirmed targets and opens the explicit assessment', () => {
  mocks.assessment.mockReturnValue(loaded(null));
  mount();
  expect(
    screen.getByLabelText('Calories: target N/A kcal, added 82.5 kcal, remaining N/A kcal'),
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

it('keeps a legacy cat diary available while requiring muscle confirmation for a feline target', () => {
  mocks.assessment.mockReturnValue(loaded({ ...assessment, weightKg: 4 }));
  mocks.entries.mockReturnValue(
    loaded([{ ...chicken, food: { ...chicken.food, name: 'Cat food', species: 'cat' } }]),
  );
  mount([], cat);
  expect(screen.getByText('Cat food')).toBeTruthy();
  expect(
    screen.getByLabelText('Calories: target N/A kcal, added 82.5 kcal, remaining N/A kcal'),
  ).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Update' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Update' }));
  expect(screen.getByRole('form', { name: 'Daily assessment' })).toBeTruthy();
});

it('shows feline calorie and minimum comparisons with the confirmed cat assessment', () => {
  mocks.assessment.mockReturnValue(loaded(catAssessment));
  mocks.entries.mockReturnValue(
    loaded([{ ...chicken, petId: cat.id, food: { ...chicken.food, species: 'cat' } }]),
  );
  mount([], cat);
  expect(
    screen.getByLabelText('Calories: target 237.6 kcal, added 82.5 kcal, remaining 155.1 kcal'),
  ).toBeTruthy();
  expect(
    screen.getByLabelText('Protein min.: target 19.8 g, added 15.5 g, remaining 4.3 g'),
  ).toBeTruthy();
  expect(
    screen.getByLabelText('Fat min.: target 5.3 g, added 1.8 g, remaining 3.5 g'),
  ).toBeTruthy();
  expect(screen.getByLabelText('Carbs: target N/A g, added 0 g, remaining N/A g')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Daily target details' }));
  expect(screen.getByText('Weight: 4 kg. Targets are starting estimates.')).toBeTruthy();
});

it('saves a confirmed cat assessment under the selected pet and returns to the tracker', () => {
  mocks.assessment.mockReturnValue(loaded(null));
  mocks.save.mockImplementation((_input: unknown, options: { onSuccess: () => void }) => {
    mocks.assessment.mockReturnValue(loaded(catAssessment));
    options.onSuccess();
  });
  mount([], cat);
  fireEvent.click(screen.getByRole('button', { name: 'Set target' }));
  fireEvent.click(screen.getByRole('button', { name: 'Save assessment' }));
  expect(mocks.save).toHaveBeenCalledExactlyOnceWith(
    { petId: cat.id, ...catAssessment },
    { onSuccess: expect.any(Function) },
  );
  expect(screen.queryByRole('form')).toBeNull();
  expect(screen.getByRole('heading', { name: 'Tracker' })).toBeTruthy();
});

it('resets setup and calculation details when switching between dog and cat workspaces', () => {
  const rendered = mount();
  fireEvent.click(screen.getByRole('button', { name: 'Daily target details' }));
  expect(screen.getByText('Weight: 6 kg. Targets are starting estimates.')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Update' }));
  expect(screen.getByRole('form', { name: 'Daily assessment' })).toBeTruthy();
  mocks.assessment.mockReturnValue(loaded(catAssessment));
  mocks.entries.mockReturnValue(loaded([]));
  rendered.rerender(
    createElement(DailyDietTracker, { pet: cat, today, plans: [], onFoods: rendered.onFoods }),
  );
  expect(screen.queryByRole('form')).toBeNull();
  expect(screen.getByRole('heading', { name: 'Tracker' })).toBeTruthy();
  expect(
    screen.getByLabelText('Calories: target 237.6 kcal, added 0 kcal, remaining 237.6 kcal'),
  ).toBeTruthy();
  expect(screen.queryByText(/Targets are starting estimates/)).toBeNull();
  expect(mocks.entries).toHaveBeenLastCalledWith(cat.id, today);
  fireEvent.click(screen.getByRole('button', { name: 'Daily target details' }));
  expect(screen.getByText('Weight: 4 kg. Targets are starting estimates.')).toBeTruthy();
  mocks.assessment.mockReturnValue(loaded(assessment));
  rendered.rerender(
    createElement(DailyDietTracker, { pet, today, plans: [], onFoods: rendered.onFoods }),
  );
  expect(screen.queryByText(/Targets are starting estimates/)).toBeNull();
  expect(
    screen.getByLabelText('Calories: target 375.7 kcal, added 0 kcal, remaining 375.7 kcal'),
  ).toBeTruthy();
});
