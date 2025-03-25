import { PrismaClient } from '@prisma/client';
import { mockDeep, mockReset } from 'jest-mock-extended';

/**
 * Mock of the Prisma client used for testing
 */
export const prismaMock = mockDeep<PrismaClient>();

/**
 * Reset all mocks between tests
 */
export const resetPrismaMocks = () => {
  mockReset(prismaMock);
};

/**
 * Setup the database test environment
 * @returns Cleanup function to be called after tests
 */
export const setupTestDatabase = () => {
  // Perform any test database setup here

  // Return a cleanup function
  return async () => {
    // Perform any test database cleanup here
  };
};

/**
 * Creates a test document with optional custom data
 * @param customData Additional data to include in the document
 * @returns The created test document
 */
export const createTestDocument = (customData = {}) => {
  return {
    id: 'test-document-id',
    title: 'Test Document',
    content: 'This is a test document with sample content.',
    contentType: 'text/plain',
    source: 'unit-test',
    userId: 'test-user-id',
    createdAt: new Date(),
    updatedAt: new Date(),
    metadata: { testKey: 'testValue' },
    ...customData,
  };
};

/**
 * Creates a test chunk with optional custom data
 * @param documentId The ID of the document this chunk belongs to
 * @param customData Additional data to include in the chunk
 * @returns The created test chunk
 */
export const createTestChunk = (documentId = 'test-document-id', customData = {}) => {
  return {
    id: 'test-chunk-id',
    content: 'This is a test chunk from the document.',
    documentId,
    embedding: new Array(1536).fill(0),
    keywords: ['test', 'chunk', 'document'],
    metadata: { position: 1 },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...customData,
  };
};

/**
 * Creates a test search query with optional custom data
 * @param customData Additional data to include in the search query
 * @returns The created test search query
 */
export const createTestSearchQuery = (customData = {}) => {
  return {
    id: 'test-search-query-id',
    query: 'test search query',
    userId: 'test-user-id',
    createdAt: new Date(),
    updatedAt: new Date(),
    metadata: { source: 'web' },
    ...customData,
  };
};

/**
 * Creates a test search result with optional custom data
 * @param queryId The ID of the search query this result belongs to
 * @param customData Additional data to include in the search result
 * @returns The created test search result
 */
export const createTestSearchResult = (queryId = 'test-search-query-id', customData = {}) => {
  return {
    id: 'test-search-result-id',
    searchQueryId: queryId,
    title: 'Test Result',
    url: 'https://example.com/test',
    snippet: 'This is a test search result snippet.',
    position: 1,
    createdAt: new Date(),
    metadata: { relevance: 0.95 },
    ...customData,
  };
};

/**
 * Helper to create a transaction mock that simulates the behavior of Prisma transactions
 * @param mockClient The mock Prisma client
 */
export const mockTransaction = (mockClient: PrismaClient) => {
  (mockClient.$transaction as jest.Mock).mockImplementation(async (callback: unknown) => {
    if (typeof callback === 'function') {
      return await callback(mockClient);
    }
    if (Array.isArray(callback)) {
      return await Promise.all(callback);
    }
    return callback;
  });
};
