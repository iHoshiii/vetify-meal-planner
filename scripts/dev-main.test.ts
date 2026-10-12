import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveMainService, waitForMain } from './dev-main';

const servers: http.Server[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(
    servers
      .splice(0)
      .map((server) => new Promise<void>((resolve) => server.close(() => resolve()))),
  );
});

async function accountServer(body: object) {
  const server = http.createServer((_request, response) => {
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify(body));
  });
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1`;
}

describe('real Vetify local account service', () => {
  it('reuses a ready account service without launching another server', async () => {
    const apiUrl = await accountServer({ status: 'ok', db: 'connected' });
    await expect(resolveMainService(apiUrl)).resolves.toBeNull();
    await expect(waitForMain(() => false, apiUrl)).resolves.toBeUndefined();
  });

  it('refuses a server whose database is unavailable', async () => {
    const apiUrl = await accountServer({ status: 'ok', db: 'disconnected' });
    await expect(resolveMainService(apiUrl)).rejects.toThrow('without a ready database');
  });

  it('refuses an unrelated server on the configured API address', async () => {
    const apiUrl = await accountServer({ status: 'ok' });
    await expect(resolveMainService(apiUrl)).rejects.toThrow('without a ready database');
  });

  it('ends readiness waiting when startup has been stopped', async () => {
    const request = vi.spyOn(globalThis, 'fetch');
    await expect(waitForMain(() => true)).rejects.toThrow('did not become ready');
    expect(request).not.toHaveBeenCalled();
  });
});
