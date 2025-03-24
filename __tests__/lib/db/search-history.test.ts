/**
 * Search History and Cache Tests
 */

import { SearchQuery, SearchResult, User } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import {
  createSearchQuery,
  createSearchResult,
  createSearchQueryWithResults,
  getSearchQueryById,
  getRecentSearchQueries,
  getFrequentSearchQueries,
  searchQueries,
  provideSearchResultFeedback,
  getSearchHistory,
  deleteSearchQuery,
  clearSearchHistory,
} from '../../../src/lib/db/search-history';
import {
  saveToCache,
  getFromCache,
  isCached,
  invalidateCache,
  extendCacheExpiration,
  cleanupExpiredCache,
  getCacheStats,
} from '../../../src/lib/db/cache';
import { prisma } from '../../../src/lib/db';

describe('Search History Utilities', () => {
  let testUser: User;
  let testQuery: SearchQuery;
  let testResult: SearchResult;

  // Setup: Create a test user before all tests
  beforeAll(async () => {
    testUser = await prisma.user.create({
      data: {
        id: uuidv4(),
        email: `test-${Date.now()}@example.com`,
        name: 'Test User',
      },
    });
  });

  // Cleanup after all tests
  afterAll(async () => {
    // Clean up all search results and queries
    await prisma.searchResult.deleteMany({});
    await prisma.searchQuery.deleteMany({});

    // Clean up the test user
    await prisma.user.delete({
      where: { id: testUser.id },
    });
  });

  // Test: Create a search query
  test('should create a search query', async () => {
    const query = await createSearchQuery({
      query: 'test search',
      userId: testUser.id,
      provider: 'google',
      resultCount: 5,
      metadata: {
        source: 'test',
        userAgent: 'Jest Test',
      },
    });

    expect(query).toBeDefined();
    expect(query.query).toBe('test search');
    expect(query.userId).toBe(testUser.id);
    expect(query.provider).toBe('google');
    expect(query.resultCount).toBe(5);

    // Save for later tests
    testQuery = query;
  });

  // Test: Create a search result
  test('should create a search result', async () => {
    const result = await createSearchResult({
      searchQueryId: testQuery.id,
      title: 'Test Result',
      url: 'https://example.com/test',
      snippet: 'This is a test search result snippet.',
      position: 1,
      metadata: {
        displayUrl: 'example.com/test',
        resultType: 'organic',
      },
    });

    expect(result).toBeDefined();
    expect(result.title).toBe('Test Result');
    expect(result.url).toBe('https://example.com/test');
    expect(result.searchQueryId).toBe(testQuery.id);
    expect(result.position).toBe(1);

    // Save for later tests
    testResult = result;
  });

  // Test: Create a search query with multiple results
  test('should create a search query with multiple results', async () => {
    const queryWithResults = await createSearchQueryWithResults(
      {
        query: 'another test',
        userId: testUser.id,
        provider: 'bing',
        resultCount: 3,
        metadata: { source: 'test suite' },
      },
      [
        {
          title: 'Result 1',
          url: 'https://example.com/1',
          snippet: 'Snippet 1',
          position: 1,
          metadata: { type: 'organic' },
        },
        {
          title: 'Result 2',
          url: 'https://example.com/2',
          snippet: 'Snippet 2',
          position: 2,
          metadata: { type: 'organic' },
        },
        {
          title: 'Result 3',
          url: 'https://example.com/3',
          snippet: 'Snippet 3',
          position: 3,
          metadata: { type: 'organic' },
        },
      ]
    );

    expect(queryWithResults).toBeDefined();
    expect(queryWithResults.query).toBe('another test');
    expect(queryWithResults.provider).toBe('bing');
    expect(queryWithResults.results).toHaveLength(3);
    expect(queryWithResults.results[0].title).toBe('Result 1');
    expect(queryWithResults.results[1].title).toBe('Result 2');
    expect(queryWithResults.results[2].title).toBe('Result 3');
  });

  // Test: Get a search query by ID
  test('should get a search query by ID', async () => {
    const query = await getSearchQueryById(testQuery.id);

    expect(query).toBeDefined();
    expect(query?.id).toBe(testQuery.id);
    expect(query?.query).toBe(testQuery.query);
    expect(query?.results).toHaveLength(1);
    expect(query?.results[0].id).toBe(testResult.id);
  });

  // Test: Get recent search queries
  test('should get recent search queries', async () => {
    // Create a few more search queries
    await createSearchQuery({
      query: 'recent search 1',
      userId: testUser.id,
      provider: 'google',
      resultCount: 10,
    });

    await createSearchQuery({
      query: 'recent search 2',
      userId: testUser.id,
      provider: 'google',
      resultCount: 10,
    });

    const queries = await getRecentSearchQueries(testUser.id, 3);

    expect(queries).toBeDefined();
    expect(queries).toHaveLength(3);
    expect(queries[0].query).toBe('recent search 2'); // Most recent first
    expect(queries[1].query).toBe('recent search 1');
  });

  // Test: Provide feedback on search result
  test('should update search result feedback', async () => {
    const updatedResult = await provideSearchResultFeedback(testResult.id, true);

    expect(updatedResult).toBeDefined();
    expect(updatedResult.id).toBe(testResult.id);
    expect(updatedResult.isRelevant).toBe(true);
  });

  // Test: Search for queries
  test('should search for queries by term', async () => {
    const results = await searchQueries(testUser.id, 'test');

    expect(results).toBeDefined();
    expect(results.length).toBeGreaterThan(0);
    // All returned queries should contain 'test'
    results.forEach((r) => {
      expect(r.query.toLowerCase()).toContain('test');
    });
  });

  // Test: Get search history with filtering
  test('should get search history with filtering', async () => {
    const history = await getSearchHistory(
      { userId: testUser.id, provider: 'google' },
      { page: 1, limit: 10 },
      { field: 'createdAt', direction: 'desc' }
    );

    expect(history).toBeDefined();
    expect(history.items.length).toBeGreaterThan(0);
    // All items should be from the google provider
    history.items.forEach((item) => {
      expect(item.provider).toBe('google');
    });
  });

  // Test: Delete a search query
  test('should delete a search query', async () => {
    // Create a query to delete
    const queryToDelete = await createSearchQuery({
      query: 'delete me',
      userId: testUser.id,
      provider: 'google',
      resultCount: 0,
    });

    const deleted = await deleteSearchQuery(queryToDelete.id);

    expect(deleted).toBeDefined();
    expect(deleted.id).toBe(queryToDelete.id);

    // Verify it's deleted
    const query = await getSearchQueryById(queryToDelete.id);
    expect(query).toBeNull();
  });
});

describe('Search Cache Utilities', () => {
  // Setup and teardown
  beforeAll(async () => {
    await prisma.searchCache.deleteMany({});
  });

  afterAll(async () => {
    await prisma.searchCache.deleteMany({});
  });

  // Test: Save and retrieve from cache
  test('should save and retrieve from cache', async () => {
    const query = 'cache test query';
    const provider = 'google';
    const results = [
      { title: 'Result 1', url: 'https://example.com/1' },
      { title: 'Result 2', url: 'https://example.com/2' },
    ];

    // Save to cache
    const cacheEntry = await saveToCache({
      query,
      provider,
      results,
      expirationMinutes: 30,
      metadata: { source: 'test' },
    });

    expect(cacheEntry).toBeDefined();
    expect(cacheEntry.query).toBe(query);
    expect(cacheEntry.provider).toBe(provider);

    // Retrieve from cache
    const cachedData = await getFromCache(query, provider);

    expect(cachedData).toBeDefined();
    expect(cachedData?.results).toHaveLength(2);
    expect(cachedData?.results[0].title).toBe('Result 1');
    expect(cachedData?.results[1].title).toBe('Result 2');
    expect(cachedData?.metadata?.source).toBe('test');
  });

  // Test: Check if query is cached
  test('should check if query is cached', async () => {
    const query = 'is cached test';
    const provider = 'google';

    // Initially not cached
    let isCachedResult = await isCached(query, provider);
    expect(isCachedResult).toBe(false);

    // Save to cache
    await saveToCache({
      query,
      provider,
      results: [{ title: 'Cached Result' }],
    });

    // Now should be cached
    isCachedResult = await isCached(query, provider);
    expect(isCachedResult).toBe(true);
  });

  // Test: Invalidate cache entry
  test('should invalidate a cache entry', async () => {
    const query = 'invalidate test';
    const provider = 'google';

    // Save to cache
    await saveToCache({
      query,
      provider,
      results: [{ title: 'To Be Invalidated' }],
    });

    // Verify it's cached
    let isCachedResult = await isCached(query, provider);
    expect(isCachedResult).toBe(true);

    // Invalidate the cache
    const invalidated = await invalidateCache(query, provider);
    expect(invalidated).toBeDefined();
    expect(invalidated?.query).toBe(query);

    // Verify it's no longer cached
    isCachedResult = await isCached(query, provider);
    expect(isCachedResult).toBe(false);
  });

  // Test: Extend cache expiration
  test('should extend cache expiration', async () => {
    const query = 'extend expiration test';
    const provider = 'google';

    // Save to cache with short expiration
    const original = await saveToCache({
      query,
      provider,
      results: [{ title: 'Extend Me' }],
      expirationMinutes: 5,
    });

    // Get the original expiration time
    const originalExpiresAt = new Date(original.expiresAt).getTime();

    // Extend the expiration
    const extended = await extendCacheExpiration(query, provider, 30);

    expect(extended).toBeDefined();

    // Verify the expiration was extended
    const newExpiresAt = new Date(extended!.expiresAt).getTime();
    expect(newExpiresAt).toBeGreaterThan(originalExpiresAt);
  });

  // Test: Clean up expired cache entries
  test('should clean up expired cache entries', async () => {
    // Create an already expired cache entry
    const expiredDate = new Date();
    expiredDate.setMinutes(expiredDate.getMinutes() - 60); // 60 minutes in the past

    await prisma.searchCache.create({
      data: {
        id: uuidv4(),
        query: 'expired query',
        provider: 'google',
        results: JSON.stringify({ results: [] }),
        expiresAt: expiredDate,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Run cleanup
    const deletedCount = await cleanupExpiredCache();

    // Should have deleted at least our expired entry
    expect(deletedCount).toBeGreaterThanOrEqual(1);

    // Verify it's gone
    const cachedData = await getFromCache('expired query', 'google');
    expect(cachedData).toBeNull();
  });

  // Test: Get cache statistics
  test('should get cache statistics', async () => {
    // Create some cache entries
    await saveToCache({
      query: 'stats test 1',
      provider: 'google',
      results: [{ title: 'Stats 1' }],
    });

    await saveToCache({
      query: 'stats test 2',
      provider: 'google',
      results: [{ title: 'Stats 2' }],
    });

    // Get stats
    const stats = await getCacheStats();

    expect(stats).toBeDefined();
    expect(stats.totalEntries).toBeGreaterThanOrEqual(2);
    expect(stats.activeEntries).toBeGreaterThanOrEqual(2);
    expect(stats.oldestEntryDate).toBeDefined();
    expect(stats.newestEntryDate).toBeDefined();
    expect(stats.averageExpirationMinutes).toBeGreaterThan(0);
  });
});
