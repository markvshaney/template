import { webSearch, enhancedSearch, firecrawlSearch } from '../../../src/lib/search/web-search';
import { BraveSearchProvider } from '../../../src/lib/search/providers/brave';
import { FirecrawlClient } from '../../../src/lib/search/providers/firecrawl';

// Mock the providers
jest.mock('../../../src/lib/search/providers/brave');
jest.mock('../../../src/lib/search/providers/firecrawl');

describe('Web Search Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('webSearch function', () => {
    it('should search using the specified provider', async () => {
      // Setup mock responses
      const mockSearchResults = [
        {
          title: 'Test Result 1',
          url: 'https://example.com/1',
          snippet: 'This is a test result',
          position: 1,
          metadata: {},
        },
      ];

      // Setup the mock
      const mockProvider = BraveSearchProvider as jest.MockedClass<typeof BraveSearchProvider>;
      mockProvider.prototype.isAvailable.mockResolvedValue(true);
      mockProvider.prototype.search.mockResolvedValue(mockSearchResults);

      // Call the function
      const results = await webSearch('test query', { provider: 'brave' });

      // Verify that the provider's search was called
      expect(mockProvider.prototype.search).toHaveBeenCalledWith('test query', {
        provider: 'brave',
      });

      // Verify the results
      expect(results).toEqual(mockSearchResults);
    });

    it('should throw an error if the provider is not available', async () => {
      // Setup the mock
      const mockProvider = BraveSearchProvider as jest.MockedClass<typeof BraveSearchProvider>;
      mockProvider.prototype.isAvailable.mockResolvedValue(false);

      // Call the function and expect it to throw
      await expect(webSearch('test query', { provider: 'brave' })).rejects.toThrow(
        "Search provider 'brave' is not available"
      );
    });
  });

  describe('enhancedSearch function', () => {
    it('should enhance search results with extracted content', async () => {
      // Setup mock responses
      const mockSearchResults = [
        {
          title: 'Test Result 1',
          url: 'https://example.com/1',
          snippet: 'This is a test result',
          position: 1,
          metadata: {},
        },
      ];

      const mockExtractedData = {
        url: 'https://example.com/1',
        title: 'Test Result 1',
        content: 'Extracted content',
        markdown: 'Extracted markdown content',
        statusCode: 200,
      };

      // Setup the mocks
      const mockProvider = BraveSearchProvider as jest.MockedClass<typeof BraveSearchProvider>;
      mockProvider.prototype.isAvailable.mockResolvedValue(true);
      mockProvider.prototype.search.mockResolvedValue(mockSearchResults);

      const mockFirecrawl = FirecrawlClient as jest.MockedClass<typeof FirecrawlClient>;
      mockFirecrawl.prototype.scrape.mockResolvedValue(mockExtractedData);

      // Call the function
      const results = await enhancedSearch('test query', {
        provider: 'brave',
        extractContent: true,
        maxExtractions: 1,
      });

      // Verify that the provider's search was called
      expect(mockProvider.prototype.search).toHaveBeenCalledWith('test query', {
        provider: 'brave',
        extractContent: true,
        maxExtractions: 1,
      });

      // Verify that Firecrawl was called for content extraction
      expect(mockFirecrawl.prototype.scrape).toHaveBeenCalledWith('https://example.com/1', {
        onlyMainContent: true,
      });

      // Verify the results
      expect(results).toHaveLength(1);
      expect(results[0].extractedContent).toBe(mockExtractedData.markdown);
    });

    it('should not extract content if extractContent is false', async () => {
      // Setup mock responses
      const mockSearchResults = [
        {
          title: 'Test Result 1',
          url: 'https://example.com/1',
          snippet: 'This is a test result',
          position: 1,
          metadata: {},
        },
      ];

      // Setup the mocks
      const mockProvider = BraveSearchProvider as jest.MockedClass<typeof BraveSearchProvider>;
      mockProvider.prototype.isAvailable.mockResolvedValue(true);
      mockProvider.prototype.search.mockResolvedValue(mockSearchResults);

      const mockFirecrawl = FirecrawlClient as jest.MockedClass<typeof FirecrawlClient>;

      // Call the function
      const results = await enhancedSearch('test query', {
        provider: 'brave',
        extractContent: false,
      });

      // Verify that Firecrawl was not called
      expect(mockFirecrawl.prototype.scrape).not.toHaveBeenCalled();

      // Verify the results
      expect(results).toEqual(mockSearchResults);
    });
  });

  describe('firecrawlSearch function', () => {
    it('should search directly using Firecrawl', async () => {
      // Setup mock responses
      const mockSearchResults = [
        {
          title: 'Test Result 1',
          url: 'https://example.com/1',
          content: 'Extracted content',
          snippet: 'This is a test result',
        },
      ];

      // Setup the mock
      const mockFirecrawl = FirecrawlClient as jest.MockedClass<typeof FirecrawlClient>;
      mockFirecrawl.prototype.search.mockResolvedValue(mockSearchResults);

      // Call the function
      const results = await firecrawlSearch('test query', { limit: 5 });

      // Verify that Firecrawl was called
      expect(mockFirecrawl.prototype.search).toHaveBeenCalledWith('test query', { limit: 5 });

      // Verify the results
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Test Result 1');
      expect(results[0].url).toBe('https://example.com/1');
      expect(results[0].metadata!.extractedContent).toBe('Extracted content');
    });
  });
});
