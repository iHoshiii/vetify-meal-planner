import type {
  NutritionObservation,
  NutritionObservationInput,
} from '@vetify/planner-shared/nutrition-observations';
import { ObjectId, type Collection, type IndexDescription } from 'mongodb';

import { getDb } from '../config/db.js';

export const NUTRITION_OBSERVATIONS_COLLECTION = 'nutrition_observations';
export const NUTRITION_OBSERVATION_INDEXES: IndexDescription[] = [
  { key: { ownerId: 1, petId: 1, measuredOn: -1, createdAt: -1 } },
];

type ObservationDocument = Omit<NutritionObservationInput, 'petId'> & {
  _id: ObjectId;
  ownerId: string;
  petId: ObjectId;
  createdAt: Date;
};

function collection(): Collection<ObservationDocument> {
  return getDb().collection<ObservationDocument>(NUTRITION_OBSERVATIONS_COLLECTION);
}

function view(doc: ObservationDocument): NutritionObservation {
  const { _id, ownerId: _ownerId, petId, createdAt, ...fields } = doc;
  return {
    ...fields,
    id: _id.toHexString(),
    petId: petId.toHexString(),
    createdAt: createdAt.toISOString(),
  };
}

export async function listNutritionObservations(ownerId: string, petId: ObjectId) {
  const docs = await collection()
    .find({ ownerId, petId })
    .sort({ measuredOn: -1, createdAt: -1 })
    .limit(50)
    .toArray();
  return docs.map(view);
}

export async function createNutritionObservation(
  ownerId: string,
  input: NutritionObservationInput,
) {
  const { petId, ...fields } = input;
  const doc: ObservationDocument = {
    ...fields,
    _id: new ObjectId(),
    ownerId,
    petId: new ObjectId(petId),
    createdAt: new Date(),
  };
  await collection().insertOne(doc);
  return view(doc);
}
