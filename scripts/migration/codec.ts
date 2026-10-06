import { createHash } from 'node:crypto';
import { BSON, ObjectId, type Document } from 'mongodb';

export const collections = [
  'pets',
  'meal_plans',
  'feeding_logs',
  'nutrition_observations',
] as const;
export type CollectionName = (typeof collections)[number];
export type Snapshot = Record<CollectionName, Document[]>;
export type Direction = 'forward' | 'reverse';

export function ownerKey(ownerId: unknown): string {
  if (ownerId instanceof ObjectId) return ownerId.toHexString();
  if (typeof ownerId === 'string' && /^[a-f\d]{24}$/.test(ownerId)) return ownerId;
  throw new Error('ownerId must be an ObjectId or lowercase 24-character hexadecimal main ID');
}

export function documentKey(document: Document): string {
  if (!(document._id instanceof ObjectId))
    throw new Error('Planner _id must remain a BSON ObjectId');
  return document._id.toHexString();
}

export function convertOwner(document: Document, direction: Direction): Document {
  const expected =
    direction === 'forward'
      ? document.ownerId instanceof ObjectId
      : typeof document.ownerId === 'string';
  if (!expected) throw new Error(`Unexpected source ownerId representation for ${direction}`);
  const key = ownerKey(document.ownerId);
  return { ...document, ownerId: direction === 'forward' ? key : new ObjectId(key) };
}

function sorted(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sorted);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([key, item]) => [key, sorted(item)]),
    );
  }
  return value;
}

export function hashDocument(document: Document, normalizeOwner = true): string {
  const normalized = normalizeOwner
    ? { ...document, ownerId: ownerKey(document.ownerId) }
    : document;
  const canonical = sorted(BSON.EJSON.serialize(normalized, { relaxed: false }));
  return createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
}

export function snapshotSummary(snapshot: Snapshot) {
  return Object.fromEntries(
    collections.map((name) => {
      const records = snapshot[name].map((document) => ({
        owner: ownerKey(document.ownerId),
        hash: hashDocument(document),
      }));
      const owners: Record<string, number> = {};
      for (const record of records) owners[record.owner] = (owners[record.owner] ?? 0) + 1;
      const hash = createHash('sha256')
        .update(
          records
            .map((record) => record.hash)
            .sort()
            .join('\n'),
        )
        .digest('hex');
      return [
        name,
        { count: records.length, owners: Object.fromEntries(Object.entries(owners).sort()), hash },
      ];
    }),
  );
}
