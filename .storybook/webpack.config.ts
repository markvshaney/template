import path from 'path';
import type { StorybookConfig } from '@storybook/nextjs';
import type { Configuration } from 'webpack';

const config = (config: Configuration) => {
  return {
    ...config,
    resolve: {
      ...config.resolve,
      alias: {
        ...config.resolve?.alias,
        '@': path.resolve(__dirname, '../src'),
      },
    },
  };
};

export default config;
