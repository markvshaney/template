import { SearchService } from '@/lib/services/search-service';
import { webSearch } from '@/lib/search/web-search';
import { createSearchQuery, getRecentSearchQueries } from '@/lib/db/search-history';
import { EmbeddingGenerator } from '@/lib/ai/embeddings';
import { retrieveContext } from '@/lib/rag/retrieval';

// Mock dependencies
jest.mock('@/lib/search/web-search');
jest.mock('@/lib/db/search-history');
jest.mock('@/lib/ai/embeddings', () => ({
  EmbeddingGenerator: jest.fn(),
}));
jest.mock('@/lib/rag/retrieval');

describe('SearchService', () => {
  const mockWebResults = [
    {
      title: 'Web Result 1',
      url: 'https://example.com/1',
      snippet: 'This is web result 1',
      position: 1,
    },
    {
      title: 'Web Result 2',
      url: 'https://example.com/2',
      snippet: 'This is web result 2',
      position: 2,
    },
  ];

  const mockDocumentResults = [
    {
      title: 'Document Result 1',
      snippet: 'This is document result 1',
      url: 'document://123/456',
      position: 1,
      metadata: {
        source: 'document',
        documentId: '123',
        chunkId: '456',
      },
    },
  ];

  const mockQueryEmbedding = [0.1, 0.2, 0.3, 0.4];

  const mockRetrievalResult = {
    results: [
      {
        chunk: {
          id: '456',
          documentId: '123',
          content: 'This is document result 1',
          metadata: JSON.stringify({ title: 'Document Result 1' }),
        },
        score: 0.95,
      },
    ],
    context: 'mockContext',
    sources: [{ id: '123' }],
  };

  beforeEach(() => {
    jest.resetAllMocks();

    // Mock web search
    (webSearch as jest.Mock).mockResolvedValue(mockWebResults);

    // Mock embedding generation
    const mockGenerateQueryEmbedding = jest.fn().mockResolvedValue(mockQueryEmbedding);
    const mockEmbeddingGenerator = {
      generateQueryEmbedding: mockGenerateQueryEmbedding,
    };
    jest
      .spyOn(EmbeddingGenerator.prototype, 'generateQueryEmbedding')
      .mockImplementation(mockEmbeddingGenerator.generateQueryEmbedding);

    // Mock context retrieval
    (retrieveContext as jest.Mock).mockResolvedValue(mockRetrievalResult);

    // Mock database functions
    (createSearchQuery as jest.Mock).mockResolvedValue({ id: 'mock-query-id' });
    (getRecentSearchQueries as jest.Mock).mockResolvedValue([
      { query: 'previous search 1' },
      { query: 'previous search 2' },
    ]);
  });

  describe('search', () => {
    test('returns web and document results correctly', async () => {
      const result = await SearchService.search('test query');

      expect(result.webResults).toEqual(mockWebResults);
      expect(result.documentResults).toHaveLength(1);
      expect(result.query).toBe('test query');
      expect(result.timestamp).toBeDefined();
    });

    test('creates search history record when tracking enabled', async () => {
      await SearchService.search('test query', { trackHistory: true });

      expect(createSearchQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'test query',
          userId: 'anonymous',
          provider: 'google',
        })
      );
    });

    test('does not create search history when tracking disabled', async () => {
      await SearchService.search('test query', { trackHistory: false });

      expect(createSearchQuery).not.toHaveBeenCalled();
    });

    test('does not perform document search when semantic search disabled', async () => {
      await SearchService.search('test query', { enableSemanticSearch: false });

      expect(EmbeddingGenerator).not.toHaveBeenCalled();
      expect(retrieveContext).not.toHaveBeenCalled();
    });

    test('handles search errors gracefully', async () => {
      (webSearch as jest.Mock).mockRejectedValue(new Error('Search failed'));

      const result = await SearchService.search('test query');

      expect(result.webResults).toEqual([]);
      expect(result.combinedResults).toEqual([]);
    });

    test('combines results correctly', async () => {
      const result = await SearchService.search('test query', { combineResults: true });

      expect(result.combinedResults.length).toBe(
        result.webResults.length + result.documentResults.length
      );
    });
  });

  describe('getRecentSearches', () => {
    test('returns formatted search queries', async () => {
      const results = await SearchService.getRecentSearches();

      expect(results).toEqual(['previous search 1', 'previous search 2']);
      expect(getRecentSearchQueries).toHaveBeenCalledWith('anonymous', 10);
    });

    test('handles custom user ID and limit', async () => {
      await SearchService.getRecentSearches('user123', 5);

      expect(getRecentSearchQueries).toHaveBeenCalledWith('user123', 5);
    });

    test('handles errors gracefully', async () => {
      (getRecentSearchQueries as jest.Mock).mockRejectedValue(new Error('Database error'));

      const results = await SearchService.getRecentSearches();

      expect(results).toEqual([]);
    });
  });
});
