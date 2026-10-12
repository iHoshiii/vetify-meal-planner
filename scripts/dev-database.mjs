import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { MongoClient } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';

export async function startLocalDatabase(onFailure = () => {}) {
  if (process.env.NODE_ENV === 'production')
    throw new Error('Local development Mongo cannot run in production');

  const uri = 'mongodb://127.0.0.1:27018/vetify_meal_planner';
  const options = { serverSelectionTimeoutMS: 1000, connectTimeoutMS: 1000, timeoutMS: 1500 };
  let client = new MongoClient(uri, options);
  let database;
  let running = false;
  try {
    await client.db().command({ ping: 1 });
    running = true;
  } catch {
    running = false;
  }
  if (!running) {
    await client.close();
    const dbPath = path.resolve('.local-data/mongo');
    await mkdir(dbPath, { recursive: true });
    database = await MongoMemoryServer.create({
      instance: {
        ip: '127.0.0.1',
        port: 27018,
        portGeneration: false,
        dbPath,
        storageEngine: 'wiredTiger',
      },
      spawn: { windowsHide: true },
    });
    client = new MongoClient(uri, options);
    console.log(`[db] Planner development Mongo: ${uri}`);
    console.log(`[db] Data persists in ${dbPath}`);
  } else console.log(`[db] Using the database already running at ${uri}`);

  const instance = database?.instanceInfo?.instance;
  let stopping = false;
  let ready = false;
  let failure;
  let checking = false;
  let missedPings = 0;
  let monitor;
  function fail(detail) {
    if (stopping || failure) return;
    failure = new Error(
      `Planner development Mongo on 127.0.0.1:27018 ${detail}. Restart the local stack. Saved data is retained.`,
    );
    if (ready) onFailure(failure);
  }
  const closed = (code, signal) =>
    fail(`stopped (exit ${code ?? 'unknown'}${signal ? `, signal ${signal}` : ''})`);
  const errored = () => fail('reported an instance error');
  instance?.once('instanceClosed', closed);
  instance?.once('instanceError', errored);

  async function stop() {
    if (stopping) return;
    stopping = true;
    clearInterval(monitor);
    instance?.removeListener('instanceClosed', closed);
    instance?.removeListener('instanceError', errored);
    try {
      await client.close();
    } finally {
      await database?.stop({ doCleanup: false });
    }
  }

  try {
    await client.db().command({ ping: 1 });
    if (failure) throw failure;
  } catch {
    await stop();
    throw failure ?? new Error('Planner development Mongo did not stay ready on 127.0.0.1:27018.');
  }
  ready = true;
  monitor = setInterval(async () => {
    if (checking || stopping) return;
    checking = true;
    try {
      await client.db().command({ ping: 1 });
      missedPings = 0;
    } catch {
      if (++missedPings >= 2) fail('is no longer reachable');
    } finally {
      checking = false;
    }
  }, 2000);
  monitor.unref();
  return { stop };
}
