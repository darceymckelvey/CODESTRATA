module.exports = [
  {
    languageOptions: {
      parser: require('@typescript-eslint/parser'),
      parserOptions: {
        ecmaVersion: 2021,
        sourceType: 'module',
        project: './tsconfig.json',
      },
      globals: {
        require: 'readonly',
        module: 'writable',
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
        window: 'readonly',
        document: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': require('@typescript-eslint/eslint-plugin'),
    },
    rules: {},
  },
  // @typescript-eslint recommended rules without the unsupported extends key
  (function () {
    const config = require('@typescript-eslint/eslint-plugin').configs
      .recommended;
    const { extends: _unused, ...rest } = config;
    return rest;
  })(),
  // Prettier configuration without the unsupported extends key
  (function () {
    const config = require('eslint-config-prettier');
    const { extends: _unused, ...rest } = config;
    return rest;
  })(),
];
