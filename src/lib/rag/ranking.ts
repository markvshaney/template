/**
 * Ranking Module
 * Algorithms for relevance ranking in RAG applications
 */

import { Chunk, Document } from '@prisma/client';
import { DistanceMetric, VectorSearchResult } from '../db/vector-operations';

/**
 * Ranking algorithm types
 */
export enum RankingAlgorithm {
  VECTOR_SIMILARITY = 'vector_similarity',
  BM25 = 'bm25',
  TF_IDF = 'tf_idf',
  HYBRID = 'hybrid',
  RECIPROCAL_RANK_FUSION = 'reciprocal_rank_fusion',
}

/**
 * Options for ranking results
 */
export interface RankingOptions {
  /** Algorithm to use for ranking */
  algorithm?: RankingAlgorithm;
  /** Weights for different ranking signals */
  weights?: {
    /** Weight for vector similarity (0-1) */
    vectorSimilarity?: number;
    /** Weight for BM25 score (0-1) */
    bm25?: number;
    /** Weight for recency (0-1) */
    recency?: number;
    /** Weight for document length (0-1) */
    documentLength?: number;
    /** Weight for custom boosting (0-1) */
    boost?: number;
  };
  /** Maximum number of results to return */
  limit?: number;
  /** Specific fields to boost */
  boostFields?: Record<string, number>;
  /** Decay factor for recency scoring */
  recencyDecay?: number;
  /** Use reciprocal rank fusion */
  useRrf?: boolean;
  /** Constant for RRF calculation */
  rrfConstant?: number;
}

/**
 * Ranked result with additional scoring information
 */
export interface RankedResult extends VectorSearchResult {
  /** Combined score from all ranking signals */
  combinedScore: number;
  /** Individual component scores */
  scores?: {
    /** Vector similarity score */
    vectorSimilarity?: number;
    /** BM25 score */
    bm25?: number;
    /** Recency score */
    recency?: number;
    /** Length score */
    length?: number;
    /** Boost score */
    boost?: number;
  };
}

/**
 * Calculate TF-IDF score for search terms in a chunk
 * This is a simplified implementation that works on a small set of chunks
 */
export function calculateTfIdf(chunk: Chunk, searchTerms: string[], allChunks: Chunk[]): number {
  const content = chunk.content.toLowerCase();
  let score = 0;

  for (const term of searchTerms) {
    // Skip very short terms
    if (term.length < 3) continue;

    const termLower = term.toLowerCase();

    // Calculate term frequency (TF)
    const termMatches = (content.match(new RegExp(termLower, 'g')) || []).length;
    if (termMatches === 0) continue;

    const tf = termMatches / content.split(/\s+/).length;

    // Calculate inverse document frequency (IDF)
    const docsWithTerm = allChunks.filter((c) =>
      c.content.toLowerCase().includes(termLower)
    ).length;

    const idf = Math.log((allChunks.length + 1) / (docsWithTerm + 1)) + 1;

    // Add to score
    score += tf * idf;
  }

  return score;
}

/**
 * Calculate BM25 score for search terms in a chunk
 * BM25 is a more sophisticated ranking algorithm than TF-IDF
 */
export function calculateBM25(
  chunk: Chunk,
  searchTerms: string[],
  allChunks: Chunk[],
  k1 = 1.2,
  b = 0.75
): number {
  const content = chunk.content.toLowerCase();
  const contentWords = content.split(/\s+/).length;

  // Calculate average document length
  const avgDocLength =
    allChunks.reduce((sum, c) => sum + c.content.split(/\s+/).length, 0) / allChunks.length;

  let score = 0;

  for (const term of searchTerms) {
    // Skip very short terms
    if (term.length < 3) continue;

    const termLower = term.toLowerCase();

    // Calculate term frequency
    const termMatches = (content.match(new RegExp(termLower, 'g')) || []).length;
    if (termMatches === 0) continue;

    // Calculate IDF using BM25 formula
    const docsWithTerm = allChunks.filter((c) =>
      c.content.toLowerCase().includes(termLower)
    ).length;

    const idf = Math.log((allChunks.length - docsWithTerm + 0.5) / (docsWithTerm + 0.5) + 1);

    // Calculate BM25 score for this term
    const tf = termMatches;
    const lengthRatio = contentWords / avgDocLength;
    const termScore = (idf * (tf * (k1 + 1))) / (tf + k1 * (1 - b + b * lengthRatio));

    score += termScore;
  }

  return score;
}

/**
 * Calculate recency score based on document creation date
 */
export function calculateRecencyScore(document: Document | undefined, decayFactor = 0.05): number {
  if (!document?.createdAt) return 0.5; // Default middle score if no date

  const now = new Date();
  const docDate = new Date(document.createdAt);
  const ageInDays = (now.getTime() - docDate.getTime()) / (1000 * 60 * 60 * 24);

  // Exponential decay formula
  return Math.exp(-decayFactor * ageInDays);
}

/**
 * Calculate boost score based on metadata fields
 */
export function calculateBoostScore(
  chunk: Chunk,
  boostFields: Record<string, number> = {}
): number {
  try {
    let score = 1; // Base score
    const metadata = JSON.parse(chunk.metadata || '{}');

    for (const [field, boost] of Object.entries(boostFields)) {
      if (metadata[field]) {
        score *= boost;
      }
    }

    return score;
  } catch (error) {
    console.error('Error calculating boost score:', error);
    return 1;
  }
}

/**
 * Apply reciprocal rank fusion to combine multiple result lists
 */
export function reciprocalRankFusion(resultSets: RankedResult[][], constant = 60): RankedResult[] {
  // Map to store combined scores by chunk ID
  const combinedScores = new Map<
    string,
    {
      result: RankedResult;
      score: number;
    }
  >();

  // Process each result set
  resultSets.forEach((resultSet) => {
    resultSet.forEach((result, index) => {
      const rank = index + 1;
      const rrfScore = 1 / (constant + rank);

      if (combinedScores.has(result.chunk.id)) {
        // Add to existing score
        const existing = combinedScores.get(result.chunk.id)!;
        existing.score += rrfScore;
      } else {
        // Create new entry
        combinedScores.set(result.chunk.id, {
          result,
          score: rrfScore,
        });
      }
    });
  });

  // Convert to array and sort by combined score
  return Array.from(combinedScores.values())
    .map((entry) => ({
      ...entry.result,
      combinedScore: entry.score,
    }))
    .sort((a, b) => b.combinedScore - a.combinedScore);
}

/**
 * Rank results using multiple signals
 */
export function rankResults(
  results: VectorSearchResult[],
  searchTerms: string[] = [],
  options: RankingOptions = {}
): RankedResult[] {
  const {
    weights = {
      vectorSimilarity: 1.0,
      bm25: 0.0,
      recency: 0.0,
      documentLength: 0.0,
      boost: 0.0,
    },
    limit = results.length,
    boostFields = {},
    recencyDecay = 0.05,
    useRrf = false,
    rrfConstant = 60,
  } = options;

  // Extract all chunks for BM25/TF-IDF calculation if needed
  const allChunks = results.map((r) => r.chunk);

  // Calculate individual scores for each result
  const rankedResults: RankedResult[] = results.map((result) => {
    const scores: RankedResult['scores'] = {
      vectorSimilarity: result.score,
    };

    // Calculate BM25 score if needed
    if (weights.bm25 && weights.bm25 > 0 && searchTerms.length > 0) {
      scores.bm25 = calculateBM25(result.chunk, searchTerms, allChunks);
    }

    // Calculate recency score if needed
    if (weights.recency && weights.recency > 0) {
      scores.recency = calculateRecencyScore(result.document, recencyDecay);
    }

    // Calculate length score if needed
    if (weights.documentLength && weights.documentLength > 0) {
      const contentLength = result.chunk.content.length;
      const idealLength = 1500; // An ideal chunk size
      scores.length = 1 - Math.abs(contentLength - idealLength) / idealLength;
      scores.length = Math.max(0, Math.min(1, scores.length)); // Clamp to 0-1
    }

    // Calculate boost score if needed
    if (weights.boost && weights.boost > 0) {
      scores.boost = calculateBoostScore(result.chunk, boostFields);
    }

    // Calculate combined score
    let combinedScore = 0;
    let weightSum = 0;

    for (const [key, score] of Object.entries(scores)) {
      const weight = weights[key as keyof typeof weights] || 0;
      if (weight > 0 && score !== undefined) {
        combinedScore += weight * score;
        weightSum += weight;
      }
    }

    // Normalize by sum of weights
    if (weightSum > 0) {
      combinedScore /= weightSum;
    } else {
      combinedScore = result.score; // Default to original score
    }

    return {
      ...result,
      combinedScore,
      scores,
    };
  });

  // Sort by combined score
  const sortedResults = rankedResults.sort((a, b) => b.combinedScore - a.combinedScore);

  // Apply limit
  return sortedResults.slice(0, limit);
}

/**
 * Re-rank results using multiple methods and combine with RRF
 */
export function reRankWithMultipleMethods(
  results: VectorSearchResult[],
  searchTerms: string[] = [],
  options: RankingOptions = {}
): RankedResult[] {
  if (results.length <= 1) {
    return results.map((r) => ({ ...r, combinedScore: r.score }));
  }

  // Create different ranked result sets
  const vectorRanked = rankResults(results, searchTerms, {
    ...options,
    weights: { vectorSimilarity: 1.0 },
  });

  // Only do BM25 ranking if we have search terms
  const bm25Ranked =
    searchTerms.length > 0
      ? rankResults(results, searchTerms, {
          ...options,
          weights: { bm25: 1.0 },
        })
      : [];

  const recencyRanked = rankResults(results, searchTerms, {
    ...options,
    weights: { recency: 1.0 },
  });

  // Combine using reciprocal rank fusion
  const resultSets = [vectorRanked];
  if (bm25Ranked.length > 0) resultSets.push(bm25Ranked);
  resultSets.push(recencyRanked);

  return reciprocalRankFusion(resultSets, options.rrfConstant);
}
