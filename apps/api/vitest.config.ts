import { defineProject } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineProject({
  root: fileURLToPath(new URL('.', import.meta.url)),
  test: {
    name: 'api',
    environment: 'node',
    include: ['src/**/*.test.ts'],
    testTimeout: 30000,
    hookTimeout: 120000,
    env: { NODE_ENV: 'test' },
  },
});
