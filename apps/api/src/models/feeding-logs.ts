import type { FeedingLog, FeedingLogInput } from '@vetify/planner-shared/meal-plans';
import { ObjectId, type Collection, type IndexDescription } from 'mongodb';

import { getDb } from '../config/db.js';

export const FEEDING_LOGS_COLLECTION = 'feeding_logs';
export const FEEDING_LOG_INDEXES: IndexDescription[] = [
  { key: { ownerId: 1, planId: 1, date: 1, mealIndex: 1 }, unique: true },
];

type LogDocument = FeedingLogInput & {
  _id: ObjectId;
  ownerId: string;
  planId: ObjectId;
  recordedAt: Date;
};

function collection(): Collection<LogDocument> {
  return getDb().collection<LogDocument>(FEEDING_LOGS_COLLECTION);
}

function view(doc: LogDocument): FeedingLog {
  const { _id, ownerId: _ownerId, planId, recordedAt, ...fields } = doc;
  return {
    ...fields,
    id: _id.toHexString(),
    planId: planId.toHexString(),
    recordedAt: recordedAt.toISOString(),
  };
}

export async function listFeedingLogs(ownerId: string, planId: ObjectId, date: string) {
  const docs = await collection().find({ ownerId, planId, date }).sort({ mealIndex: 1 }).toArray();
  return docs.map(view);
}

export async function saveFeedingLog(ownerId: string, planId: ObjectId, input: FeedingLogInput) {
  const doc = await collection().findOneAndUpdate(
    { ownerId, planId, date: input.date, mealIndex: input.mealIndex },
    {
      $set: { ...input, recordedAt: new Date() },
      $setOnInsert: { _id: new ObjectId(), ownerId, planId },
    },
    { upsert: true, returnDocument: 'after' },
  );
  if (!doc) throw new Error('Feeding log could not be saved');
  return view(doc);
}
