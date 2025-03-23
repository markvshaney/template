module.exports = {
  '*.{js,jsx,ts,tsx}': [
    'eslint --fix',
    'prettier --write',
    'bash -c "tsc --noEmit"', // Run TypeScript compiler on all files
  ],
  '*.{json,md}': ['prettier --write'],
};
