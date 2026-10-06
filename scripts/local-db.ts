import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { MongoMemoryServer } from 'mongodb-memory-server';

if (process.env.NODE_ENV === 'production')
  throw new Error('Local development Mongo cannot run in production');
const databasePath = path.resolve('.local-data/mongo');
await mkdir(databasePath, { recursive: true });
const database = await MongoMemoryServer.create({
  instance: { ip: '127.0.0.1', port: 27018, dbPath: databasePath, storageEngine: 'wiredTiger' },
});
console.log('Planner development Mongo: mongodb://127.0.0.1:27018/vetify_meal_planner');
console.log(`Data persists in ${databasePath}. Keep this terminal running.`);
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => void database.stop({ doCleanup: false }).then(() => process.exit(0)));
}
