import { build } from 'esbuild';

await build({
  entryPoints: ['src/index.ts', 'src/vercel.ts', 'src/setup-indexes.ts'],
  outdir: 'dist',
  bundle: true,
  packages: 'external',
  platform: 'node',
  format: 'esm',
  target: 'node24',
  sourcemap: true,
});
