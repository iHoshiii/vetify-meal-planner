import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    pool: 'forks',
    projects: ['apps/web/vitest.config.ts', 'apps/api/vitest.config.ts', 'vitest.node.config.ts'],
    maxWorkers: 2,
    fileParallelism: false,
  },
});
