import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '.local-data/**',
      'coverage/**',
      'test-results/**',
      'playwright-report/**',
      'apps/web/public/sw.js',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{js,mjs,cjs,ts,tsx,jsx}'],
    ignores: [
      '**/*.{test,spec}.{ts,tsx,js,jsx,mjs,cjs}',
      '**/tests/**',
      '**/__tests__/**',
      '**/*test-helpers.*',
      '**/*test-fixtures.*',
      'scripts/migration/fixtures.ts',
    ],
    rules: { 'max-lines': ['error', { max: 160, skipBlankLines: false, skipComments: false }] },
  },
  {
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
);
