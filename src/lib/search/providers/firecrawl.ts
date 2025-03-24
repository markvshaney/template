/**
 * Firecrawl Provider
 * Implementation for content extraction from web pages using Firecrawl
 */

/**
 * Firecrawl API response types
 */
interface FirecrawlScrapeResponse {
  url: string;
  title: string;
  content: string;
  markdown: string;
  html?: string;
  links?: string[];
  images?: string[];
  statusCode: number;
}

interface FirecrawlSearchResponse {
  results: FirecrawlSearchResult[];
}

interface FirecrawlSearchResult {
  title: string;
  url: string;
  content: string;
  snippet: string;
}

/**
 * Options for Firecrawl scrape requests
 */
export interface FirecrawlScrapeOptions {
  /** Only extract main content, skipping headers/footers */
  onlyMainContent?: boolean;
  /** Include raw HTML in the response */
  includeHtml?: boolean;
  /** Wait for JavaScript to load content */
  waitForJs?: boolean;
  /** Execute specific actions on the page */
  actions?: FirecrawlAction[];
}

/**
 * Actions that can be performed before scraping
 */
export interface FirecrawlAction {
  type: 'click' | 'scroll' | 'wait' | 'type';
  selector?: string;
  value?: string | number;
}

/**
 * Options for Firecrawl search requests
 */
export interface FirecrawlSearchOptions {
  /** Maximum number of results to return */
  limit?: number;
  /** Whether to fetch full content for each result */
  fetchPageContent?: boolean;
}

/**
 * Firecrawl client for content extraction
 */
export class FirecrawlClient {
  private apiKey: string;
  private baseUrl = 'https://api.firecrawl.dev/api/v1';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.FIRECRAWL_API_KEY || '';

    if (!this.apiKey) {
      console.warn('Firecrawl API key not provided. API calls will likely fail.');
    }
  }

  /**
   * Check if the client is available
   */
  async isAvailable(): Promise<boolean> {
    return Boolean(this.apiKey);
  }

  /**
   * Scrape content from a URL using Firecrawl
   */
  async scrape(
    url: string,
    options: FirecrawlScrapeOptions = {}
  ): Promise<FirecrawlScrapeResponse> {
    if (!this.apiKey) {
      throw new Error('Firecrawl API key is required');
    }

    try {
      const response = await fetch(`${this.baseUrl}/scrape`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          url,
          onlyMainContent: options.onlyMainContent ?? true,
          includeHtml: options.includeHtml ?? false,
          waitForJs: options.waitForJs ?? true,
          actions: options.actions || [],
        }),
      });

      if (!response.ok) {
        throw new Error(`Firecrawl API error: ${response.status} ${response.statusText}`);
      }

      return (await response.json()) as FirecrawlScrapeResponse;
    } catch (error) {
      console.error('Error in Firecrawl scrape:', error);
      throw new Error(
        `Firecrawl scrape failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Search and scrape content using Firecrawl
   */
  async search(
    query: string,
    options: FirecrawlSearchOptions = {}
  ): Promise<FirecrawlSearchResult[]> {
    if (!this.apiKey) {
      throw new Error('Firecrawl API key is required');
    }

    try {
      const response = await fetch(`${this.baseUrl}/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          query,
          limit: options.limit || 5,
          fetchPageContent: options.fetchPageContent ?? true,
        }),
      });

      if (!response.ok) {
        throw new Error(`Firecrawl API error: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as FirecrawlSearchResponse;
      return data.results;
    } catch (error) {
      console.error('Error in Firecrawl search:', error);
      throw new Error(
        `Firecrawl search failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
