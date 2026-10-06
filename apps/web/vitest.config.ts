import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineProject } from 'vitest/config';

export default defineProject({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'src') } },
  test: {
    name: 'web',
    environment: 'jsdom',
    globals: true,
    setupFiles: [path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'src/test-setup.ts')],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
