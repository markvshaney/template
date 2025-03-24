/**
 * Document Storage Module
 * Utilities for storing and retrieving documents in the database
 */

import { PrismaClient, Document as PrismaDocument, Chunk as PrismaChunk } from '@prisma/client';
import { Document, DocumentChunk, DocumentMetadata } from '../rag/document-processing';
import { v4 as uuidv4 } from 'uuid';

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
  source?: string;
  metadata?: Record<string, any>;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  tags?: string[];
}

export interface ChunkInput {
  content: string;
  documentId: string;
  keywords: string[];
  metadata: Record<string, any>;
  startPosition: number;
  endPosition: number;
  chunkIndex: number;
  isFirst: boolean;
  isLast: boolean;
  tokens: number;
  embeddingModel?: string;
  embedding?: number[];
}

/**
 * Convert from application Document type to database format
 */
export function documentToDbFormat(
  document: Document,
  userId: string
): Omit<PrismaDocument, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    title: document.metadata.title || 'Untitled Document',
    content: document.content,
    contentType: document.metadata.documentType || 'text/plain',
    source: document.metadata.url,
    userId,
    metadata: document.metadata as any,
    fileName: document.metadata.fileName,
    fileSize: document.metadata.fileSize,
    mimeType: document.metadata.mimeType,
    processingStatus: 'pending',
    isIndexed: false,
    tags: document.metadata.tags || [],
  };
}

/**
 * Convert from database Document to application format
 */
export function dbDocumentToAppFormat(dbDocument: PrismaDocument): Document {
  return {
    id: dbDocument.id,
    content: dbDocument.content,
    metadata: {
      ...(dbDocument.metadata as DocumentMetadata),
      title: dbDocument.title,
      url: dbDocument.source || undefined,
      documentType: dbDocument.contentType,
      fileName: dbDocument.fileName || undefined,
      fileSize: dbDocument.fileSize || undefined,
      mimeType: dbDocument.mimeType || undefined,
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
      metadata: documentInput.metadata || {},
      tags: documentInput.tags || [],
    },
  });
}

/**
 * Create a document from the application Document format
 */
export async function createDocumentFromApp(document: Document, userId: string): Promise<Document> {
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
  const where: any = { userId };

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
    where.tags = { hasSome: tags };
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
      embedding: (chunkInput.embedding as any) || [],
      metadata: chunkInput.metadata || {},
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
          embedding: (chunk.embedding as any) || [],
          metadata: chunk.metadata || {},
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
    keywords: chunk.metadata.keywords || [],
    metadata: chunk.metadata as any,
    startPosition: chunk.startPosition,
    endPosition: chunk.endPosition,
    chunkIndex: index,
    isFirst: index === 0,
    isLast: index === documentChunks.length - 1,
    tokens: chunk.metadata.tokens || 0,
    embeddingModel: chunk.metadata.embeddingModel,
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
  return prisma.$transaction(async (tx) => {
    // Create document
    const dbDocument = await tx.document.create({
      data: documentToDbFormat(document, userId),
    });

    // Create chunks
    const dbChunks = await Promise.all(
      chunksToDbFormat(chunks, dbDocument.id).map((chunk) =>
        tx.chunk.create({
          data: {
            ...chunk,
            embedding: (chunk.embedding as any) || [],
          },
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
  const where: any = { userId };

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
    where.tags = { hasSome: tags };
  }

  return prisma.document.count({ where });
}
