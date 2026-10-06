import { parseArgs } from 'node:util';
import { MongoClient, type Db, type Document } from 'mongodb';
import type { Direction } from './codec.js';
import { migrate } from './engine.js';

function databaseIdentity(uri: string): string {
  const match = /^(mongodb(?:\+srv)?):\/\/(?:[^/@]+@)?([^/]+)\/([^?/#]+)(?:\?[^#]*)?$/.exec(uri);
  if (!match)
    throw new Error('Use explicit mongodb:// or mongodb+srv:// URIs with a database name');
  const hosts = match[2]
    .split(',')
    .map((host) =>
      host
        .toLowerCase()
        .replace(/^127\.0\.0\.1(?=:|$)/, 'localhost')
        .replace(/:27017$/, ''),
    )
    .sort();
  return `${hosts.join(',')}/${decodeURIComponent(match[3])}`;
}

export function migrationArguments(args: string[]): {
  sourceUri: string;
  targetUri: string;
  direction: Direction;
  apply: boolean;
  reconcile: boolean;
} {
  const { values } = parseArgs({
    args,
    options: {
      'source-uri': { type: 'string' },
      'target-uri': { type: 'string' },
      direction: { type: 'string', default: 'forward' },
      apply: { type: 'boolean', default: false },
      reconcile: { type: 'boolean', default: false },
    },
    strict: true,
  });
  if (!values['source-uri'] || !values['target-uri'])
    throw new Error('Both --source-uri and --target-uri are required');
  if (databaseIdentity(values['source-uri']) === databaseIdentity(values['target-uri']))
    throw new Error('Source and target must be separate database namespaces');
  if (values.direction !== 'forward' && values.direction !== 'reverse')
    throw new Error('--direction must be forward or reverse');
  if (values.reconcile && values.direction !== 'reverse')
    throw new Error('--reconcile is restricted to reverse rollback');
  return {
    sourceUri: values['source-uri'],
    targetUri: values['target-uri'],
    direction: values.direction,
    apply: values.apply,
    reconcile: values.reconcile,
  };
}

export async function assertDatabaseSeparation(source: Db, target: Db) {
  if (source.databaseName !== target.databaseName) return;
  const [sourceHello, targetHello] = await Promise.all([
    source.admin().command({ hello: 1 }),
    target.admin().command({ hello: 1 }),
  ]);
  const identity = (hello: Document) =>
    hello.setName && Array.isArray(hello.hosts)
      ? `${hello.setName}:${[...hello.hosts].sort().join(',')}`
      : hello.topologyVersion?.processId?.toHexString();
  const sourceIdentity = identity(sourceHello);
  const targetIdentity = identity(targetHello);
  if (!sourceIdentity || !targetIdentity)
    throw new Error('Source and target database separation cannot be verified');
  if (sourceIdentity === targetIdentity)
    throw new Error('Source and target resolve to the same database namespace');
}

export async function runMigration(args: string[]) {
  const options = migrationArguments(args);
  const settings = {
    promoteValues: false,
    promoteLongs: false,
    bsonRegExp: true,
    serverSelectionTimeoutMS: 10000,
  };
  const source = new MongoClient(options.sourceUri, settings);
  const target = new MongoClient(options.targetUri, settings);
  try {
    await Promise.all([source.connect(), target.connect()]);
    await assertDatabaseSeparation(source.db(), target.db());
    const report = await migrate(source.db(), target.db(), options);
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } finally {
    await Promise.allSettled([source.close(), target.close()]);
  }
}
