/**
 * Vector Operations Tests
 * Unit tests for vector math operations and database vector storage functionality
 */

import {
  dotProduct,
  magnitude,
  normalize,
  cosineSimilarity,
  cosineDistance,
  euclideanDistance,
  manhattanDistance,
  getDistance,
  distanceToSimilarity,
  DistanceMetric,
  parseEmbeddingVector,
  serializeVector,
  averageVectors,
  weightedAverageVectors,
  vectorSimilaritySearch,
  hybridSearch,
  getEmbeddingsWithVectors,
  VectorSearchResult,
} from '../../../src/lib/db/vector-operations';

// Mock the PrismaClient to avoid database calls during testing
jest.mock('@prisma/client', () => {
  const mockPrisma = {
    embedding: {
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
      createMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    chunk: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    $transaction: jest.fn((callbacks: Function[]) =>
      Promise.all(callbacks.map((callback) => callback()))
    ),
  };

  return {
    PrismaClient: jest.fn(() => mockPrisma),
  };
});

// Get access to the mocked prisma client
import { PrismaClient } from '@prisma/client';
const mockPrismaClient = new PrismaClient();

describe('Vector Math Operations', () => {
  describe('dotProduct', () => {
    it('should calculate dot product correctly', () => {
      const a = [1, 2, 3];
      const b = [4, 5, 6];
      expect(dotProduct(a, b)).toBe(1 * 4 + 2 * 5 + 3 * 6);
      expect(dotProduct(a, b)).toBe(32);
    });

    it('should throw error if vectors have different dimensions', () => {
      const a = [1, 2, 3];
      const b = [4, 5];
      expect(() => dotProduct(a, b)).toThrow('Vector dimensions do not match');
    });
  });

  describe('magnitude', () => {
    it('should calculate magnitude correctly', () => {
      const vec = [3, 4];
      expect(magnitude(vec)).toBe(5); // 3-4-5 triangle

      const vec2 = [1, 1, 1, 1];
      expect(magnitude(vec2)).toBe(2); // sqrt(4)
    });

    it('should return 0 for zero vector', () => {
      const zero = [0, 0, 0];
      expect(magnitude(zero)).toBe(0);
    });
  });

  describe('normalize', () => {
    it('should normalize vector to unit length', () => {
      const vec = [3, 0, 0];
      const normalized = normalize(vec);
      expect(normalized).toEqual([1, 0, 0]);
      expect(magnitude(normalized)).toBeCloseTo(1);

      const vec2 = [1, 1, 1, 1];
      const normalized2 = normalize(vec2);
      expect(magnitude(normalized2)).toBeCloseTo(1);
    });

    it('should handle zero vector', () => {
      const zero = [0, 0, 0];
      expect(normalize(zero)).toEqual([0, 0, 0]);
    });
  });

  describe('cosineSimilarity', () => {
    it('should calculate similarity for identical vectors', () => {
      const vec = [1, 2, 3];
      expect(cosineSimilarity(vec, vec)).toBeCloseTo(1);
    });

    it('should calculate similarity for orthogonal vectors', () => {
      const a = [1, 0, 0];
      const b = [0, 1, 0];
      expect(cosineSimilarity(a, b)).toBeCloseTo(0);
    });

    it('should calculate similarity for opposite vectors', () => {
      const a = [1, 2, 3];
      const b = [-1, -2, -3];
      expect(cosineSimilarity(a, b)).toBeCloseTo(-1);
    });

    it('should handle zero vectors', () => {
      const a = [0, 0, 0];
      const b = [1, 2, 3];
      expect(cosineSimilarity(a, b)).toBe(0);
    });
  });

  describe('distance metrics', () => {
    const a = [1, 2, 3];
    const b = [4, 5, 6];

    it('should calculate cosine distance', () => {
      const similarity = cosineSimilarity(a, b);
      expect(cosineDistance(a, b)).toBeCloseTo(1 - similarity);
    });

    it('should calculate euclidean distance', () => {
      // sqrt((4-1)^2 + (5-2)^2 + (6-3)^2) = sqrt(27) = 5.196
      expect(euclideanDistance(a, b)).toBeCloseTo(5.196, 3);
    });

    it('should calculate manhattan distance', () => {
      // |4-1| + |5-2| + |6-3| = 3 + 3 + 3 = 9
      expect(manhattanDistance(a, b)).toBe(9);
    });

    it('should select the correct distance metric', () => {
      expect(getDistance(a, b, DistanceMetric.COSINE)).toBeCloseTo(cosineDistance(a, b));
      expect(getDistance(a, b, DistanceMetric.EUCLIDEAN)).toBeCloseTo(euclideanDistance(a, b));
      expect(getDistance(a, b, DistanceMetric.MANHATTAN)).toBe(manhattanDistance(a, b));
      expect(getDistance(a, b, DistanceMetric.DOT_PRODUCT)).toBe(-dotProduct(a, b));
    });

    it('should convert distance to similarity score', () => {
      // Cosine distance -> similarity
      const cosineDistVal = cosineDistance(a, b);
      expect(distanceToSimilarity(cosineDistVal, DistanceMetric.COSINE)).toBeCloseTo(
        1 - cosineDistVal / 2
      );

      // Check bounds are respected
      expect(distanceToSimilarity(0, DistanceMetric.COSINE)).toBeCloseTo(1);
      expect(distanceToSimilarity(2, DistanceMetric.COSINE)).toBeCloseTo(0);
    });

    it('should handle invalid distance metric gracefully', () => {
      // @ts-ignore - Intentionally passing invalid metric
      expect(() => getDistance(a, b, 'invalid_metric')).toThrow('Unknown distance metric');
      // @ts-ignore - Intentionally passing invalid metric
      expect(() => distanceToSimilarity(1, 'invalid_metric')).toThrow('Unknown distance metric');
    });
  });

  describe('vector serialization', () => {
    it('should serialize and parse vectors correctly', () => {
      const vec = [1.1, 2.2, 3.3, 4.4];
      const serialized = serializeVector(vec);
      expect(typeof serialized).toBe('string');
      expect(parseEmbeddingVector(serialized)).toEqual(vec);
    });

    it('should handle parsing errors', () => {
      expect(() => parseEmbeddingVector('invalid json')).toThrow(
        'Failed to parse embedding vector'
      );
    });
  });

  describe('vector aggregation', () => {
    it('should calculate average of vectors', () => {
      const vectors = [
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9],
      ];

      const avg = averageVectors(vectors);
      expect(avg).toEqual([4, 5, 6]);
    });

    it('should throw error for empty vector array', () => {
      expect(() => averageVectors([])).toThrow('Cannot average empty vector array');
    });

    it('should throw error for incompatible dimensions', () => {
      const vectors = [
        [1, 2, 3],
        [4, 5], // Different dimension
      ];

      expect(() => averageVectors(vectors)).toThrow('incompatible dimensions');
    });

    it('should calculate weighted average correctly', () => {
      const vectors = [
        [1, 1, 1],
        [2, 2, 2],
        [3, 3, 3],
      ];

      const weights = [1, 2, 3];
      // (1*1 + 2*2 + 3*3)/(1+2+3) = 14/6 = 2.333...
      const weightedAvg = weightedAverageVectors(vectors, weights);
      expect(weightedAvg[0]).toBeCloseTo(2.333, 3);
      expect(weightedAvg[1]).toBeCloseTo(2.333, 3);
      expect(weightedAvg[2]).toBeCloseTo(2.333, 3);
    });

    it('should throw error for mismatched vector and weight counts', () => {
      const vectors = [
        [1, 1, 1],
        [2, 2, 2],
      ];

      const weights = [1, 2, 3]; // One more weight than vectors
      expect(() => weightedAverageVectors(vectors, weights)).toThrow(
        'Mismatch between vector count'
      );
    });

    it('should throw error for zero sum of weights', () => {
      const vectors = [
        [1, 1, 1],
        [2, 2, 2],
      ];

      const weights = [0, 0]; // Weights sum to zero
      expect(() => weightedAverageVectors(vectors, weights)).toThrow('Sum of weights is zero');
    });
  });
});

describe('Database Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getEmbeddingsWithVectors', () => {
    it('should retrieve and parse embeddings', async () => {
      // Setup mock data
      const mockEmbeddings = [
        {
          id: 'emb1',
          chunkId: 'chunk1',
          createdAt: new Date(),
          updatedAt: new Date(),
          modelName: 'test-model',
          dimensions: 3,
          vectorData: JSON.stringify([1, 2, 3]),
        },
        {
          id: 'emb2',
          chunkId: 'chunk2',
          createdAt: new Date(),
          updatedAt: new Date(),
          modelName: 'test-model',
          dimensions: 3,
          vectorData: JSON.stringify([4, 5, 6]),
        },
      ];

      // Set the mock return value
      (mockPrismaClient.embedding.findMany as jest.Mock).mockResolvedValueOnce(mockEmbeddings);

      // Call the function
      const result = await getEmbeddingsWithVectors(['chunk1', 'chunk2']);

      // Verify
      expect(mockPrismaClient.embedding.findMany).toHaveBeenCalledWith({
        where: {
          chunkId: { in: ['chunk1', 'chunk2'] },
        },
      });

      expect(result.size).toBe(2);
      expect(result.get('chunk1')).toBeDefined();
      expect(result.get('chunk2')).toBeDefined();
      expect(result.get('chunk1')?.parsedVector).toEqual([1, 2, 3]);
      expect(result.get('chunk2')?.parsedVector).toEqual([4, 5, 6]);
    });

    it('should handle parsing errors gracefully', async () => {
      // Setup mock data with invalid JSON
      const mockEmbeddings = [
        {
          id: 'emb1',
          chunkId: 'chunk1',
          createdAt: new Date(),
          updatedAt: new Date(),
          modelName: 'test-model',
          dimensions: 3,
          vectorData: 'invalid json',
        },
      ];

      // Mock console.error to avoid polluting test output
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Set the mock return value
      (mockPrismaClient.embedding.findMany as jest.Mock).mockResolvedValueOnce(mockEmbeddings);

      // Call the function
      const result = await getEmbeddingsWithVectors(['chunk1']);

      // Verify
      expect(result.size).toBe(0); // No valid embeddings found
      expect(consoleSpy).toHaveBeenCalled(); // Error was logged

      // Restore console.error
      consoleSpy.mockRestore();
    });
  });

  describe('vectorSimilaritySearch', () => {
    it('should perform vector similarity search with default options', async () => {
      // Setup mock chunks
      const mockChunks = [
        {
          id: 'chunk1',
          documentId: 'doc1',
          content: 'test content 1',
          keywordsString: 'key1,key2',
          metadata: '{}',
          startPosition: 0,
          endPosition: 100,
          chunkIndex: 0,
          isFirst: true,
          isLast: false,
          tokens: 20,
          embeddingModel: 'test-model',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'chunk2',
          documentId: 'doc2',
          content: 'test content 2',
          keywordsString: 'key3,key4',
          metadata: '{}',
          startPosition: 0,
          endPosition: 100,
          chunkIndex: 0,
          isFirst: true,
          isLast: false,
          tokens: 20,
          embeddingModel: 'test-model',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      // Mock embeddings
      const mockEmbeddingsMap = new Map();
      mockEmbeddingsMap.set('chunk1', {
        id: 'emb1',
        chunkId: 'chunk1',
        createdAt: new Date(),
        updatedAt: new Date(),
        modelName: 'test-model',
        dimensions: 3,
        vectorData: '[1,2,3]',
        parsedVector: [1, 2, 3],
      });
      mockEmbeddingsMap.set('chunk2', {
        id: 'emb2',
        chunkId: 'chunk2',
        createdAt: new Date(),
        updatedAt: new Date(),
        modelName: 'test-model',
        dimensions: 3,
        vectorData: '[4,5,6]',
        parsedVector: [4, 5, 6],
      });

      // Set the mock return value
      (mockPrismaClient.chunk.findMany as jest.Mock).mockResolvedValueOnce(mockChunks);

      // Mock getEmbeddingsWithVectors
      jest
        .spyOn(require('../../../src/lib/db/vector-operations'), 'getEmbeddingsWithVectors')
        .mockResolvedValueOnce(mockEmbeddingsMap);

      // Query vector
      const queryVector = [1, 1, 1];

      // Call the function
      const results = await vectorSimilaritySearch(queryVector);

      // Verify
      expect(mockPrismaClient.chunk.findMany).toHaveBeenCalled();
      expect(results.length).toBe(2);
      expect(results[0].chunk.id).toBeDefined();
      expect(results[0].score).toBeDefined();
      expect(results[0].distance).toBeDefined();

      // Results should be sorted by score (highest first)
      expect(results[0].score).toBeGreaterThanOrEqual(results[1].score);
    });

    it('should apply filters correctly', async () => {
      // Setup mock chunks
      const mockChunks = [
        {
          id: 'chunk1',
          documentId: 'doc1',
          content: 'test content 1',
          keywordsString: 'key1,key2',
          metadata: '{}',
          startPosition: 0,
          endPosition: 100,
          chunkIndex: 0,
          isFirst: true,
          isLast: false,
          tokens: 20,
          embeddingModel: 'model1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      // Mock embeddings
      const mockEmbeddingsMap = new Map();
      mockEmbeddingsMap.set('chunk1', {
        id: 'emb1',
        chunkId: 'chunk1',
        createdAt: new Date(),
        updatedAt: new Date(),
        modelName: 'model1',
        dimensions: 3,
        vectorData: '[1,2,3]',
        parsedVector: [1, 2, 3],
      });

      // Set the mock return value
      (mockPrismaClient.chunk.findMany as jest.Mock).mockResolvedValueOnce(mockChunks);

      // Mock getEmbeddingsWithVectors
      jest
        .spyOn(require('../../../src/lib/db/vector-operations'), 'getEmbeddingsWithVectors')
        .mockResolvedValueOnce(mockEmbeddingsMap);

      // Query vector
      const queryVector = [1, 1, 1];

      // Call the function with filters
      await vectorSimilaritySearch(queryVector, {
        filterDocumentIds: ['doc1'],
        filterUserId: 'user1',
        modelNames: ['model1'],
        includeDocument: true,
        limit: 5,
        minScore: 0.5,
      });

      // Verify that the filters were applied
      expect(mockPrismaClient.chunk.findMany).toHaveBeenCalledWith({
        where: {
          documentId: { in: ['doc1'] },
          document: { userId: 'user1' },
        },
        include: {
          document: true,
        },
      });
    });

    it('should handle empty results gracefully', async () => {
      // Set the mock return value
      (mockPrismaClient.chunk.findMany as jest.Mock).mockResolvedValueOnce([]);

      // Call the function
      const results = await vectorSimilaritySearch([1, 1, 1]);

      // Verify
      expect(results).toEqual([]);
    });

    it('should filter results by minimum score', async () => {
      // Setup mock chunks
      const mockChunks = [
        { id: 'chunk1', documentId: 'doc1', embeddingModel: 'test-model' },
        { id: 'chunk2', documentId: 'doc2', embeddingModel: 'test-model' },
      ];

      // Mock embeddings with very different vectors
      const mockEmbeddingsMap = new Map();
      mockEmbeddingsMap.set('chunk1', {
        id: 'emb1',
        chunkId: 'chunk1',
        parsedVector: [1, 0, 0], // This will have high similarity with query [1, 0, 0]
        vectorData: '[1,0,0]',
      });
      mockEmbeddingsMap.set('chunk2', {
        id: 'emb2',
        chunkId: 'chunk2',
        parsedVector: [0, 0, 1], // This will have low similarity with query [1, 0, 0]
        vectorData: '[0,0,1]',
      });

      // Set the mock return value
      (mockPrismaClient.chunk.findMany as jest.Mock).mockResolvedValueOnce(mockChunks);

      // Mock getEmbeddingsWithVectors
      jest
        .spyOn(require('../../../src/lib/db/vector-operations'), 'getEmbeddingsWithVectors')
        .mockResolvedValueOnce(mockEmbeddingsMap);

      // Query vector (should have high similarity with [1, 0, 0] but low with [0, 0, 1])
      const queryVector = [1, 0, 0];

      // Call the function with high minScore
      const results = await vectorSimilaritySearch(queryVector, { minScore: 0.9 });

      // We expect only chunk1 to have a score higher than 0.9
      expect(results.length).toBe(1);
      expect(results[0].chunk.id).toBe('chunk1');
    });
  });

  describe('hybridSearch', () => {
    it('should combine vector search with keyword filtering', async () => {
      // Create spy on vectorSimilaritySearch
      const vectorSearchSpy = jest.spyOn(
        require('../../../src/lib/db/vector-operations'),
        'vectorSimilaritySearch'
      );

      // Mock vectorSimilaritySearch to return test results
      const mockResults: VectorSearchResult[] = [
        {
          chunk: {
            id: 'chunk1',
            content: 'test content with keyword1',
            keywordsString: 'keyword1,test',
          } as any,
          score: 0.7,
          distance: 0.3,
        },
        {
          chunk: {
            id: 'chunk2',
            content: 'another content with keyword2',
            keywordsString: 'keyword2',
          } as any,
          score: 0.6,
          distance: 0.4,
        },
      ];

      vectorSearchSpy.mockResolvedValueOnce(mockResults);

      // Call hybridSearch with keywords
      const results = await hybridSearch([1, 2, 3], ['keyword1']);

      // Verify vectorSimilaritySearch was called with adjusted parameters
      expect(vectorSearchSpy).toHaveBeenCalled();

      // Verify results include keyword boosting
      expect(results.length).toBe(2);

      // The first result should have a boosted score since it contains "keyword1"
      expect(results[0].score).toBeGreaterThan(mockResults[0].score);

      // Clean up
      vectorSearchSpy.mockRestore();
    });

    it('should fall back to vector search when no keywords are provided', async () => {
      // Create spy on vectorSimilaritySearch
      const vectorSearchSpy = jest.spyOn(
        require('../../../src/lib/db/vector-operations'),
        'vectorSimilaritySearch'
      );

      // Mock vectorSimilaritySearch to return test results
      vectorSearchSpy.mockResolvedValueOnce([
        {
          chunk: { id: 'chunk1' } as any,
          score: 0.7,
          distance: 0.3,
        },
      ]);

      // Call hybridSearch with empty keywords
      await hybridSearch([1, 2, 3], []);

      // Verify vectorSimilaritySearch was called directly
      expect(vectorSearchSpy).toHaveBeenCalledWith([1, 2, 3], {});

      // Clean up
      vectorSearchSpy.mockRestore();
    });

    it('should fall back to vector search when keywords are empty after trimming', async () => {
      // Create spy on vectorSimilaritySearch
      const vectorSearchSpy = jest.spyOn(
        require('../../../src/lib/db/vector-operations'),
        'vectorSimilaritySearch'
      );

      // Mock vectorSimilaritySearch to return test results
      vectorSearchSpy.mockResolvedValueOnce([
        {
          chunk: { id: 'chunk1' } as any,
          score: 0.7,
          distance: 0.3,
        },
      ]);

      // Call hybridSearch with empty or whitespace-only keywords
      await hybridSearch([1, 2, 3], ['', '  ']);

      // Verify vectorSimilaritySearch was called directly
      expect(vectorSearchSpy).toHaveBeenCalledWith([1, 2, 3], {});

      // Clean up
      vectorSearchSpy.mockRestore();
    });

    it('should filter results below minimum score after boosting', async () => {
      // Create spy on vectorSimilaritySearch
      const vectorSearchSpy = jest.spyOn(
        require('../../../src/lib/db/vector-operations'),
        'vectorSimilaritySearch'
      );

      // Mock vectorSimilaritySearch to return test results
      const mockResults: VectorSearchResult[] = [
        {
          chunk: {
            id: 'chunk1',
            content: 'test content with keyword1',
            keywordsString: 'keyword1',
          } as any,
          score: 0.65, // Below threshold but will be boosted
          distance: 0.35,
        },
        {
          chunk: {
            id: 'chunk2',
            content: 'content without match',
            keywordsString: '',
          } as any,
          score: 0.65, // Below threshold and won't be boosted
          distance: 0.35,
        },
      ];

      vectorSearchSpy.mockResolvedValueOnce(mockResults);

      // Call hybridSearch with keywords and minimum score
      const results = await hybridSearch([1, 2, 3], ['keyword1'], { minScore: 0.7 });

      // Verify only the boosted result is returned
      expect(results.length).toBe(1);
      expect(results[0].chunk.id).toBe('chunk1');

      // Clean up
      vectorSearchSpy.mockRestore();
    });
  });
});
