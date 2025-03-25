import { jest } from '@jest/globals';

// Mock implementation for @prisma/client
const mockMemory = {
  id: 'test-memory-id',
  userId: 'test-user-id',
  sessionId: 'test-session-id',
  type: 'factual',
  content: 'Test memory content',
  importance: 0.8,
  embedding: new Array(1536).fill(0),
  keywords: ['test', 'memory'],
  metadata: { source: 'test' },
  createdAt: new Date(),
  updatedAt: new Date(),
  consolidation: {
    id: 'test-consolidation-id',
    memoryId: 'test-memory-id',
    importance: 0.8,
    reviewCount: 0,
    lastReviewed: new Date(),
  },
};

// Document-centric mocks
const mockDocument = {
  id: 'test-document-id',
  title: 'Test Document',
  content: 'This is a test document with sample content.',
  contentType: 'text/plain',
  source: 'unit-test',
  userId: 'test-user-id',
  createdAt: new Date(),
  updatedAt: new Date(),
  metadata: { testKey: 'testValue' },
  chunks: [],
};

const mockChunk = {
  id: 'test-chunk-id',
  content: 'This is a test chunk from the document.',
  documentId: 'test-document-id',
  embedding: new Array(1536).fill(0),
  keywords: ['test', 'chunk', 'document'],
  metadata: { position: 1 },
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockSearchQuery = {
  id: 'test-search-query-id',
  query: 'test search query',
  userId: 'test-user-id',
  createdAt: new Date(),
  updatedAt: new Date(),
  metadata: { source: 'web' },
  results: [],
};

const mockSearchResult = {
  id: 'test-search-result-id',
  searchQueryId: 'test-search-query-id',
  title: 'Test Result',
  url: 'https://example.com/test',
  snippet: 'This is a test search result snippet.',
  position: 1,
  createdAt: new Date(),
  metadata: { relevance: 0.95 },
};

const mockPrismaClient = {
  // Common database operations
  $connect: jest.fn().mockResolvedValue(undefined),
  $disconnect: jest.fn().mockResolvedValue(undefined),

  // Enhanced transaction support with proper rollback functionality
  $transaction: jest.fn((operations) => {
    if (Array.isArray(operations)) {
      return Promise.all(operations).catch((error) => {
        // Simulate transaction rollback on error
        console.error('Transaction rolled back:', error);
        throw error;
      });
    }

    // Handle function-based transactions
    if (typeof operations === 'function') {
      try {
        return Promise.resolve(operations(mockPrismaClient));
      } catch (error) {
        // Simulate transaction rollback on error
        console.error('Transaction rolled back:', error);
        return Promise.reject(error);
      }
    }

    return Promise.resolve(operations);
  }),

  // Error simulation helper (for testing error scenarios)
  $simulateError: jest.fn((modelName, operation) => {
    if (!mockPrismaClient[modelName]) {
      throw new Error(`Model ${modelName} does not exist in mock`);
    }

    const originalFn = mockPrismaClient[modelName][operation];
    if (!originalFn) {
      throw new Error(`Operation ${operation} does not exist on model ${modelName}`);
    }

    // Replace the function with one that throws an error
    mockPrismaClient[modelName][operation] = jest.fn(() =>
      Promise.reject(new Error(`Simulated ${modelName}.${operation} error`))
    );

    // Return a cleanup function to restore the original behavior
    return () => {
      mockPrismaClient[modelName][operation] = originalFn;
    };
  }),

  // Clear all mocks and reset their behavior
  $clearMocks: jest.fn(() => {
    Object.keys(mockPrismaClient).forEach((key) => {
      if (key.startsWith('$')) return;

      Object.keys(mockPrismaClient[key]).forEach((method) => {
        if (mockPrismaClient[key][method].mockClear) {
          mockPrismaClient[key][method].mockClear();
        }
      });
    });
  }),

  // User model
  user: {
    create: jest.fn(() =>
      Promise.resolve({
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    ),
    findUnique: jest.fn(() =>
      Promise.resolve({
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    ),
    findMany: jest.fn(() => Promise.resolve([])),
    deleteMany: jest.fn(() => Promise.resolve({ count: 1 })),
  },

  // Document model with improved error handling and query support
  document: {
    create: jest.fn((args) =>
      Promise.resolve({
        ...mockDocument,
        ...args?.data,
        id: args?.data?.id || 'test-document-id',
        chunks: [],
      })
    ),
    findUnique: jest.fn((args) => {
      if (args?.where?.id === 'non-existent-id') {
        return Promise.resolve(null);
      }
      if (args?.where?.id === 'error-document-id') {
        return Promise.reject(new Error('Database error while finding document'));
      }
      if (args?.where?.id === 'test-document-id') {
        return Promise.resolve({ ...mockDocument, chunks: [mockChunk] });
      } else if (args?.where?.id === 'document-to-delete-id') {
        return Promise.resolve(null);
      }
      return Promise.resolve({ ...mockDocument, chunks: [] });
    }),
    findMany: jest.fn((args) => {
      // Support filtering
      if (args?.where?.userId === 'non-existent-user') {
        return Promise.resolve([]);
      }
      if (args?.where?.contentType) {
        return Promise.resolve([
          {
            ...mockDocument,
            contentType: args.where.contentType,
          },
        ]);
      }

      // Support pagination
      const limit = args?.take || 10;
      const docs = Array(limit)
        .fill(0)
        .map((_, i) => ({
          ...mockDocument,
          id: `test-document-id-${i}`,
          title: `Test Document ${i}`,
        }));

      return Promise.resolve(docs);
    }),
    update: jest.fn((args) =>
      Promise.resolve({
        ...mockDocument,
        ...args?.data,
        id: args?.where?.id || 'test-document-id',
      })
    ),
    delete: jest.fn((args) => {
      if (args?.where?.id === 'error-document-id') {
        return Promise.reject(new Error('Database error while deleting document'));
      }
      return Promise.resolve({
        ...mockDocument,
        id: args?.where?.id || 'document-to-delete-id',
      });
    }),
    deleteMany: jest.fn(() => Promise.resolve({ count: 1 })),
  },

  // Chunk model
  chunk: {
    create: jest.fn(() => Promise.resolve(mockChunk)),
    findMany: jest.fn(() => Promise.resolve([mockChunk])),
    deleteMany: jest.fn(() => Promise.resolve({ count: 1 })),
  },

  // Search query model
  searchQuery: {
    create: jest.fn(() => Promise.resolve({ ...mockSearchQuery, results: [] })),
    findMany: jest.fn(() => Promise.resolve([{ ...mockSearchQuery, results: [mockSearchResult] }])),
    deleteMany: jest.fn(() => Promise.resolve({ count: 1 })),
  },

  // Search result model
  searchResult: {
    create: jest.fn(() => Promise.resolve(mockSearchResult)),
    findMany: jest.fn(() => Promise.resolve([mockSearchResult])),
    deleteMany: jest.fn(() => Promise.resolve({ count: 1 })),
  },

  // Memory model
  memory: {
    create: jest.fn(() => Promise.resolve(mockMemory)),
    findUnique: jest.fn(() => Promise.resolve(mockMemory)),
    findMany: jest.fn(() => Promise.resolve([mockMemory])),
    update: jest.fn(() => Promise.resolve(mockMemory)),
    deleteMany: jest.fn(() => Promise.resolve({ count: 1 })),
  },

  // Session model
  session: {
    create: jest.fn(() =>
      Promise.resolve({
        id: 'test-session-id',
        userId: 'test-user-id',
        name: 'Test Session',
        createdAt: new Date(),
        updatedAt: new Date(),
        memories: [],
      })
    ),
    findUnique: jest.fn(() =>
      Promise.resolve({
        id: 'test-session-id',
        userId: 'test-user-id',
        name: 'Test Session',
        createdAt: new Date(),
        updatedAt: new Date(),
        memories: [mockMemory],
      })
    ),
    deleteMany: jest.fn(() => Promise.resolve({ count: 1 })),
  },

  // Memory consolidation model
  memoryConsolidation: {
    upsert: jest.fn(() =>
      Promise.resolve({
        id: 'test-consolidation-id',
        memoryId: 'test-memory-id',
        importance: 0.9,
        reviewCount: 0,
        lastReviewed: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    ),
    deleteMany: jest.fn(() => Promise.resolve({ count: 1 })),
  },

  // Specialization model
  specialization: {
    create: jest.fn(() =>
      Promise.resolve({
        id: 'test-specialization-id',
        name: 'TestSpecialization',
        type: 'factual',
        version: '1.0.0',
        active: false,
        metadata: { description: 'Test specialization' },
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    ),
    findUnique: jest.fn(() =>
      Promise.resolve({
        id: 'test-specialization-id',
        type: 'factual',
        active: false,
      })
    ),
    update: jest.fn(() =>
      Promise.resolve({
        id: 'test-specialization-id',
        name: 'TestSpecialization',
        type: 'factual',
        version: '1.0.0',
        active: true,
        metadata: { description: 'Test specialization' },
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    ),
    updateMany: jest.fn(() => Promise.resolve({ count: 1 })),
    deleteMany: jest.fn(() => Promise.resolve({ count: 1 })),
  },

  // Vector index model
  vectorIndex: {
    create: jest.fn(() =>
      Promise.resolve({
        id: 'test-vector-id',
        embedding: new Array(1536).fill(0),
        metadata: { description: 'Test vector' },
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    ),
    deleteMany: jest.fn(() => Promise.resolve({ count: 1 })),
  },

  // Prisma Client methods
  $queryRaw: jest.fn(() =>
    Promise.resolve([
      {
        id: 'test-chunk-id',
        content: 'This is a test chunk from the document.',
        document_id: 'test-document-id',
        distance: 0.25,
      },
    ])
  ),
  $executeRaw: jest.fn(),
  $runCommandRaw: jest.fn(),

  // Prisma Client events
  $on: jest.fn(),
  $use: jest.fn(),
  $intercept: jest.fn(),
};

// Export mocked PrismaClient constructor
function MockPrismaClient() {
  return mockPrismaClient;
}

// Export the mock
module.exports = {
  PrismaClient: MockPrismaClient,
};
