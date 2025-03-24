/**
 * Embeddings Module
 * Utilities for generating embeddings using Ollama
 */

import { OllamaClient, EmbeddingOptions } from './ollama';
import { Document, DocumentChunk } from '../rag/document-processing';
import { VectorChunk } from '../rag/vector-store';

/**
 * Configuration for embedding generation
 */
export interface EmbeddingConfig {
  /** Model to use for embedding generation */
  model: string;
  /** Batch size for processing multiple texts */
  batchSize?: number;
  /** Whether to normalize the embeddings */
  normalize?: boolean;
  /** Additional model parameters */
  modelParams?: Record<string, any>;
}

/**
 * Default embedding configuration
 */
const DEFAULT_EMBEDDING_CONFIG: EmbeddingConfig = {
  model: 'nomic-embed-text',
  batchSize: 10,
  normalize: true,
};

/**
 * Embedding generator using Ollama models
 */
export class EmbeddingGenerator {
  private client: OllamaClient;
  private config: EmbeddingConfig;

  constructor(client?: OllamaClient, config: Partial<EmbeddingConfig> = {}) {
    this.client = client || new OllamaClient();
    this.config = {
      ...DEFAULT_EMBEDDING_CONFIG,
      ...config,
    };
  }

  /**
   * Generate embeddings for a single text
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const options: EmbeddingOptions = {
        model: this.config.model,
        prompt: text,
        options: this.config.modelParams,
      };

      const response = await this.client.createEmbedding(options);
      let embedding = response.embedding;

      // Normalize if requested
      if (this.config.normalize) {
        embedding = this.normalizeEmbedding(embedding);
      }

      return embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw new Error(
        `Failed to generate embedding: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Generate embeddings for multiple texts in batches
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) {
      return [];
    }

    // Process in batches
    const batchSize = this.config.batchSize || 10;
    const batches: string[][] = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      batches.push(texts.slice(i, i + batchSize));
    }

    // Process each batch
    const embeddings: number[][] = [];

    for (const batch of batches) {
      const batchPromises = batch.map((text) => this.generateEmbedding(text));
      const batchEmbeddings = await Promise.all(batchPromises);
      embeddings.push(...batchEmbeddings);
    }

    return embeddings;
  }

  /**
   * Generate embeddings for document chunks
   */
  async generateChunkEmbeddings(chunks: DocumentChunk[]): Promise<VectorChunk[]> {
    // Extract content from chunks
    const contents = chunks.map((chunk) => chunk.content);

    // Generate embeddings for all chunk contents
    const embeddings = await this.generateEmbeddings(contents);

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
  async embedDocument(document: Document, chunks: DocumentChunk[]): Promise<VectorChunk[]> {
    return this.generateChunkEmbeddings(chunks);
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
