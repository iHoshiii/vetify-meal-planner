import type { MealPlan, MealPlanInput, MealPlanPreview } from '@vetify/planner-shared/meal-plans';
import { ObjectId, type Collection, type IndexDescription } from 'mongodb';

import { getDb } from '../config/db.js';

export const MEAL_PLANS_COLLECTION = 'meal_plans';
export const MEAL_PLAN_INDEXES: IndexDescription[] = [
  { key: { ownerId: 1, petId: 1, version: -1 }, unique: true },
  { key: { ownerId: 1, requestId: 1 }, unique: true },
];

type PlanDocument = Omit<MealPlanInput, 'petId'> & {
  _id: ObjectId;
  ownerId: string;
  petId: ObjectId;
  petName: string;
  petWeightKg: number;
  preview: MealPlanPreview;
  version: number;
  timeZone: string;
  activeFrom: Date;
  endedAt: Date | null;
  createdAt: Date;
};

function collection(): Collection<PlanDocument> {
  return getDb().collection<PlanDocument>(MEAL_PLANS_COLLECTION);
}

function view(doc: PlanDocument): MealPlan {
  const { _id, ownerId, petId, activeFrom, endedAt, createdAt, ...fields } = doc;
  return {
    ...fields,
    id: _id.toHexString(),
    ownerId: ownerId,
    petId: petId.toHexString(),
    activeFrom: activeFrom.toISOString(),
    endedAt: endedAt?.toISOString() ?? null,
    createdAt: createdAt.toISOString(),
  };
}

export async function listMealPlans(ownerId: string, petId: ObjectId): Promise<MealPlan[]> {
  const docs = await collection().find({ ownerId, petId }).sort({ version: -1 }).toArray();
  return docs.map(view);
}

export async function findMealPlan(ownerId: string, id: ObjectId): Promise<MealPlan | null> {
  const doc = await collection().findOne({ _id: id, ownerId });
  return doc ? view(doc) : null;
}

export async function saveMealPlan(
  ownerId: string,
  petId: ObjectId,
  input: MealPlanInput,
  preview: MealPlanPreview,
  petName: string,
  petWeightKg: number,
  timeZone: string,
): Promise<MealPlan> {
  const previousRequest = await collection().findOne({ ownerId, requestId: input.requestId });
  if (previousRequest) return view(previousRequest);
  const now = new Date();
  const last = await collection().findOne({ ownerId, petId }, { sort: { version: -1 } });
  const { petId: _petId, ...fields } = input;
  const doc: PlanDocument = {
    ...fields,
    _id: new ObjectId(),
    ownerId,
    petId,
    petName,
    petWeightKg,
    preview,
    version: (last?.version ?? 0) + 1,
    timeZone,
    activeFrom: now,
    endedAt: null,
    createdAt: now,
  };
  try {
    await collection().insertOne(doc);
  } catch (cause) {
    if ((cause as { code?: number }).code === 11000) {
      const duplicate = await collection().findOne({ ownerId, requestId: input.requestId });
      if (duplicate) return view(duplicate);
    }
    throw cause;
  }
  if (last && !last.endedAt) {
    await collection().updateOne({ _id: last._id, ownerId }, { $set: { endedAt: now } });
  }
  return view(doc);
}
