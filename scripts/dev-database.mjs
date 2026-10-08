import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { MongoClient } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';

export async function startLocalDatabase() {
  if (process.env.NODE_ENV === 'production')
    throw new Error('Local development Mongo cannot run in production');

  const uri = 'mongodb://127.0.0.1:27018/vetify_meal_planner';
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 1000 });
  let running = false;
  try {
    await client.db().command({ ping: 1 });
    running = true;
  } catch {
    running = false;
  } finally {
    await client.close();
  }
  if (running) {
    console.log(`[db] Using the database already running at ${uri}`);
    return;
  }

  const dbPath = path.resolve('.local-data/mongo');
  await mkdir(dbPath, { recursive: true });
  const database = await MongoMemoryServer.create({
    instance: {
      ip: '127.0.0.1',
      port: 27018,
      portGeneration: false,
      dbPath,
      storageEngine: 'wiredTiger',
    },
  });
  console.log(`[db] Planner development Mongo: ${uri}`);
  console.log(`[db] Data persists in ${dbPath}`);
  return database;
}
