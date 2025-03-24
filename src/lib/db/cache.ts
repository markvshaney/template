/**
 * Search Cache Utilities
 * Functions for managing search result caching
 */

import { Prisma, SearchCache } from '@prisma/client';
import { prisma } from '../db';
import { v4 as uuidv4 } from 'uuid';

/**
 * Type for search response to be cached
 */
export interface SearchCacheData {
  results: any[];
  timestamp: number;
  metadata?: Record<string, unknown>;
}

/**
 * Cache input parameters
 */
export interface CacheInput {
  query: string;
  provider: string;
  results: any[];
  expirationMinutes?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Default cache expiration time in minutes
 */
const DEFAULT_CACHE_EXPIRATION_MINUTES = 60;

/**
 * Saves search results to the cache
 *
 * @param input Cache input containing query, provider, and results
 * @returns The created cache entry
 */
export async function saveToCache(input: CacheInput): Promise<SearchCache> {
  const {
    query,
    provider,
    results,
    expirationMinutes = DEFAULT_CACHE_EXPIRATION_MINUTES,
    metadata,
  } = input;

  // Calculate expiration time
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + expirationMinutes);

  // Prepare the cache data
  const cacheData: SearchCacheData = {
    results,
    timestamp: Date.now(),
    metadata,
  };

  try {
    // Try to update an existing cache entry if it exists
    return await prisma.searchCache.upsert({
      where: {
        query,
      },
      update: {
        provider,
        results: JSON.stringify(cacheData),
        expiresAt,
        updatedAt: new Date(),
      },
      create: {
        id: uuidv4(),
        query,
        provider,
        results: JSON.stringify(cacheData),
        expiresAt,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    // If the unique constraint error happens (rare race condition),
    // try with a regular update instead
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return await prisma.searchCache.update({
        where: {
          query,
        },
        data: {
          provider,
          results: JSON.stringify(cacheData),
          expiresAt,
          updatedAt: new Date(),
        },
      });
    }
    throw error;
  }
}

/**
 * Gets cached search results if available and not expired
 *
 * @param query The search query
 * @param provider The search provider
 * @returns The cached results or null if not found or expired
 */
export async function getFromCache(
  query: string,
  provider: string
): Promise<SearchCacheData | null> {
  const now = new Date();

  // Try to find a cache entry that hasn't expired
  const cacheEntry = await prisma.searchCache.findFirst({
    where: {
      query,
      provider,
      expiresAt: {
        gt: now,
      },
    },
  });

  // Return null if no valid cache entry exists
  if (!cacheEntry) {
    return null;
  }

  try {
    // Parse the cached results
    const cacheData = JSON.parse(cacheEntry.results) as SearchCacheData;
    return cacheData;
  } catch (error) {
    // If JSON parsing fails, delete the invalid cache entry
    await prisma.searchCache.delete({
      where: {
        id: cacheEntry.id,
      },
    });
    return null;
  }
}

/**
 * Checks if a query is cached and not expired
 *
 * @param query The search query
 * @param provider The search provider
 * @returns True if cached and not expired, false otherwise
 */
export async function isCached(query: string, provider: string): Promise<boolean> {
  const cacheData = await getFromCache(query, provider);
  return cacheData !== null;
}

/**
 * Invalidates a specific cache entry
 *
 * @param query The search query
 * @param provider The search provider
 * @returns The deleted cache entry or null if not found
 */
export async function invalidateCache(
  query: string,
  provider: string
): Promise<SearchCache | null> {
  try {
    return await prisma.searchCache.delete({
      where: {
        query,
      },
    });
  } catch (error) {
    // If the entry doesn't exist, return null
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return null;
    }
    throw error;
  }
}

/**
 * Extends the expiration time of a cache entry
 *
 * @param query The search query
 * @param provider The search provider
 * @param additionalMinutes Minutes to extend the expiration by
 * @returns The updated cache entry or null if not found
 */
export async function extendCacheExpiration(
  query: string,
  provider: string,
  additionalMinutes: number = DEFAULT_CACHE_EXPIRATION_MINUTES
): Promise<SearchCache | null> {
  try {
    // Find the current entry
    const entry = await prisma.searchCache.findUnique({
      where: {
        query,
      },
    });

    if (!entry) {
      return null;
    }

    // Calculate new expiration time based on current expiration
    const newExpiresAt = new Date(entry.expiresAt);
    newExpiresAt.setMinutes(newExpiresAt.getMinutes() + additionalMinutes);

    // Update the expiration time
    return await prisma.searchCache.update({
      where: {
        id: entry.id,
      },
      data: {
        expiresAt: newExpiresAt,
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return null;
    }
    throw error;
  }
}

/**
 * Cleans up expired cache entries
 *
 * @returns The number of deleted entries
 */
export async function cleanupExpiredCache(): Promise<number> {
  const now = new Date();
  const result = await prisma.searchCache.deleteMany({
    where: {
      expiresAt: {
        lt: now,
      },
    },
  });

  return result.count;
}

/**
 * Gets cache statistics
 *
 * @returns Statistics about the cache
 */
export async function getCacheStats(): Promise<{
  totalEntries: number;
  activeEntries: number;
  expiredEntries: number;
  oldestEntryDate: Date | null;
  newestEntryDate: Date | null;
  averageExpirationMinutes: number | null;
}> {
  const now = new Date();

  // Get total entries
  const totalEntries = await prisma.searchCache.count();

  // Get active (not expired) entries
  const activeEntries = await prisma.searchCache.count({
    where: {
      expiresAt: {
        gt: now,
      },
    },
  });

  // Get expired entries
  const expiredEntries = await prisma.searchCache.count({
    where: {
      expiresAt: {
        lt: now,
      },
    },
  });

  // Get oldest entry date
  const oldestEntry = await prisma.searchCache.findFirst({
    orderBy: {
      createdAt: 'asc',
    },
  });

  // Get newest entry date
  const newestEntry = await prisma.searchCache.findFirst({
    orderBy: {
      createdAt: 'desc',
    },
  });

  // Calculate average expiration duration in minutes
  const cacheEntries = await prisma.searchCache.findMany({
    select: {
      createdAt: true,
      expiresAt: true,
    },
    take: 100, // Limit to 100 entries for performance
  });

  let totalMinutes = 0;
  if (cacheEntries.length > 0) {
    cacheEntries.forEach((entry) => {
      const durationMs = entry.expiresAt.getTime() - entry.createdAt.getTime();
      totalMinutes += durationMs / (1000 * 60);
    });
  }

  return {
    totalEntries,
    activeEntries,
    expiredEntries,
    oldestEntryDate: oldestEntry?.createdAt || null,
    newestEntryDate: newestEntry?.createdAt || null,
    averageExpirationMinutes: cacheEntries.length > 0 ? totalMinutes / cacheEntries.length : null,
  };
}
