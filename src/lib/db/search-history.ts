/**
 * Search History Utilities
 * Functions for managing search queries, results, and history
 */

import { Prisma, SearchQuery, SearchResult } from '@prisma/client';
import { prisma } from '../db';
import { v4 as uuidv4 } from 'uuid';
import { PaginatedResponse, PaginationOptions, SortingOptions } from './types';

/**
 * Search query filter options
 */
export interface SearchQueryFilterOptions {
  userId?: string;
  provider?: string;
  startDate?: Date;
  endDate?: Date;
  searchTerm?: string;
}

/**
 * Search result feedback type
 */
export enum SearchResultFeedback {
  RELEVANT = 'relevant',
  IRRELEVANT = 'irrelevant',
  NEUTRAL = 'neutral',
}

/**
 * Input for creating a search query
 */
export interface SearchQueryInput {
  query: string;
  userId: string;
  provider: string;
  resultCount: number;
  metadata?: Record<string, unknown>;
}

/**
 * Input for creating a search result
 */
export interface SearchResultInput {
  searchQueryId: string;
  title: string;
  url: string;
  snippet: string;
  position: number;
  metadata?: Record<string, unknown>;
}

/**
 * Search query with related results
 */
export type SearchQueryWithResults = SearchQuery & {
  results: SearchResult[];
};

/**
 * Creates a new search query record
 *
 * @param input The search query input data
 * @returns The created search query
 */
export async function createSearchQuery(input: SearchQueryInput): Promise<SearchQuery> {
  return await prisma.searchQuery.create({
    data: {
      id: uuidv4(),
      query: input.query,
      userId: input.userId,
      provider: input.provider,
      resultCount: input.resultCount,
      metadata: JSON.stringify(input.metadata || {}),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });
}

/**
 * Creates a new search result record
 *
 * @param input The search result input data
 * @returns The created search result
 */
export async function createSearchResult(input: SearchResultInput): Promise<SearchResult> {
  return await prisma.searchResult.create({
    data: {
      id: uuidv4(),
      searchQueryId: input.searchQueryId,
      title: input.title,
      url: input.url,
      snippet: input.snippet,
      position: input.position,
      metadata: JSON.stringify(input.metadata || {}),
      createdAt: new Date(),
    },
  });
}

/**
 * Creates a search query with multiple results in a single transaction
 *
 * @param queryInput The search query input
 * @param resultsInput The array of search results
 * @returns The created search query with results
 */
export async function createSearchQueryWithResults(
  queryInput: SearchQueryInput,
  resultsInput: Omit<SearchResultInput, 'searchQueryId'>[]
): Promise<SearchQueryWithResults> {
  return await prisma.$transaction(async (tx) => {
    // Create the search query
    const query = await tx.searchQuery.create({
      data: {
        id: uuidv4(),
        query: queryInput.query,
        userId: queryInput.userId,
        provider: queryInput.provider,
        resultCount: queryInput.resultCount,
        metadata: JSON.stringify(queryInput.metadata || {}),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Create all the search results
    const results = await Promise.all(
      resultsInput.map((result) =>
        tx.searchResult.create({
          data: {
            id: uuidv4(),
            searchQueryId: query.id,
            title: result.title,
            url: result.url,
            snippet: result.snippet,
            position: result.position,
            metadata: JSON.stringify(result.metadata || {}),
            createdAt: new Date(),
          },
        })
      )
    );

    return {
      ...query,
      results,
    };
  });
}

/**
 * Gets a search query by ID with its results
 *
 * @param id The search query ID
 * @returns The search query with results or null if not found
 */
export async function getSearchQueryById(id: string): Promise<SearchQueryWithResults | null> {
  return await prisma.searchQuery.findUnique({
    where: { id },
    include: {
      results: {
        orderBy: {
          position: 'asc',
        },
      },
    },
  });
}

/**
 * Gets recent search queries for a user
 *
 * @param userId The user ID
 * @param limit The maximum number of queries to return (default: 10)
 * @returns Array of search queries with their results
 */
export async function getRecentSearchQueries(
  userId: string,
  limit: number = 10
): Promise<SearchQueryWithResults[]> {
  return await prisma.searchQuery.findMany({
    where: { userId },
    include: {
      results: {
        orderBy: {
          position: 'asc',
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: limit,
  });
}

/**
 * Gets the most frequent search queries for a user
 *
 * @param userId The user ID
 * @param days Number of days to look back
 * @param limit The maximum number of queries to return
 * @returns Array of search queries and their count
 */
export async function getFrequentSearchQueries(
  userId: string,
  days: number = 30,
  limit: number = 10
): Promise<{ query: string; count: number }[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const queries = await prisma.searchQuery.groupBy({
    by: ['query'],
    where: {
      userId,
      createdAt: {
        gte: startDate,
      },
    },
    _count: {
      query: true,
    },
    orderBy: {
      _count: {
        query: 'desc',
      },
    },
    take: limit,
  });

  return queries.map((q) => ({
    query: q.query,
    count: q._count.query,
  }));
}

/**
 * Searches for queries matching the given text
 *
 * @param userId The user ID
 * @param searchTerm The search term to match
 * @param limit Maximum number of results to return
 * @returns Matching search queries with results
 */
export async function searchQueries(
  userId: string,
  searchTerm: string,
  limit: number = 10
): Promise<SearchQueryWithResults[]> {
  return await prisma.searchQuery.findMany({
    where: {
      userId,
      query: {
        contains: searchTerm,
      },
    },
    include: {
      results: {
        orderBy: {
          position: 'asc',
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: limit,
  });
}

/**
 * Provides user feedback on a search result
 *
 * @param resultId The search result ID
 * @param isRelevant Whether the result was relevant
 * @returns The updated search result
 */
export async function provideSearchResultFeedback(
  resultId: string,
  isRelevant: boolean
): Promise<SearchResult> {
  return await prisma.searchResult.update({
    where: { id: resultId },
    data: {
      isRelevant,
    },
  });
}

/**
 * Gets advanced search query history with pagination and filtering
 *
 * @param filters Filter options
 * @param pagination Pagination options
 * @param sorting Sorting options
 * @returns Paginated search queries with results
 */
export async function getSearchHistory(
  filters: SearchQueryFilterOptions,
  pagination: PaginationOptions = { page: 1, limit: 10 },
  sorting: SortingOptions = { field: 'createdAt', direction: 'desc' }
): Promise<PaginatedResponse<SearchQueryWithResults>> {
  const { page = 1, limit = 10 } = pagination;
  const skip = (page - 1) * limit;

  // Build the where clause based on filters
  const where: Prisma.SearchQueryWhereInput = {};

  if (filters.userId) {
    where.userId = filters.userId;
  }

  if (filters.provider) {
    where.provider = filters.provider;
  }

  if (filters.startDate) {
    where.createdAt = {
      ...((where.createdAt as object) || {}),
      gte: filters.startDate,
    };
  }

  if (filters.endDate) {
    where.createdAt = {
      ...((where.createdAt as object) || {}),
      lte: filters.endDate,
    };
  }

  if (filters.searchTerm) {
    where.query = {
      contains: filters.searchTerm,
    };
  }

  // Get the total count
  const total = await prisma.searchQuery.count({ where });

  // Get the items with pagination and sorting
  const items = await prisma.searchQuery.findMany({
    where,
    include: {
      results: {
        orderBy: {
          position: 'asc',
        },
      },
    },
    skip,
    take: limit,
    orderBy: {
      [sorting.field]: sorting.direction,
    },
  });

  // Calculate total pages
  const pages = Math.ceil(total / limit);

  return {
    items,
    total,
    page,
    limit,
    pages,
  };
}

/**
 * Deletes a search query and all its results
 *
 * @param queryId The search query ID
 * @returns The deleted search query
 */
export async function deleteSearchQuery(queryId: string): Promise<SearchQuery> {
  return await prisma.searchQuery.delete({
    where: { id: queryId },
  });
}

/**
 * Deletes all search history for a user
 *
 * @param userId The user ID
 * @returns The number of deleted records
 */
export async function clearSearchHistory(userId: string): Promise<{ deletedQueries: number }> {
  const result = await prisma.searchQuery.deleteMany({
    where: { userId },
  });

  return { deletedQueries: result.count };
}
