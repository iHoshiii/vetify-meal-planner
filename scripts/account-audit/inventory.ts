import { ObjectId, type Db, type Document } from 'mongodb';

export const plannerCollections = [
  'pets',
  'meal_plans',
  'feeding_logs',
  'nutrition_observations',
  'saved_foods',
  'diet_entries',
  'diet_assessments',
  'diet_target_snapshots',
] as const;
export const referenceFields = ['ownerId', 'user', 'userId', 'user_id'] as const;
export function accountId(value: unknown): string | null {
  return value instanceof ObjectId
    ? value.toHexString()
    : typeof value === 'string' && value.length > 0 && value.length <= 128
      ? value
      : null;
}
export function classifyDocument(name: string, document: Document) {
  const fields = Object.keys(document);
  const credentialEvidence = fields.some((field) =>
    /^(password|passwordHash|refreshToken|tokenHash|codeHash|providerId|identities)$/.test(field),
  );
  const plannerEvidence =
    (plannerCollections as readonly string[]).includes(name) &&
    accountId(document.ownerId) !== null &&
    (name === 'pets'
      ? typeof document.name === 'string'
      : name === 'feeding_logs'
        ? document.planId instanceof ObjectId
        : document.petId instanceof ObjectId);
  return credentialEvidence
    ? 'authentication-review'
    : plannerEvidence
      ? 'planner-preserve'
      : 'unknown-review';
}
export async function inventoryDatabase(db: Db) {
  const collections = [];
  const identities = new Map<
    string,
    { oldId: string; collections: Set<string>; roles: Set<string> }
  >();
  for (const info of await db.listCollections({}, { nameOnly: false }).toArray()) {
    const collection = db.collection(info.name);
    const fields = new Map<string, number>();
    const classification: Record<string, number> = {};
    let count = 0;
    if (info.type !== 'view')
      for await (const document of collection.find({})) {
        count++;
        for (const field of Object.keys(document)) fields.set(field, (fields.get(field) ?? 0) + 1);
        const kind = classifyDocument(info.name, document);
        classification[kind] = (classification[kind] ?? 0) + 1;
        const candidates = referenceFields.map((field) => accountId(document[field]));
        if (kind === 'authentication-review') candidates.push(accountId(document._id));
        for (const oldId of candidates) {
          if (!oldId) continue;
          const identity = identities.get(oldId) ?? {
            oldId,
            collections: new Set<string>(),
            roles: new Set<string>(),
          };
          identity.collections.add(info.name);
          if (kind === 'authentication-review' && typeof document.role === 'string')
            identity.roles.add(document.role);
          identities.set(oldId, identity);
        }
      }
    const indexes = info.type === 'view' ? [] : await collection.listIndexes().toArray();
    collections.push({
      name: info.name,
      type: info.type,
      count,
      fields: Object.fromEntries(fields),
      classification,
      indexes,
      options: info.options,
    });
  }
  return {
    database: db.databaseName,
    recordedAt: new Date().toISOString(),
    collections,
    identities: [...identities.values()].map((identity) => ({
      ...identity,
      collections: [...identity.collections].sort(),
      roles: [...identity.roles].sort(),
    })),
    cleanup: {
      proposedDeletes: [],
      decision: 'Preserve all records until provenance and identity review are approved.',
    },
  };
}
