import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

describe('shell cache boundaries', () => {
  it('does not intercept account or planner data requests', () => {
    const handlers = new Map<string, (event: unknown) => void>();
    const localFile = resolve(process.cwd(), 'public/sw.js');
    const code = readFileSync(
      existsSync(localFile) ? localFile : resolve(process.cwd(), 'apps/web/public/sw.js'),
      'utf8',
    );
    runInNewContext(code, {
      self: {
        location: { origin: 'https://planner.vetify.com' },
        addEventListener: (name: string, handler: (event: unknown) => void) =>
          handlers.set(name, handler),
      },
      URL,
    });
    for (const path of [
      '/api/v1/pets',
      '/main-api/v1/auth/refresh',
      '/api/v1/export',
      '/api/v1/session',
    ]) {
      const respondWith = vi.fn();
      handlers.get('fetch')!({
        request: new Request(`https://planner.vetify.com${path}`),
        respondWith,
      });
      expect(respondWith).not.toHaveBeenCalled();
    }
    const respondWith = vi.fn();
    handlers.get('fetch')!({
      request: new Request('https://main.vetify.com/auth/refresh'),
      respondWith,
    });
    expect(respondWith).not.toHaveBeenCalled();
  });
});
