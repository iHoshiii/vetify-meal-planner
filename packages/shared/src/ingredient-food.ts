import type { CatalogFood, FoodDetails } from './foods.js';

export function ingredient(
  id: string,
  name: string,
  category: FoodDetails['category'],
  kcal: number,
  proteinG: number,
  fatG: number,
  carbsG: number,
  notes: string,
): CatalogFood {
  return {
    id,
    food: {
      name,
      form: 'other',
      adequacy: 'supplemental',
      species: 'dog',
      lifeStage: 'unknown',
      calorieBasis: 'kg',
      calories: null,
      packageGrams: null,
      labelSource: 'Provided ingredient table (estimate)',
      labelCheckedOn: null,
    },
    details: {
      kind: 'ingredient',
      category,
      nutritionPer100g: { kcal, proteinG, fatG, carbsG },
      notes,
    },
  };
}
