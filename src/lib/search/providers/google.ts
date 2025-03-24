import {
  SearchOptions,
  SearchProviderCapabilities,
  SearchProviderInterface,
  SearchResult,
} from '../types';

/**
 * Google Search API result item interface
 */
interface GoogleSearchResultItem {
  title?: string;
  link?: string;
  snippet?: string;
  displayLink?: string;
  formattedUrl?: string;
  htmlSnippet?: string;
  htmlTitle?: string;
  kind?: string;
  labels?: string[];
  [key: string]: unknown;
}

/**
 * Google Search Provider
 * Uses the Google Search API to perform web searches
 */
export class GoogleSearchProvider implements SearchProviderInterface {
  private apiKey: string;
  private searchEngineId: string;
  private baseUrl = 'https://www.googleapis.com/customsearch/v1';

  constructor() {
    this.apiKey = process.env.GOOGLE_API_KEY || '';
    this.searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID || '';
  }

  /**
   * Provider name
   */
  public get name() {
    return 'google' as const;
  }

  /**
   * Check if the provider is properly configured and available
   */
  async isAvailable(): Promise<boolean> {
    return Boolean(this.apiKey && this.searchEngineId);
  }

  /**
   * Get provider capabilities
   */
  getCapabilities(): SearchProviderCapabilities {
    return {
      timeFiltering: true,
      domainFiltering: true,
      contentTypeFiltering: true,
      maxResultsPerQuery: 10,
      rateLimit: {
        requestsPerDay: 100, // Default free tier limit
      },
    };
  }

  /**
   * Perform a Google search
   * @param query Search query
   * @param options Search options
   */
  async search(query: string, options?: Partial<SearchOptions>): Promise<SearchResult[]> {
    if (!this.isAvailable()) {
      throw new Error('Google Search API is not properly configured');
    }

    try {
      const searchOptions = {
        q: query,
        key: this.apiKey,
        cx: this.searchEngineId,
        num: options?.maxResults || 10,
      };

      // Add time range if specified
      if (options?.timeRange) {
        const dateRestrict = this.convertTimeRangeToDateRestrict(options.timeRange);
        if (dateRestrict) {
          Object.assign(searchOptions, { dateRestrict });
        }
      }

      // Add filters if specified
      if (options?.filters) {
        Object.entries(options.filters).forEach(([key, value]) => {
          if (key === 'site' && value) {
            searchOptions.q += ` site:${value}`;
          } else if (key === 'fileType' && value) {
            searchOptions.q += ` filetype:${value}`;
          }
        });
      }

      // Construct URL with query parameters
      const url = new URL(this.baseUrl);
      Object.entries(searchOptions).forEach(([key, value]) => {
        url.searchParams.append(key, value.toString());
      });

      // Perform the search
      const response = await fetch(url.toString());

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Google search failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      if (!data.items || !Array.isArray(data.items)) {
        return [];
      }

      // Transform Google search results into our standard format
      return data.items.map((item: GoogleSearchResultItem, index: number) => ({
        title: item.title || '',
        url: item.link || '',
        snippet: item.snippet || '',
        position: index + 1,
        metadata: {
          displayLink: item.displayLink,
          formattedUrl: item.formattedUrl,
          htmlSnippet: item.htmlSnippet,
          htmlTitle: item.htmlTitle,
          kind: item.kind,
          labels: item.labels,
          mime: item.mime,
          fileFormat: item.fileFormat,
          pagemap: item.pagemap,
        },
      }));
    } catch (error) {
      console.error('Error performing Google search:', error);
      throw new Error(
        `Google search failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Convert time range string to Google's dateRestrict format
   */
  private convertTimeRangeToDateRestrict(timeRange: string): string | null {
    switch (timeRange.toLowerCase()) {
      case 'day':
        return 'd1';
      case 'week':
        return 'w1';
      case 'month':
        return 'm1';
      case 'year':
        return 'y1';
      default:
        if (timeRange.match(/^d\d+$/)) return timeRange; // d[number]
        if (timeRange.match(/^w\d+$/)) return timeRange; // w[number]
        if (timeRange.match(/^m\d+$/)) return timeRange; // m[number]
        if (timeRange.match(/^y\d+$/)) return timeRange; // y[number]
        return null;
    }
  }
}
