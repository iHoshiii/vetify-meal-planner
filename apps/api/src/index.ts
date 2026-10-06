import app from './app.js';
import { connectDb, disconnectDb } from './config/db.js';
import { loadConfig } from './config/env.js';
import { ensureIndexes } from './config/indexes.js';

const config = loadConfig();
await ensureIndexes(await connectDb(config.PLANNER_MONGODB_URI));
const server = app.listen(config.PORT, '127.0.0.1', () => {
  console.log(`Planner API listening at http://localhost:${config.PORT}`);
});
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => {
    server.close(() => void disconnectDb().then(() => process.exit(0)));
    setTimeout(() => process.exit(1), 10000).unref();
  });
}
