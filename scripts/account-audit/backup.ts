import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { BSON, type Db, type Document, type IndexDescription } from 'mongodb';

type BackupCollection = {
  name: string;
  type: string;
  options: Document;
  indexes: Document[];
  file: string | null;
  count: number;
  sha256: string | null;
};
type Manifest = {
  version: 1;
  database: string;
  startedAt: string;
  completedAt: string;
  consistency: string;
  collections: BackupCollection[];
};
async function digestFile(file: string) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
}
export async function* readBackupDocuments(file: string) {
  let pending = Buffer.alloc(0);
  for await (const chunk of createReadStream(file)) {
    pending = Buffer.concat([pending, chunk]);
    while (pending.length >= 4) {
      const length = pending.readInt32LE(0);
      if (length < 5 || length > 16 * 1024 * 1024) throw new Error('Invalid BSON backup length');
      if (pending.length < length) break;
      yield BSON.deserialize(pending.subarray(0, length), {
        promoteValues: false,
        promoteLongs: false,
        bsonRegExp: true,
      });
      pending = pending.subarray(length);
    }
  }
  if (pending.length) throw new Error('Truncated BSON backup');
}
export async function backupDatabase(db: Db, directory: string) {
  await mkdir(directory, { recursive: false });
  const manifest: Manifest = {
    version: 1,
    database: db.databaseName,
    startedAt: new Date().toISOString(),
    completedAt: '',
    consistency: 'Per-collection capture. Freeze writers and repeat before a production migration.',
    collections: [],
  };
  for (const info of await db.listCollections({}, { nameOnly: false }).toArray()) {
    const file = info.type === 'view' ? null : `${manifest.collections.length}.bson`;
    const item: BackupCollection = {
      name: info.name,
      type: info.type ?? 'collection',
      options: info.options ?? {},
      indexes: info.type === 'view' ? [] : await db.collection(info.name).listIndexes().toArray(),
      file,
      count: 0,
      sha256: null,
    };
    if (file) {
      async function* documents() {
        const cursor = db
          .collection(info.name)
          .find({}, { promoteValues: false, promoteLongs: false, bsonRegExp: true });
        for await (const document of cursor) {
          item.count++;
          yield BSON.serialize(document);
        }
      }
      await pipeline(
        documents(),
        createWriteStream(path.join(directory, file), { flags: 'wx', mode: 0o600 }),
      );
      item.sha256 = await digestFile(path.join(directory, file));
    }
    manifest.collections.push(item);
  }
  manifest.completedAt = new Date().toISOString();
  await writeFile(
    path.join(directory, 'manifest.ejson'),
    BSON.EJSON.stringify(manifest, { relaxed: false }),
    { flag: 'wx', mode: 0o600 },
  );
  await verifyBackup(directory);
  return manifest;
}
export async function verifyBackup(directory: string): Promise<Manifest> {
  const manifest = BSON.EJSON.parse(
    await readFile(path.join(directory, 'manifest.ejson'), 'utf8'),
  ) as Manifest;
  if (manifest.version !== 1 || !manifest.completedAt || !Array.isArray(manifest.collections))
    throw new Error('Incomplete backup manifest');
  for (const item of manifest.collections) {
    if (!item.file) continue;
    if (!/^\d+\.bson$/.test(item.file)) throw new Error('Invalid backup filename');
    const file = path.join(directory, item.file);
    if ((await digestFile(file)) !== item.sha256) throw new Error('Backup checksum mismatch');
    let count = 0;
    for await (const _document of readBackupDocuments(file)) {
      void _document;
      count++;
    }
    if (count !== item.count) throw new Error('Backup record count mismatch');
  }
  return manifest;
}
export async function restoreBackupIntoEmptyDatabase(db: Db, directory: string) {
  const manifest = await verifyBackup(directory);
  if ((await db.listCollections().toArray()).length)
    throw new Error('Restore requires an empty isolated database');
  for (const item of [...manifest.collections].sort(
    (a, b) => Number(a.type === 'view') - Number(b.type === 'view'),
  )) {
    await db.createCollection(item.name, item.options);
    if (!item.file) continue;
    const collection = db.collection(item.name);
    for await (const document of readBackupDocuments(path.join(directory, item.file)))
      await collection.insertOne(document);
    const indexes = item.indexes
      .filter((index) => index.name !== '_id_')
      .map((index) => {
        const { v: _v, ns: _ns, ...options } = index;
        void _v;
        void _ns;
        return options as IndexDescription;
      });
    if (indexes.length) await collection.createIndexes(indexes);
  }
  return manifest;
}
