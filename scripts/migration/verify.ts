import { ObjectId, type Document } from 'mongodb';
import { collections, documentKey, ownerKey, type Snapshot } from './codec.js';

function date(value: unknown, field: string): number {
  if (!(value instanceof Date) || !Number.isFinite(value.getTime()))
    throw new Error(`Invalid BSON date: ${field}`);
  return value.getTime();
}

function day(value: unknown, field: string) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    throw new Error(`Invalid calendar day: ${field}`);
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value)
    throw new Error(`Invalid calendar day: ${field}`);
}

function unique(keys: Set<string>, key: string, field: string) {
  if (keys.has(key)) throw new Error(`Duplicate ${field}`);
  keys.add(key);
}

function reference(document: Document, field: string, targets: Map<string, Document>) {
  const id = document[field];
  if (!(id instanceof ObjectId)) throw new Error(`${field} must remain a BSON ObjectId`);
  const target = targets.get(id.toHexString());
  if (!target || ownerKey(target.ownerId) !== ownerKey(document.ownerId))
    throw new Error(`Dangling or cross-owner ${field} reference`);
}

function windows(plans: Document[]) {
  plans.sort((a, b) => Number(a.version) - Number(b.version));
  for (const [index, plan] of plans.entries()) {
    if (Number(plan.version) !== index + 1)
      throw new Error('Plan versions must form a contiguous sequence from 1');
    const start = date(plan.activeFrom, 'activeFrom');
    const end = plan.endedAt === null ? null : date(plan.endedAt, 'endedAt');
    if (end !== null && end < start)
      throw new Error('Plan activation window ends before it starts');
    const next = plans[index + 1];
    if (next && (end === null || end > date(next.activeFrom, 'activeFrom')))
      throw new Error('Plan activation windows overlap');
  }
}

export function verifySnapshot(snapshot: Snapshot, ownerFormat: 'object' | 'string') {
  for (const name of collections) {
    const ids = new Set<string>();
    for (const document of snapshot[name]) {
      unique(ids, documentKey(document), `${name} _id`);
      ownerKey(document.ownerId);
      if (
        ownerFormat === 'object'
          ? !(document.ownerId instanceof ObjectId)
          : typeof document.ownerId !== 'string'
      ) {
        throw new Error(`Unexpected ${name} ownerId representation`);
      }
      if ('createdAt' in document) date(document.createdAt, 'createdAt');
      if ('updatedAt' in document) date(document.updatedAt, 'updatedAt');
    }
  }
  const pets = new Map(snapshot.pets.map((document) => [documentKey(document), document]));
  const plans = new Map(snapshot.meal_plans.map((document) => [documentKey(document), document]));
  const versions = new Set<string>();
  const requests = new Set<string>();
  const groups = new Map<string, Document[]>();
  for (const plan of snapshot.meal_plans) {
    reference(plan, 'petId', pets);
    const group = `${ownerKey(plan.ownerId)}:${plan.petId.toHexString()}`;
    if (!Number.isSafeInteger(Number(plan.version)) || Number(plan.version) < 1)
      throw new Error('Invalid plan version');
    if (typeof plan.requestId !== 'string' || !plan.requestId)
      throw new Error('Missing plan requestId');
    unique(versions, `${group}:${Number(plan.version)}`, 'owner/pet/version');
    unique(requests, `${ownerKey(plan.ownerId)}:${plan.requestId}`, 'owner/requestId');
    if (typeof plan.timeZone !== 'string') throw new Error('Missing saved plan timezone');
    try {
      new Intl.DateTimeFormat('en', { timeZone: plan.timeZone }).format(new Date());
    } catch {
      throw new Error('Invalid saved plan timezone');
    }
    groups.set(group, [...(groups.get(group) ?? []), plan]);
  }
  for (const group of groups.values()) windows(group);
  const logs = new Set<string>();
  for (const log of snapshot.feeding_logs) {
    reference(log, 'planId', plans);
    day(log.date, 'feeding date');
    date(log.recordedAt, 'recordedAt');
    if (
      !Number.isSafeInteger(Number(log.mealIndex)) ||
      Number(log.mealIndex) < 0 ||
      Number(log.mealIndex) > 5
    )
      throw new Error('Invalid mealIndex');
    unique(
      logs,
      `${ownerKey(log.ownerId)}:${log.planId.toHexString()}:${log.date}:${Number(log.mealIndex)}`,
      'owner/plan/day/meal',
    );
  }
  for (const observation of snapshot.nutrition_observations) {
    reference(observation, 'petId', pets);
    day(observation.measuredOn, 'observation date');
  }
}
