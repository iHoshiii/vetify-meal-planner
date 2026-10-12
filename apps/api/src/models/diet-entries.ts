import {
  portionNutrition,
  type DietEntry,
  type DietEntryInput,
} from '@vetify/planner-shared/daily-diet';
import type { FoodDetails, FoodLabel } from '@vetify/planner-shared/foods';
import { ObjectId, type Collection, type IndexDescription } from 'mongodb';
import { getDb } from '../config/db.js';
import { AppError } from '../utils/AppError.js';

export const DIET_ENTRIES_COLLECTION = 'diet_entries';
export const DIET_ENTRY_INDEXES: IndexDescription[] = [
  { key: { ownerId: 1, petId: 1, date: 1, createdAt: 1 } },
  { key: { ownerId: 1, requestId: 1 }, unique: true },
];

type DietEntryDocument = Omit<DietEntry, 'id' | 'petId' | 'createdAt'> & {
  _id: ObjectId;
  ownerId: string;
  petId: ObjectId;
  createdAt: Date;
};

function collection(): Collection<DietEntryDocument> {
  return getDb().collection<DietEntryDocument>(DIET_ENTRIES_COLLECTION);
}

function view(doc: DietEntryDocument): DietEntry {
  const { _id, ownerId: _ownerId, petId, createdAt, ...fields } = doc;
  return {
    ...fields,
    id: _id.toHexString(),
    petId: petId.toHexString(),
    createdAt: createdAt.toISOString(),
  };
}

export async function listDietEntries(
  ownerId: string,
  petId: ObjectId,
  date: string,
): Promise<DietEntry[]> {
  const docs = await collection().find({ ownerId, petId, date }).sort({ createdAt: 1 }).toArray();
  return docs.map(view);
}

export async function listDietEntriesInRange(
  ownerId: string,
  petId: ObjectId,
  first: string,
  last: string,
): Promise<DietEntry[]> {
  const docs = await collection()
    .find({ ownerId, petId, date: { $gte: first, $lte: last } })
    .sort({ date: 1, createdAt: 1 })
    .toArray();
  return docs.map(view);
}

export async function findDietEntry(ownerId: string, id: ObjectId): Promise<DietEntry | null> {
  const doc = await collection().findOne({ _id: id, ownerId });
  return doc ? view(doc) : null;
}

export async function findDietEntryRequest(
  ownerId: string,
  input: DietEntryInput,
): Promise<DietEntry | null> {
  const doc = await collection().findOne({ ownerId, requestId: input.requestId });
  if (!doc) return null;
  if (
    doc.petId.toHexString() !== new ObjectId(input.petId).toHexString() ||
    doc.date !== input.date ||
    doc.source !== input.source ||
    doc.foodId !== input.foodId ||
    doc.grams !== input.grams
  )
    throw new AppError(
      409,
      'This request was already used for a different diet entry.',
      'request-conflict',
    );
  return view(doc);
}

export async function createDietEntry(
  ownerId: string,
  input: DietEntryInput,
  food: FoodLabel,
  details: FoodDetails,
  timeZone: string,
): Promise<DietEntry> {
  const previous = await findDietEntryRequest(ownerId, input);
  if (previous) return previous;
  const doc: DietEntryDocument = {
    _id: new ObjectId(),
    ownerId,
    requestId: input.requestId,
    petId: new ObjectId(input.petId),
    date: input.date,
    timeZone,
    source: input.source,
    foodId: input.foodId,
    grams: input.grams,
    food,
    details,
    nutrition: portionNutrition(food, details, input.grams),
    createdAt: new Date(),
  };
  try {
    await collection().insertOne(doc);
  } catch (cause) {
    if ((cause as { code?: number }).code === 11000) {
      const duplicate = await findDietEntryRequest(ownerId, input);
      if (duplicate) return duplicate;
    }
    throw cause;
  }
  return view(doc);
}

export async function deleteDietEntry(
  ownerId: string,
  petId: ObjectId,
  id: ObjectId,
): Promise<boolean> {
  const result = await collection().deleteOne({ _id: id, ownerId, petId });
  return result.deletedCount === 1;
}
