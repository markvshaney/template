/**
 * Document Storage Module
 * Utilities for storing and retrieving documents in the database
 */

import { PrismaClient, Document as PrismaDocument, Chunk as PrismaChunk } from '@prisma/client';
import { Document, DocumentChunk, DocumentMetadata } from '../rag/document-processing';

// Initialize Prisma client
const prisma = new PrismaClient();

/**
 * Types to match our Prisma schema
 */
export interface DocumentInput {
  title: string;
  content: string;
  contentType: string;
  userId: string;
  source?: string | null;
  metadata?: Record<string, unknown>;
  fileName?: string | null;
  fileSize?: number | null;
  mimeType?: string | null;
  tags?: string[];
}

export interface ChunkInput {
  content: string;
  documentId: string;
  keywordsString: string;
  metadata: string;
  startPosition: number;
  endPosition: number;
  chunkIndex: number;
  isFirst: boolean;
  isLast: boolean;
  tokens: number;
  embeddingModel?: string | null;
}

/**
 * Prepare a query filter for documents or chunks
 */
export function prepareQueryFilter(options: {
  documentIds?: string[];
  userId?: string;
  processStatus?: string;
  searchTerm?: string;
  tags?: string[];
}): Record<string, unknown> {
  const { documentIds, userId, processStatus, searchTerm, tags } = options;
  const filter: Record<string, unknown> = {};

  if (documentIds && documentIds.length > 0) {
    if (documentIds.length === 1) {
      filter.documentId = documentIds[0];
    } else {
      filter.documentId = { in: documentIds };
    }
  }

  if (userId) {
    if (!filter.document) {
      filter.document = {};
    }
    (filter.document as Record<string, unknown>).userId = userId;
  }

  if (processStatus) {
    if (!filter.document) {
      filter.document = {};
    }
    (filter.document as Record<string, unknown>).processingStatus = processStatus;
  }

  if (searchTerm) {
    const searchClause = { contains: searchTerm, mode: 'insensitive' };
    filter.OR = [{ content: searchClause }, { document: { title: searchClause } }];
  }

  if (tags && tags.length > 0) {
    // For SQLite we need to use string operations instead of array operations
    const tagConditions = tags.map((tag) => ({
      tagsString: {
        contains: tag,
        mode: 'insensitive' as const,
      },
    }));

    if (!filter.document) {
      filter.document = {};
    }
    (filter.document as Record<string, unknown>).OR = tagConditions;
  }

  return filter;
}

/**
 * Convert from application Document type to database format
 */
export function documentToDbFormat(
  document: Document,
  userId: string
): Omit<PrismaDocument, 'id' | 'createdAt' | 'updatedAt'> {
  const metadata = document.metadata ? JSON.stringify(document.metadata) : '{}';
  const tags = document.metadata?.tags ? document.metadata.tags.join(',') : '';

  return {
    title: document.metadata?.title || 'Untitled Document',
    content: document.content,
    contentType: document.metadata?.documentType || 'text/plain',
    source: document.metadata?.url || null,
    userId,
    metadata,
    fileName: document.metadata?.fileName || null,
    fileSize: document.metadata?.fileSize || null,
    mimeType: document.metadata?.mimeType || null,
    processingStatus: 'pending',
    processingError: null,
    isIndexed: false,
    indexedAt: null,
    tagsString: tags,
  };
}

/**
 * Convert from database Document to application format
 */
export function dbDocumentToAppFormat(dbDocument: PrismaDocument): Document {
  let metadata: DocumentMetadata;
  try {
    metadata = JSON.parse(dbDocument.metadata as string) as DocumentMetadata;
  } catch (e) {
    metadata = {} as DocumentMetadata;
  }

  return {
    id: dbDocument.id,
    content: dbDocument.content,
    metadata: {
      ...metadata,
      title: dbDocument.title,
      url: dbDocument.source || undefined,
      documentType: dbDocument.contentType,
      fileName: dbDocument.fileName || undefined,
      fileSize: dbDocument.fileSize || undefined,
      mimeType: dbDocument.mimeType || undefined,
      tags: dbDocument.tagsString ? dbDocument.tagsString.split(',') : [],
    },
  };
}

/**
 * Create a new document in the database
 */
export async function createDocument(documentInput: DocumentInput): Promise<PrismaDocument> {
  return prisma.document.create({
    data: {
      ...documentInput,
      metadata: JSON.stringify(documentInput.metadata || {}),
      tagsString: documentInput.tags ? documentInput.tags.join(',') : '',
    },
  });
}

/**
 * Create a document from the application Document format
 */
export async function createDocumentFromApp(document: Document, userId: string): Promise<Document> {
  // First check if the user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    // Create a test user if one doesn't exist
    await prisma.user.create({
      data: {
        id: userId,
        email: `user_${userId}@example.com`,
        name: `Test User ${userId}`,
      },
    });
  }

  const dbDocument = await prisma.document.create({
    data: documentToDbFormat(document, userId),
  });

  return dbDocumentToAppFormat(dbDocument);
}

/**
 * Get a document by ID
 */
export async function getDocumentById(id: string): Promise<PrismaDocument | null> {
  return prisma.document.findUnique({
    where: { id },
    include: { chunks: true },
  });
}

/**
 * Document where clause type
 */
interface DocumentWhereClause {
  userId: string;
  processingStatus?: string;
  OR?: Array<
    | { title: { contains: string; mode: 'insensitive' } }
    | { content: { contains: string; mode: 'insensitive' } }
    | { tagsString: { contains: string; mode: 'insensitive' } }
  >;
  tagsString?: { contains: string; mode: 'insensitive' };
  [key: string]: unknown;
}

/**
 * Get documents for a user
 */
export async function getUserDocuments(
  userId: string,
  options: {
    limit?: number;
    offset?: number;
    includeChunks?: boolean;
    filterByStatus?: string;
    searchTerm?: string;
    tags?: string[];
  } = {}
): Promise<PrismaDocument[]> {
  const {
    limit = 10,
    offset = 0,
    includeChunks = false,
    filterByStatus,
    searchTerm,
    tags,
  } = options;

  // Build where clause
  const where: DocumentWhereClause = { userId };

  if (filterByStatus) {
    where.processingStatus = filterByStatus;
  }

  if (searchTerm) {
    where.OR = [
      { title: { contains: searchTerm, mode: 'insensitive' } },
      { content: { contains: searchTerm, mode: 'insensitive' } },
    ];
  }

  if (tags && tags.length > 0) {
    // For SQLite, we need to use string operations since it doesn't support array operations
    const tagConditions = tags.map((tag) => ({
      tagsString: { contains: tag, mode: 'insensitive' as const },
    }));

    // If we already have OR conditions, we need to merge them
    if (where.OR) {
      where.OR = [...where.OR, ...tagConditions] as DocumentWhereClause['OR'];
    } else {
      where.OR = tagConditions as DocumentWhereClause['OR'];
    }
  }

  return prisma.document.findMany({
    where,
    include: { chunks: includeChunks },
    take: limit,
    skip: offset,
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Update a document's metadata and properties
 */
export async function updateDocument(
  id: string,
  data: Partial<Omit<PrismaDocument, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<PrismaDocument> {
  return prisma.document.update({
    where: { id },
    data,
  });
}

/**
 * Update document processing status
 */
export async function updateDocumentStatus(
  id: string,
  status: string,
  error?: string
): Promise<PrismaDocument> {
  return prisma.document.update({
    where: { id },
    data: {
      processingStatus: status,
      processingError: error,
      ...(status === 'completed'
        ? {
            isIndexed: true,
            indexedAt: new Date(),
          }
        : {}),
    },
  });
}

/**
 * Delete a document and all its chunks
 */
export async function deleteDocument(id: string): Promise<void> {
  await prisma.document.delete({
    where: { id },
  });
}

/**
 * Store a document chunk
 */
export async function createChunk(chunkInput: ChunkInput): Promise<PrismaChunk> {
  return prisma.chunk.create({
    data: {
      ...chunkInput,
      keywordsString:
        typeof chunkInput.keywordsString === 'string' ? chunkInput.keywordsString : '',
      metadata:
        typeof chunkInput.metadata === 'string'
          ? chunkInput.metadata
          : JSON.stringify(chunkInput.metadata || {}),
    },
  });
}

/**
 * Store multiple chunks for a document
 */
export async function createChunks(chunks: ChunkInput[]): Promise<PrismaChunk[]> {
  // Use a transaction to ensure all chunks are created
  return prisma.$transaction(
    chunks.map((chunk) =>
      prisma.chunk.create({
        data: {
          ...chunk,
          keywordsString: typeof chunk.keywordsString === 'string' ? chunk.keywordsString : '',
          metadata:
            typeof chunk.metadata === 'string'
              ? chunk.metadata
              : JSON.stringify(chunk.metadata || {}),
        },
      })
    )
  );
}

/**
 * Convert application document chunks to database format
 */
export function chunksToDbFormat(
  documentChunks: DocumentChunk[],
  documentId: string
): ChunkInput[] {
  return documentChunks.map((chunk, index) => ({
    content: chunk.content,
    documentId: documentId,
    keywordsString: Array.isArray(chunk.metadata.keywords) ? chunk.metadata.keywords.join(',') : '',
    metadata: JSON.stringify(chunk.metadata || {}),
    startPosition: chunk.startPosition,
    endPosition: chunk.endPosition,
    chunkIndex: index,
    isFirst: index === 0,
    isLast: index === documentChunks.length - 1,
    tokens: chunk.metadata.tokens || 0,
    embeddingModel: chunk.metadata.embeddingModel || null,
  }));
}

/**
 * Store document with chunks in a transaction
 */
export async function storeDocumentWithChunks(
  document: Document,
  chunks: DocumentChunk[],
  userId: string
): Promise<{ document: PrismaDocument; chunks: PrismaChunk[] }> {
  // First check if the user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    // Create a test user if one doesn't exist
    await prisma.user.create({
      data: {
        id: userId,
        email: `user_${userId}@example.com`,
        name: `Test User ${userId}`,
      },
    });
  }

  return prisma.$transaction(async (tx) => {
    // Create document
    const dbDocument = await tx.document.create({
      data: documentToDbFormat(document, userId),
    });

    // Create chunks
    const dbChunks = await Promise.all(
      chunksToDbFormat(chunks, dbDocument.id).map((chunk) =>
        tx.chunk.create({
          data: chunk,
        })
      )
    );

    // Update document status to reflect chunks are stored
    await tx.document.update({
      where: { id: dbDocument.id },
      data: {
        processingStatus: 'completed',
        isIndexed: true,
        indexedAt: new Date(),
      },
    });

    return { document: dbDocument, chunks: dbChunks };
  });
}

/**
 * Get chunks for a document
 */
export async function getDocumentChunks(documentId: string): Promise<PrismaChunk[]> {
  return prisma.chunk.findMany({
    where: { documentId },
    orderBy: { chunkIndex: 'asc' },
  });
}

/**
 * Delete all chunks for a document
 */
export async function deleteDocumentChunks(documentId: string): Promise<void> {
  await prisma.chunk.deleteMany({
    where: { documentId },
  });
}

/**
 * Count documents for a user
 */
export async function countUserDocuments(
  userId: string,
  options: {
    filterByStatus?: string;
    searchTerm?: string;
    tags?: string[];
  } = {}
): Promise<number> {
  const { filterByStatus, searchTerm, tags } = options;

  // Build where clause
  const where: DocumentWhereClause = { userId };

  if (filterByStatus) {
    where.processingStatus = filterByStatus;
  }

  if (searchTerm) {
    where.OR = [
      { title: { contains: searchTerm, mode: 'insensitive' } },
      { content: { contains: searchTerm, mode: 'insensitive' } },
    ];
  }

  if (tags && tags.length > 0) {
    where.tagsString = { contains: tags[0], mode: 'insensitive' };
  }

  return prisma.document.count({ where });
}
