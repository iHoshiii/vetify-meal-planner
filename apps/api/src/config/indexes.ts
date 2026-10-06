import type { Db } from 'mongodb';
import { PETS_COLLECTION, PET_INDEXES } from '../models/pets.js';
import { MEAL_PLANS_COLLECTION, MEAL_PLAN_INDEXES } from '../models/meal-plans.js';
import { FEEDING_LOGS_COLLECTION, FEEDING_LOG_INDEXES } from '../models/feeding-logs.js';
import {
  NUTRITION_OBSERVATIONS_COLLECTION,
  NUTRITION_OBSERVATION_INDEXES,
} from '../models/nutrition-observations.js';

export async function ensureIndexes(db: Db) {
  const plan = [
    { collection: PETS_COLLECTION, indexes: PET_INDEXES },
    { collection: MEAL_PLANS_COLLECTION, indexes: MEAL_PLAN_INDEXES },
    { collection: FEEDING_LOGS_COLLECTION, indexes: FEEDING_LOG_INDEXES },
    { collection: NUTRITION_OBSERVATIONS_COLLECTION, indexes: NUTRITION_OBSERVATION_INDEXES },
  ];
  for (const item of plan) await db.collection(item.collection).createIndexes(item.indexes);
}
