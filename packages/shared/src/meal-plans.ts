import { z } from 'zod';
import { validCalendarDay } from './planner-date.js';

const date = z.string().refine(validCalendarDay, 'Enter a real date');
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

export const mealPlanInputSchema = z.object({
  requestId: z
    .string()
    .min(16)
    .max(80)
    .regex(/^[a-zA-Z\d-]+$/),
  petId: z.string().regex(/^[a-f\d]{24}$/i),
  mode: z.enum(['estimate', 'manual']),
  weightKg: z.number().finite().positive().max(500),
  weightMeasuredOn: date,
  conditionScore: z.number().int().min(1).max(9).nullable(),
  stableWeight: z.boolean(),
  growing: z.boolean(),
  healthConcern: z.boolean(),
  prescribedDiet: z.boolean(),
  appetiteChange: z.boolean(),
  food: z.object({
    name: z.string().trim().min(2).max(120),
    form: z.enum(['dry', 'wet', 'other']),
    adequacy: z.enum(['complete', 'supplemental', 'unknown']),
    species: z.enum(['dog', 'cat', 'other']),
    lifeStage: z.enum(['adult', 'growth', 'all', 'unknown']),
    calorieBasis: z.enum(['kg', 'package']),
    calories: z.number().finite().positive().max(10000).nullable(),
    packageGrams: z.number().finite().positive().max(5000).nullable(),
    labelSource: z.string().trim().max(180),
    labelCheckedOn: date.nullable(),
  }),
  extrasKcal: z.number().finite().min(0).max(5000).nullable(),
  manualDailyGrams: z.number().finite().positive().max(5000).nullable(),
  mealTimes: z.array(time).min(1).max(6),
});

export type MealPlanInput = z.infer<typeof mealPlanInputSchema>;

export type MealPlanPreview = {
  mode: MealPlanInput['mode'];
  dailyGrams: number | null;
  dailyKcal: number | null;
  foodKcal: number | null;
  factor: number | null;
  mealGrams: number[];
  warnings: string[];
  blockers: string[];
};

export type MealPlan = MealPlanInput & {
  id: string;
  ownerId: string;
  petName: string;
  petWeightKg: number;
  preview: MealPlanPreview;
  version: number;
  timeZone: string;
  activeFrom: string;
  endedAt: string | null;
  createdAt: string;
};

export const feedingLogInputSchema = z
  .object({
    date: date,
    mealIndex: z.number().int().min(0).max(5),
    status: z.enum(['fed', 'partial', 'skipped']),
    actualGrams: z.number().finite().min(0).max(5000).nullable(),
    extrasKcal: z.number().finite().min(0).max(5000).nullable(),
    note: z.string().trim().max(300),
  })
  .superRefine((value, context) => {
    if (value.status === 'skipped' && value.actualGrams !== 0) {
      context.addIssue({
        code: 'custom',
        path: ['actualGrams'],
        message: 'Skipped meals have 0 g',
      });
    }
    if (value.status !== 'skipped' && (!value.actualGrams || value.actualGrams <= 0)) {
      context.addIssue({ code: 'custom', path: ['actualGrams'], message: 'Enter the amount fed' });
    }
  });

export type FeedingLogInput = z.infer<typeof feedingLogInputSchema>;
export type FeedingLog = FeedingLogInput & {
  id: string;
  planId: string;
  recordedAt: string;
};
