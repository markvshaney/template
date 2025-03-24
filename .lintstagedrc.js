const { ESLint } = require('eslint');

const removeIgnoredFiles = async (files) => {
  const eslint = new ESLint();
  const ignoredFiles = await Promise.all(files.map((file) => eslint.isPathIgnored(file)));
  const filteredFiles = files.filter((_, i) => !ignoredFiles[i]);
  return filteredFiles;
};

module.exports = {
  '*.{js,jsx,ts,tsx}': async (files) => {
    const filesToLint = await removeIgnoredFiles(files);
    if (filesToLint.length) {
      return [
        `eslint --fix ${filesToLint.join(' ')}`,
        `prettier --write ${filesToLint.join(' ')}`,
        'npx tsc --noEmit',
      ];
    }
    return [];
  },
  '*.{json,md}': ['prettier --write'],
};
