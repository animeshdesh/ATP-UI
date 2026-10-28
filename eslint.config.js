import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'dist',
      'dev-dist',
      'coverage',
      '**/dist',
      '**/dev-dist',
      '**/design',
      '**/public/mockServiceWorker.js',
      'packages/core/src/api/schema.d.ts',
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: { ecmaVersion: 2023, globals: globals.browser },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
    },
  },
  {
    // Providers co-locate their hook; router/providers are not hot-reloaded components.
    files: [
      'apps/*/src/app/**',
      '**/*Context.tsx',
      'packages/core/src/*.tsx',
      'packages/ui/src/Toast.tsx',
      'apps/money/src/features/dashboard/PeriodSwitch.tsx',
      // Sheets and the calendar kit export their labels and hooks next to the components.
      'apps/patients/src/features/calendar/*.tsx',
      'apps/patients/src/features/inquiries/ConvertSheet.tsx',
      'apps/patients/src/features/patients/NewPatientSheet.tsx',
    ],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
);
