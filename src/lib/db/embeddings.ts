/**
 * Embeddings Storage Module
 * Utilities for storing and retrieving vector embeddings from the database
 */

import {
  PrismaClient,
  Embedding as PrismaEmbedding,
  Chunk as PrismaChunk,
  Document as PrismaDocument,
} from '@prisma/client';

// Initialize Prisma client
const prisma = new PrismaClient();

/**
 * Interface for embedding input
 */
export interface EmbeddingInput {
  chunkId: string;
  modelName: string;
  dimensions: number;
  vector: number[];
}

/**
 * Interface for similarity search options
 */
export interface SimilaritySearchOptions {
  limit?: number;
  minScore?: number;
  filterByDocumentIds?: string[];
  includeMetadata?: boolean;
  includeDocument?: boolean;
}

/**
 * Interface for similarity search result
 */
export interface SimilaritySearchResult {
  chunk: PrismaChunk;
  score: number;
  document?: PrismaDocument; // Full document if includeDocument is true
}

/**
 * Store an embedding in the database
 */
export async function storeEmbedding(input: EmbeddingInput): Promise<PrismaEmbedding> {
  return prisma.embedding.create({
    data: {
      chunkId: input.chunkId,
      modelName: input.modelName,
      dimensions: input.dimensions,
      vectorData: JSON.stringify(input.vector), // Convert vector to string for storage
    },
  });
}

/**
 * Store multiple embeddings in a transaction
 */
export async function storeEmbeddings(embeddings: EmbeddingInput[]): Promise<PrismaEmbedding[]> {
  return prisma.$transaction(
    embeddings.map((embedding) =>
      prisma.embedding.create({
        data: {
          chunkId: embedding.chunkId,
          modelName: embedding.modelName,
          dimensions: embedding.dimensions,
          vectorData: JSON.stringify(embedding.vector), // Convert vector to string for storage
        },
      })
    )
  );
}

/**
 * Update an embedding for a chunk
 */
export async function updateEmbedding(
  chunkId: string,
  vector: number[],
  modelName?: string
): Promise<PrismaEmbedding> {
  const data: { vectorData: string; modelName?: string } = {
    vectorData: JSON.stringify(vector),
  };

  if (modelName) {
    data.modelName = modelName;
  }

  return prisma.embedding.update({
    where: { chunkId },
    data,
  });
}

/**
 * Get embedding by chunk ID
 */
export async function getEmbeddingByChunkId(chunkId: string): Promise<PrismaEmbedding | null> {
  return prisma.embedding.findUnique({
    where: { chunkId },
  });
}

/**
 * Delete embedding by chunk ID
 */
export async function deleteEmbedding(chunkId: string): Promise<void> {
  await prisma.embedding.delete({
    where: { chunkId },
  });
}

/**
 * Delete all embeddings for a document (via chunks)
 */
export async function deleteDocumentEmbeddings(documentId: string): Promise<void> {
  // Find all chunks for the document
  const chunks = await prisma.chunk.findMany({
    where: { documentId },
    select: { id: true },
  });

  // Delete all embeddings for those chunks
  await prisma.embedding.deleteMany({
    where: {
      chunkId: {
        in: chunks.map((chunk) => chunk.id),
      },
    },
  });
}

/**
 * Perform vector similarity search
 *
 * This is a simplified version. In production, you would:
 * 1. Use the pgvector extension with PostgreSQL
 * 2. Implement proper vector indexing
 * 3. Use optimized SQL queries with vector operators
 *
 * For simplicity, we're using a basic approach here
 */
export async function similaritySearch(
  queryVector: number[],
  options: SimilaritySearchOptions = {}
): Promise<SimilaritySearchResult[]> {
  const { limit = 5, minScore = 0.7, filterByDocumentIds, includeDocument = false } = options;

  // First, get all relevant chunks
  const chunks = await prisma.chunk.findMany({
    where: {
      ...(filterByDocumentIds
        ? {
            documentId: { in: filterByDocumentIds },
          }
        : {}),
    },
    include: {
      document: includeDocument,
    },
  });

  // Then, get the embeddings separately
  const chunkIds = chunks.map((chunk) => chunk.id);
  const embeddings = await prisma.embedding.findMany({
    where: {
      chunkId: { in: chunkIds },
    },
  });

  // Create a lookup map for faster access
  const embeddingMap = new Map<string, string>();
  for (const embedding of embeddings) {
    embeddingMap.set(embedding.chunkId, embedding.vectorData);
  }

  // Compute similarity scores in memory
  const results = chunks
    .map((chunk) => {
      const vectorData = embeddingMap.get(chunk.id);

      // Skip chunks without embeddings
      if (!vectorData) {
        return { chunk, score: 0, document: includeDocument ? chunk.document : undefined };
      }

      try {
        // Parse the vector data from JSON string
        const embeddingVector = JSON.parse(vectorData) as number[];

        // Calculate cosine similarity
        let score = 0;
        if (embeddingVector && embeddingVector.length === queryVector.length) {
          score = cosineSimilarity(queryVector, embeddingVector);
        }

        return {
          chunk,
          score,
          document: includeDocument ? chunk.document : undefined,
        };
      } catch (error) {
        console.error(`Error parsing vector data for chunk ${chunk.id}:`, error);
        return { chunk, score: 0, document: includeDocument ? chunk.document : undefined };
      }
    })
    .filter((result) => result.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return results;
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same dimensions');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
}

/**
 * Count embeddings for a document (via chunks)
 */
export async function countDocumentEmbeddings(documentId: string): Promise<number> {
  // Find all chunks for the document
  const chunks = await prisma.chunk.findMany({
    where: { documentId },
    select: { id: true },
  });

  // Count all embeddings for those chunks
  return prisma.embedding.count({
    where: {
      chunkId: {
        in: chunks.map((chunk) => chunk.id),
      },
    },
  });
}
