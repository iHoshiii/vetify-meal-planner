import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'src') } },
  server: {
    host: '127.0.0.1',
    port: 5174,
    strictPort: true,
    proxy: {
      '/api': { target: 'http://127.0.0.1:8001', changeOrigin: true },
      '/main-api': {
        target: 'http://127.0.0.1:8002',
        changeOrigin: true,
        rewrite: (url) => url.replace(/^\/main-api/, '/api'),
      },
    },
  },
  build: { outDir: 'dist' },
});
