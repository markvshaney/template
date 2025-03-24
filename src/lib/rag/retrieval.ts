/**
 * Retrieval Module
 * Functions for retrieving relevant context for RAG applications
 */

import { InMemoryVectorStore, VectorSearchOptions, VectorSearchResult } from './vector-store';
import { Document, DocumentChunk } from './document-processing';

/**
 * Options for context retrieval
 */
export interface RetrievalOptions extends VectorSearchOptions {
  /** Whether to include document metadata in the retrieved context */
  includeMetadata?: boolean;
  /** Whether to include source references in the retrieved context */
  includeSources?: boolean;
  /** Format of retrieved context */
  format?: 'text' | 'json' | 'markdown';
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
  }[];
}

/**
 * Retrieves relevant context based on a query embedding
 */
export async function retrieveContext(
  vectorStore: InMemoryVectorStore,
  queryEmbedding: number[],
  options: RetrievalOptions = {}
): Promise<RetrievalResult> {
  const {
    limit = 5,
    minScore = 0.7,
    filter,
    includeMetadata = true,
    includeSources = true,
    format = 'text',
  } = options;

  // Search for relevant vectors
  const searchResults = vectorStore.search(queryEmbedding, {
    limit,
    minScore,
    filter,
  });

  if (searchResults.length === 0) {
    return {
      context: '',
      results: [],
      sources: [],
    };
  }

  // Format the context
  const context = formatContext(searchResults, { includeMetadata, format });

  // Generate sources if requested
  const sources = includeSources ? generateSources(searchResults) : undefined;

  return {
    context,
    results: searchResults,
    sources,
  };
}

/**
 * Format retrieved chunks into a unified context
 */
function formatContext(
  results: VectorSearchResult[],
  options: { includeMetadata?: boolean; format: 'text' | 'json' | 'markdown' }
): string {
  const { includeMetadata = true, format = 'text' } = options;

  switch (format) {
    case 'json':
      return JSON.stringify(
        results.map((result) => ({
          content: result.chunk.content,
          score: result.score,
          metadata: includeMetadata ? result.chunk.metadata : undefined,
        }))
      );

    case 'markdown':
      return results
        .map((result) => {
          let markdown = `## ${result.chunk.metadata.title || 'Content'} (Score: ${result.score.toFixed(2)})\n\n`;
          markdown += result.chunk.content.trim();

          if (includeMetadata && Object.keys(result.chunk.metadata).length > 0) {
            markdown += '\n\n### Metadata\n\n';
            for (const [key, value] of Object.entries(result.chunk.metadata)) {
              if (key !== 'title') {
                markdown += `- **${key}**: ${value}\n`;
              }
            }
          }

          return markdown;
        })
        .join('\n\n---\n\n');

    case 'text':
    default:
      return results.map((result) => result.chunk.content.trim()).join('\n\n');
  }
}

/**
 * Generate source references from search results
 */
function generateSources(
  results: VectorSearchResult[]
): { id: string; title?: string; url?: string }[] {
  // Create a map to deduplicate sources by document ID
  const sourcesMap = new Map<string, { id: string; title?: string; url?: string }>();

  for (const result of results) {
    if (!sourcesMap.has(result.documentId)) {
      sourcesMap.set(result.documentId, {
        id: result.documentId,
        title: result.chunk.metadata.title,
        url: result.chunk.metadata.url,
      });
    }
  }

  return Array.from(sourcesMap.values());
}

/**
 * Hybrid retrieval: combines vector search with keyword search
 * Note: This is a placeholder implementation that would need to be
 * expanded with actual keyword search functionality
 */
export async function hybridRetrieve(
  vectorStore: InMemoryVectorStore,
  queryEmbedding: number[],
  query: string,
  options: RetrievalOptions = {}
): Promise<RetrievalResult> {
  // For now, this just calls the vector search
  // In a real implementation, this would combine vector search with
  // keyword search or other retrieval methods
  return retrieveContext(vectorStore, queryEmbedding, options);
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
