import React from 'react';
import type { Preview } from '@storybook/react';
import { ThemeProvider } from 'next-themes';
import '../src/app/globals.css';

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    nextjs: {
      appDirectory: true,
    },
    layout: 'centered',
    themes: {
      defaultTheme: 'light',
      list: [
        { name: 'light', class: '', color: '#ffffff' },
        { name: 'dark', class: 'dark', color: '#000000' },
      ],
    },
  },
  decorators: [
    (Story) => (
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <div className="min-h-screen p-4">
          <Story />
        </div>
      </ThemeProvider>
    ),
  ],
};

export default preview;
