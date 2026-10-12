// @vitest-environment jsdom
import { dog } from './food-screen-test-fixtures';
import { act, fireEvent, screen } from '@testing-library/react';
import { defaultIngredientCatalog } from '@vetify/planner-shared/ingredient-catalog';
import { expect, it } from 'vitest';
import { queries, mount, input, click } from './food-screen-test-helpers';
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
