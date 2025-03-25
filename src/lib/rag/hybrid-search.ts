/**
 * Hybrid Search Module
 * Functions for combining vector and keyword searching
 */

import { PrismaClient, Chunk } from '@prisma/client';
import {
  DistanceMetric,
  VectorSearchResult,
  ExtendedVectorSearchOptions,
  getDistance,
  getScore,
} from '../db/vector-operations';
import { prepareQueryFilter } from '../db/documents';
import { RankingOptions, rankResults } from './ranking';
import { RetrievalOptions, RetrievalResult, retrieveContext } from './retrieval';

// Initialize Prisma client
const prisma = new PrismaClient();

/**
 * Options for hybrid search
 */
export interface HybridSearchOptions extends RetrievalOptions {
  /** Weight for vector similarity (0-1) */
  vectorWeight?: number;
  /** Weight for keyword matching (0-1) */
  keywordWeight?: number;
  /** Whether to use BM25 for keyword scoring */
  useBM25?: boolean;
  /** Whether to normalize scores from different methods */
  normalizeScores?: boolean;
  /** Use reciprocal rank fusion to combine results */
  useRankFusion?: boolean;
  /** Maximum number of keyword results to consider */
  maxKeywordResults?: number;
}

/**
 * Perform a keyword search in the database
 */
export async function keywordSearch(
  query: string,
  options: Omit<ExtendedVectorSearchOptions, 'queryVector'> = {}
): Promise<Chunk[]> {
  const { filterDocumentIds, filterUserId, includeDocument = false, limit = 10 } = options;

  // Prepare database filter
  const filter = prepareQueryFilter({
    documentIds: filterDocumentIds,
    userId: filterUserId,
  });

  // Extract meaningful keywords from query
  const keywords = query
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 2) // Remove very short words
    .filter((word) => !stopWords.has(word));

  // If no meaningful keywords, return empty array
  if (keywords.length === 0) {
    return [];
  }

  // Create search terms for database
  const searchTerms = keywords.join(' & ');

  try {
    // Perform the search in the database
    const results = await prisma.chunk.findMany({
      where: {
        ...filter,
        content: {
          search: searchTerms,
        },
      },
      include: {
        document: includeDocument,
      },
      take: limit,
    });

    return results;
  } catch (error) {
    console.error('Error performing keyword search:', error);
    return [];
  }
}

/**
 * Hybrid search combining vector and keyword search
 */
export async function hybridSearch(
  query: string,
  queryEmbedding: number[],
  options: HybridSearchOptions = {}
): Promise<RetrievalResult> {
  const {
    vectorWeight = 0.7,
    keywordWeight = 0.3,
    useBM25 = true,
    normalizeScores = true,
    useRankFusion = false,
    maxKeywordResults = 20,
    limit = 5,
    includeDocument = true,
    includeMetadata = true,
    includeSources = true,
    format = 'text',
  } = options;

  // No need for keyword search if weight is 0
  const skipKeyword = keywordWeight === 0;

  // No need for vector search if weight is 0
  const skipVector = vectorWeight === 0;

  // Get vector search results if needed
  let vectorResults: VectorSearchResult[] = [];
  if (!skipVector) {
    const vectorSearchResult = await retrieveContext(queryEmbedding, {
      ...options,
      limit: limit * 2, // Get more for re-ranking
      includeDocument: true,
    });
    vectorResults = vectorSearchResult.results;
  }

  // Get keyword search results if needed
  let keywordResults: Chunk[] = [];
  if (!skipKeyword) {
    keywordResults = await keywordSearch(query, {
      ...options,
      limit: maxKeywordResults,
      includeDocument: true,
    });
  }

  // If using RRF for combination
  if (useRankFusion) {
    // Use the ranking module to combine
    const keywordSearchTerms = query
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length > 2);

    const rankingOptions: RankingOptions = {
      weights: useBM25 ? { bm25: 1.0 } : { vectorSimilarity: 0.0 }, // Just placeholder
      limit,
    };

    // Convert keyword results to vector results structure
    const keywordVectorResults: VectorSearchResult[] = keywordResults.map((chunk) => {
      const score = 0.95; // High base score for keyword matches
      return {
        chunk,
        document: chunk.document,
        score,
        distance: 1 - score,
      };
    });

    // Combine based on weights
    const combinedResults = combineResults(
      vectorResults,
      keywordVectorResults,
      keywordSearchTerms,
      {
        vectorWeight,
        keywordWeight,
        limit,
        useBM25,
        rankingOptions,
      }
    );

    // Format results
    const context = formatHybridResults(combinedResults, {
      includeMetadata,
      format,
      maxLength: options.maxContextLength,
    });

    // Generate sources if requested
    const sources = includeSources ? generateHybridSources(combinedResults) : undefined;

    return {
      context,
      results: combinedResults,
      sources,
      totalResults: vectorResults.length + keywordResults.length,
    };
  } else {
    // Simpler combination approach
    // Convert keyword results to match vector result structure
    const keywordVectorResults: VectorSearchResult[] = keywordResults.map((chunk) => {
      const score = 0.95; // High base score for keyword matches
      return {
        chunk,
        document: chunk.document,
        score,
        distance: 1 - score,
      };
    });

    // Combine and deduplicate results
    const combinedResults = combineAndDeduplicateResults(
      vectorResults,
      keywordVectorResults,
      vectorWeight,
      keywordWeight,
      limit
    );

    // Format results
    const context = formatHybridResults(combinedResults, {
      includeMetadata,
      format,
      maxLength: options.maxContextLength,
    });

    // Generate sources if requested
    const sources = includeSources ? generateHybridSources(combinedResults) : undefined;

    return {
      context,
      results: combinedResults,
      sources,
      totalResults: vectorResults.length + keywordResults.length,
    };
  }
}

/**
 * Combine and deduplicate results from vector and keyword search
 */
function combineAndDeduplicateResults(
  vectorResults: VectorSearchResult[],
  keywordResults: VectorSearchResult[],
  vectorWeight: number,
  keywordWeight: number,
  limit: number
): VectorSearchResult[] {
  // Create a map of chunk IDs to combined results
  const resultMap = new Map<string, VectorSearchResult>();

  // Normalize weights
  const totalWeight = vectorWeight + keywordWeight;
  const normalizedVectorWeight = vectorWeight / totalWeight;
  const normalizedKeywordWeight = keywordWeight / totalWeight;

  // Process vector results
  for (const result of vectorResults) {
    resultMap.set(result.chunk.id, {
      ...result,
      score: result.score * normalizedVectorWeight,
    });
  }

  // Process and combine keyword results
  for (const result of keywordResults) {
    if (resultMap.has(result.chunk.id)) {
      // If already in vector results, boost the score
      const existing = resultMap.get(result.chunk.id)!;
      existing.score += result.score * normalizedKeywordWeight;
    } else {
      // If not in vector results, add with keyword weight
      resultMap.set(result.chunk.id, {
        ...result,
        score: result.score * normalizedKeywordWeight,
      });
    }
  }

  // Convert to array, sort by score, and limit
  return Array.from(resultMap.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Format hybrid search results
 */
function formatHybridResults(
  results: VectorSearchResult[],
  options: {
    includeMetadata?: boolean;
    format: 'text' | 'json' | 'markdown';
    maxLength?: number;
  }
): string {
  const { includeMetadata = true, format = 'text', maxLength } = options;

  let formattedContext: string;

  switch (format) {
    case 'json':
      formattedContext = JSON.stringify(
        results.map((result) => ({
          content: result.chunk.content,
          score: result.score,
          metadata: includeMetadata ? JSON.parse(result.chunk.metadata || '{}') : undefined,
        }))
      );
      break;

    case 'markdown':
      formattedContext = results
        .map((result) => {
          const metadata = JSON.parse(result.chunk.metadata || '{}');
          let markdown = `## ${metadata.title || 'Content'} (Score: ${result.score.toFixed(2)})\n\n`;
          markdown += result.chunk.content.trim();

          if (includeMetadata && Object.keys(metadata).length > 0) {
            markdown += '\n\n### Metadata\n\n';
            for (const [key, value] of Object.entries(metadata)) {
              if (key !== 'title') {
                markdown += `- **${key}**: ${value}\n`;
              }
            }
          }

          return markdown;
        })
        .join('\n\n---\n\n');
      break;

    case 'text':
    default:
      formattedContext = results.map((result) => result.chunk.content.trim()).join('\n\n');
      break;
  }

  // Truncate if maxLength is specified
  if (maxLength && formattedContext.length > maxLength) {
    formattedContext = formattedContext.substring(0, maxLength) + '...';
  }

  return formattedContext;
}

/**
 * Generate source references from hybrid search results
 */
function generateHybridSources(
  results: VectorSearchResult[]
): { id: string; title?: string; url?: string; createdAt?: Date }[] {
  // Create a map to deduplicate sources by document ID
  const sourcesMap = new Map<
    string,
    { id: string; title?: string; url?: string; createdAt?: Date }
  >();

  for (const result of results) {
    if (result.document && !sourcesMap.has(result.document.id)) {
      const metadata = JSON.parse(result.chunk.metadata || '{}');
      sourcesMap.set(result.document.id, {
        id: result.document.id,
        title: metadata.title || result.document.title,
        url: metadata.url,
        createdAt: result.document.createdAt,
      });
    }
  }

  return Array.from(sourcesMap.values());
}

/**
 * Combine results using more advanced ranking
 */
function combineResults(
  vectorResults: VectorSearchResult[],
  keywordResults: VectorSearchResult[],
  searchTerms: string[] = [],
  options: {
    vectorWeight: number;
    keywordWeight: number;
    limit: number;
    useBM25: boolean;
    rankingOptions?: RankingOptions;
  }
): VectorSearchResult[] {
  const { vectorWeight, keywordWeight, limit, useBM25, rankingOptions = {} } = options;

  // Create a combined set of all results
  const allResults = new Map<string, VectorSearchResult>();

  // Add vector results
  for (const result of vectorResults) {
    allResults.set(result.chunk.id, { ...result });
  }

  // Add keyword results
  for (const result of keywordResults) {
    if (!allResults.has(result.chunk.id)) {
      allResults.set(result.chunk.id, { ...result });
    }
  }

  // Convert to array
  const combinedResults = Array.from(allResults.values());

  // If we have a combined ranking strategy
  if (useBM25 && searchTerms.length > 0) {
    // Rank using the ranking module
    const rankedResults = rankResults(combinedResults, searchTerms, {
      ...rankingOptions,
      weights: {
        vectorSimilarity: vectorWeight,
        bm25: keywordWeight,
        ...(rankingOptions.weights || {}),
      },
      limit,
    });

    // Convert to expected format
    return rankedResults.map((result) => ({
      ...result,
      // Use the combinedScore as the main score
      score: result.combinedScore,
    }));
  } else {
    // Simpler approach if not using BM25
    return combineAndDeduplicateResults(
      vectorResults,
      keywordResults,
      vectorWeight,
      keywordWeight,
      limit
    );
  }
}

/**
 * Common English stop words
 */
const stopWords = new Set([
  'a',
  'an',
  'the',
  'and',
  'or',
  'but',
  'is',
  'are',
  'was',
  'were',
  'be',
  'been',
  'being',
  'have',
  'has',
  'had',
  'do',
  'does',
  'did',
  'of',
  'at',
  'by',
  'for',
  'with',
  'about',
  'against',
  'between',
  'into',
  'through',
  'during',
  'before',
  'after',
  'above',
  'below',
  'to',
  'from',
  'up',
  'down',
  'in',
  'out',
  'on',
  'off',
  'over',
  'under',
  'again',
  'further',
  'then',
  'once',
  'here',
  'there',
  'when',
  'where',
  'why',
  'how',
  'all',
  'any',
  'both',
  'each',
  'few',
  'more',
  'most',
  'other',
  'some',
  'such',
  'no',
  'nor',
  'not',
  'only',
  'own',
  'same',
  'so',
  'than',
  'too',
  'very',
  's',
  't',
  'can',
  'will',
  'just',
  'don',
  'should',
  'now',
]);
