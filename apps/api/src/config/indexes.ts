import type { Db } from 'mongodb';
import { PETS_COLLECTION, PET_INDEXES } from '../models/pets.js';
import { SAVED_FOODS_COLLECTION, FOOD_INDEXES } from '../models/foods.js';
import { MEAL_PLANS_COLLECTION, MEAL_PLAN_INDEXES } from '../models/meal-plans.js';
import { FEEDING_LOGS_COLLECTION, FEEDING_LOG_INDEXES } from '../models/feeding-logs.js';
import { DIET_ENTRIES_COLLECTION, DIET_ENTRY_INDEXES } from '../models/diet-entries.js';
import {
  DIET_ASSESSMENTS_COLLECTION,
  DIET_ASSESSMENT_INDEXES,
} from '../models/diet-assessments.js';
import {
  DIET_TARGET_SNAPSHOTS_COLLECTION,
  DIET_TARGET_SNAPSHOT_INDEXES,
} from '../models/diet-target-snapshots.js';
import {
  NUTRITION_OBSERVATIONS_COLLECTION,
  NUTRITION_OBSERVATION_INDEXES,
} from '../models/nutrition-observations.js';

export async function ensureIndexes(db: Db) {
  const plan = [
    { collection: PETS_COLLECTION, indexes: PET_INDEXES },
    { collection: SAVED_FOODS_COLLECTION, indexes: FOOD_INDEXES },
    { collection: DIET_ENTRIES_COLLECTION, indexes: DIET_ENTRY_INDEXES },
    { collection: DIET_ASSESSMENTS_COLLECTION, indexes: DIET_ASSESSMENT_INDEXES },
    { collection: DIET_TARGET_SNAPSHOTS_COLLECTION, indexes: DIET_TARGET_SNAPSHOT_INDEXES },
    { collection: MEAL_PLANS_COLLECTION, indexes: MEAL_PLAN_INDEXES },
    { collection: FEEDING_LOGS_COLLECTION, indexes: FEEDING_LOG_INDEXES },
    { collection: NUTRITION_OBSERVATIONS_COLLECTION, indexes: NUTRITION_OBSERVATION_INDEXES },
  ];
  for (const item of plan) await db.collection(item.collection).createIndexes(item.indexes);
}
