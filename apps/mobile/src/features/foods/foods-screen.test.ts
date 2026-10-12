// @vitest-environment jsdom
import { createElement, type ReactNode } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { defaultFoodDetails, type SavedFood } from '@vetify/planner-shared/foods';
import { defaultIngredientCatalog } from '@vetify/planner-shared/ingredient-catalog';
import type { Pet } from '@vetify/planner-shared/pets';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const queries = vi.hoisted(() => ({
  useFoods: vi.fn(),
  mutate: vi.fn(),
  reset: vi.fn(),
  refetch: vi.fn(),
  addMutate: vi.fn(),
  addReset: vi.fn(),
  randomUUID: vi.fn(),
}));
vi.mock('../../services/food-queries', () => ({
  useFoods: queries.useFoods,
  useSaveFood: () => ({
    mutate: queries.mutate,
    reset: queries.reset,
    isPending: false,
    error: null,
  }),
}));
vi.mock('../../services/diet-queries', () => ({
  useAddDietEntry: () => ({
    mutate: queries.addMutate,
    reset: queries.addReset,
    isPending: false,
    error: null,
  }),
}));
vi.mock('expo-crypto', () => ({ randomUUID: queries.randomUUID }));
vi.mock('../../auth/session', () => ({ accountToday: () => '2026-10-11' }));
vi.mock('../../components/screen-activity', () => ({ useScreenActive: () => true }));
vi.mock('../../components/app-icon', () => ({ AppIcon: () => null }));
vi.mock('react-native', () => ({
  View: ({ children }: { children: ReactNode }) => createElement('div', {}, children),
  ScrollView: ({ children }: { children: ReactNode }) => createElement('div', {}, children),
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
    accessibilityRole,
    accessibilityLabel,
    accessibilityState,
  }: {
    children: ReactNode;
    onPress: () => void;
    disabled?: boolean;
    accessibilityRole?: string;
    accessibilityLabel?: string;
    accessibilityState?: { checked?: boolean; expanded?: boolean; disabled?: boolean };
  }) =>
    createElement(
      'button',
      {
        onClick: onPress,
        disabled: disabled || accessibilityState?.disabled,
        role: accessibilityRole,
        'aria-label': accessibilityLabel,
        'aria-checked': accessibilityState?.checked,
        'aria-expanded': accessibilityState?.expanded,
      },
      children,
    ),
  TextInput: ({
    value,
    onChangeText,
    accessibilityLabel,
    multiline,
    maxLength,
  }: {
    value: string;
    onChangeText: (value: string) => void;
    accessibilityLabel: string;
    multiline?: boolean;
    maxLength?: number;
  }) =>
    createElement(multiline ? 'textarea' : 'input', {
      value,
      'aria-label': accessibilityLabel,
      maxLength,
      onChange: (event: { target: { value: string } }) => onChangeText(event.target.value),
    }),
  ActivityIndicator: ({ accessibilityLabel }: { accessibilityLabel: string }) =>
    createElement('div', { role: 'status', 'aria-label': accessibilityLabel }),
  Switch: () => null,
  BackHandler: { addEventListener: () => ({ remove: () => {} }) },
  StyleSheet: { create: <T>(styles: T) => styles },
}));
import { FoodsScreen } from './foods-screen';

const dog = { id: 'aaaaaaaaaaaaaaaaaaaaaaaa', name: 'Milo', species: 'dog' } as Pet;
const cat = { id: 'bbbbbbbbbbbbbbbbbbbbbbbb', name: 'Nori', species: 'cat' } as Pet;
const customDog: SavedFood = {
  id: 'cccccccccccccccccccccccc',
  petId: dog.id,
  food: { ...defaultIngredientCatalog[0].food, name: 'Owner chicken' },
  details: {
    ...defaultIngredientCatalog[0].details,
    nutritionPer100g: { ...defaultIngredientCatalog[0].details.nutritionPer100g },
    notes: 'Owner notes',
  },
  createdAt: '2026-10-11T00:00:00.000Z',
  updatedAt: '2026-10-11T00:00:00.000Z',
};
const customCat: SavedFood = {
  ...customDog,
  id: 'dddddddddddddddddddddddd',
  petId: cat.id,
  food: {
    ...customDog.food,
    name: 'Owner cat package',
    species: 'cat',
    form: 'wet',
    adequacy: 'complete',
    calories: 100,
  },
  details: defaultFoodDetails(),
};

function library(foods: SavedFood[] = []) {
  queries.useFoods.mockImplementation((petId: string) => ({
    data: {
      foods: foods.filter((item) => item.petId === petId),
      catalog: [...defaultIngredientCatalog],
    },
    isPending: false,
    isError: false,
    error: null,
    refetch: queries.refetch,
  }));
}
function mount(pet = dog) {
  const onPlanMeals = vi.fn();
  const rendered = render(createElement(FoodsScreen, { pet, onPlanMeals }));
  return { ...rendered, onPlanMeals };
}
const input = (name: string) => screen.getByRole('textbox', { name });
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));

beforeEach(() => {
  queries.useFoods.mockReset();
  queries.mutate.mockReset();
  queries.reset.mockReset();
  queries.refetch.mockReset();
  queries.addMutate.mockReset();
  queries.addReset.mockReset();
  queries.randomUUID.mockReset();
  queries.randomUUID.mockReturnValue('123e4567-e89b-42d3-a456-426614174000');
  library();
});
afterEach(cleanup);

it('displays all20 built-in foods with Add/View actions and keeps their macros collapsed initially', () => {
  mount();
  for (const item of defaultIngredientCatalog) {
    expect(screen.getByText(item.food.name, { exact: true })).toBeTruthy();
    expect(screen.getByRole('button', { name: `Add: ${item.food.name}` })).toBeTruthy();
    expect(screen.getByRole('button', { name: `View: ${item.food.name}` })).toBeTruthy();
  }
  expect(screen.queryByText('165 kcal / 100 g', { exact: true })).toBeNull();
  expect(screen.queryByText('31 g', { exact: true })).toBeNull();
  expect(screen.queryByRole('button', { name: /Copy|Edit|Save label/i })).toBeNull();
  expect(screen.queryByRole('textbox', { name: 'Food name' })).toBeNull();
  expect(screen.queryByRole('textbox', { name: 'Protein, g' })).toBeNull();
  expect(queries.mutate).not.toHaveBeenCalled();
  expect(queries.addMutate).not.toHaveBeenCalled();
});

it('expands read-only built-in macros and notes through View without Copy/Edit actions', () => {
  mount();
  const builtin = defaultIngredientCatalog[0];
  expect(screen.queryByText(builtin.details.notes, { exact: true })).toBeNull();
  click(`View: ${builtin.food.name}`);
  expect(screen.getByText('Per 100 g (estimated)', { exact: true })).toBeTruthy();
  expect(screen.getByText('165 kcal / 100 g', { exact: true })).toBeTruthy();
  expect(screen.getByText('31 g', { exact: true })).toBeTruthy();
  expect(screen.getByText(builtin.details.notes, { exact: true })).toBeTruthy();
  expect(screen.queryByRole('textbox', { name: 'Food name' })).toBeNull();
  expect(screen.queryByRole('textbox', { name: 'Protein, g' })).toBeNull();
  expect(screen.queryByRole('textbox', { name: 'Amount, g' })).toBeNull();
  expect(screen.queryByRole('button', { name: /Copy|Edit/i })).toBeNull();
  click(`View: ${builtin.food.name}`);
  expect(screen.queryByText(builtin.details.notes, { exact: true })).toBeNull();
  expect(screen.queryByText('31 g', { exact: true })).toBeNull();
  expect(queries.addMutate).not.toHaveBeenCalled();
});

it('previews a 50 g portion and submits a snapshot request without making macros editable', () => {
  mount();
  click(`Add: ${defaultIngredientCatalog[0].food.name}`);
  expect((input('Amount, g') as HTMLInputElement).value).toBe('');
  fireEvent.change(input('Amount, g'), { target: { value: '50' } });
  expect(screen.getByText('82.5 kcal in this portion', { exact: true })).toBeTruthy();
  expect(screen.getByText('15.5 g', { exact: true })).toBeTruthy();
  expect(screen.getByText('1.8 g', { exact: true })).toBeTruthy();
  for (const label of ['Energy, kcal', 'Protein, g', 'Fat, g', 'Carbs, g'])
    expect(screen.queryByRole('textbox', { name: label })).toBeNull();
  click('Add to diet');
  expect(queries.addMutate).toHaveBeenCalledOnce();
  expect(queries.addMutate.mock.calls[0][0]).toEqual({
    requestId: '123e4567-e89b-42d3-a456-426614174000',
    petId: dog.id,
    date: '2026-10-11',
    source: 'catalog',
    foodId: defaultIngredientCatalog[0].id,
    grams: 50,
  });
  expect(queries.mutate).not.toHaveBeenCalled();
  act(() => queries.addMutate.mock.calls[0][1].onSuccess());
  expect(screen.queryByRole('textbox', { name: 'Amount, g' })).toBeNull();
  expect(screen.getByText("Added to today's diet", { exact: true })).toBeTruthy();
  expect(defaultIngredientCatalog[0].details.nutritionPer100g.proteinG).toBe(31);
});

it.each(['', '0', '10001', 'not a number'])(
  'does not create a diet entry for an invalid gram amount (%s)',
  (grams) => {
    mount();
    click(`Add: ${defaultIngredientCatalog[0].food.name}`);
    fireEvent.change(input('Amount, g'), { target: { value: grams } });
    const add = screen.getByRole('button', { name: 'Add to diet' });
    expect((add as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(add);
    expect(queries.addMutate).not.toHaveBeenCalled();
    expect(queries.randomUUID).not.toHaveBeenCalled();
  },
);

it('uses the saved-food source for a custom portion and preserves its editable source values', () => {
  library([customDog]);
  mount();
  click(`Add: ${customDog.food.name}`);
  fireEvent.change(input('Amount, g'), { target: { value: '25.5' } });
  click('Add to diet');
  expect(queries.addMutate.mock.calls[0][0]).toMatchObject({
    petId: dog.id,
    source: 'saved',
    foodId: customDog.id,
    grams: 25.5,
  });
  expect(queries.mutate).not.toHaveBeenCalled();
  expect(customDog.details.nutritionPer100g.proteinG).toBe(31);
});

it('opens a blank editable custom food from Add food and saves its values without borrowing built-in macros', () => {
  mount();
  click('Add food');
  expect((input('Food name') as HTMLInputElement).value).toBe('');
  expect(
    screen.getByRole('radio', { name: 'Food type: Ingredient' }).getAttribute('aria-checked'),
  ).toBe('true');
  fireEvent.change(input('Food name'), { target: { value: 'Owner entered food' } });
  click('Next');
  for (const name of ['Energy, kcal', 'Protein, g', 'Fat, g', 'Carbs, g'])
    expect((input(name) as HTMLInputElement).value).toBe('');
  fireEvent.change(input('Protein, g'), { target: { value: '0' } });
  fireEvent.change(input('Carbs, g'), { target: { value: '4.7' } });
  click('Next');
  click('Save food');
  expect(queries.mutate).toHaveBeenCalledOnce();
  expect(queries.mutate.mock.calls[0][0]).toMatchObject({
    id: undefined,
    input: {
      petId: dog.id,
      food: { name: 'Owner entered food', adequacy: 'supplemental', calories: null },
      details: {
        kind: 'ingredient',
        nutritionPer100g: { kcal: null, proteinG: 0, fatG: null, carbsG: 4.7 },
      },
    },
  });
  expect(defaultIngredientCatalog[0].details.nutritionPer100g).toEqual({
    kcal: 165,
    proteinG: 31,
    fatG: 3.6,
    carbsG: 0,
  });
});

it('keeps existing custom foods editable while the built-in catalogue stays read-only', () => {
  library([customDog]);
  mount();
  expect(screen.queryByRole('button', { name: /^Edit:/ })).toBeNull();
  click('View: Owner chicken');
  expect(screen.getAllByRole('button', { name: /^Edit:/ })).toHaveLength(1);
  click('Edit: Owner chicken');
  expect((input('Food name') as HTMLInputElement).value).toBe('Owner chicken');
  expect(screen.queryByRole('radio', { name: 'Food type: Packaged food' })).toBeNull();
  click('Next');
  expect((input('Protein, g') as HTMLInputElement).value).toBe('31');
  fireEvent.change(input('Protein, g'), { target: { value: '30' } });
  click('Next');
  click('Save food');
  expect(queries.mutate.mock.calls[0][0]).toMatchObject({
    id: customDog.id,
    input: {
      petId: dog.id,
      food: { name: customDog.food.name },
      details: { nutritionPer100g: { proteinG: 30, kcal: 165, fatG: 3.6, carbsG: 0 } },
    },
  });
  expect(customDog.details.nutritionPer100g.proteinG).toBe(31);
  expect(defaultIngredientCatalog[0].details.nutritionPer100g.proteinG).toBe(31);
});

it('clears an open form when changing pets and keeps dog defaults and custom foods isolated', () => {
  library([customDog, customCat]);
  const rendered = mount();
  click('View: Owner chicken');
  click('Edit: Owner chicken');
  expect(input('Food name')).toBeTruthy();
  rendered.rerender(createElement(FoodsScreen, { pet: cat, onPlanMeals: rendered.onPlanMeals }));
  expect(queries.useFoods).toHaveBeenLastCalledWith(cat.id);
  expect(screen.queryByRole('textbox', { name: 'Food name' })).toBeNull();
  expect(screen.queryByText(defaultIngredientCatalog[0].food.name, { exact: true })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Edit: Owner chicken' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'View: Owner chicken' })).toBeNull();
  click('View: Owner cat package');
  expect(screen.getByRole('button', { name: 'Edit: Owner cat package' })).toBeTruthy();
  rendered.rerender(createElement(FoodsScreen, { pet: dog, onPlanMeals: rendered.onPlanMeals }));
  expect(screen.getByText(defaultIngredientCatalog[0].food.name, { exact: true })).toBeTruthy();
  click('View: Owner chicken');
  expect(screen.getByRole('button', { name: 'Edit: Owner chicken' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Edit: Owner cat package' })).toBeNull();
  expect(screen.queryByRole('button', { name: /Copy/i })).toBeNull();
  expect(queries.mutate).not.toHaveBeenCalled();
  expect(queries.addMutate).not.toHaveBeenCalled();
});

it('disables adding a custom food with a different species even if it appears in the current library', () => {
  const wrongSpecies = { ...customCat, petId: dog.id };
  library([wrongSpecies]);
  mount();
  const add = screen.getByRole('button', { name: `Add: ${wrongSpecies.food.name}` });
  expect((add as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(add);
  expect(screen.queryByRole('textbox', { name: 'Amount, g' })).toBeNull();
  expect(queries.addMutate).not.toHaveBeenCalled();
});

it('clears a cached built-in portion draft and retry key when switching between dogs', () => {
  const secondDog = { ...dog, id: 'eeeeeeeeeeeeeeeeeeeeeeee', name: 'Luna' };
  queries.randomUUID
    .mockReturnValueOnce('123e4567-e89b-42d3-a456-426614174000')
    .mockReturnValueOnce('123e4567-e89b-42d3-a456-426614174001');
  const rendered = mount();
  click(`Add: ${defaultIngredientCatalog[0].food.name}`);
  fireEvent.change(input('Amount, g'), { target: { value: '50' } });
  click('Add to diet');
  // A failed attempt keeps its retry key; a different pet must get a fresh form/key.
  rendered.rerender(
    createElement(FoodsScreen, { pet: secondDog, onPlanMeals: rendered.onPlanMeals }),
  );
  expect(queries.useFoods).toHaveBeenLastCalledWith(secondDog.id);
  expect(screen.queryByRole('textbox', { name: 'Amount, g' })).toBeNull();
  click(`Add: ${defaultIngredientCatalog[0].food.name}`);
  expect((input('Amount, g') as HTMLInputElement).value).toBe('');
  fireEvent.change(input('Amount, g'), { target: { value: '25' } });
  click('Add to diet');
  expect(queries.randomUUID).toHaveBeenCalledTimes(2);
  expect(queries.addMutate.mock.calls[1][0]).toMatchObject({
    requestId: '123e4567-e89b-42d3-a456-426614174001',
    petId: secondDog.id,
    date: '2026-10-11',
    grams: 25,
  });
});

it('resets the previous day confirmation and adds a new portion to the displayed day', () => {
  const rendered = mount();
  click(`Add: ${defaultIngredientCatalog[0].food.name}`);
  fireEvent.change(input('Amount, g'), { target: { value: '50' } });
  click('Add to diet');
  act(() => queries.addMutate.mock.calls[0][1].onSuccess());
  expect(screen.getByText("Added to today's diet", { exact: true })).toBeTruthy();
  rendered.rerender(
    createElement(FoodsScreen, {
      pet: dog,
      today: '2026-10-12',
      onPlanMeals: rendered.onPlanMeals,
    }),
  );
  expect(screen.queryByText("Added to today's diet", { exact: true })).toBeNull();
  click(`Add: ${defaultIngredientCatalog[0].food.name}`);
  expect((input('Amount, g') as HTMLInputElement).value).toBe('');
  fireEvent.change(input('Amount, g'), { target: { value: '10' } });
  click('Add to diet');
  expect(queries.addMutate.mock.calls[1][0]).toMatchObject({
    petId: dog.id,
    date: '2026-10-12',
    grams: 10,
  });
});
