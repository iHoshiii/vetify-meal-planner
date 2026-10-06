import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    name: 'node',
    environment: 'node',
    include: ['scripts/**/*.test.ts', 'packages/shared/tests/**/*.test.ts', 'tools/**/*.test.ts'],
  },
});
