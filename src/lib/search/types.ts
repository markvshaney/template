/**
 * Types for web search functionality
 */

/**
 * Supported search providers
 */
export type SearchProvider = 'google' | 'bing' | 'duckduckgo' | 'brave';

/**
 * Search options for web search
 */
export interface SearchOptions {
  /** Search provider to use */
  provider: SearchProvider;
  /** Maximum number of results to return */
  maxResults?: number;
  /** Additional filters for search (provider-specific) */
  filters?: Record<string, string>;
  /** Include snippets in search results */
  includeSnippets?: boolean;
  /** Time window for search results (e.g., 'day', 'week', 'month', 'year') */
  timeRange?: string;
}

/**
 * Web search result structure
 */
export interface SearchResult {
  /** Title of the search result */
  title: string;
  /** URL of the search result */
  url: string;
  /** Text snippet from the search result */
  snippet: string;
  /** Position in search results (1-based) */
  position: number;
  /** Additional metadata for the search result */
  metadata?: Record<string, unknown>;
}

/**
 * Search history record for tracking user searches
 */
export interface SearchHistoryRecord {
  /** Search query text */
  query: string;
  /** User ID who performed the search */
  userId: string;
  /** Timestamp of the search */
  timestamp: Date;
  /** Provider used for search */
  provider: SearchProvider;
  /** Search options used */
  options?: Partial<SearchOptions>;
  /** Number of results returned */
  resultCount: number;
}

/**
 * Interface for search provider implementation
 */
export interface SearchProviderInterface {
  /** Provider name */
  name: SearchProvider;
  /** Search implementation */
  search(query: string, options?: Partial<SearchOptions>): Promise<SearchResult[]>;
  /** Check if provider is available */
  isAvailable(): Promise<boolean>;
  /** Get provider capabilities */
  getCapabilities(): SearchProviderCapabilities;
}

/**
 * Provider capabilities
 */
export interface SearchProviderCapabilities {
  /** Supports filtering by time range */
  timeFiltering: boolean;
  /** Supports filtering by domain */
  domainFiltering: boolean;
  /** Supports filtering by content type */
  contentTypeFiltering: boolean;
  /** Maximum results per query */
  maxResultsPerQuery: number;
  /** Rate limit information */
  rateLimit?: {
    /** Requests per minute */
    requestsPerMinute?: number;
    /** Requests per day */
    requestsPerDay?: number;
  };
}
