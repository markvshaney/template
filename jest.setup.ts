// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock the global fetch
global.fetch = jest.fn();

// Mock console.error to fail tests
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  // Reset fetch mock
  (global.fetch as jest.Mock).mockReset();
});

// Clean up after each test
afterEach(() => {
  jest.resetAllMocks();
});

// Restore console.error after all tests
afterAll(() => {
  console.error = originalError;
});
