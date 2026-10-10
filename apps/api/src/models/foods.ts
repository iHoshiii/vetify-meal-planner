import type { FoodLabel, SavedFood } from '@vetify/planner-shared/foods';
import { ObjectId, type Collection, type IndexDescription } from 'mongodb';
import { getDb } from '../config/db.js';

export const SAVED_FOODS_COLLECTION = 'saved_foods';
export const FOOD_INDEXES: IndexDescription[] = [{ key: { ownerId: 1, petId: 1, updatedAt: -1 } }];

type SavedFoodDocument = {
  _id: ObjectId;
  ownerId: string;
  petId: ObjectId;
  food: FoodLabel;
  createdAt: Date;
  updatedAt: Date;
};

function collection(): Collection<SavedFoodDocument> {
  return getDb().collection<SavedFoodDocument>(SAVED_FOODS_COLLECTION);
}

function view(doc: SavedFoodDocument): SavedFood {
  return {
    id: doc._id.toHexString(),
    petId: doc.petId.toHexString(),
    food: doc.food,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export async function listSavedFoods(ownerId: string, petId: ObjectId): Promise<SavedFood[]> {
  const docs = await collection().find({ ownerId, petId }).sort({ updatedAt: -1 }).toArray();
  return docs.map(view);
}

export async function findSavedFood(ownerId: string, id: ObjectId): Promise<SavedFood | null> {
  const doc = await collection().findOne({ _id: id, ownerId });
  return doc ? view(doc) : null;
}

export async function createSavedFood(
  ownerId: string,
  petId: ObjectId,
  food: FoodLabel,
): Promise<SavedFood> {
  const now = new Date();
  const doc: SavedFoodDocument = {
    _id: new ObjectId(),
    ownerId,
    petId,
    food,
    createdAt: now,
    updatedAt: now,
  };
  await collection().insertOne(doc);
  return view(doc);
}

export async function updateSavedFood(
  ownerId: string,
  petId: ObjectId,
  id: ObjectId,
  food: FoodLabel,
): Promise<SavedFood | null> {
  const doc = await collection().findOneAndUpdate(
    { _id: id, ownerId, petId },
    { $set: { food, updatedAt: new Date() } },
    { returnDocument: 'after' },
  );
  return doc ? view(doc) : null;
}

export async function deleteSavedFood(
  ownerId: string,
  petId: ObjectId,
  id: ObjectId,
): Promise<boolean> {
  const result = await collection().deleteOne({ _id: id, ownerId, petId });
  return result.deletedCount === 1;
}
