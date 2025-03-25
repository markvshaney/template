/**
 * Retrieval Module
 * Functions for retrieving relevant context for RAG applications
 */

import { PrismaClient, Chunk, Document, Embedding } from '@prisma/client';
import {
  DistanceMetric,
  VectorSearchResult,
  ExtendedVectorSearchOptions,
  getDistance,
  getScore,
} from '../db/vector-operations';
import { prepareQueryFilter } from '../db/documents';
import { DocumentChunk } from './types';

// Initialize Prisma client
const prisma = new PrismaClient();

/**
 * Options for context retrieval
 */
export interface RetrievalOptions extends Omit<ExtendedVectorSearchOptions, 'queryVector'> {
  /** Whether to include document metadata in the retrieved context */
  includeMetadata?: boolean;
  /** Whether to include source references in the retrieved context */
  includeSources?: boolean;
  /** Format of retrieved context */
  format?: 'text' | 'json' | 'markdown';
  /** Weight to apply to vector similarity (0-1) */
  vectorWeight?: number;
  /** Weight to apply to keyword matching (0-1) */
  keywordWeight?: number;
  /** Maximum context length */
  maxContextLength?: number;
  /** De-duplicate similar chunks */
  deduplicate?: boolean;
  /** Similarity threshold for deduplication */
  deduplicationThreshold?: number;
}

/**
 * Result of context retrieval
 */
export interface RetrievalResult {
  /** Retrieved context as a formatted string */
  context: string;
  /** Original search results */
  results: VectorSearchResult[];
  /** Source references if requested */
  sources?: {
    id: string;
    title?: string;
    url?: string;
    createdAt?: Date;
  }[];
  /** Total results found before limiting */
  totalResults?: number;
}

/**
 * Convert database chunk to document chunk type
 */
function convertDatabaseChunkToDocumentChunk(chunk: Chunk): DocumentChunk {
  return {
    id: chunk.id,
    content: chunk.content,
    metadata: JSON.parse(chunk.metadata || '{}'),
  };
}

/**
 * Retrieves relevant context based on a query embedding
 */
export async function retrieveContext(
  queryEmbedding: number[],
  options: RetrievalOptions = {}
): Promise<RetrievalResult> {
  const {
    limit = 5,
    minScore = 0.7,
    filterDocumentIds,
    filterUserId,
    includeDocument = false,
    includeMetadata = true,
    includeSources = true,
    format = 'text',
    metric = DistanceMetric.COSINE,
    deduplicate = false,
    deduplicationThreshold = 0.9,
    maxContextLength,
  } = options;

  // Prepare database filter
  const filter = prepareQueryFilter({
    documentIds: filterDocumentIds,
    userId: filterUserId,
  });

  // Query database for embeddings
  const embeddings = await prisma.embedding.findMany({
    where: filter,
    include: {
      chunk: true,
      chunk: {
        include: {
          document: includeDocument,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // Calculate similarity scores
  const results: VectorSearchResult[] = embeddings
    .map((embedding) => {
      // Parse vector data
      const vector = JSON.parse(embedding.vectorData) as number[];

      // Calculate distance and score
      const distance = getDistance(queryEmbedding, vector, metric);
      const score = getScore(distance, metric);

      return {
        chunk: embedding.chunk,
        document: embedding.chunk.document,
        score,
        distance,
      };
    })
    .filter((result) => result.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  // Apply deduplication if requested
  const deduplicatedResults = deduplicate
    ? deduplicateResults(results, deduplicationThreshold, metric)
    : results;

  if (deduplicatedResults.length === 0) {
    return {
      context: '',
      results: [],
      sources: [],
      totalResults: 0,
    };
  }

  // Format the context
  const context = formatContext(deduplicatedResults, {
    includeMetadata,
    format,
    maxLength: maxContextLength,
  });

  // Generate sources if requested
  const sources = includeSources ? generateSources(deduplicatedResults) : undefined;

  return {
    context,
    results: deduplicatedResults,
    sources,
    totalResults: embeddings.length,
  };
}

/**
 * Format retrieved chunks into a unified context
 */
function formatContext(
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
 * Generate source references from search results
 */
function generateSources(
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
        url: metadata.url || result.document.url,
        createdAt: result.document.createdAt,
      });
    }
  }

  return Array.from(sourcesMap.values());
}

/**
 * Hybrid retrieval: combines vector search with keyword search
 */
export async function hybridRetrieve(
  queryEmbedding: number[],
  query: string,
  options: RetrievalOptions = {}
): Promise<RetrievalResult> {
  const { vectorWeight = 0.7, keywordWeight = 0.3, includeDocument = true } = options;

  // Normalize weights
  const totalWeight = vectorWeight + keywordWeight;
  const normalizedVectorWeight = vectorWeight / totalWeight;
  const normalizedKeywordWeight = keywordWeight / totalWeight;

  // Get vector search results
  const vectorResults = await retrieveContext(queryEmbedding, {
    ...options,
    limit: options.limit ? options.limit * 2 : 10, // Get more results for re-ranking
    includeDocument: true,
  });

  // Perform keyword search if weight > 0
  let keywordResults: Chunk[] = [];
  if (normalizedKeywordWeight > 0) {
    const keywordFilter = prepareQueryFilter({
      documentIds: options.filterDocumentIds,
      userId: options.filterUserId,
    });

    // Search for keywords in chunk content
    keywordResults = await prisma.chunk.findMany({
      where: {
        ...keywordFilter,
        content: {
          search: query
            .split(' ')
            .filter((word) => word.length > 2)
            .join(' & '),
        },
      },
      include: {
        document: includeDocument,
      },
      take: options.limit ? options.limit * 2 : 10,
    });
  }

  // Combine and re-rank results
  const combinedResults = reRankResults(
    vectorResults.results,
    keywordResults,
    normalizedVectorWeight,
    normalizedKeywordWeight,
    options.limit || 5
  );

  // Format the context
  const context = formatContext(combinedResults, {
    includeMetadata: options.includeMetadata,
    format: options.format || 'text',
    maxLength: options.maxContextLength,
  });

  // Generate sources if requested
  const sources = options.includeSources ? generateSources(combinedResults) : undefined;

  return {
    context,
    results: combinedResults,
    sources,
    totalResults: vectorResults.totalResults,
  };
}

/**
 * Re-rank results by combining vector search and keyword search scores
 */
function reRankResults(
  vectorResults: VectorSearchResult[],
  keywordResults: Chunk[],
  vectorWeight: number,
  keywordWeight: number,
  limit: number
): VectorSearchResult[] {
  // Create a map of chunk IDs to vector results
  const vectorResultsMap = new Map<string, VectorSearchResult>();
  for (const result of vectorResults) {
    vectorResultsMap.set(result.chunk.id, result);
  }

  // Create a combined set of all chunk IDs
  const allChunkIds = new Set<string>([
    ...vectorResults.map((r) => r.chunk.id),
    ...keywordResults.map((r) => r.id),
  ]);

  // Combine scores
  const combinedResults: VectorSearchResult[] = [];
  for (const chunkId of allChunkIds) {
    const vectorResult = vectorResultsMap.get(chunkId);
    const keywordResult = keywordResults.find((r) => r.id === chunkId);

    if (vectorResult) {
      // If we have both vector and keyword results, combine scores
      if (keywordResult) {
        // Use the original vector result but update the score
        combinedResults.push({
          ...vectorResult,
          score: vectorResult.score * vectorWeight + keywordWeight, // Keyword match boosts score
        });
      } else {
        // Use the vector result with vector weight only
        combinedResults.push({
          ...vectorResult,
          score: vectorResult.score * vectorWeight,
        });
      }
    } else if (keywordResult) {
      // Only have keyword result, create a new entry with keyword weight
      combinedResults.push({
        chunk: keywordResult,
        document: keywordResult.document,
        score: keywordWeight * 0.9, // Slightly lower base score for keyword-only matches
        distance: 0.1, // Placeholder
      });
    }
  }

  // Sort by combined score and limit results
  return combinedResults.sort((a, b) => b.score - a.score).slice(0, limit);
}

/**
 * Deduplicate results based on content similarity
 */
function deduplicateResults(
  results: VectorSearchResult[],
  threshold: number,
  metric: DistanceMetric
): VectorSearchResult[] {
  if (results.length <= 1) return results;

  const deduplicatedResults: VectorSearchResult[] = [results[0]];
  const contentMap = new Map<string, boolean>();
  contentMap.set(results[0].chunk.content, true);

  for (let i = 1; i < results.length; i++) {
    const currentChunk = results[i];
    let isDuplicate = false;

    // Check for exact content matches
    if (contentMap.has(currentChunk.chunk.content)) {
      isDuplicate = true;
      continue;
    }

    // Check for similarity with already included chunks
    for (const included of deduplicatedResults) {
      const similarityScore = calculateTextSimilarity(
        currentChunk.chunk.content,
        included.chunk.content
      );

      if (similarityScore > threshold) {
        isDuplicate = true;
        break;
      }
    }

    if (!isDuplicate) {
      deduplicatedResults.push(currentChunk);
      contentMap.set(currentChunk.chunk.content, true);
    }
  }

  return deduplicatedResults;
}

/**
 * Calculate text similarity between two strings
 * This is a simple implementation using Jaccard similarity
 */
function calculateTextSimilarity(text1: string, text2: string): number {
  const tokens1 = new Set(
    text1
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 3)
  );
  const tokens2 = new Set(
    text2
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 3)
  );

  const intersection = new Set([...tokens1].filter((x) => tokens2.has(x)));
  const union = new Set([...tokens1, ...tokens2]);

  if (union.size === 0) return 0;
  return intersection.size / union.size;
}

/**
 * Prepares retrieval context for LLM prompt
 */
export function prepareContextForPrompt(
  retrievalResult: RetrievalResult,
  maxLength?: number
): string {
  let context = retrievalResult.context;

  // Truncate if needed
  if (maxLength && context.length > maxLength) {
    context = context.substring(0, maxLength) + '...';
  }

  // Add source references if available
  if (retrievalResult.sources && retrievalResult.sources.length > 0) {
    context += '\n\nSources:\n';
    retrievalResult.sources.forEach((source, index) => {
      context += `[${index + 1}] ${source.title || 'Untitled'} ${source.url ? `(${source.url})` : ''}\n`;
    });
  }

  return context;
}

/**
 * Get the most relevant keywords from a set of chunks
 */
export function extractKeywords(chunks: Chunk[], count: number = 10): string[] {
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

  // Combine all chunk content
  const allText = chunks.map((chunk) => chunk.content).join(' ');

  // Tokenize and count words
  const words = allText
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 3 && !stopWords.has(word) && !/^\d+$/.test(word));

  // Count word frequencies
  const wordCounts = new Map<string, number>();
  for (const word of words) {
    wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
  }

  // Sort by frequency and return top 'count' words
  return Array.from(wordCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map((entry) => entry[0]);
}
