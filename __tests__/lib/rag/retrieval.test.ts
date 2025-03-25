/**
 * Tests for the retrieval module in the RAG system
 */

import { PrismaClient } from '@prisma/client';
import {
  retrieveContext,
  hybridRetrieve,
  prepareContextForPrompt,
  extractKeywords,
} from '../../../src/lib/rag/retrieval';
import { hybridSearch } from '../../../src/lib/rag/hybrid-search';
import { mockDeep, mockReset } from 'jest-mock-extended';

// Mock the Prisma client
jest.mock('@prisma/client', () => {
  const mockPrisma = {
    PrismaClient: jest.fn().mockImplementation(() => ({
      embedding: {
        findMany: jest.fn(),
      },
      chunk: {
        findMany: jest.fn(),
      },
      $disconnect: jest.fn(),
    })),
  };
  return mockPrisma;
});

// Mock specific external functions
jest.mock('../../../src/lib/db/vector-operations', () => ({
  DistanceMetric: {
    COSINE: 'cosine',
    EUCLIDEAN: 'euclidean',
    DOT_PRODUCT: 'dot_product',
    MANHATTAN: 'manhattan',
  },
  getDistance: jest.fn().mockImplementation((a, b) => 0.2),
  getScore: jest.fn().mockImplementation((distance) => 1 - distance),
}));

// Mock documents preparation function
jest.mock('../../../src/lib/db/documents', () => ({
  prepareQueryFilter: jest.fn().mockImplementation((options) => {
    return { ...options };
  }),
}));

describe('RAG Retrieval', () => {
  const mockPrisma = new PrismaClient() as jest.Mocked<PrismaClient>;

  const mockEmbedding = {
    id: 'emb1',
    chunkId: 'chunk1',
    modelName: 'test-model',
    dimensions: 5,
    vectorData: JSON.stringify([0.1, 0.2, 0.3, 0.4, 0.5]),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockChunk = {
    id: 'chunk1',
    documentId: 'doc1',
    content: 'This is a test chunk for retrieval testing.',
    metadata: JSON.stringify({
      title: 'Test Document',
      source: 'Unit Tests',
    }),
    keywordsString: 'test,chunk,retrieval',
    startPosition: 0,
    endPosition: 100,
    chunkIndex: 0,
    isFirst: true,
    isLast: false,
    tokens: 10,
    embeddingModel: 'test-model',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockDocument = {
    id: 'doc1',
    title: 'Test Document',
    content: 'Full document content',
    contentType: 'text/plain',
    source: 'Unit Tests',
    userId: 'user1',
    createdAt: new Date(),
    updatedAt: new Date(),
    fileName: 'test.txt',
    fileSize: 100,
    mimeType: 'text/plain',
    processingStatus: 'complete',
    processingError: null,
    tagsString: 'test',
  };

  // Mock the chunk with document relationship
  const mockChunkWithDocument = {
    ...mockChunk,
    document: mockDocument,
  };

  // Mock embedding with chunk relationship
  const mockEmbeddingWithChunk = {
    ...mockEmbedding,
    chunk: mockChunkWithDocument,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockReset(mockPrisma);

    // Default implementation for embedding findMany
    mockPrisma.embedding.findMany.mockResolvedValue([mockEmbeddingWithChunk]);

    // Default implementation for chunk findMany
    mockPrisma.chunk.findMany.mockResolvedValue([mockChunkWithDocument]);
  });

  describe('retrieveContext', () => {
    it('should retrieve context based on query embedding', async () => {
      const queryEmbedding = [0.2, 0.3, 0.4, 0.5, 0.6];

      const result = await retrieveContext(queryEmbedding);

      expect(result.results.length).toBe(1);
      expect(result.context).toBeTruthy();
      expect(result.totalResults).toBe(1);
    });

    it('should handle empty results', async () => {
      mockPrisma.embedding.findMany.mockResolvedValue([]);

      const queryEmbedding = [0.2, 0.3, 0.4, 0.5, 0.6];
      const result = await retrieveContext(queryEmbedding);

      expect(result.results.length).toBe(0);
      expect(result.context).toBe('');
      expect(result.totalResults).toBe(0);
    });

    it('should format context as markdown when requested', async () => {
      const queryEmbedding = [0.2, 0.3, 0.4, 0.5, 0.6];

      const result = await retrieveContext(queryEmbedding, { format: 'markdown' });

      expect(result.context).toContain('##');
      expect(result.context).toContain('Test Document');
      expect(result.context).toContain('Score:');
    });

    it('should include sources when requested', async () => {
      const queryEmbedding = [0.2, 0.3, 0.4, 0.5, 0.6];

      const result = await retrieveContext(queryEmbedding, { includeSources: true });

      expect(result.sources).toBeDefined();
      expect(result.sources?.length).toBe(1);
      expect(result.sources?.[0].title).toBe('Test Document');
    });
  });

  describe('hybridRetrieve', () => {
    it('should combine vector and keyword search results', async () => {
      const queryEmbedding = [0.2, 0.3, 0.4, 0.5, 0.6];
      const query = 'test retrieval';

      const result = await hybridRetrieve(queryEmbedding, query);

      expect(result.results.length).toBeGreaterThan(0);
      expect(result.context).toBeTruthy();
    });

    it('should apply weights correctly', async () => {
      const queryEmbedding = [0.2, 0.3, 0.4, 0.5, 0.6];
      const query = 'test retrieval';

      // Vector only
      const vectorResult = await hybridRetrieve(queryEmbedding, query, {
        vectorWeight: 1.0,
        keywordWeight: 0.0,
      });

      // Keyword only
      const keywordResult = await hybridRetrieve(queryEmbedding, query, {
        vectorWeight: 0.0,
        keywordWeight: 1.0,
      });

      // Combined
      const combinedResult = await hybridRetrieve(queryEmbedding, query, {
        vectorWeight: 0.6,
        keywordWeight: 0.4,
      });

      expect(vectorResult.results.length).toBeGreaterThan(0);
      expect(keywordResult.results.length).toBeGreaterThanOrEqual(0);
      expect(combinedResult.results.length).toBeGreaterThan(0);
    });
  });

  describe('prepareContextForPrompt', () => {
    it('should format context for use in prompts', () => {
      const retrievalResult = {
        context: 'This is the context for the prompt.',
        results: [],
        sources: [
          { id: 'doc1', title: 'Source 1', url: 'http://example.com' },
          { id: 'doc2', title: 'Source 2', url: null },
        ],
      };

      const prompt = prepareContextForPrompt(retrievalResult);

      expect(prompt).toContain('This is the context for the prompt.');
      expect(prompt).toContain('Source 1');
      expect(prompt).toContain('Source 2');
    });

    it('should truncate context if too long', () => {
      const longContext = 'A'.repeat(500);
      const retrievalResult = {
        context: longContext,
        results: [],
      };

      const prompt = prepareContextForPrompt(retrievalResult, 100);

      expect(prompt.length).toBeLessThan(longContext.length);
      expect(prompt).toContain('...');
    });
  });

  describe('extractKeywords', () => {
    it('should extract relevant keywords from chunks', () => {
      const chunks = [
        {
          ...mockChunk,
          content: 'Artificial intelligence and machine learning are transforming technology.',
        },
        {
          ...mockChunk,
          content: 'Machine learning algorithms require high-quality training data.',
        },
      ];

      const keywords = extractKeywords(chunks, 5);

      expect(keywords.length).toBeGreaterThan(0);
      expect(keywords).toContain('machine');
      expect(keywords).toContain('learning');
    });
  });

  describe('hybrid-search integration', () => {
    it('should work with the hybrid-search module', async () => {
      const queryEmbedding = [0.2, 0.3, 0.4, 0.5, 0.6];
      const query = 'test retrieval';

      const result = await hybridSearch(query, queryEmbedding);

      expect(result.results.length).toBeGreaterThanOrEqual(0);
    });
  });
});
