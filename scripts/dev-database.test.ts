import { EventEmitter } from 'node:events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  ping: vi.fn(),
  close: vi.fn(),
  create: vi.fn(),
  mkdir: vi.fn(),
}));
vi.mock('node:fs/promises', () => ({ mkdir: mocks.mkdir }));
vi.mock('mongodb', () => ({
  MongoClient: class {
    db() {
      return { command: mocks.ping };
    }
    close() {
      return mocks.close();
    }
  },
}));
vi.mock('mongodb-memory-server', () => ({ MongoMemoryServer: { create: mocks.create } }));
const modulePath = './dev-database.mjs';
const { startLocalDatabase } = await import(modulePath);
let stop: (() => Promise<void>) | undefined;

beforeEach(() => {
  vi.useFakeTimers();
  mocks.ping.mockReset().mockResolvedValue({ ok: 1 });
  mocks.close.mockReset().mockResolvedValue(undefined);
  mocks.create.mockReset();
  mocks.mkdir.mockReset().mockResolvedValue(undefined);
  vi.spyOn(console, 'log').mockImplementation(() => {});
});
afterEach(async () => {
  await stop?.();
  stop = undefined;
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function ownedDatabase() {
  const instance = new EventEmitter();
  const database = { instanceInfo: { instance }, stop: vi.fn().mockResolvedValue(undefined) };
  mocks.create.mockResolvedValue(database);
  mocks.ping.mockRejectedValueOnce(new Error('not running'));
  return { database, instance };
}

describe('Local planner database lifecycle', () => {
  it('monitors a reused database without taking ownership of its process', async () => {
    const onFailure = vi.fn();
    ({ stop } = await startLocalDatabase(onFailure));
    expect(mocks.create).not.toHaveBeenCalled();
    mocks.ping
      .mockRejectedValueOnce(new Error('closed'))
      .mockRejectedValueOnce(new Error('closed'));
    await vi.advanceTimersByTimeAsync(4000);
    expect(onFailure).toHaveBeenCalledOnce();
    expect(onFailure.mock.calls[0][0].message).toContain('no longer reachable');
    await stop!();
    expect(mocks.close).toHaveBeenCalledOnce();
  });

  it('allows a temporary slow ping to recover without stopping the stack', async () => {
    const onFailure = vi.fn();
    ({ stop } = await startLocalDatabase(onFailure));
    mocks.ping.mockRejectedValueOnce(new Error('temporary timeout'));
    await vi.advanceTimersByTimeAsync(6000);
    expect(onFailure).not.toHaveBeenCalled();
  });

  it('reports a lost owned process once and preserves its data during cleanup', async () => {
    const { database, instance } = ownedDatabase();
    const onFailure = vi.fn();
    ({ stop } = await startLocalDatabase(onFailure));
    instance.emit('instanceClosed', 12, null);
    instance.emit('instanceError', new Error('private details'));
    expect(onFailure).toHaveBeenCalledOnce();
    expect(onFailure.mock.calls[0][0].message).toContain('exit 12');
    expect(onFailure.mock.calls[0][0].message).not.toContain('private details');
    await stop!();
    expect(database.stop).toHaveBeenCalledWith({ doCleanup: false });
    instance.emit('instanceClosed', 0, null);
    await vi.advanceTimersByTimeAsync(4000);
    expect(onFailure).toHaveBeenCalledOnce();
  });

  it('cleans up an owned database that dies immediately after launch', async () => {
    const { database } = ownedDatabase();
    mocks.ping.mockRejectedValueOnce(new Error('startup succeeded but listener died'));
    await expect(startLocalDatabase()).rejects.toThrow('did not stay ready');
    expect(database.stop).toHaveBeenCalledWith({ doCleanup: false });
  });
});
