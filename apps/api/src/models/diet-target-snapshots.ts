import {
  estimateDailyDietTargets,
  type DailyDietAssessment,
  type DailyDietTargets,
} from '@vetify/planner-shared/daily-diet';
import type { DietTargetSnapshot } from '@vetify/planner-shared/diet-target-snapshots';
import type { Pet } from '@vetify/planner-shared/pets';
import { ObjectId, type IndexDescription } from 'mongodb';
import { getDb } from '../config/db.js';
import { dietPetContext } from './diet-assessment-context.js';

export const DIET_TARGET_SNAPSHOTS_COLLECTION = 'diet_target_snapshots';
export const DIET_TARGET_SNAPSHOT_INDEXES: IndexDescription[] = [
  { key: { ownerId: 1, petId: 1, validFrom: 1, validThrough: 1, recordedAt: -1 } },
  {
    key: { ownerId: 1, sourcePlanId: 1 },
    unique: true,
    partialFilterExpression: { sourcePlanId: { $exists: true } },
  },
];

type TargetRevisionDocument = {
  _id: ObjectId;
  ownerId: string;
  petId: ObjectId;
  pet: Pet;
  petContext: string;
  assessment: DailyDietAssessment | null;
  timeZone: string;
  validFrom: string;
  validThrough: string;
  recordedAt: Date;
  sourcePlanId?: string;
  days: { date: string; targets: DailyDietTargets }[];
};

function calendarOffset(date: string, days: number): string {
  const value = new Date(`${date}T12:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

/**
 * One atomic, immutable revision. Future dates are frozen projections only;
 * monthly progress reads no dates beyond today and never backfills earlier days.
 */
export async function captureDietTargetSnapshots(
  ownerId: string,
  pet: Pet,
  confirmedOn: string,
  timeZone: string,
  assessment: DailyDietAssessment | null,
  source?: { planId: string; recordedAt: string },
): Promise<void> {
  const collection = getDb().collection<TargetRevisionDocument>(DIET_TARGET_SNAPSHOTS_COLLECTION);
  if (source && (await collection.findOne({ ownerId, sourcePlanId: source.planId }))) return;
  const confirmationExpiry = calendarOffset(confirmedOn, 30);
  const weightExpiry = assessment
    ? calendarOffset(assessment.weightMeasuredOn, 30)
    : confirmationExpiry;
  const validThrough =
    weightExpiry < confirmedOn
      ? confirmedOn
      : weightExpiry < confirmationExpiry
        ? weightExpiry
        : confirmationExpiry;
  const days: TargetRevisionDocument['days'] = [];
  for (let date = confirmedOn; date <= validThrough; date = calendarOffset(date, 1)) {
    const targets = estimateDailyDietTargets(pet, date, assessment);
    days.push({ date, targets });
  }
  const doc: TargetRevisionDocument = {
    _id: new ObjectId(),
    ownerId,
    petId: new ObjectId(pet.id),
    pet,
    petContext: dietPetContext(pet),
    assessment,
    timeZone,
    validFrom: confirmedOn,
    validThrough,
    recordedAt: source ? new Date(source.recordedAt) : new Date(),
    ...(source ? { sourcePlanId: source.planId } : {}),
    days,
  };
  try {
    await collection.insertOne(doc);
  } catch (cause) {
    if (source && (cause as { code?: number }).code === 11000) return;
    throw cause;
  }
}

/** Cat live assessments and their frozen references share one authoritative write. */
export async function findCurrentCatDietAssessment(
  ownerId: string,
  pet: Pet,
  today: string,
  timeZone?: string,
): Promise<DailyDietAssessment | null> {
  const doc = await getDb()
    .collection<TargetRevisionDocument>(DIET_TARGET_SNAPSHOTS_COLLECTION)
    .findOne(
      { ownerId, petId: new ObjectId(pet.id), validFrom: { $lte: today } },
      { sort: { recordedAt: -1, _id: -1 } },
    );
  if (
    !doc ||
    !doc.assessment ||
    doc.validThrough < today ||
    doc.petContext !== dietPetContext(pet) ||
    (timeZone !== undefined && doc.timeZone !== timeZone)
  )
    return null;
  return doc.assessment;
}

export async function listDietTargetSnapshots(
  ownerId: string,
  petId: ObjectId,
  first: string,
  last: string,
): Promise<DietTargetSnapshot[]> {
  if (last < first) return [];
  const docs = await getDb()
    .collection<TargetRevisionDocument>(DIET_TARGET_SNAPSHOTS_COLLECTION)
    .find({ ownerId, petId, validFrom: { $lte: last } })
    .sort({ recordedAt: -1, _id: -1 })
    .toArray();
  const snapshots: DietTargetSnapshot[] = [];
  for (let date = first; date <= last; date = calendarOffset(date, 1)) {
    // Choose the newest applicable write BEFORE checking its coverage. An
    // expired replacement cannot restore an older projection, and timezone
    // changes cannot make an older civil-date revision take precedence.
    const doc = docs.find((candidate) => candidate.validFrom <= date);
    const day = doc?.days.find((candidate) => candidate.date === date);
    const captured = day?.targets ?? doc?.days.at(-1)?.targets;
    if (doc && captured)
      snapshots.push({
        revisionId: doc._id.toHexString(),
        petId: doc.petId.toHexString(),
        date,
        timeZone: doc.timeZone,
        validFrom: doc.validFrom,
        validThrough: doc.validThrough,
        recordedAt: doc.recordedAt.toISOString(),
        expired: !day,
        targets: captured,
      });
  }
  return snapshots;
}
