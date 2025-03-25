module.exports = {
  extends: [
    'next/core-web-vitals',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
    'plugin:jest/recommended',
    'prettier',
  ],
  plugins: ['@typescript-eslint', 'react', 'react-hooks', 'jsx-a11y', 'jest', 'prettier'],
  rules: {
    // Custom rules for the project
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/no-explicit-any': 'warn',
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
  },
  ignorePatterns: [
    'node_modules',
    '.next',
    'out',
    'dist',
    'build',
    'storybook-static',
    '*.d.ts',
    'coverage',
  ],
  settings: {
    react: {
      version: 'detect',
    },
  },
  overrides: [
    {
      // Allow `any` and `require()` in test files
      files: [
        '**/__tests__/**/*',
        '**/*.test.ts',
        '**/*.test.tsx',
        'jest.setup.js',
        'jest.setup.cjs',
      ],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-var-requires': 'off',
        '@typescript-eslint/ban-ts-comment': 'off',
        '@typescript-eslint/no-unused-vars': 'off', // Allow unused variables in test files
        '@typescript-eslint/ban-types': 'off',
      },
    },
    {
      // Allow `require()` in config files
      files: ['*.config.js', '*.config.cjs', 'scripts/**/*.js'],
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
        '@typescript-eslint/no-unused-vars': 'warn',
      },
    },
    {
      // Specifically for the test-quality.tsx file, which is used for linting tests
      files: ['**/test-quality.tsx'],
      rules: {
        '@typescript-eslint/no-unused-vars': 'off',
      },
    },
  ],
};
