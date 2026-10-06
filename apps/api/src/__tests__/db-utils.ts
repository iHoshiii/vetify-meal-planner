import { MongoMemoryServer } from 'mongodb-memory-server';
import { connectDb, disconnectDb, getDb } from '../config/db.js';
import { ensureIndexes } from '../config/indexes.js';
import { testConfig, principals } from './fixtures.js';

let mongo: MongoMemoryServer | undefined;
export async function startTestDb() {
  mongo = await MongoMemoryServer.create();
  testConfig.PLANNER_MONGODB_URI = mongo.getUri();
  await ensureIndexes(await connectDb(testConfig.PLANNER_MONGODB_URI));
}
export async function stopTestDb() {
  await disconnectDb();
  await mongo?.stop();
}
export async function clearTestDb() {
  const collections = await getDb().collections();
  await Promise.all(collections.map((collection) => collection.deleteMany({})));
  principals.clear();
}
