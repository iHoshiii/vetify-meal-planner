// @vitest-environment jsdom
import { dog, customDog } from './food-screen-test-fixtures';
import { fireEvent, screen } from '@testing-library/react';
import { defaultIngredientCatalog } from '@vetify/planner-shared/ingredient-catalog';
import { expect, it } from 'vitest';
import { queries, library, mount, input, click } from './food-screen-test-helpers';
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
