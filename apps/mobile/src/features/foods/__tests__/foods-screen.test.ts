// @vitest-environment jsdom
import { dog, customDog, cat, customCat } from './food-screen-test-fixtures';
import { act, fireEvent, screen } from '@testing-library/react';
import { defaultIngredientCatalog } from '@vetify/planner-shared/ingredient-catalog';
import { expect, it } from 'vitest';
import { queries, mount, input, click, library, foodScreen } from './food-screen-test-helpers';

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

it('shows read-only built-in macros and notes in the View popup without Copy/Edit actions', () => {
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
  click('Done');
  expect(screen.queryByText(builtin.details.notes, { exact: true })).toBeNull();
  expect(screen.queryByText('31 g', { exact: true })).toBeNull();
  expect(queries.addMutate).not.toHaveBeenCalled();
});

it('previews a 50 g portion and submits a snapshot request without making macros editable', () => {
  mount();
  click(`Add: ${defaultIngredientCatalog[0].food.name}`);
  expect((input('Amount, g') as HTMLInputElement).value).toBe('');
  fireEvent.change(input('Amount, g'), { target: { value: '50' } });
  expect(screen.getByText('82.5 kcal', { exact: true })).toBeTruthy();
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
  rendered.rerender(foodScreen({ pet: cat }));
  expect(queries.useFoods).toHaveBeenLastCalledWith(cat.id);
  expect(screen.queryByRole('textbox', { name: 'Food name' })).toBeNull();
  expect(screen.queryByText(defaultIngredientCatalog[0].food.name, { exact: true })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Edit: Owner chicken' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'View: Owner chicken' })).toBeNull();
  click('View: Owner cat package');
  expect(screen.getByRole('button', { name: 'Edit: Owner cat package' })).toBeTruthy();
  rendered.rerender(foodScreen({ pet: dog }));
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
  rendered.rerender(foodScreen({ pet: secondDog }));
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
    foodScreen({
      pet: dog,
      today: '2026-10-12',
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

const radio = (name: string) => fireEvent.click(screen.getByRole('radio', { name }));
it('keeps category controls in the panel and discards unapplied changes when closed', () => {
  mount();
  expect(screen.queryByRole('radio', { name: 'Category: Protein' })).toBeNull();
  click('Filter and sort foods');
  radio('Category: Fruit');
  click('Close');
  expect(
    screen.getByRole('button', { name: `View: ${defaultIngredientCatalog[0].food.name}` }),
  ).toBeTruthy();
  click('Filter and sort foods');
  expect(screen.getByRole('radio', { name: 'Category: All' }).getAttribute('aria-checked')).toBe(
    'true',
  );
});
it('applies category, meal type and sorting together and resets all options', () => {
  library([{ ...customDog, details: { ...customDog.details, mealTypes: ['breakfast', 'lunch'] } }]);
  mount();
  click('Filter and sort foods');
  radio('Category: Protein');
  radio('Meal type: Breakfast');
  radio('Sort by: Name A to Z');
  click('Show results');
  expect(screen.queryByRole('heading', { name: 'Filters' })).toBeNull();
  expect(screen.getAllByRole('button', { name: /^View:/ })).toHaveLength(1);
  expect(screen.getByRole('button', { name: 'View: Owner chicken' })).toBeTruthy();
  click('Filter and sort foods');
  click('Reset');
  click('Show results');
  expect(screen.getAllByRole('button', { name: /^View:/ })).toHaveLength(21);
  expect(queries.mutate).not.toHaveBeenCalled();
});
it('keeps an active search when applying filters and shows an empty result clearly', () => {
  mount();
  fireEvent.change(input('Search foods'), { target: { value: 'chicken' } });
  click('Filter and sort foods');
  radio('Category: Fruit');
  click('Show results');
  expect((input('Search foods') as HTMLInputElement).value).toBe('chicken');
  expect(screen.getByText('No foods match. Try another name or filter.')).toBeTruthy();
  click('Filter and sort foods');
  click('Reset');
  click('Show results');
  expect(screen.getAllByRole('button', { name: /^View:/ })).toHaveLength(1);
});
it('clears the previous pet filters and open draft when switching pets', () => {
  library([customDog, customCat]);
  const rendered = mount();
  click('Filter and sort foods');
  radio('Category: Protein');
  click('Show results');
  click('Filter and sort foods');
  radio('Meal type: Dinner');
  rendered.rerender(foodScreen({ pet: cat }));
  expect(screen.queryByRole('heading', { name: 'Filters' })).toBeNull();
  expect(screen.getByRole('button', { name: 'View: Owner cat package' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'View: Owner chicken' })).toBeNull();
  click('Filter and sort foods');
  expect(screen.getByRole('radio', { name: 'Category: All' }).getAttribute('aria-checked')).toBe(
    'true',
  );
  expect(screen.getByRole('radio', { name: 'Meal type: All' }).getAttribute('aria-checked')).toBe(
    'true',
  );
});
it('saves multiple meal tags and preserves them when editing nutrition', () => {
  library([{ ...customDog, details: { ...customDog.details, mealTypes: ['dinner'] } }]);
  mount();
  click('View: Owner chicken');
  click('Edit: Owner chicken');
  click('Next');
  click('Next');
  expect(
    screen.getByRole('checkbox', { name: 'Meal type: Dinner' }).getAttribute('aria-checked'),
  ).toBe('true');
  fireEvent.click(screen.getByRole('checkbox', { name: 'Meal type: Breakfast' }));
  click('Save food');
  expect(queries.mutate.mock.calls[0][0]).toMatchObject({
    input: {
      petId: dog.id,
      details: {
        mealTypes: ['dinner', 'breakfast'],
        nutritionPer100g: customDog.details.nutritionPer100g,
      },
    },
  });
  expect(customDog.details.mealTypes).toBeUndefined();
});
