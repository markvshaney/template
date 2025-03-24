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
} from '../../../src/lib/db/vector-operations';

// Mock the PrismaClient to avoid database calls during testing
jest.mock('@prisma/client', () => {
  const mockPrisma = {
    embedding: {
      findMany: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    chunk: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn((callbacks: Function[]) =>
      Promise.all(callbacks.map((callback) => callback()))
    ),
  };

  return {
    PrismaClient: jest.fn(() => mockPrisma),
  };
});

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
