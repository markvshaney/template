/**
 * Vector Store Module
 * Simple in-memory vector store for RAG applications
 */

import { DocumentChunk } from './document-processing';

/**
 * Vector representation of a document chunk
 */
export interface VectorChunk {
  /** Chunk ID */
  id: string;
  /** Document ID */
  documentId: string;
  /** Document chunk */
  chunk: DocumentChunk;
  /** Vector embedding */
  embedding: number[];
  /** Metadata fields for filtering */
  metadata: Record<string, any>;
}

/**
 * Result of a vector search
 */
export interface VectorSearchResult {
  /** Chunk ID */
  id: string;
  /** Document ID */
  documentId: string;
  /** Document chunk */
  chunk: DocumentChunk;
  /** Similarity score (0-1, higher is more similar) */
  score: number;
}

/**
 * Options for vector search
 */
export interface VectorSearchOptions {
  /** Maximum number of results to return */
  limit?: number;
  /** Minimum similarity score threshold */
  minScore?: number;
  /** Filter by metadata */
  filter?: Record<string, any>;
}

/**
 * Simple in-memory vector store
 */
export class InMemoryVectorStore {
  private vectors: VectorChunk[] = [];

  /**
   * Add a vector to the store
   */
  addVector(vector: VectorChunk): void {
    this.vectors.push(vector);
  }

  /**
   * Add multiple vectors to the store
   */
  addVectors(vectors: VectorChunk[]): void {
    this.vectors.push(...vectors);
  }

  /**
   * Get a vector by ID
   */
  getVector(id: string): VectorChunk | undefined {
    return this.vectors.find((v) => v.id === id);
  }

  /**
   * Delete a vector by ID
   */
  deleteVector(id: string): boolean {
    const initialLength = this.vectors.length;
    this.vectors = this.vectors.filter((v) => v.id !== id);
    return initialLength !== this.vectors.length;
  }

  /**
   * Delete vectors by document ID
   */
  deleteVectorsByDocumentId(documentId: string): number {
    const initialLength = this.vectors.length;
    this.vectors = this.vectors.filter((v) => v.documentId !== documentId);
    return initialLength - this.vectors.length;
  }

  /**
   * Search for similar vectors
   */
  search(embedding: number[], options: VectorSearchOptions = {}): VectorSearchResult[] {
    const { limit = 10, minScore = 0, filter } = options;

    // Apply filter if provided
    let filteredVectors = this.vectors;
    if (filter) {
      filteredVectors = this.vectors.filter((v) => {
        for (const [key, value] of Object.entries(filter)) {
          // Handle nested metadata paths (e.g., 'metadata.author')
          const keyParts = key.split('.');
          let currentValue: any = v;

          for (const part of keyParts) {
            if (currentValue === undefined || currentValue === null) {
              return false;
            }
            currentValue = currentValue[part];
          }

          if (currentValue !== value) {
            return false;
          }
        }
        return true;
      });
    }

    // Calculate similarity scores
    const results = filteredVectors.map((v) => {
      const score = this.cosineSimilarity(embedding, v.embedding);
      return {
        id: v.id,
        documentId: v.documentId,
        chunk: v.chunk,
        score,
      };
    });

    // Filter by minimum score
    const filteredResults = results.filter((r) => r.score >= minScore);

    // Sort by score (highest first)
    const sortedResults = filteredResults.sort((a, b) => b.score - a.score);

    // Limit the number of results
    return sortedResults.slice(0, limit);
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error(`Vector dimensions do not match: ${a.length} vs ${b.length}`);
    }

    // Calculate dot product
    let dotProduct = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
    }

    // Calculate magnitudes
    let magnitudeA = 0;
    let magnitudeB = 0;
    for (let i = 0; i < a.length; i++) {
      magnitudeA += a[i] * a[i];
      magnitudeB += b[i] * b[i];
    }

    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);

    // Avoid division by zero
    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0;
    }

    // Return cosine similarity
    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * Get the number of vectors in the store
   */
  get size(): number {
    return this.vectors.length;
  }

  /**
   * Clear the vector store
   */
  clear(): void {
    this.vectors = [];
  }
}
