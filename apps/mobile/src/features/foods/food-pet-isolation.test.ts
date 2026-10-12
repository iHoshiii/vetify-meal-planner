// @vitest-environment jsdom
import { dog, cat, customDog, customCat } from './food-screen-test-fixtures';
import { act, fireEvent, screen } from '@testing-library/react';
import { defaultIngredientCatalog } from '@vetify/planner-shared/ingredient-catalog';
import { expect, it } from 'vitest';
import { queries, library, mount, input, click, foodScreen } from './food-screen-test-helpers';
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
