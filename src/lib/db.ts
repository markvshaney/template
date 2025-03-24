import {
  PrismaClient,
  Prisma,
  type Memory,
  type Session,
  type User,
  type MemoryConsolidation,
  type Specialization,
  type VectorIndex,
} from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { calculateCosineSimilarity } from './vector';

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// ============================================================
// DOCUMENT-CENTRIC FUNCTIONS FOR RAG
// ============================================================

// Add types for document models that aren't in the Prisma client yet
type DocumentWithChunks = {
  id: string;
  title: string;
  content: string;
  contentType: string;
  source: string | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  metadata: Prisma.JsonValue;
  chunks: ChunkType[];
};

type ChunkType = {
  id: string;
  content: string;
  documentId: string;
  embedding: number[];
  keywords: string[];
  metadata: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
};

type SearchQueryType = {
  id: string;
  query: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  metadata: Prisma.JsonValue;
  results: SearchResultType[];
};

type SearchResultType = {
  id: string;
  searchQueryId: string;
  title: string;
  url: string;
  snippet: string;
  position: number;
  createdAt: Date;
  metadata: Prisma.JsonValue;
};

// Extend PrismaClient type to include document models
interface CustomPrismaClient extends PrismaClient {
  document: {
    create: (args: any) => Promise<DocumentWithChunks>;
    findUnique: (args: any) => Promise<DocumentWithChunks | null>;
    findMany: (args: any) => Promise<DocumentWithChunks[]>;
    delete: (args: any) => Promise<DocumentWithChunks>;
    deleteMany: (args: any) => Promise<{ count: number }>;
  };
  chunk: {
    create: (args: any) => Promise<ChunkType>;
    findMany: (args: any) => Promise<ChunkType[]>;
    deleteMany: (args: any) => Promise<{ count: number }>;
  };
  searchQuery: {
    create: (args: any) => Promise<SearchQueryType>;
    findMany: (args: any) => Promise<SearchQueryType[]>;
    deleteMany: (args: any) => Promise<{ count: number }>;
  };
  searchResult: {
    create: (args: any) => Promise<SearchResultType>;
    findMany: (args: any) => Promise<SearchResultType[]>;
    deleteMany: (args: any) => Promise<{ count: number }>;
  };
}

// Types for document management
export enum ContentType {
  TEXT = 'text/plain',
  HTML = 'text/html',
  MARKDOWN = 'text/markdown',
  PDF = 'application/pdf',
  JSON = 'application/json',
  CSV = 'text/csv',
}

export interface DocumentInput {
  title: string;
  content: string;
  contentType: ContentType;
  source: string;
  userId: string;
  metadata?: Prisma.JsonValue;
}

export interface ChunkInput {
  content: string;
  documentId: string;
  embedding: number[];
  keywords: string[];
  metadata?: Prisma.JsonValue;
}

// Document operations
export async function createDocument(input: DocumentInput): Promise<DocumentWithChunks> {
  return await (prisma as CustomPrismaClient).document.create({
    data: {
      id: uuidv4(),
      title: input.title,
      content: input.content,
      contentType: input.contentType,
      source: input.source,
      userId: input.userId,
      metadata: input.metadata || {},
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    include: {
      chunks: true,
    },
  });
}

export async function getDocumentById(id: string): Promise<DocumentWithChunks | null> {
  return await (prisma as CustomPrismaClient).document.findUnique({
    where: { id },
    include: {
      chunks: true,
    },
  });
}

export async function getDocumentsByUserId(userId: string): Promise<DocumentWithChunks[]> {
  return await (prisma as CustomPrismaClient).document.findMany({
    where: { userId },
    include: {
      chunks: true,
    },
  });
}

export async function deleteDocument(id: string): Promise<DocumentWithChunks | null> {
  // First, delete all chunks associated with the document
  await (prisma as CustomPrismaClient).chunk.deleteMany({
    where: { documentId: id },
  });

  // Then delete the document
  return await (prisma as CustomPrismaClient).document.delete({
    where: { id },
    include: {
      chunks: true,
    },
  });
}

// Chunk operations
export async function createChunk(input: ChunkInput): Promise<ChunkType> {
  return await (prisma as CustomPrismaClient).chunk.create({
    data: {
      id: uuidv4(),
      content: input.content,
      documentId: input.documentId,
      embedding: input.embedding,
      keywords: input.keywords,
      metadata: input.metadata || {},
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });
}

export async function getChunksByDocumentId(documentId: string): Promise<ChunkType[]> {
  return await (prisma as CustomPrismaClient).chunk.findMany({
    where: { documentId },
  });
}

export async function findSimilarChunks(
  embedding: number[],
  limit: number = 5,
  threshold: number = 0.7
): Promise<ChunkType[]> {
  // Use Postgres vector operations for similarity search
  // This is a simplified approach - in production, you'd use pgvector or similar
  const results = await (prisma as CustomPrismaClient).$queryRaw`
    SELECT 
      c.id, 
      c.content, 
      c.document_id as "documentId",
      c.embedding,
      c.keywords,
      c.metadata,
      c.created_at as "createdAt",
      c.updated_at as "updatedAt",
      (1 - (c.embedding <=> ${embedding}::vector)) as similarity
    FROM 
      "Chunk" c
    WHERE 
      (1 - (c.embedding <=> ${embedding}::vector)) > ${threshold}
    ORDER BY 
      similarity DESC
    LIMIT ${limit};
  `;

  return results.map((result: any) => ({
    id: result.id,
    content: result.content,
    documentId: result.documentId,
    embedding: result.embedding,
    keywords: result.keywords,
    metadata: result.metadata,
    createdAt: result.createdAt,
    updatedAt: result.updatedAt,
  }));
}

// Search history operations
export async function saveSearchQuery(
  query: string,
  userId: string,
  metadata?: Prisma.JsonValue
): Promise<SearchQueryType> {
  return await (prisma as CustomPrismaClient).searchQuery.create({
    data: {
      id: uuidv4(),
      query,
      userId,
      metadata: metadata || {},
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    include: {
      results: true,
    },
  });
}

export async function saveSearchResult(
  searchQueryId: string,
  title: string,
  url: string,
  snippet: string,
  position: number,
  metadata?: any
): Promise<SearchResultType> {
  return await (prisma as CustomPrismaClient).searchResult.create({
    data: {
      id: uuidv4(),
      searchQueryId,
      title,
      url,
      snippet,
      position,
      metadata: metadata || {},
      createdAt: new Date(),
    },
  });
}

export async function getRecentSearches(
  userId: string,
  limit: number = 10
): Promise<SearchQueryType[]> {
  return await (prisma as CustomPrismaClient).searchQuery.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      results: true,
    },
  });
}

// ============================================================
// LEGACY MEMORY FUNCTIONS - MAINTAINED FOR COMPATIBILITY
// ============================================================

// Memory Types
export type MemoryType = 'factual' | 'procedural' | 'social' | 'episodic';

interface Memory {
  id: string;
  content: string;
  type: MemoryType;
  createdAt: Date;
  updatedAt: Date;
}

// Memory Creation Interface
export interface CreateMemoryInput {
  content: string;
  type: MemoryType;
  importance?: number;
  userId: string;
  sessionId: string;
  embedding: number[];
  keywords: string[];
  metadata: Record<string, unknown>;
}

// Memory Utility Functions
export async function createMemory(data: Omit<Memory, 'id' | 'createdAt' | 'updatedAt'>) {
  return prisma.memory.create({
    data: {
      content: data.content,
      type: data.type,
      importance: data.importance || 0,
      userId: data.userId,
      sessionId: data.sessionId,
      embedding: data.embedding as any, // Type assertion needed for vector type
      keywords: data.keywords,
      metadata: data.metadata,
    },
    include: {
      consolidation: true,
    },
  });
}

export async function getMemoriesByUserId(userId: string) {
  return prisma.memory.findMany({
    where: { userId },
    include: {
      consolidation: true,
    },
    orderBy: {
      updatedAt: 'desc',
    },
  });
}

export async function getMemoriesByType(userId: string, type: MemoryType) {
  return prisma.memory.findMany({
    where: { userId, type },
    include: {
      consolidation: true,
    },
    orderBy: {
      importance: 'desc',
    },
  });
}

// Session Management
export async function createSession(userId: string) {
  return prisma.session.create({
    data: {
      userId,
    },
  });
}

export async function getSessionById(id: string) {
  return prisma.session.findUnique({
    where: { id },
    include: {
      memories: {
        include: {
          consolidation: true,
        },
      },
    },
  });
}

// Memory Consolidation
export async function consolidateMemory(memoryId: string, importance: number) {
  return prisma.memoryConsolidation.upsert({
    where: {
      memoryId,
    },
    update: {
      importance,
      lastReviewed: new Date(),
      reviewCount: {
        increment: 1,
      },
    },
    create: {
      memoryId,
      importance,
      metadata: {},
    },
  });
}

// Specialization Management
export async function createSpecialization(
  name: string,
  type: MemoryType,
  version: string,
  metadata: Record<string, unknown>
) {
  return prisma.specialization.create({
    data: {
      name,
      type,
      version,
      metadata,
    },
  });
}

export async function activateSpecialization(id: string) {
  // Deactivate all other specializations of the same type
  const specialization = await prisma.specialization.findUnique({
    where: { id },
  });

  if (!specialization) {
    throw new Error('Specialization not found');
  }

  await prisma.specialization.updateMany({
    where: {
      type: specialization.type,
      id: {
        not: id,
      },
    },
    data: {
      active: false,
    },
  });

  // Activate the requested specialization
  return prisma.specialization.update({
    where: { id },
    data: {
      active: true,
    },
  });
}

// Vector Operations
export async function createVectorIndex(embedding: number[], metadata: Record<string, unknown>) {
  return prisma.vectorIndex.create({
    data: {
      embedding: embedding as any, // Type assertion needed for vector type
      metadata,
    },
  });
}

// Cleanup function for tests
export async function cleanupDatabase() {
  if (process.env.NODE_ENV === 'test') {
    // Clean new document models
    await (prisma as CustomPrismaClient).searchResult.deleteMany();
    await (prisma as CustomPrismaClient).searchQuery.deleteMany();
    await (prisma as CustomPrismaClient).chunk.deleteMany();
    await (prisma as CustomPrismaClient).document.deleteMany();

    // Clean legacy models
    await prisma.memoryConsolidation.deleteMany();
    await prisma.memory.deleteMany();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
    await prisma.specialization.deleteMany();
    await prisma.vectorIndex.deleteMany();
  }
}

export async function getMemories(filter: Partial<Pick<Memory, 'type'>>) {
  return prisma.memory.findMany({
    where: filter,
    include: {
      consolidation: true,
    },
    orderBy: {
      updatedAt: 'desc',
    },
  });
}
