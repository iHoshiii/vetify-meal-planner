import { loadConfig } from './config/env.js';
import { connectDb, disconnectDb } from './config/db.js';
import { ensureIndexes } from './config/indexes.js';

try {
  await ensureIndexes(await connectDb(loadConfig().PLANNER_MONGODB_URI));
  console.log('Planner indexes are ready');
} finally {
  await disconnectDb();
}
