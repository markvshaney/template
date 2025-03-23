// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock the global fetch
global.fetch = jest.fn();

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});

// Clean up after each test
afterEach(() => {
  jest.resetAllMocks();
});
