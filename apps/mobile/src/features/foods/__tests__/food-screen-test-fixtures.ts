import { defaultFoodDetails, type SavedFood } from '@vetify/planner-shared/foods';
import { defaultIngredientCatalog } from '@vetify/planner-shared/ingredient-catalog';
import type { Pet } from '@vetify/planner-shared/pets';
export const dog = { id: 'aaaaaaaaaaaaaaaaaaaaaaaa', name: 'Milo', species: 'dog' } as Pet;
export const cat = { id: 'bbbbbbbbbbbbbbbbbbbbbbbb', name: 'Nori', species: 'cat' } as Pet;
export const customDog: SavedFood = {
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
export const customCat: SavedFood = {
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
