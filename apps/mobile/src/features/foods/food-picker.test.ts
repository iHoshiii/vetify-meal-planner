// @vitest-environment jsdom
import { createElement, type ReactNode } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type {
  CatalogFood,
  FoodDetails,
  FoodLabel,
  FoodLibrary,
  SavedFood,
} from '@vetify/planner-shared/foods';
import type { Pet } from '@vetify/planner-shared/pets';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const query = vi.hoisted(() => ({ useFoods: vi.fn(), refetch: vi.fn() }));
vi.mock('../../services/food-queries', () => ({ useFoods: query.useFoods }));
vi.mock('../../components/app-icon', () => ({ AppIcon: () => null }));
vi.mock('react-native', () => ({
  View: ({ children }: { children: ReactNode }) => createElement('div', {}, children),
  Text: ({ children, accessibilityRole }: { children: ReactNode; accessibilityRole?: string }) =>
    createElement('span', { role: accessibilityRole }, children),
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
  ActivityIndicator: ({ accessibilityLabel }: { accessibilityLabel: string }) =>
    createElement('div', { role: 'status', 'aria-label': accessibilityLabel }),
  TextInput: () => null,
  Switch: () => null,
  StyleSheet: { create: <T>(styles: T) => styles },
}));
import { FoodPicker } from './food-picker';

const pet = { id: 'pet-1', species: 'dog' } as Pet;
const label: FoodLabel = {
  name: 'Dog package label',
  form: 'dry',
  adequacy: 'complete',
  species: 'dog',
  lifeStage: 'adult',
  calorieBasis: 'kg',
  calories: 3500,
  packageGrams: null,
  labelSource: 'Package',
  labelCheckedOn: '2026-10-11',
};
const details: FoodDetails = {
  kind: 'packaged',
  category: null,
  nutritionPer100g: { kcal: null, proteinG: null, fatG: null, carbsG: null },
  notes: '',
};
const savedPackage: SavedFood = {
  id: 'saved-package',
  petId: pet.id,
  food: label,
  details,
  createdAt: '2026-10-11T00:00:00.000Z',
  updatedAt: '2026-10-11T00:00:00.000Z',
};
const savedIngredient: SavedFood = {
  ...savedPackage,
  id: 'saved-ingredient',
  food: { ...label, name: 'Saved chicken ingredient', adequacy: 'supplemental', calories: null },
  details: {
    ...details,
    kind: 'ingredient',
    category: 'protein',
    nutritionPer100g: { kcal: 165, proteinG: 31, fatG: 3.6, carbsG: 0 },
  },
};
const catalogPackage: CatalogFood = {
  id: 'catalog-package',
  food: { ...label, name: 'Catalogue package label', calories: 4000 },
  details,
};
const catalogIngredient: CatalogFood = {
  id: 'catalog-ingredient',
  food: { ...savedIngredient.food, name: 'Built-in chicken ingredient' },
  details: savedIngredient.details,
};

function library(data: FoodLibrary) {
  query.useFoods.mockReturnValue({
    data,
    isPending: false,
    isError: false,
    error: null,
    refetch: query.refetch,
  });
}
function mount(selected = label) {
  const onSelect = vi.fn();
  render(createElement(FoodPicker, { pet, selected, onSelect }));
  return onSelect;
}
function open() {
  fireEvent.click(screen.getByRole('button', { name: 'Choose a packaged food' }));
}
beforeEach(() => {
  query.useFoods.mockReset();
  query.refetch.mockReset();
  library({ foods: [], catalog: [] });
});
afterEach(cleanup);

it('filters both saved and built-in ingredients out of the primary food choices', () => {
  library({ foods: [savedPackage, savedIngredient], catalog: [catalogPackage, catalogIngredient] });
  mount();
  expect(screen.queryByRole('radio')).toBeNull();
  open();
  expect(query.useFoods).toHaveBeenCalledWith(pet.id);
  expect(screen.getAllByRole('radio')).toHaveLength(2);
  expect(screen.getByText('Dog package label')).toBeTruthy();
  expect(screen.getByText('Catalogue package label')).toBeTruthy();
  expect(screen.queryByText('Saved chicken ingredient')).toBeNull();
  expect(screen.queryByText('Built-in chicken ingredient')).toBeNull();
});

it('explains an ingredient-only library without allowing ingredient selection', () => {
  library({ foods: [savedIngredient], catalog: [catalogIngredient] });
  const onSelect = mount();
  open();
  expect(screen.queryByRole('radio')).toBeNull();
  expect(
    screen.getByText('No packaged foods yet. Ingredients are not complete diets.'),
  ).toBeTruthy();
  expect(onSelect).not.toHaveBeenCalled();
});

it('preserves selected packaged labels and closes after choosing a catalogue package', () => {
  library({ foods: [savedPackage], catalog: [catalogPackage, catalogIngredient] });
  const onSelect = mount();
  open();
  expect(
    screen
      .getByRole('radio', { name: 'Dog package label, 3,500 kcal/kg' })
      .getAttribute('aria-checked'),
  ).toBe('true');
  fireEvent.click(screen.getByRole('radio', { name: 'Catalogue package label, 4,000 kcal/kg' }));
  expect(onSelect).toHaveBeenCalledExactlyOnceWith(catalogPackage.food);
  expect(screen.queryByRole('radio')).toBeNull();
  expect(
    screen.getByRole('button', { name: 'Choose a packaged food' }).getAttribute('aria-expanded'),
  ).toBe('false');
});

it('retains the species guard for packaged food instead of rewriting its label', () => {
  const catFood: SavedFood = {
    ...savedPackage,
    id: 'cat-package',
    food: { ...label, name: 'Cat package label', species: 'cat' },
  };
  library({ foods: [catFood, savedPackage], catalog: [] });
  const onSelect = mount();
  open();
  const mismatch = screen.getByRole('radio', {
    name: 'Cat package label, label for cat, different species',
  });
  expect(mismatch.hasAttribute('disabled')).toBe(true);
  fireEvent.click(mismatch);
  expect(onSelect).not.toHaveBeenCalled();
  expect(catFood.food.species).toBe('cat');
  fireEvent.click(screen.getByRole('radio', { name: 'Dog package label, 3,500 kcal/kg' }));
  expect(onSelect).toHaveBeenCalledExactlyOnceWith(savedPackage.food);
});

it('keeps legacy package labels selectable when optional metadata is absent at runtime', () => {
  const { details: _details, ...legacy } = savedPackage;
  library({ foods: [legacy as SavedFood], catalog: [catalogIngredient] });
  const onSelect = mount();
  open();
  fireEvent.click(screen.getByRole('radio', { name: 'Dog package label, 3,500 kcal/kg' }));
  expect(onSelect).toHaveBeenCalledExactlyOnceWith(legacy.food);
});
