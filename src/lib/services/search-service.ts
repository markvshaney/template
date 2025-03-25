import { SearchOptions, SearchProvider, SearchResult } from '../search/types';
import { webSearch } from '../search/web-search';
import { createSearchQuery, getRecentSearchQueries } from '../db/search-history';
import { EmbeddingGenerator } from '../ai/embeddings';
import { retrieveContext } from '../rag/retrieval';

/**
 * Options for the search service
 */
export interface SearchServiceOptions extends Partial<SearchOptions> {
  /** Enable semantic search */
  enableSemanticSearch?: boolean;
  /** Enable search history tracking */
  trackHistory?: boolean;
  /** User ID for search history */
  userId?: string;
  /** Number of RAG results to retrieve */
  ragResultCount?: number;
  /** Combine web and RAG results */
  combineResults?: boolean;
}

/**
 * Combined search results from web and RAG
 */
export interface CombinedSearchResults {
  /** Web search results */
  webResults: SearchResult[];
  /** Document search results from RAG */
  documentResults: SearchResult[];
  /** Combined and ranked results */
  combinedResults: SearchResult[];
  /** Query used for search */
  query: string;
  /** Search timestamp */
  timestamp: string;
}

/**
 * SearchService provides a unified interface for searching web and documents
 */
export class SearchService {
  /**
   * Search web and documents with combined results
   *
   * @param query Search query string
   * @param options Search options
   * @returns Combined search results
   */
  public static async search(
    query: string,
    options: SearchServiceOptions = {}
  ): Promise<CombinedSearchResults> {
    const {
      enableSemanticSearch = true,
      trackHistory = true,
      userId = 'anonymous',
      provider = 'google',
      ragResultCount = 5,
      combineResults = true,
      ...webOptions
    } = options;

    // Perform web search
    const webResults = await this.searchWeb(query, {
      provider,
      ...webOptions,
    });

    // Perform RAG search if enabled
    let documentResults: SearchResult[] = [];
    if (enableSemanticSearch) {
      documentResults = await this.searchDocuments(query, ragResultCount);
    }

    // Track search history if enabled
    if (trackHistory && query.trim()) {
      try {
        await createSearchQuery({
          query,
          userId,
          provider: provider as SearchProvider,
          resultCount: webResults.length + documentResults.length,
          metadata: {
            enableSemanticSearch,
            ...webOptions,
          },
        });
      } catch (error) {
        console.error('Failed to save search history:', error);
      }
    }

    // Combine results if requested
    let combinedResults: SearchResult[] = [];
    if (combineResults && documentResults.length > 0) {
      combinedResults = this.combineSearchResults(webResults, documentResults);
    } else {
      combinedResults = [...webResults];
    }

    return {
      webResults,
      documentResults,
      combinedResults,
      query,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Search the web using the web search API
   *
   * @param query Search query
   * @param options Search options
   * @returns Web search results
   */
  private static async searchWeb(
    query: string,
    options: Partial<SearchOptions> = {}
  ): Promise<SearchResult[]> {
    if (!query.trim()) {
      return [];
    }

    try {
      return await webSearch(query, options);
    } catch (error) {
      console.error('Web search failed:', error);
      return [];
    }
  }

  /**
   * Search documents using the RAG system
   *
   * @param query Search query
   * @param maxResults Maximum number of results to return
   * @returns Document search results
   */
  private static async searchDocuments(
    query: string,
    maxResults: number = 5
  ): Promise<SearchResult[]> {
    if (!query.trim()) {
      return [];
    }

    try {
      // Get query embeddings using the embedding generator
      const embeddingGenerator = new EmbeddingGenerator();
      const queryEmbedding = await embeddingGenerator.generateQueryEmbedding(query);

      // Retrieve context using the RAG system
      const retrievalResult = await retrieveContext(queryEmbedding, {
        limit: maxResults,
        minScore: 0.7,
        format: 'json',
      });

      // Convert contexts to search results format
      return retrievalResult.results.map((result, index) => ({
        title: JSON.parse(result.chunk.metadata || '{}').title || `Document ${index + 1}`,
        snippet: result.chunk.content,
        url: JSON.parse(result.chunk.metadata || '{}').url || `document://${result.chunk.id}`,
        position: index + 1,
        metadata: {
          source: 'document',
          documentId: result.chunk.documentId,
          chunkId: result.chunk.id,
          ...JSON.parse(result.chunk.metadata || '{}'),
        },
      }));
    } catch (error) {
      console.error('Document search failed:', error);
      return [];
    }
  }

  /**
   * Combine and rank web and document search results
   *
   * @param webResults Web search results
   * @param documentResults Document search results
   * @returns Combined and ranked results
   */
  private static combineSearchResults(
    webResults: SearchResult[],
    documentResults: SearchResult[]
  ): SearchResult[] {
    // If either set is empty, return the other
    if (webResults.length === 0) return documentResults;
    if (documentResults.length === 0) return webResults;

    // Normalize positions for ranking
    const normalizedWebResults = webResults.map((result, index) => ({
      ...result,
      position: index + 1,
    }));

    const normalizedDocResults = documentResults.map((result, index) => ({
      ...result,
      position: index + 1,
    }));

    // Create combined results with simple weighting
    // Web results get higher weight (positioned first)
    const combinedResults: SearchResult[] = [...normalizedWebResults, ...normalizedDocResults];

    // Sort by position (normalized by the respective result set size)
    return combinedResults.sort((a, b) => {
      // Give web results priority (lower position is better)
      const aIsWeb = a.metadata?.source !== 'document';
      const bIsWeb = b.metadata?.source !== 'document';

      if (aIsWeb && !bIsWeb) return -1;
      if (!aIsWeb && bIsWeb) return 1;

      // Otherwise sort by position within their respective sets
      return a.position - b.position;
    });
  }

  /**
   * Get recent searches for a user
   *
   * @param userId User ID
   * @param limit Maximum number of results
   * @returns Recent search queries
   */
  public static async getRecentSearches(
    userId: string = 'anonymous',
    limit: number = 10
  ): Promise<string[]> {
    try {
      const searches = await getRecentSearchQueries(userId, limit);
      return searches.map((search) => search.query);
    } catch (error) {
      console.error('Failed to get recent searches:', error);
      return [];
    }
  }
}
