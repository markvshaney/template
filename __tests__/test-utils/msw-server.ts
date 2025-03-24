import { handlers } from './server-handlers';

/**
 * TEMPORARY WORKAROUND: Simplified MSW server implementation
 *
 * Due to compatibility issues between MSW v2 and Jest in this environment,
 * we're using a simplified mock implementation instead of the full MSW server.
 *
 * When importing from 'msw/node', Jest cannot resolve the module correctly.
 * To properly set up MSW with Jest, we would need to:
 * 1. Ensure all ESM modules are properly configured
 * 2. Add the correct module mappings in Jest config
 * 3. Set up proper polyfills for web standards APIs
 *
 * For now, we're using direct fetch mocking in our tests instead of MSW's request interception.
 * See msw-api-example.test.tsx for an example of how to use this approach.
 *
 * The original implementation would be:
 * ```
 * import { setupServer } from 'msw/node';
 * import { handlers } from './server-handlers';
 * export const server = setupServer(...handlers);
 * ```
 */
export const server = {
  // Store the handlers
  handlers,

  // Start intercepting requests
  listen: () => {
    console.log('MSW server started (simplified mock implementation)');
    return () => server.close();
  },

  // Reset handlers to the initial handlers
  resetHandlers: () => {
    console.log('MSW handlers reset (simplified mock implementation)');
  },

  // Add new handlers
  use: () => {
    console.log('MSW adding handlers (simplified mock implementation)');
  },

  // Stop intercepting requests
  close: () => {
    console.log('MSW server closed (simplified mock implementation)');
  },
};
