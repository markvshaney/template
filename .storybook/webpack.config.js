const path = require('path');

/**
 * @param {Object} options - The options object containing the config
 * @returns {Object} - The updated webpack config
 */
module.exports = ({ config }) => {
  // Add path aliases
  config.resolve.alias = {
    ...config.resolve.alias,
    '@': path.resolve(__dirname, '../src'),
  };

  return config;
};
