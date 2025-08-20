const path = require('path');

module.exports = {
  root: true,
  // ADD THIS LINE
  ignorePatterns: [
    '**/*.js', // Ignore all .js files by default, because we're linting TypeScript
    '**/*.mjs', // Also ignore mjs files
    '**/*.cjs', // Also ignore cjs files (like .eslintrc.cjs itself!)
    '/lib/**/*', // Ignore built files.
    '/generated/**/*', // Ignore generated files.
    // Ensure you also specifically ignore the ESLint config file if it's outside 'src'
    '.eslintrc.cjs', // <--- ADD THIS LINE!
    'tsconfig.json', // Often useful to ignore config files
    'tsconfig.dev.json', // Often useful to ignore config files
  ],
  env: {
    es6: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:import/typescript',
    'google',
    'plugin:@typescript-eslint/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: [
      path.resolve(__dirname, './tsconfig.json'),
      path.resolve(__dirname, './tsconfig.dev.json'),
    ],
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint', 'import'],

  rules: {
    quotes: ['error', 'single'],
    'import/no-unresolved': 0,
    indent: ['error', 2],
    'object-curly-spacing': ['error', 'always'],
  },

  // ... (rest of your config)
};
