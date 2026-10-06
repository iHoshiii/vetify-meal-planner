import {
  Binary,
  Decimal128,
  Long,
  ObjectId,
  Timestamp,
  type Document,
  type IndexDescription,
} from 'mongodb';
import { collections, type Snapshot } from './codec.js';
import type { MigrationDatabase } from './engine.js';

export const id = (suffix: number) => new ObjectId(suffix.toString(16).padStart(24, '0'));
export const at = (day: number) =>
  new Date(`2026-10-${String(day).padStart(2, '0')}T08:00:00.000Z`);

export function fixture(): Snapshot {
  const ownerId = id(1);
  const otherOwner = id(2);
  return {
    pets: [
      {
        _id: id(10),
        ownerId,
        name: 'Miso',
        weightKg: 8,
        createdAt: at(1),
        updatedAt: at(1),
        ageYearsAtReference: 3,
        ageMonthsAtReference: 1,
        ageReferenceOn: '2026-10-01',
        bodyConditionScore: 10,
        preserved: {
          amount: Decimal128.fromString('1.2500'),
          long: Long.fromString('9007199254740993'),
          binary: new Binary(Buffer.from([1, 2, 3]), 128),
          timestamp: new Timestamp({ t: 20, i: 2 }),
        },
      },
      { _id: id(11), ownerId: otherOwner, name: 'Nori', createdAt: at(1), updatedAt: at(1) },
    ],
    meal_plans: [
      {
        _id: id(20),
        ownerId,
        petId: id(10),
        version: 1,
        requestId: 'request-owner-a-001',
        timeZone: 'Asia/Manila',
        activeFrom: at(1),
        endedAt: null,
        createdAt: at(1),
        preview: { dailyGrams: 100 },
        petName: 'Miso',
        conditionScore: 9,
      },
      {
        _id: id(21),
        ownerId: otherOwner,
        petId: id(11),
        version: 1,
        requestId: 'request-owner-b-001',
        timeZone: 'Asia/Singapore',
        activeFrom: at(1),
        endedAt: null,
        createdAt: at(1),
      },
    ],
    feeding_logs: [
      {
        _id: id(30),
        ownerId,
        planId: id(20),
        date: '2026-10-01',
        mealIndex: 0,
        actualGrams: 50,
        extrasKcal: 4,
        recordedAt: at(1),
      },
    ],
    nutrition_observations: [
      {
        _id: id(40),
        ownerId,
        petId: id(10),
        measuredOn: '2026-10-01',
        weightKg: 8,
        conditionScore: 9,
        createdAt: at(1),
      },
    ],
  };
}

export class MemoryDatabase implements MigrationDatabase {
  readonly records: Snapshot;
  writes = 0;
  indexWrites = 0;

  constructor(records?: Snapshot) {
    this.records = records ?? {
      pets: [],
      meal_plans: [],
      feeding_logs: [],
      nutrition_observations: [],
    };
  }

  collection(name: string) {
    if (!collections.includes(name as (typeof collections)[number]))
      throw new Error('Unexpected collection access');
    const documents = this.records[name as keyof Snapshot];
    return {
      find: () => ({ toArray: async () => [...documents] }),
      createIndexes: async (_indexes: IndexDescription[]) => {
        this.indexWrites += 1;
      },
      insertOne: async (document: Document) => {
        documents.push(document);
        this.writes += 1;
      },
      replaceOne: async (filter: Document, document: Document) => {
        const index = documents.findIndex((candidate) => candidate._id.equals(filter._id));
        if (index < 0) throw new Error('Missing replacement record');
        documents[index] = document;
        this.writes += 1;
      },
    };
  }
}
