'use strict';

const { defineConfig } = require('eslint/config');
const eslintJs = require('@eslint/js');
const jestPlugin = require('eslint-plugin-jest');
const salesforceLwcConfig = require('@salesforce/eslint-config-lwc/recommended');
const i18n = require('@salesforce/eslint-config-lwc/i18n');
const globals = require('globals');

module.exports = defineConfig([
  // LWC configuration for force-app/main/default/lwc
  {
    files: ['force-app/main/default/lwc/**/*.js'],
    extends: [salesforceLwcConfig, i18n],
    rules: {
      '@lwc/lwc/no-async-operation': 'off',
      '@lwc/lwc/consistent-component-name': 'error',
      '@lwc/lwc/no-deprecated': 'error',
      '@lwc/lwc/valid-api': 'error',
      '@lwc/lwc/no-document-query': 'error',
      'no-console': 'error',
      'spaced-comment': ['error', 'always'],
      'no-var': 'error',
      'prefer-const': 'error',
      'prefer-spread': 'error',
      'prefer-object-spread': 'error',
      'prefer-template': 'error',
      camelcase: 'error',
      'max-lines': ['error', 600],
      'max-lines-per-function': ['error', 50],
      'no-inline-comments': 'error',
      'no-nested-ternary': 'error'
    }
  },

  // LWC configuration with override for LWC test files
  {
    files: ['force-app/main/default/lwc/**/*.test.js'],
    languageOptions: { globals: { ...globals.node } },
    extends: [salesforceLwcConfig],
    rules: {
      '@lwc/lwc/no-async-operation': 'off',
      '@lwc/lwc/no-unexpected-wire-adapter-usages': 'off',
      '@locker/locker/distorted-element-shadow-root-getter': 'off',
      'max-lines-per-function': 'off'
    }
  },

  // Jest mocks configuration
  {
    files: ['force-app/test/jest-mocks/**/*.js'],
    languageOptions: {
      sourceType: 'module',
      ecmaVersion: 'latest',
      globals: { ...globals.node, ...globals.es2021, ...jestPlugin.environments.globals.globals }
    },
    plugins: { eslintJs },
    extends: ['eslintJs/recommended']
  },

  // UTAM tests configuration
  {
    files: ['force-app/test/utam/**/*.js'],
    languageOptions: {
      sourceType: 'module',
      ecmaVersion: 'latest',
      globals: { ...globals.node, ...globals.es2021, ...globals.jasmine, utam: 'readonly', browser: 'readonly' }
    },
    plugins: { eslintJs },
    extends: ['eslintJs/recommended']
  }
]);
