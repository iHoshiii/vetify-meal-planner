import { z } from 'zod';
import { validCalendarDay } from './planner-date.js';

export const nutritionObservationSchema = z.object({
  petId: z.string().regex(/^[a-f\d]{24}$/i),
  weightKg: z.number().finite().positive().max(500),
  measuredOn: z.string().refine(validCalendarDay, 'Enter a real date'),
  conditionScore: z.number().int().min(1).max(9).nullable(),
  observer: z.enum(['owner', 'veterinarian']),
});

export type NutritionObservationInput = z.infer<typeof nutritionObservationSchema>;
export type NutritionObservation = NutritionObservationInput & {
  id: string;
  createdAt: string;
};
