import type { DailyDietAssessment, DietAssessmentInput } from '@vetify/planner-shared/daily-diet';
import { ObjectId, type Collection, type IndexDescription } from 'mongodb';
import { getDb } from '../config/db.js';

export const DIET_ASSESSMENTS_COLLECTION = 'diet_assessments';
export const DIET_ASSESSMENT_INDEXES: IndexDescription[] = [
  { key: { ownerId: 1, petId: 1 }, unique: true },
];

type AssessmentDocument = {
  _id: ObjectId;
  ownerId: string;
  petId: ObjectId;
  assessment: DailyDietAssessment;
  confirmedOn: string;
  timeZone: string;
  createdAt: Date;
  updatedAt: Date;
};

function collection(): Collection<AssessmentDocument> {
  return getDb().collection<AssessmentDocument>(DIET_ASSESSMENTS_COLLECTION);
}

function currentDateWithin30Days(date: string, today: string): boolean {
  const age = Date.parse(`${today}T00:00:00.000Z`) - Date.parse(`${date}T00:00:00.000Z`);
  return Number.isFinite(age) && age >= 0 && age <= 30 * 86400000;
}

export async function findCurrentDietAssessment(
  ownerId: string,
  petId: ObjectId,
  today: string,
): Promise<DailyDietAssessment | null> {
  const doc = await collection().findOne({ ownerId, petId });
  if (
    !doc ||
    !currentDateWithin30Days(doc.assessment.weightMeasuredOn, today) ||
    !currentDateWithin30Days(doc.confirmedOn, today)
  )
    return null;
  return doc.assessment;
}

export async function saveDietAssessment(
  ownerId: string,
  input: DietAssessmentInput,
  confirmedOn: string,
  timeZone: string,
): Promise<DailyDietAssessment> {
  const { petId, ...assessment } = input;
  const now = new Date();
  const filter = { ownerId, petId: new ObjectId(petId) };
  const changes = {
    $set: { assessment, confirmedOn, timeZone, updatedAt: now },
    $setOnInsert: { _id: new ObjectId(), ...filter, createdAt: now },
  };
  try {
    await collection().updateOne(filter, changes, { upsert: true });
  } catch (cause) {
    if ((cause as { code?: number }).code !== 11000) throw cause;
    // Simultaneous initial confirmations still produce one owned pet record.
    await collection().updateOne(filter, changes);
  }
  return assessment;
}
