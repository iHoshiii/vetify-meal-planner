import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { waitForPlanner } from './dev-readiness';

const servers: http.Server[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(
    servers
      .splice(0)
      .map((server) => new Promise<void>((resolve) => server.close(() => resolve()))),
  );
});

async function plannerServer(body: object) {
  const server = http.createServer((_request, response) => {
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify(body));
  });
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1`;
}

describe('Planner readiness before Expo starts', () => {
  it('accepts only an API with its database connected', async () => {
    const apiUrl = await plannerServer({ status: 'ok', db: 'connected' });
    await expect(waitForPlanner(() => false, apiUrl)).resolves.toBeUndefined();
  });

  it('rejects a live API whose database is unavailable', async () => {
    const apiUrl = await plannerServer({ status: 'ok', db: 'disconnected' });
    await expect(waitForPlanner(() => false, apiUrl, 20)).rejects.toThrow('Expo was not started');
  });

  it('rejects a watching process that never starts its API', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('connection refused'));
    await expect(waitForPlanner(() => false, undefined, 20)).rejects.toThrow(
      'Planner API did not become ready',
    );
  });

  it('ends readiness waiting after the stack has stopped', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch');
    await expect(waitForPlanner(() => true)).rejects.toThrow('did not become ready');
    expect(fetch).not.toHaveBeenCalled();
  });
});
