import { z } from 'zod';
import { mealPlanInputSchema } from './meal-plans.js';

export type FoodLabel = z.infer<typeof mealPlanInputSchema.shape.food>;

const nutrientGrams = z.number().finite().min(0).max(100).nullable();
export const foodDetailsSchema = z
  .object({
    kind: z.enum(['packaged', 'ingredient']),
    category: z.enum(['protein', 'carb', 'vegetable', 'fruit', 'other']).nullable(),
    nutritionPer100g: z
      .object({
        kcal: z.number().finite().min(0).max(1000).nullable(),
        proteinG: nutrientGrams,
        fatG: nutrientGrams,
        carbsG: nutrientGrams,
      })
      .strict(),
    notes: z.string().trim().max(500),
    imageUrl: z
      .string()
      .trim()
      .url()
      .refine((value) => value.startsWith('https://'), 'Use an https image link.')
      .nullish(),
  })
  .strict()
  .superRefine(({ nutritionPer100g }, context) => {
    const knownGrams = [
      nutritionPer100g.proteinG,
      nutritionPer100g.fatG,
      nutritionPer100g.carbsG,
    ].reduce<number>((total, value) => total + (value ?? 0), 0);
    if (knownGrams > 100)
      context.addIssue({
        code: 'custom',
        path: ['nutritionPer100g'],
        message: 'Protein, fat and carbohydrate amounts cannot total more than 100 g.',
      });
  });

export type FoodDetails = z.infer<typeof foodDetailsSchema>;
export function defaultFoodDetails(kind: FoodDetails['kind'] = 'packaged'): FoodDetails {
  return {
    kind,
    category: null,
    nutritionPer100g: { kcal: null, proteinG: null, fatG: null, carbsG: null },
    notes: '',
    imageUrl: null,
  };
}

export const savedFoodInputSchema = z
  .object({
    petId: z.string().regex(/^[a-f\d]{24}$/i),
    food: mealPlanInputSchema.shape.food.strict(),
    details: foodDetailsSchema.optional(),
  })
  .strict()
  .superRefine(({ food, details }, context) => {
    if (food.calorieBasis === 'package' && food.calories !== null && food.packageGrams === null)
      context.addIssue({
        code: 'custom',
        path: ['food', 'packageGrams'],
        message: 'Enter the package weight for calories per package.',
      });
    if (details?.kind === 'ingredient') {
      if (food.adequacy === 'complete')
        context.addIssue({
          code: 'custom',
          path: ['food', 'adequacy'],
          message: 'An ingredient is not a complete diet.',
        });
      if (food.calories !== null)
        context.addIssue({
          code: 'custom',
          path: ['food', 'calories'],
          message: 'Store ingredient energy estimates in the per-100 g nutrition details.',
        });
    }
  });

export type SavedFoodInput = z.infer<typeof savedFoodInputSchema>;
export type SavedFood = {
  id: string;
  petId: string;
  food: FoodLabel;
  details: FoodDetails;
  createdAt: string;
  updatedAt: string;
};
export type CatalogFood = { id: string; food: FoodLabel; details: FoodDetails };
export type FoodLibrary = { foods: SavedFood[]; catalog: CatalogFood[] };

export function filterFoodCatalogForSpecies<T extends { food: Pick<FoodLabel, 'species'> }>(
  catalog: readonly T[],
  species: FoodLabel['species'],
): T[] {
  return catalog.filter((item) => item.food.species === species);
}

// Add products only after their current package labels and sources are verified.
export const packagedFoodCatalog: readonly CatalogFood[] = [];
