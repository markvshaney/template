import { jest } from '@jest/globals';
import { PrismaClient } from '@prisma/client';

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

const mockPrismaClient = {
  // Common database operations
  $connect: jest.fn(),
  $disconnect: jest.fn(),
  $transaction: jest.fn((operations) => Promise.all(operations)),

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
  $queryRaw: jest.fn(),
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
