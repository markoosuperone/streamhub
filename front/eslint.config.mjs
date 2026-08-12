import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { FlatCompat } from '@eslint/eslintrc';
import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import eslintConfigPrettier from 'eslint-config-prettier';
import eslintPluginSimpleImportSort from 'eslint-plugin-simple-import-sort';
import eslintPluginUnusedImports from 'eslint-plugin-unused-imports';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  {
    plugins: {
      'simple-import-sort': eslintPluginSimpleImportSort,
      'unused-imports': eslintPluginUnusedImports,
    },
    rules: {
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        { vars: 'all', varsIgnorePattern: '^_', args: 'after-used', argsIgnorePattern: '^_' },
      ],
      // Too conservative for this codebase's data-fetching pattern: it flags
      // any component-scoped callback (e.g. a shared `refetch` useCallback)
      // that sets state when called from an effect, even well after an
      // await, forcing the actual setState calls out into either a
      // module-level function or an inline effect IIFE.
      'react-hooks/set-state-in-effect': 'off',
    },
  },

  // FSD layer-boundary rules only (not the package's public-api/import-order
  // rule sets — this codebase has no barrel/index files, and import-order is
  // already covered by simple-import-sort). Legacy-format config, bridged in
  // via FlatCompat rather than rewritten against eslint-plugin-boundaries' new API.
  ...compat.extends('@feature-sliced/eslint-config/rules/layers-slices'),
  {
    languageOptions: {
      // @feature-sliced/eslint-config hardcodes ecmaVersion: "2015" (a string),
      // valid under the old eslintrc schema but rejected by the flat config
      // schema (wants a number or "latest") — override it back to something valid.
      ecmaVersion: 'latest',
    },
    settings: {
      // FSD layers live under app/ (Next.js reserves the project-root "app"
      // name for the App Router), not at the project root itself — without
      // this, every file's first path segment is "app", so layer patterns
      // like "shared/*" never match and everything falls through misclassified.
      'boundaries/root-path': 'app',
    },
  },

  eslintConfigPrettier,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
  ]),
]);

export default eslintConfig;
