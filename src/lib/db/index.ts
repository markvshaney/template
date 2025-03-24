/**
 * Database Module Index
 * Central export point for all database operations
 */

// Export all from each module
export * from './types';
export * from './documents';
export * from './embeddings';
export * from './search-history';
export * from './cache';
export * from './vector-operations';

// Re-export specific utilities for direct use
import {
  createDocument,
  getDocumentById,
  getUserDocuments,
  updateDocument,
  deleteDocument,
} from './documents';

import { storeEmbedding, similaritySearch, getEmbeddingByChunkId } from './embeddings';

import { createSearchQuery, getSearchHistory, getRecentSearchQueries } from './search-history';

import { vectorSimilaritySearch, hybridSearch, DistanceMetric } from './vector-operations';

// Export central database operations
export const db = {
  documents: {
    create: createDocument,
    get: getDocumentById,
    getByUser: getUserDocuments,
    update: updateDocument,
    delete: deleteDocument,
  },
  embeddings: {
    store: storeEmbedding,
    get: getEmbeddingByChunkId,
    similaritySearch,
  },
  search: {
    saveQuery: createSearchQuery,
    getHistory: getSearchHistory,
    getRecent: getRecentSearchQueries,
  },
  vectors: {
    similaritySearch: vectorSimilaritySearch,
    hybridSearch,
    metrics: DistanceMetric,
  },
};
