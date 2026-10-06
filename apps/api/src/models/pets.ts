import type { PetInput, Pet } from '@vetify/planner-shared/pets';
import { ageFromBirthMonth, petAge } from '@vetify/planner-shared/pet-age';
import { ObjectId, type Collection, type IndexDescription } from 'mongodb';

import { getDb } from '../config/db.js';

export const PETS_COLLECTION = 'pets';
export const PET_INDEXES: IndexDescription[] = [{ key: { ownerId: 1, createdAt: 1 } }];

type PetDocument = Omit<PetInput, 'ageYears' | 'ageMonths'> & {
  _id: ObjectId;
  ownerId: string;
  ageYearsAtReference: number;
  ageMonthsAtReference: number;
  registeredOn: string;
  ageReferenceOn: string;
  createdAt: Date;
  updatedAt: Date;
};

function collection(): Collection<PetDocument> {
  return getDb().collection<PetDocument>(PETS_COLLECTION);
}

function view(doc: PetDocument): Pet {
  const { _id, ownerId: _ownerId, createdAt, updatedAt, ...fields } = doc;
  return {
    ...fields,
    id: _id.toHexString(),
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
  };
}

export async function listPets(ownerId: string): Promise<Pet[]> {
  const docs = await collection().find({ ownerId }).sort({ createdAt: 1 }).toArray();
  return docs.map(view);
}

export async function findPet(ownerId: string, petId: ObjectId): Promise<Pet | null> {
  const doc = await collection().findOne({ _id: petId, ownerId });
  return doc ? view(doc) : null;
}

export async function createPet(
  ownerId: string,
  input: PetInput,
  registeredOn: string,
): Promise<Pet> {
  const now = new Date();
  const { ageYears, ageMonths, ...fields } = input;
  const initialAge = input.birthMonth
    ? ageFromBirthMonth(input.birthMonth, registeredOn)
    : { years: ageYears, months: ageMonths };
  const doc: PetDocument = {
    ...fields,
    ageYearsAtReference: initialAge.years,
    ageMonthsAtReference: initialAge.months,
    _id: new ObjectId(),
    ownerId,
    registeredOn,
    ageReferenceOn: registeredOn,
    createdAt: now,
    updatedAt: now,
  };
  await collection().insertOne(doc);
  return view(doc);
}

export async function updatePet(
  ownerId: string,
  id: ObjectId,
  input: PetInput,
  today: string,
): Promise<Pet | null> {
  const previous = await collection().findOne({ _id: id, ownerId });
  if (!previous) return null;
  const { ageYears, ageMonths, ...fields } = input;
  const currentAge = petAge(previous, today);
  const corrected =
    previous.birthMonth !== input.birthMonth ||
    currentAge.years !== ageYears ||
    currentAge.months !== ageMonths;
  const nextAge = input.birthMonth
    ? ageFromBirthMonth(input.birthMonth, today)
    : { years: ageYears, months: ageMonths };
  const doc = await collection().findOneAndUpdate(
    { _id: id, ownerId },
    {
      $set: {
        ...fields,
        ageYearsAtReference: corrected ? nextAge.years : previous.ageYearsAtReference,
        ageMonthsAtReference: corrected ? nextAge.months : previous.ageMonthsAtReference,
        ageReferenceOn: corrected ? today : previous.ageReferenceOn,
        updatedAt: new Date(),
      },
    },
    { returnDocument: 'after' },
  );
  return doc ? view(doc) : null;
}
