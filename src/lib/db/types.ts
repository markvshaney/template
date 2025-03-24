/**
 * Database Types Module
 * Shared type definitions for database operations
 */

import { Document as PrismaDocument, Chunk as PrismaChunk } from '@prisma/client';

/**
 * Document processing status enumeration
 */
export enum DocumentProcessingStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

/**
 * Document with related chunks
 */
export type DocumentWithChunks = PrismaDocument & {
  chunks: PrismaChunk[];
};

/**
 * Chunk with parent document
 */
export type ChunkWithDocument = PrismaChunk & {
  document: PrismaDocument;
};

/**
 * Embedding vector type
 * This is a workaround for the vector type that Prisma doesn't support natively
 */
export type EmbeddingVector = number[];

/**
 * Document filter options
 */
export interface DocumentFilterOptions {
  userId?: string;
  processingStatus?: DocumentProcessingStatus;
  isIndexed?: boolean;
  tags?: string[];
  searchTerm?: string;
  startDate?: Date;
  endDate?: Date;
}

/**
 * Pagination options
 */
export interface PaginationOptions {
  page?: number;
  limit?: number;
}

/**
 * Sorting options
 */
export interface SortingOptions {
  field: string;
  direction: 'asc' | 'desc';
}

/**
 * Query options combining filters, pagination, and sorting
 */
export interface QueryOptions {
  filters?: DocumentFilterOptions;
  pagination?: PaginationOptions;
  sorting?: SortingOptions;
}

/**
 * Paginated response structure
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

/**
 * Vector similarity search options
 */
export interface VectorSearchOptions {
  queryVector: number[];
  filterDocumentIds?: string[];
  filterUserId?: string;
  limit?: number;
  minScore?: number;
  includeDocument?: boolean;
}
