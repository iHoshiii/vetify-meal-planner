import type { FeedingLog, MealPlan } from '@vetify/planner-shared/meal-plans';
import type { NutritionObservation } from '@vetify/planner-shared/nutrition-observations';
import { progressMonthDates } from '@vetify/planner-shared/monthly-progress';
import { ObjectId } from 'mongodb';
import { getDb } from '../config/db.js';
import { MEAL_PLANS_COLLECTION } from './meal-plans.js';
import { FEEDING_LOGS_COLLECTION } from './feeding-logs.js';
import { NUTRITION_OBSERVATIONS_COLLECTION } from './nutrition-observations.js';

type StoredPlan = Omit<MealPlan, 'id' | 'petId' | 'activeFrom' | 'endedAt' | 'createdAt'> & {
  _id: ObjectId;
  petId: ObjectId;
  activeFrom: Date;
  endedAt: Date | null;
  createdAt: Date;
};
type StoredLog = Omit<FeedingLog, 'id' | 'planId' | 'recordedAt'> & {
  _id: ObjectId;
  ownerId: string;
  planId: ObjectId;
  recordedAt: Date;
};
type StoredObservation = Omit<NutritionObservation, 'id' | 'petId' | 'createdAt'> & {
  _id: ObjectId;
  ownerId: string;
  petId: ObjectId;
  createdAt: Date;
};

export async function monthlyProgressRecords(
  ownerId: string,
  petId: ObjectId,
  month: string,
  today: string,
) {
  const dates = progressMonthDates(month);
  const first = dates[0]!;
  const last = dates.at(-1)!;
  // The one-day margin includes every civil-time zone; the shared summary applies exact calendar boundaries.
  const lower = new Date(`${first}T00:00:00.000Z`);
  lower.setUTCDate(lower.getUTCDate() - 1);
  const upper = new Date(`${last}T00:00:00.000Z`);
  upper.setUTCDate(upper.getUTCDate() + 2);
  const db = getDb();
  const planDocs = await db
    .collection<StoredPlan>(MEAL_PLANS_COLLECTION)
    .find({
      ownerId,
      petId,
      activeFrom: { $lt: upper },
      $or: [{ endedAt: null }, { endedAt: { $gte: lower } }],
    })
    .sort({ version: -1 })
    .toArray();
  const until = last < today ? last : today;
  const [logDocs, observationDocs] = await Promise.all([
    db
      .collection<StoredLog>(FEEDING_LOGS_COLLECTION)
      .find({
        ownerId,
        planId: { $in: planDocs.map((plan) => plan._id) },
        date: { $gte: first, $lte: until },
      })
      .sort({ date: 1, mealIndex: 1, recordedAt: 1 })
      .toArray(),
    db
      .collection<StoredObservation>(NUTRITION_OBSERVATIONS_COLLECTION)
      .find({
        ownerId,
        petId,
        measuredOn: { $gte: first, $lte: until },
      })
      .sort({ measuredOn: -1, createdAt: -1 })
      .toArray(),
  ]);
  const plans: MealPlan[] = planDocs.map(
    ({ _id, petId: storedPet, activeFrom, endedAt, createdAt, ...fields }) => ({
      ...fields,
      id: _id.toHexString(),
      petId: storedPet.toHexString(),
      activeFrom: activeFrom.toISOString(),
      endedAt: endedAt?.toISOString() ?? null,
      createdAt: createdAt.toISOString(),
    }),
  );
  const logs: FeedingLog[] = logDocs.map(
    ({ _id, ownerId: _owner, planId, recordedAt, ...fields }) => ({
      ...fields,
      id: _id.toHexString(),
      planId: planId.toHexString(),
      recordedAt: recordedAt.toISOString(),
    }),
  );
  const measurements: NutritionObservation[] = observationDocs.map(
    ({ _id, ownerId: _owner, petId: storedPet, createdAt, ...fields }) => ({
      ...fields,
      id: _id.toHexString(),
      petId: storedPet.toHexString(),
      createdAt: createdAt.toISOString(),
    }),
  );
  return { plans, logs, measurements };
}
