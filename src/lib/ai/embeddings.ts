/**
 * Embeddings Module
 * Utilities for generating embeddings using Ollama
 */

import { OllamaClient } from './ollama';
import { EmbeddingConfig, EmbeddingOptions } from './types';
import { Document, DocumentChunk } from '../rag/document-processing';
import { VectorChunk } from '../rag/vector-store';
import { getPreferredModelForCapability } from './models';
import { BatchProcessor, BatchProcessingOptions } from './batch-processing';

/**
 * Default embedding configuration
 */
const DEFAULT_EMBEDDING_CONFIG: EmbeddingConfig = {
  model: 'nomic-embed-text',
  batchSize: 10,
  normalize: true,
  cacheEnabled: true,
  // Retry settings
  maxRetries: 3,
  retryDelay: 1000,
};

/**
 * In-memory cache for embeddings to avoid redundant processing
 * Maps text content hash to embedding vector
 */
const embeddingCache = new Map<string, number[]>();

/**
 * Simple hash function for text
 */
function simpleHash(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return String(hash);
}

/**
 * Embedding generator using Ollama models
 */
export class EmbeddingGenerator {
  private client: OllamaClient;
  private config: EmbeddingConfig;
  private batchProcessor: BatchProcessor<string, number[]>;

  constructor(client?: OllamaClient, config: Partial<EmbeddingConfig> = {}) {
    this.client = client || new OllamaClient();
    this.config = {
      ...DEFAULT_EMBEDDING_CONFIG,
      ...config,
    };
    this.batchProcessor = new BatchProcessor<string, number[]>({
      batchSize: this.config.batchSize || DEFAULT_EMBEDDING_CONFIG.batchSize,
      maxConcurrent: this.config.maxConcurrent || 3,
      processorFn: this.processBatch.bind(this),
    });
  }

  /**
   * Generate embeddings for a single text
   */
  async generateEmbedding(text: string, options?: Partial<EmbeddingOptions>): Promise<number[]> {
    // Check cache if enabled
    if (this.config.cacheEnabled) {
      const textHash = simpleHash(text);
      const cachedEmbedding = embeddingCache.get(textHash);
      if (cachedEmbedding) {
        return cachedEmbedding;
      }
    }

    let retries = 0;
    const maxRetries = this.config.maxRetries || DEFAULT_EMBEDDING_CONFIG.maxRetries;
    const retryDelay = this.config.retryDelay || DEFAULT_EMBEDDING_CONFIG.retryDelay;

    while (true) {
      try {
        const embeddingOptions: EmbeddingOptions = {
          model: options?.model || this.config.model,
          prompt: text,
          options: options?.options || this.config.modelParams,
        };

        const response = await this.client.createEmbedding(embeddingOptions);
        let embedding = response.embedding;

        // Normalize if requested
        if (this.config.normalize) {
          embedding = this.normalizeEmbedding(embedding);
        }

        // Cache the result if enabled
        if (this.config.cacheEnabled) {
          const textHash = simpleHash(text);
          embeddingCache.set(textHash, embedding);
        }

        return embedding;
      } catch (error) {
        if (retries < maxRetries) {
          retries++;
          console.warn(`Retry ${retries}/${maxRetries} for embedding generation`);
          await new Promise((resolve) => setTimeout(resolve, retryDelay * retries));
        } else {
          console.error('Error generating embedding:', error);
          throw new Error(
            `Failed to generate embedding after ${maxRetries} attempts: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      }
    }
  }

  /**
   * Process a batch of texts for embedding
   * Internal method used by the BatchProcessor
   */
  private async processBatch(texts: string[]): Promise<number[][]> {
    const batchPromises = texts.map((text) => this.generateEmbedding(text));
    return Promise.all(batchPromises);
  }

  /**
   * Generate embeddings for multiple texts in batches
   */
  async generateEmbeddings(texts: string[], options?: BatchProcessingOptions): Promise<number[][]> {
    if (texts.length === 0) {
      return [];
    }

    return this.batchProcessor.processBatch(texts, options);
  }

  /**
   * Generate embeddings for document chunks
   */
  async generateChunkEmbeddings(
    chunks: DocumentChunk[],
    options?: BatchProcessingOptions
  ): Promise<VectorChunk[]> {
    // Extract content from chunks
    const contents = chunks.map((chunk) => chunk.content);

    // Generate embeddings for all chunk contents
    const embeddings = await this.generateEmbeddings(contents, options);

    // Map back to VectorChunk objects
    return chunks.map((chunk, index) => ({
      id: chunk.id,
      documentId: chunk.documentId,
      chunk,
      embedding: embeddings[index],
      metadata: chunk.metadata,
    }));
  }

  /**
   * Generate embeddings for a document
   */
  async embedDocument(
    document: Document,
    chunks: DocumentChunk[],
    options?: BatchProcessingOptions
  ): Promise<VectorChunk[]> {
    return this.generateChunkEmbeddings(chunks, options);
  }

  /**
   * Generate embeddings optimized for search queries
   * May use different models or parameters than document embeddings
   */
  async generateQueryEmbedding(query: string): Promise<number[]> {
    // For queries, we might want different parameters
    return this.generateEmbedding(query, {
      model: this.config.queryModel || this.config.model,
      options: {
        ...this.config.modelParams,
        // Add query-specific parameters if needed
      },
    });
  }

  /**
   * Generate embeddings for code content
   * Optimized for programming language content
   */
  async generateCodeEmbedding(code: string, language?: string): Promise<number[]> {
    // For code, we might want to use a code-specific model if available
    const prompt = language ? `[${language}]\n${code}` : code;

    return this.generateEmbedding(prompt, {
      model: this.config.codeModel || this.config.model,
    });
  }

  /**
   * Find the most similar texts based on embedding cosine similarity
   */
  findSimilarTexts(
    queryEmbedding: number[],
    textEmbeddings: Array<{ text: string; embedding: number[] }>,
    topK: number = 5
  ): Array<{ text: string; similarity: number }> {
    const similarities = textEmbeddings.map(({ text, embedding }) => ({
      text,
      similarity: this.calculateCosineSimilarity(queryEmbedding, embedding),
    }));

    // Sort by similarity (descending)
    similarities.sort((a, b) => b.similarity - a.similarity);

    // Return top K results
    return similarities.slice(0, topK);
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  calculateCosineSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embeddings must have the same dimensions');
    }

    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      magnitude1 += embedding1[i] * embedding1[i];
      magnitude2 += embedding2[i] * embedding2[i];
    }

    magnitude1 = Math.sqrt(magnitude1);
    magnitude2 = Math.sqrt(magnitude2);

    if (magnitude1 === 0 || magnitude2 === 0) {
      return 0;
    }

    return dotProduct / (magnitude1 * magnitude2);
  }

  /**
   * Clear the embedding cache
   */
  static clearCache(): void {
    embeddingCache.clear();
  }

  /**
   * Get the best embedding model based on capability
   */
  static getBestEmbeddingModel(): string {
    const preferredModel = getPreferredModelForCapability('embedding');
    return preferredModel?.name || DEFAULT_EMBEDDING_CONFIG.model;
  }

  /**
   * Create a new embedding generator with the best available model
   */
  static createWithBestModel(client?: OllamaClient): EmbeddingGenerator {
    return new EmbeddingGenerator(client, {
      model: EmbeddingGenerator.getBestEmbeddingModel(),
    });
  }

  /**
   * Normalize an embedding vector to unit length
   */
  private normalizeEmbedding(embedding: number[]): number[] {
    // Calculate magnitude
    let magnitude = 0;
    for (let i = 0; i < embedding.length; i++) {
      magnitude += embedding[i] * embedding[i];
    }
    magnitude = Math.sqrt(magnitude);

    // Avoid division by zero
    if (magnitude === 0) {
      return embedding;
    }

    // Normalize
    return embedding.map((value) => value / magnitude);
  }
}
