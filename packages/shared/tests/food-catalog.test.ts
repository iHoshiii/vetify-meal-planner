import { describe, expect, it } from 'vitest';
import { catIngredientCatalog, catPackagedFoodCatalog } from '../src/cat-food-catalog.js';
import { defaultFoodCatalog } from '../src/food-catalog.js';
import { filterFoodCatalogForSpecies, packagedFoodCatalog } from '../src/foods.js';
import { defaultIngredientCatalog } from '../src/ingredient-catalog.js';

describe('shared food registry', () => {
  it('uses one unique catalog for species browsing and diet-entry lookup', () => {
    expect(defaultFoodCatalog).toHaveLength(
      defaultIngredientCatalog.length +
        packagedFoodCatalog.length +
        catIngredientCatalog.length +
        catPackagedFoodCatalog.length,
    );
    expect(new Set(defaultFoodCatalog.map(({ id }) => id)).size).toBe(defaultFoodCatalog.length);
    for (const cat of [...catIngredientCatalog, ...catPackagedFoodCatalog]) {
      expect(defaultFoodCatalog.find(({ id }) => id === cat.id)).toEqual(cat);
    }
  });

  it('shows only species-matched defaults without changing the existing dog catalog', () => {
    expect(defaultIngredientCatalog).toHaveLength(20);
    expect(defaultIngredientCatalog.every(({ food }) => food.species === 'dog')).toBe(true);
    expect(filterFoodCatalogForSpecies(defaultFoodCatalog, 'dog')).toEqual(
      defaultIngredientCatalog,
    );
    expect(filterFoodCatalogForSpecies(defaultFoodCatalog, 'cat')).toEqual([
      ...catIngredientCatalog,
      ...catPackagedFoodCatalog,
    ]);
    expect(filterFoodCatalogForSpecies(defaultFoodCatalog, 'other')).toEqual([]);
    expect(defaultFoodCatalog.find(({ id }) => id === 'ingredient-turkey-breast')).toEqual(
      defaultIngredientCatalog.find(({ id }) => id === 'ingredient-turkey-breast'),
    );
    expect(
      defaultFoodCatalog.find(({ id }) => id === 'ingredient-turkey-breast')?.details
        .nutritionPer100g.kcal,
    ).toBe(140);
    expect(
      defaultFoodCatalog.find(({ id }) => id === 'cat.usda.sr27.05220.roasted.v1')?.details
        .nutritionPer100g.kcal,
    ).toBe(147);
  });

  it('freezes nested registry copies without sharing mutable dog ingredient objects', () => {
    expect(Object.isFrozen(defaultFoodCatalog)).toBe(true);
    for (const item of defaultFoodCatalog) {
      expect(Object.isFrozen(item)).toBe(true);
      expect(Object.isFrozen(item.food)).toBe(true);
      expect(Object.isFrozen(item.details)).toBe(true);
      expect(Object.isFrozen(item.details.nutritionPer100g)).toBe(true);
    }
    const dog = defaultFoodCatalog.find(({ id }) => id === defaultIngredientCatalog[0]!.id)!;
    expect(dog.food).not.toBe(defaultIngredientCatalog[0]!.food);
    expect(dog.details.nutritionPer100g).not.toBe(
      defaultIngredientCatalog[0]!.details.nutritionPer100g,
    );
    expect(() => {
      dog.food.calories = 1650;
    }).toThrow(TypeError);
  });
});
