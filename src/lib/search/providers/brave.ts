/**
 * Brave Search Provider
 * Implementation of search provider interface for Brave Search API
 */

import {
  SearchOptions,
  SearchProviderCapabilities,
  SearchProviderInterface,
  SearchResult,
} from '../types';

/**
 * Brave Search API response types
 */
interface BraveSearchResponse {
  web: {
    results: BraveSearchResult[];
    totalEstimatedMatches: number;
  };
  query: {
    original: string;
  };
}

interface BraveSearchResult {
  title: string;
  url: string;
  description: string;
  position: number;
  age?: string;
  language?: string;
  country?: string;
}

/**
 * Implementation of Brave Search provider
 */
export class BraveSearchProvider implements SearchProviderInterface {
  name = 'brave' as const;
  private apiKey: string;
  private baseUrl = 'https://api.search.brave.com/res/v1/web';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.BRAVE_SEARCH_API_KEY || '';

    if (!this.apiKey) {
      console.warn('Brave Search API key not provided. API calls will likely fail.');
    }
  }

  /**
   * Check if the provider is available
   */
  async isAvailable(): Promise<boolean> {
    return Boolean(this.apiKey);
  }

  /**
   * Get provider capabilities
   */
  getCapabilities(): SearchProviderCapabilities {
    return {
      timeFiltering: true,
      domainFiltering: true,
      contentTypeFiltering: true,
      maxResultsPerQuery: 20,
      rateLimit: {
        requestsPerMinute: 60,
      },
    };
  }

  /**
   * Perform search using Brave Search API
   */
  async search(query: string, options: Partial<SearchOptions> = {}): Promise<SearchResult[]> {
    if (!this.apiKey) {
      throw new Error('Brave Search API key is required');
    }

    try {
      const maxResults = options.maxResults || 10;

      // Build search parameters
      const params = new URLSearchParams({
        q: query,
        count: maxResults.toString(),
      });

      // Add time filter if provided
      if (options.timeRange) {
        params.append('freshness', this.convertTimeRange(options.timeRange));
      }

      // Add domain filter if provided
      if (options.filters?.domain) {
        params.append('site', options.filters.domain);
      }

      // Perform API request
      const response = await fetch(`${this.baseUrl}?${params.toString()}`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'X-Subscription-Token': this.apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Brave Search API error: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as BraveSearchResponse;

      // Convert Brave results to standard format
      return this.convertResults(data);
    } catch (error) {
      console.error('Error in Brave search:', error);
      throw new Error(
        `Brave search failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Convert Brave Search results to standardized format
   */
  private convertResults(data: BraveSearchResponse): SearchResult[] {
    if (!data.web || !data.web.results) {
      return [];
    }

    return data.web.results.map((result) => ({
      title: result.title,
      url: result.url,
      snippet: result.description,
      position: result.position,
      metadata: {
        language: result.language,
        country: result.country,
        age: result.age,
      },
    }));
  }

  /**
   * Convert standard time range to Brave Search API format
   */
  private convertTimeRange(timeRange: string): string {
    switch (timeRange.toLowerCase()) {
      case 'day':
        return 'pd';
      case 'week':
        return 'pw';
      case 'month':
        return 'pm';
      case 'year':
        return 'py';
      default:
        return '';
    }
  }
}
