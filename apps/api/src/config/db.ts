import { MongoClient, TopologyType, type Db } from 'mongodb';
import { assertPlannerDatabaseAccess, assertPlannerNamespace } from './database-access.js';

let client: MongoClient | null = null;
let database: Db | null = null;
let connection: Promise<Db> | null = null;
let connectedUri: string | null = null;
let responding = false;

export function connectDb(uri: string): Promise<Db> {
  assertPlannerNamespace(uri);
  if (connection) {
    if (connectedUri !== uri) throw new Error('Cannot change database while connected');
    return connection;
  }
  connectedUri = uri;
  const candidate = new MongoClient(uri, { serverSelectionTimeoutMS: 10000, retryWrites: true });
  candidate.on('topologyDescriptionChanged', (event) => {
    const type = event.newDescription.type;
    responding = type !== TopologyType.Unknown && type !== TopologyType.ReplicaSetNoPrimary;
  });
  candidate.on('topologyClosed', () => {
    responding = false;
  });
  connection = candidate
    .connect()
    .then(async () => {
      await assertPlannerDatabaseAccess(candidate, uri);
      await candidate.db().command({ ping: 1 });
      client = candidate;
      database = candidate.db();
      responding = true;
      return database;
    })
    .catch(async (cause) => {
      await candidate.close().catch(() => undefined);
      connection = null;
      connectedUri = null;
      client = null;
      database = null;
      responding = false;
      throw cause;
    });
  return connection;
}

export function getDb(): Db {
  if (!database) throw new Error('Planner database is not connected');
  return database;
}

export function dbStatus() {
  return database ? (responding ? 'connected' : 'disconnected') : 'uninitialized';
}

export async function disconnectDb() {
  await connection?.catch(() => undefined);
  await client?.close();
  client = null;
  database = null;
  connection = null;
  connectedUri = null;
  responding = false;
}
