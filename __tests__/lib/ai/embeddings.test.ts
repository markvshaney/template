/**
 * Tests for embeddings module
 */

import { EmbeddingGenerator } from '../../../src/lib/ai/embeddings';
import { OllamaClient } from '../../../src/lib/ai/ollama';
import { getPreferredModelForCapability } from '../../../src/lib/ai/models';
import { Document, DocumentChunk } from '../../../src/lib/rag/document-processing';
import { BatchProcessor } from '../../../src/lib/ai/batch-processing';

// Mock dependencies
jest.mock('../../../src/lib/ai/ollama');
jest.mock('../../../src/lib/ai/models');
jest.mock('../../../src/lib/ai/batch-processing');

describe('EmbeddingGenerator', () => {
  let mockOllamaClient: jest.Mocked<OllamaClient>;
  let generator: EmbeddingGenerator;

  beforeEach(() => {
    jest.clearAllMocks();
    mockOllamaClient = new OllamaClient() as jest.Mocked<OllamaClient>;

    // Mock createEmbedding method
    mockOllamaClient.createEmbedding = jest.fn().mockResolvedValue({
      embedding: [0.1, 0.2, 0.3, 0.4],
      model: 'nomic-embed-text',
      took: 0.1,
    });

    // Mock getPreferredModelForCapability
    (getPreferredModelForCapability as jest.Mock).mockReturnValue({
      name: 'nomic-embed-text',
      displayName: 'Nomic Embed Text',
      capabilities: ['embedding'],
    });

    // Mock BatchProcessor
    (BatchProcessor as jest.Mock).mockImplementation(function (this: any, options: any) {
      this.processBatch = jest.fn().mockImplementation(async (items: string[]) => {
        // Simulate batch processing by calling the provided processorFn for each item
        if (items.length === 0) return [];
        const results = await Promise.all(items.map((item) => options.processorFn([item])));
        return results.flat();
      });
      return this;
    });

    generator = new EmbeddingGenerator(mockOllamaClient);
  });

  describe('Constructor', () => {
    test('Should create an instance with default config', () => {
      expect(generator).toBeDefined();
    });

    test('Should create an instance with custom config', () => {
      const customGenerator = new EmbeddingGenerator(mockOllamaClient, {
        model: 'custom-model',
        batchSize: 5,
        normalize: false,
        cacheEnabled: false,
      });
      expect(customGenerator).toBeDefined();
    });
  });

  describe('generateEmbedding', () => {
    test('Should generate embedding for a single text', async () => {
      const text = 'This is a test text';
      const result = await generator.generateEmbedding(text);

      expect(result).toEqual([0.1, 0.2, 0.3, 0.4]);
      expect(mockOllamaClient.createEmbedding).toHaveBeenCalledWith({
        model: 'nomic-embed-text',
        prompt: text,
        options: undefined,
      });
    });

    test('Should normalize embeddings when configured', async () => {
      // Create a generator with normalization enabled
      const normalizeGenerator = new EmbeddingGenerator(mockOllamaClient, {
        normalize: true,
      });

      // Mock implementation to return un-normalized vector
      mockOllamaClient.createEmbedding.mockResolvedValueOnce({
        embedding: [1, 0, 0, 0], // Vector with magnitude 1
        model: 'nomic-embed-text',
        took: 0.1,
      });

      const result = await normalizeGenerator.generateEmbedding('test');

      // Vector should still have magnitude 1
      const magnitude = Math.sqrt(result.reduce((sum, val) => sum + val * val, 0));
      expect(magnitude).toBeCloseTo(1, 5);
    });

    test('Should use cache when enabled', async () => {
      // Create a generator with caching enabled
      const cacheGenerator = new EmbeddingGenerator(mockOllamaClient, {
        cacheEnabled: true,
      });

      // First call should use the API
      await cacheGenerator.generateEmbedding('cached text');
      expect(mockOllamaClient.createEmbedding).toHaveBeenCalledTimes(1);

      // Second call should use the cache
      await cacheGenerator.generateEmbedding('cached text');
      expect(mockOllamaClient.createEmbedding).toHaveBeenCalledTimes(1); // Still 1, not 2
    });

    test('Should handle errors', async () => {
      mockOllamaClient.createEmbedding.mockRejectedValueOnce(new Error('API error'));

      await expect(generator.generateEmbedding('test')).rejects.toThrow(
        'Failed to generate embedding'
      );
    });

    test('Should retry on failure', async () => {
      // Configure a generator with retries
      const retryGenerator = new EmbeddingGenerator(mockOllamaClient, {
        maxRetries: 2,
        retryDelay: 10,
      });

      // First call fails, second succeeds
      mockOllamaClient.createEmbedding
        .mockRejectedValueOnce(new Error('Temporary error'))
        .mockResolvedValueOnce({
          embedding: [0.1, 0.2, 0.3, 0.4],
          model: 'nomic-embed-text',
          took: 0.1,
        });

      const result = await retryGenerator.generateEmbedding('retry test');
      expect(result).toEqual([0.1, 0.2, 0.3, 0.4]);
      expect(mockOllamaClient.createEmbedding).toHaveBeenCalledTimes(2);
    });
  });

  describe('generateEmbeddings', () => {
    test('Should generate embeddings for multiple texts', async () => {
      const texts = ['Text 1', 'Text 2', 'Text 3'];

      // Mock multiple responses
      mockOllamaClient.createEmbedding
        .mockResolvedValueOnce({
          embedding: [0.1, 0.2, 0.3, 0.4],
          model: 'nomic-embed-text',
          took: 0.1,
        })
        .mockResolvedValueOnce({
          embedding: [0.2, 0.3, 0.4, 0.5],
          model: 'nomic-embed-text',
          took: 0.1,
        })
        .mockResolvedValueOnce({
          embedding: [0.3, 0.4, 0.5, 0.6],
          model: 'nomic-embed-text',
          took: 0.1,
        });

      const results = await generator.generateEmbeddings(texts);

      expect(results.length).toBe(3);
      expect(mockOllamaClient.createEmbedding).toHaveBeenCalledTimes(3);
    });

    test('Should handle empty input', async () => {
      const results = await generator.generateEmbeddings([]);
      expect(results).toEqual([]);
      expect(mockOllamaClient.createEmbedding).not.toHaveBeenCalled();
    });
  });

  describe('generateChunkEmbeddings', () => {
    test('Should generate embeddings for document chunks', async () => {
      // Create proper DocumentChunk objects
      const chunks: DocumentChunk[] = [
        {
          id: '1',
          documentId: 'doc1',
          content: 'Chunk 1',
          metadata: {},
          startPosition: 0,
          endPosition: 7,
        },
        {
          id: '2',
          documentId: 'doc1',
          content: 'Chunk 2',
          metadata: {},
          startPosition: 8,
          endPosition: 15,
        },
      ];

      // Mock multiple responses
      mockOllamaClient.createEmbedding
        .mockResolvedValueOnce({
          embedding: [0.1, 0.2, 0.3, 0.4],
          model: 'nomic-embed-text',
          took: 0.1,
        })
        .mockResolvedValueOnce({
          embedding: [0.2, 0.3, 0.4, 0.5],
          model: 'nomic-embed-text',
          took: 0.1,
        });

      const results = await generator.generateChunkEmbeddings(chunks);

      expect(results.length).toBe(2);
      expect(results[0].embedding).toEqual([0.1, 0.2, 0.3, 0.4]);
      expect(results[1].embedding).toEqual([0.2, 0.3, 0.4, 0.5]);
      expect(results[0].id).toBe('1');
      expect(results[1].id).toBe('2');
    });
  });

  describe('Specialized embedding methods', () => {
    test('generateQueryEmbedding should use query-specific model if available', async () => {
      const queryGenerator = new EmbeddingGenerator(mockOllamaClient, {
        model: 'default-model',
        queryModel: 'query-model',
      });

      await queryGenerator.generateQueryEmbedding('query text');

      expect(mockOllamaClient.createEmbedding).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'query-model',
          prompt: 'query text',
        })
      );
    });

    test('generateCodeEmbedding should format code appropriately', async () => {
      await generator.generateCodeEmbedding('const x = 1;', 'javascript');

      expect(mockOllamaClient.createEmbedding).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: '[javascript]\nconst x = 1;',
        })
      );
    });
  });

  describe('Vector operations', () => {
    test('calculateCosineSimilarity should calculate similarity correctly', () => {
      const vec1 = [1, 0, 0, 0];
      const vec2 = [0, 1, 0, 0];
      const vec3 = [1, 1, 0, 0];

      expect(generator.calculateCosineSimilarity(vec1, vec1)).toBeCloseTo(1, 5);
      expect(generator.calculateCosineSimilarity(vec1, vec2)).toBeCloseTo(0, 5);
      expect(generator.calculateCosineSimilarity(vec1, vec3)).toBeCloseTo(0.7071, 4);
    });

    test('findSimilarTexts should return sorted similar texts', () => {
      const queryEmbedding = [1, 0, 0, 0];
      const textEmbeddings = [
        { text: 'Text A', embedding: [0.5, 0.5, 0, 0] }, // Similarity: 0.7071
        { text: 'Text B', embedding: [0.8, 0.2, 0, 0] }, // Similarity: 0.9701
        { text: 'Text C', embedding: [0.2, 0.8, 0, 0] }, // Similarity: 0.2425
      ];

      const results = generator.findSimilarTexts(queryEmbedding, textEmbeddings, 2);

      expect(results.length).toBe(2);
      expect(results[0].text).toBe('Text B'); // Most similar
      expect(results[1].text).toBe('Text A'); // Second most similar
    });
  });

  describe('Static methods', () => {
    test('getBestEmbeddingModel should return a model name', () => {
      const modelName = EmbeddingGenerator.getBestEmbeddingModel();
      expect(modelName).toBe('nomic-embed-text');
      expect(getPreferredModelForCapability).toHaveBeenCalledWith('embedding');
    });

    test('createWithBestModel should return a configured generator', () => {
      const generator = EmbeddingGenerator.createWithBestModel(mockOllamaClient);
      expect(generator).toBeInstanceOf(EmbeddingGenerator);
    });

    test('clearCache should clear the embedding cache', async () => {
      // Create a generator with caching enabled
      const cacheGenerator = new EmbeddingGenerator(mockOllamaClient, {
        cacheEnabled: true,
      });

      // Cache an embedding
      await cacheGenerator.generateEmbedding('cached text');
      expect(mockOllamaClient.createEmbedding).toHaveBeenCalledTimes(1);

      // Second call should use the cache
      await cacheGenerator.generateEmbedding('cached text');
      expect(mockOllamaClient.createEmbedding).toHaveBeenCalledTimes(1);

      // Clear the cache
      EmbeddingGenerator.clearCache();

      // Now should call the API again
      await cacheGenerator.generateEmbedding('cached text');
      expect(mockOllamaClient.createEmbedding).toHaveBeenCalledTimes(2);
    });
  });
});
