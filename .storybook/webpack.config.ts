import path from 'path';
import type { Configuration } from 'webpack';

/**
 * Storybook webpack configuration
 * @param baseConfig - The base webpack configuration
 * @returns The enhanced webpack configuration
 */
const config = (baseConfig: Configuration): Configuration => {
  return {
    ...baseConfig,
    resolve: {
      ...baseConfig.resolve,
      alias: {
        ...baseConfig.resolve?.alias,
        '@': path.resolve(__dirname, '../src'),
      },
    },
  };
};

export default config;
