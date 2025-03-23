module.exports = {
  '*.{js,jsx,ts,tsx}': [
    'eslint --fix',
    'prettier --write',
    () => 'tsc --noEmit', // Run TypeScript compiler in type-check mode
  ],
  '*.{json,md}': ['prettier --write'],
};
