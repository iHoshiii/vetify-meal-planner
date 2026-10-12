// @vitest-environment jsdom
import { dog, cat, customDog, customCat } from './food-screen-test-fixtures';
import { fireEvent, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { defaultIngredientCatalog } from '@vetify/planner-shared/ingredient-catalog';
import { foodScreen, queries, library, mount, input, click } from './food-screen-test-helpers';

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
