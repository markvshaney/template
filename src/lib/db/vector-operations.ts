/**
 * Vector Operations Module
 * Comprehensive utilities for vector operations and similarity search
 */

import { PrismaClient, Embedding as PrismaEmbedding, Chunk as PrismaChunk } from '@prisma/client';
import { EmbeddingVector, VectorSearchOptions } from './types';

// Initialize Prisma client
const prisma = new PrismaClient();

/**
 * Distance metric type
 */
export enum DistanceMetric {
  COSINE = 'cosine',
  EUCLIDEAN = 'euclidean',
  DOT_PRODUCT = 'dot_product',
  MANHATTAN = 'manhattan',
}

/**
 * Vector search result interface
 */
export interface VectorSearchResult {
  /** The chunk that matched */
  chunk: PrismaChunk;
  /** Similarity score (higher is more similar) */
  score: number;
  /** Distance value (lower is more similar) */
  distance: number;
  /** Parent document if requested */
  document?: any;
}

/**
 * Extended vector search options
 */
export interface ExtendedVectorSearchOptions {
  /** Query vector to search against */
  queryVector?: number[];
  /** Filter by document IDs */
  filterDocumentIds?: string[];
  /** Filter by user ID */
  filterUserId?: string;
  /** Maximum results to return */
  limit?: number;
  /** Minimum similarity score (0-1) */
  minScore?: number;
  /** Include document in results */
  includeDocument?: boolean;
  /** Distance/similarity metric to use */
  metric?: DistanceMetric;
  /** Whether to include content text */
  includeContent?: boolean;
  /** Filter by specific model names */
  modelNames?: string[];
}

/**
 * Embedding with vector data
 */
export interface EmbeddingWithVector {
  /** Embedding ID */
  id: string;
  /** Created timestamp */
  createdAt: Date;
  /** Updated timestamp */
  updatedAt: Date;
  /** Chunk ID */
  chunkId: string;
  /** Model name */
  modelName: string;
  /** Dimensions of the vector */
  dimensions: number;
  /** Vector data as string in database */
  vectorData: string;
  /** Parsed vector data as number array */
  parsedVector: number[];
}

/**
 * Calculate the dot product between two vectors
 */
export function dotProduct(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimensions do not match: ${a.length} vs ${b.length}`);
  }

  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += a[i] * b[i];
  }

  return sum;
}

/**
 * Calculate the magnitude (L2 norm) of a vector
 */
export function magnitude(vector: number[]): number {
  let sum = 0;
  for (let i = 0; i < vector.length; i++) {
    sum += vector[i] * vector[i];
  }

  return Math.sqrt(sum);
}

/**
 * Normalize a vector to unit length
 */
export function normalize(vector: number[]): number[] {
  const mag = magnitude(vector);

  if (mag === 0) {
    return Array(vector.length).fill(0);
  }

  return vector.map((v) => v / mag);
}

/**
 * Calculate cosine similarity between two vectors
 * Returns a value between -1 and 1 (1 being most similar)
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimensions do not match: ${a.length} vs ${b.length}`);
  }

  const magA = magnitude(a);
  const magB = magnitude(b);

  if (magA === 0 || magB === 0) {
    return 0;
  }

  return dotProduct(a, b) / (magA * magB);
}

/**
 * Calculate cosine distance between two vectors
 * Returns a value between 0 and 2 (0 being most similar)
 */
export function cosineDistance(a: number[], b: number[]): number {
  return 1 - cosineSimilarity(a, b);
}

/**
 * Calculate Euclidean distance between two vectors
 */
export function euclideanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimensions do not match: ${a.length} vs ${b.length}`);
  }

  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }

  return Math.sqrt(sum);
}

/**
 * Calculate Manhattan distance between two vectors
 */
export function manhattanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimensions do not match: ${a.length} vs ${b.length}`);
  }

  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += Math.abs(a[i] - b[i]);
  }

  return sum;
}

/**
 * Get distance between vectors using the specified metric
 */
export function getDistance(
  a: number[],
  b: number[],
  metric: DistanceMetric = DistanceMetric.COSINE
): number {
  switch (metric) {
    case DistanceMetric.COSINE:
      return cosineDistance(a, b);
    case DistanceMetric.EUCLIDEAN:
      return euclideanDistance(a, b);
    case DistanceMetric.DOT_PRODUCT:
      // Invert dot product since higher is more similar but we want lower = more similar for distance
      return -dotProduct(a, b);
    case DistanceMetric.MANHATTAN:
      return manhattanDistance(a, b);
    default:
      throw new Error(`Unknown distance metric: ${metric}`);
  }
}

/**
 * Get similarity score from distance value (normalized to 0-1 range where 1 is most similar)
 */
export function distanceToSimilarity(
  distance: number,
  metric: DistanceMetric = DistanceMetric.COSINE
): number {
  switch (metric) {
    case DistanceMetric.COSINE:
      // Cosine distance ranges from 0 (identical) to 2 (opposite)
      // Converting to a similarity score in the range 0-1
      return 1 - distance / 2;
    case DistanceMetric.EUCLIDEAN:
      // Euclidean distance can be unbounded, so we use a sigmoid function to map to 0-1
      // This is a simple approximation that assumes most distances fall under 10
      return 1 / (1 + distance / 5);
    case DistanceMetric.DOT_PRODUCT:
      // We negated the dot product for distance, so negate again
      // Note: This is simplistic; in practice you'd want to normalize based on vector magnitudes
      // and the expected range of dot products
      const normalizedScore = (-distance + 1) / 2;
      return Math.max(0, Math.min(1, normalizedScore));
    case DistanceMetric.MANHATTAN:
      // Manhattan distance can be unbounded, similar approach to Euclidean
      return 1 / (1 + distance / 10);
    default:
      throw new Error(`Unknown distance metric: ${metric}`);
  }
}

/**
 * Parse embedding data from string to array
 */
export function parseEmbeddingVector(vectorData: string): number[] {
  try {
    return JSON.parse(vectorData);
  } catch (error) {
    throw new Error(`Failed to parse embedding vector: ${error}`);
  }
}

/**
 * Retrieve embeddings with vector data for the specified chunks
 */
export async function getEmbeddingsWithVectors(
  chunkIds: string[]
): Promise<Map<string, EmbeddingWithVector>> {
  const embeddings = await prisma.embedding.findMany({
    where: {
      chunkId: { in: chunkIds },
    },
  });

  const embeddingMap = new Map<string, EmbeddingWithVector>();

  for (const embedding of embeddings) {
    try {
      const parsedVector = parseEmbeddingVector(embedding.vectorData);
      embeddingMap.set(embedding.chunkId, {
        ...embedding,
        parsedVector,
      });
    } catch (error) {
      console.error(`Error parsing vector for chunk ${embedding.chunkId}:`, error);
    }
  }

  return embeddingMap;
}

/**
 * Advanced vector similarity search
 *
 * This function retrieves chunks with embeddings and performs similarity
 * search based on the specified distance metric.
 */
export async function vectorSimilaritySearch(
  queryVector: EmbeddingVector,
  options: Omit<ExtendedVectorSearchOptions, 'queryVector'> = {}
): Promise<VectorSearchResult[]> {
  const {
    filterDocumentIds,
    filterUserId,
    limit = 10,
    minScore = 0.7,
    includeDocument = false,
    metric = DistanceMetric.COSINE,
    includeContent = true,
    modelNames,
  } = options;

  // Build where clause based on filters
  const where: any = {};

  if (filterDocumentIds && filterDocumentIds.length > 0) {
    where.documentId = { in: filterDocumentIds };
  }

  if (filterUserId) {
    where.document = { userId: filterUserId };
  }

  // Retrieve all relevant chunks with their embeddings
  const chunks = await prisma.chunk.findMany({
    where,
    include: {
      document: includeDocument,
    },
  });

  // Get chunk IDs to fetch embeddings
  const chunkIds = chunks.map((chunk) => chunk.id);

  if (chunkIds.length === 0) {
    return [];
  }

  // Get embeddings with parsed vector data
  const embeddings = await getEmbeddingsWithVectors(chunkIds);

  // Filter by model name if specified
  let filteredChunks = chunks;
  if (modelNames && modelNames.length > 0) {
    filteredChunks = chunks.filter(
      (chunk) => chunk.embeddingModel && modelNames.includes(chunk.embeddingModel)
    );
  }

  // Calculate distances and map to results
  const results: VectorSearchResult[] = [];

  for (const chunk of filteredChunks) {
    const embedding = embeddings.get(chunk.id);

    if (!embedding || !embedding.parsedVector) {
      continue;
    }

    try {
      // Calculate distance based on the selected metric
      const distance = getDistance(queryVector, embedding.parsedVector, metric);
      // Convert distance to similarity score (0-1)
      const score = distanceToSimilarity(distance, metric);

      if (score >= minScore) {
        results.push({
          chunk,
          score,
          distance,
          document: includeDocument ? chunk.document : undefined,
        });
      }
    } catch (error) {
      console.error(`Error calculating similarity for chunk ${chunk.id}:`, error);
    }
  }

  // Sort by score (descending) and limit results
  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}

/**
 * Calculate average vector from multiple vectors
 */
export function averageVectors(vectors: number[][]): number[] {
  if (vectors.length === 0) {
    throw new Error('Cannot average empty vector array');
  }

  const dimension = vectors[0].length;

  // Ensure all vectors have the same dimension
  for (let i = 1; i < vectors.length; i++) {
    if (vectors[i].length !== dimension) {
      throw new Error(
        `Vector ${i} has incompatible dimensions: ${vectors[i].length} vs ${dimension}`
      );
    }
  }

  // Initialize result vector with zeros
  const result = new Array(dimension).fill(0);

  // Sum up all vectors
  for (const vector of vectors) {
    for (let i = 0; i < dimension; i++) {
      result[i] += vector[i];
    }
  }

  // Divide by count to get average
  for (let i = 0; i < dimension; i++) {
    result[i] /= vectors.length;
  }

  return result;
}

/**
 * Calculate weighted average of multiple vectors
 */
export function weightedAverageVectors(vectors: number[][], weights: number[]): number[] {
  if (vectors.length === 0) {
    throw new Error('Cannot average empty vector array');
  }

  if (vectors.length !== weights.length) {
    throw new Error(
      `Mismatch between vector count (${vectors.length}) and weight count (${weights.length})`
    );
  }

  const dimension = vectors[0].length;

  // Ensure all vectors have the same dimension
  for (let i = 1; i < vectors.length; i++) {
    if (vectors[i].length !== dimension) {
      throw new Error(
        `Vector ${i} has incompatible dimensions: ${vectors[i].length} vs ${dimension}`
      );
    }
  }

  // Calculate sum of weights
  const weightSum = weights.reduce((sum, w) => sum + w, 0);

  if (weightSum === 0) {
    throw new Error('Sum of weights is zero');
  }

  // Initialize result vector with zeros
  const result = new Array(dimension).fill(0);

  // Calculate weighted sum
  for (let i = 0; i < vectors.length; i++) {
    const vector = vectors[i];
    const weight = weights[i] / weightSum; // Normalize weight

    for (let j = 0; j < dimension; j++) {
      result[j] += vector[j] * weight;
    }
  }

  return result;
}

/**
 * Store a vector as a JSON string
 */
export function serializeVector(vector: number[]): string {
  return JSON.stringify(vector);
}

/**
 * Hybrid vector and keyword search
 *
 * This function combines vector similarity search with keyword-based filtering
 */
export async function hybridSearch(
  queryVector: EmbeddingVector,
  keywords: string[],
  options: Omit<ExtendedVectorSearchOptions, 'queryVector'> = {}
): Promise<VectorSearchResult[]> {
  // If no keywords, just do vector search
  if (!keywords || keywords.length === 0) {
    return vectorSimilaritySearch(queryVector, options);
  }

  // Prepare keyword pattern for filtering
  const keywordPattern = keywords.map((k) => k.trim().toLowerCase()).filter((k) => k.length > 0);

  if (keywordPattern.length === 0) {
    return vectorSimilaritySearch(queryVector, options);
  }

  // Get vector search results
  const vectorResults = await vectorSimilaritySearch(queryVector, {
    ...options,
    // We need content for keyword filtering
    includeContent: true,
    // Lower the minimum score to get more candidates for filtering
    minScore: Math.max(0, (options.minScore || 0.7) - 0.2),
    // Increase limit to get more candidates
    limit: (options.limit || 10) * 3,
  });

  // Filter and re-rank based on keyword presence
  const hybridResults = vectorResults
    .map((result) => {
      const content = result.chunk.content || '';
      const keywords = (result.chunk.keywordsString || '').toLowerCase();

      // Count how many keywords match in the content
      let keywordMatches = 0;
      for (const keyword of keywordPattern) {
        if (content.toLowerCase().includes(keyword) || keywords.includes(keyword)) {
          keywordMatches++;
        }
      }

      // Adjust score based on keyword matches
      const keywordBoost = keywordMatches > 0 ? Math.min(0.3, 0.1 * keywordMatches) : 0;

      // Combined score: vector similarity with keyword boost
      const adjustedScore = Math.min(1, result.score + keywordBoost);

      return {
        ...result,
        score: adjustedScore,
      };
    })
    .filter((result) => result.score >= (options.minScore || 0.7))
    .sort((a, b) => b.score - a.score)
    .slice(0, options.limit || 10);

  return hybridResults;
}
