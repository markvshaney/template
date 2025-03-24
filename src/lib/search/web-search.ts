/**
 * Web Search Module
 * Provides a unified interface for search across different providers
 */

import { SearchOptions, SearchProvider, SearchProviderInterface, SearchResult } from './types';
import { GoogleSearchProvider } from './providers/google';
import { BraveSearchProvider } from './providers/brave';
import { FirecrawlClient, FirecrawlSearchOptions } from './providers/firecrawl';

/**
 * Factory function to get the appropriate search provider
 */
export function getSearchProvider(provider: SearchProvider): SearchProviderInterface {
  switch (provider) {
    case 'google':
      return new GoogleSearchProvider();
    case 'brave':
      return new BraveSearchProvider();
    case 'bing':
      throw new Error('Bing search provider not yet implemented');
    case 'duckduckgo':
      throw new Error('DuckDuckGo search provider not yet implemented');
    default:
      throw new Error(`Unknown search provider: ${provider}`);
  }
}

/**
 * Main search function
 * Performs a web search using the specified provider
 *
 * @param query The search query
 * @param options Search options including provider selection
 * @returns Array of search results
 */
export async function webSearch(
  query: string,
  options: Partial<SearchOptions> = {}
): Promise<SearchResult[]> {
  // Default to Google if no provider specified
  const providerName = options.provider || 'google';

  try {
    // In development or testing mode without API keys, use mock search
    // This allows the application to function without real API access
    if (process.env.NODE_ENV === 'development' || !process.env.GOOGLE_API_KEY) {
      console.log('Using mock search data - no API keys available');
      return mockSearch(query, options);
    }

    // Get the provider instance
    const provider = getSearchProvider(providerName);

    // Check if the provider is available
    const isAvailable = await provider.isAvailable();
    if (!isAvailable) {
      console.log(`Search provider '${providerName}' is not available, using mock data`);
      return mockSearch(query, options);
    }

    // Perform the search
    return await provider.search(query, options);
  } catch (error) {
    console.error(`Error in web search:`, error);
    console.log('Falling back to mock search data');
    return mockSearch(query, options);
  }
}

/**
 * Mock search function for development without API keys
 */
function mockSearch(query: string, options: Partial<SearchOptions> = {}): SearchResult[] {
  const maxResults = options.maxResults || 10;

  // Create some mock results based on the query
  const results: SearchResult[] = [
    {
      title: `${query} - Wikipedia`,
      url: `https://en.wikipedia.org/wiki/${query.replace(/\s+/g, '_')}`,
      snippet: `Comprehensive information about ${query} from Wikipedia, the free encyclopedia.`,
      position: 1,
      metadata: { source: 'mock' },
    },
    {
      title: `${query} News, Articles and Research`,
      url: `https://example.com/search?q=${encodeURIComponent(query)}`,
      snippet: `Find the latest news, articles and research about ${query} from trusted sources.`,
      position: 2,
      metadata: { source: 'mock' },
    },
    {
      title: `Learn about ${query} - Educational Resources`,
      url: `https://learn-about.example.org/${query.toLowerCase().replace(/\s+/g, '-')}`,
      snippet: `Educational resources and learning materials about ${query} for students and researchers.`,
      position: 3,
      metadata: { source: 'mock' },
    },
    {
      title: `${query} - GitHub Topics`,
      url: `https://github.com/topics/${query.toLowerCase().replace(/\s+/g, '-')}`,
      snippet: `Find repositories related to ${query} on GitHub, the world's leading software development platform.`,
      position: 4,
      metadata: { source: 'mock' },
    },
    {
      title: `${query} - Latest Research Papers`,
      url: `https://papers.example.com/search?q=${encodeURIComponent(query)}`,
      snippet: `Browse the latest research papers and academic articles about ${query}.`,
      position: 5,
      metadata: { source: 'mock' },
    },
    {
      title: `${query} Community Forum`,
      url: `https://community.example.net/forum/${query.toLowerCase().replace(/\s+/g, '-')}`,
      snippet: `Join discussions about ${query} with experts and enthusiasts in our community forum.`,
      position: 6,
      metadata: { source: 'mock' },
    },
    {
      title: `${query} - YouTube`,
      url: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
      snippet: `Watch videos about ${query} on YouTube.`,
      position: 7,
      metadata: { source: 'mock' },
    },
    {
      title: `${query} Books and Publications`,
      url: `https://books.example.org/search?q=${encodeURIComponent(query)}`,
      snippet: `Find books, publications, and e-books about ${query}.`,
      position: 8,
      metadata: { source: 'mock' },
    },
    {
      title: `${query} - Images and Photos`,
      url: `https://images.example.com/search?q=${encodeURIComponent(query)}`,
      snippet: `Browse images, photos, and illustrations related to ${query}.`,
      position: 9,
      metadata: { source: 'mock' },
    },
    {
      title: `${query} - Definition and Meaning`,
      url: `https://dictionary.example.com/definition/${query.toLowerCase().replace(/\s+/g, '-')}`,
      snippet: `Learn the definition and meaning of ${query} from our comprehensive dictionary.`,
      position: 10,
      metadata: { source: 'mock' },
    },
  ];

  // Return only the number of results requested
  return results.slice(0, maxResults);
}

/**
 * Search across multiple providers and combine results
 *
 * @param query The search query
 * @param providers Array of providers to search with
 * @param options Search options
 * @returns Combined array of search results
 */
export async function multiProviderSearch(
  query: string,
  providers: SearchProvider[] = ['google'],
  options: Partial<Omit<SearchOptions, 'provider'>> = {}
): Promise<SearchResult[]> {
  // Validate providers
  if (!providers.length) {
    throw new Error('At least one search provider must be specified');
  }

  try {
    // Execute searches in parallel
    const searchPromises = providers.map((provider) =>
      webSearch(query, { ...options, provider }).catch((error) => {
        console.warn(`Search with provider '${provider}' failed:`, error);
        return [] as SearchResult[];
      })
    );

    // Wait for all searches to complete
    const resultsArrays = await Promise.all(searchPromises);

    // Combine and deduplicate results
    const combinedResults = deduplicateResults(resultsArrays.flat());

    return combinedResults;
  } catch (error) {
    console.error(`Error in multi-provider search:`, error);
    throw new Error(
      `Multi-provider search failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Remove duplicate results based on URL
 */
function deduplicateResults(results: SearchResult[]): SearchResult[] {
  const uniqueUrls = new Set<string>();
  return results.filter((result) => {
    if (uniqueUrls.has(result.url)) {
      return false;
    }
    uniqueUrls.add(result.url);
    return true;
  });
}

/**
 * Save search history to database
 * This is a placeholder for integration with the database
 */
export async function saveSearchHistory(
  query: string,
  userId: string,
  provider: SearchProvider
): Promise<void> {
  // This will be implemented in a later step when we have database integration
  console.log(`Search history saved: ${query} by ${userId} using ${provider}`);
}

/**
 * Enhanced search with content extraction
 * Performs a web search and then extracts content from the top results
 *
 * @param query The search query
 * @param options Search options including provider selection
 * @returns Array of search results with extracted content
 */
export async function enhancedSearch(
  query: string,
  options: Partial<SearchOptions> & {
    extractContent?: boolean;
    maxExtractions?: number;
  } = {}
): Promise<(SearchResult & { extractedContent?: string })[]> {
  // Default to Brave if no provider specified
  const providerName = options.provider || 'brave';
  const extractContent = options.extractContent ?? true;
  const maxExtractions = options.maxExtractions || 3;

  try {
    // Get search results
    const results = await webSearch(query, { ...options, provider: providerName });

    // If content extraction is not needed, return results as-is
    if (!extractContent || results.length === 0) {
      return results;
    }

    // Only extract content from top N results
    const topResults = results.slice(0, maxExtractions);

    // Use Firecrawl for content extraction
    const firecrawl = new FirecrawlClient();
    const extractionPromises = topResults.map(async (result) => {
      try {
        const extractedData = await firecrawl.scrape(result.url, {
          onlyMainContent: true,
        });

        return {
          ...result,
          extractedContent: extractedData.markdown,
        };
      } catch (error) {
        console.warn(`Content extraction failed for ${result.url}:`, error);
        return result;
      }
    });

    // Wait for all extractions to complete
    const enhancedResults = await Promise.all(extractionPromises);

    // Add back any results that weren't processed for content extraction
    if (results.length > maxExtractions) {
      enhancedResults.push(...results.slice(maxExtractions));
    }

    return enhancedResults;
  } catch (error) {
    console.error(`Error in enhanced search:`, error);
    console.log('Falling back to mock search data');
    return mockSearch(query, options);
  }
}

/**
 * Combined search with Firecrawl
 * Uses Firecrawl directly for searching and content extraction
 */
export async function firecrawlSearch(
  query: string,
  options: FirecrawlSearchOptions = {}
): Promise<SearchResult[]> {
  try {
    const firecrawl = new FirecrawlClient();
    const results = await firecrawl.search(query, options);

    // Convert Firecrawl results to standard format
    return results.map((result, index) => ({
      title: result.title,
      url: result.url,
      snippet: result.snippet,
      position: index + 1,
      metadata: {
        extractedContent: result.content,
      },
    }));
  } catch (error) {
    console.error(`Error in Firecrawl search:`, error);
    console.log('Falling back to mock search data');
    // Create a compatible options object for mockSearch
    const searchOptions: Partial<SearchOptions> = {
      maxResults: options.limit,
      provider: 'google',
    };
    return mockSearch(query, searchOptions);
  }
}
