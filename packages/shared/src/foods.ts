import { z } from 'zod';
import { mealPlanInputSchema } from './meal-plans.js';

export type FoodLabel = z.infer<typeof mealPlanInputSchema.shape.food>;

export const savedFoodInputSchema = z
  .object({
    petId: z.string().regex(/^[a-f\d]{24}$/i),
    food: mealPlanInputSchema.shape.food.strict(),
  })
  .strict()
  .superRefine(({ food }, context) => {
    if (food.calorieBasis === 'package' && food.calories !== null && food.packageGrams === null)
      context.addIssue({
        code: 'custom',
        path: ['food', 'packageGrams'],
        message: 'Enter the package weight for calories per package.',
      });
  });

export type SavedFoodInput = z.infer<typeof savedFoodInputSchema>;
export type SavedFood = {
  id: string;
  petId: string;
  food: FoodLabel;
  createdAt: string;
  updatedAt: string;
};
export type CatalogFood = { id: string; food: FoodLabel };
export type FoodLibrary = { foods: SavedFood[]; catalog: CatalogFood[] };

// Add products only after their current package labels and sources are verified.
export const packagedFoodCatalog: readonly CatalogFood[] = [];
