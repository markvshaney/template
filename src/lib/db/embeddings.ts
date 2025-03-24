/**
 * Embeddings Storage Module
 * Utilities for storing and retrieving vector embeddings from the database
 */

import { PrismaClient, Embedding as PrismaEmbedding, Chunk as PrismaChunk } from '@prisma/client';

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
  document?: any; // Full document if includeDocument is true
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
      vector: input.vector as any,
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
          vector: embedding.vector as any,
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
  const data: any = { vector: vector as any };
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
  const {
    limit = 5,
    minScore = 0.7,
    filterByDocumentIds,
    includeMetadata = true,
    includeDocument = false,
  } = options;

  // For now, retrieve all relevant chunks since we don't have vector search in DB yet
  // In a real implementation, this would be a vector similarity query
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

  // Compute similarity scores in memory
  // In production, this would be done by the database
  const results = chunks
    .map((chunk) => {
      // For demonstration purposes, we're treating the embedding as any[]
      // In a real application, you would use proper vector operations
      const embedding = chunk.embedding as unknown as number[];

      // Calculate cosine similarity (simplified)
      let score = 0;
      if (embedding && embedding.length === queryVector.length) {
        score = cosineSimilarity(queryVector, embedding);
      }

      return {
        chunk,
        score,
        document: includeDocument ? chunk.document : undefined,
      };
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
