import {
  PrismaClient,
  Prisma,
  type Memory,
  type Session,
  type User,
  type MemoryConsolidation,
  type Specialization,
  type VectorIndex,
  type Document,
  type Chunk,
  type SearchQuery,
  type SearchResult,
} from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

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
  metadata?: Prisma.InputJsonValue;
}

export interface ChunkInput {
  content: string;
  documentId: string;
  embedding: number[];
  keywords: string[];
  metadata?: Prisma.InputJsonValue;
}

// Document operations
export async function createDocument(
  input: DocumentInput
): Promise<Document & { chunks: Chunk[] }> {
  return await prisma.document.create({
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

export async function getDocumentById(
  id: string
): Promise<(Document & { chunks: Chunk[] }) | null> {
  return await prisma.document.findUnique({
    where: { id },
    include: {
      chunks: true,
    },
  });
}

export async function getDocumentsByUserId(
  userId: string
): Promise<(Document & { chunks: Chunk[] })[]> {
  return await prisma.document.findMany({
    where: { userId },
    include: {
      chunks: true,
    },
  });
}

export async function deleteDocument(id: string): Promise<(Document & { chunks: Chunk[] }) | null> {
  // First, delete all chunks associated with the document
  await prisma.chunk.deleteMany({
    where: { documentId: id },
  });

  // Then delete the document
  return await prisma.document.delete({
    where: { id },
    include: {
      chunks: true,
    },
  });
}

// Chunk operations
export async function createChunk(input: ChunkInput): Promise<Chunk> {
  return await prisma.chunk.create({
    data: {
      id: uuidv4(),
      content: input.content,
      documentId: input.documentId,
      embedding: input.embedding as unknown as Prisma.InputJsonValue, // Type assertion for vector type
      keywords: input.keywords,
      metadata: input.metadata || {},
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });
}

export async function getChunksByDocumentId(documentId: string): Promise<Chunk[]> {
  return await prisma.chunk.findMany({
    where: { documentId },
  });
}

export async function findSimilarChunks(
  embedding: number[],
  limit: number = 5,
  threshold: number = 0.7
): Promise<Chunk[]> {
  // Use Postgres vector operations for similarity search
  const results = await prisma.$queryRaw`
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

  return results as Chunk[];
}

// Search history operations
export async function saveSearchQuery(
  query: string,
  userId: string,
  metadata?: Prisma.InputJsonValue
): Promise<SearchQuery> {
  return await prisma.searchQuery.create({
    data: {
      id: uuidv4(),
      query,
      userId,
      metadata: metadata || {},
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });
}

export async function saveSearchResult(
  searchQueryId: string,
  title: string,
  url: string,
  snippet: string,
  position: number,
  metadata?: Prisma.InputJsonValue
): Promise<SearchResult> {
  return await prisma.searchResult.create({
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
): Promise<(SearchQuery & { results: SearchResult[] })[]> {
  return await prisma.searchQuery.findMany({
    where: { userId },
    include: {
      results: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: limit,
  });
}

// ============================================================
// LEGACY MEMORY FUNCTIONS - MAINTAINED FOR COMPATIBILITY
// ============================================================

// Memory Types
export type MemoryType = 'factual' | 'procedural' | 'social' | 'episodic';

// Memory Creation Interface
export interface CreateMemoryInput {
  content: string;
  type: MemoryType;
  importance?: number;
  userId: string;
  sessionId: string;
  embedding: number[];
  keywords: string[];
  metadata: Prisma.InputJsonValue;
}

// Memory Utility Functions
export async function createMemory(
  data: CreateMemoryInput
): Promise<Memory & { consolidation: MemoryConsolidation | null }> {
  return await prisma.memory.create({
    data: {
      id: uuidv4(),
      content: data.content,
      type: data.type,
      importance: data.importance || 0,
      userId: data.userId,
      sessionId: data.sessionId,
      embedding: data.embedding as unknown as Prisma.InputJsonValue, // Type assertion for vector type
      keywords: data.keywords,
      metadata: data.metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    include: {
      consolidation: true,
    },
  });
}

export async function getMemoriesByUserId(
  userId: string
): Promise<(Memory & { consolidation: MemoryConsolidation | null })[]> {
  return await prisma.memory.findMany({
    where: { userId },
    include: {
      consolidation: true,
    },
  });
}

export async function getMemoriesByType(
  userId: string,
  type: MemoryType
): Promise<(Memory & { consolidation: MemoryConsolidation | null })[]> {
  return await prisma.memory.findMany({
    where: { userId, type },
    include: {
      consolidation: true,
    },
  });
}

export async function createSession(userId: string): Promise<Session> {
  return await prisma.session.create({
    data: {
      id: uuidv4(),
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });
}

export async function getSessionById(
  id: string
): Promise<
  (Session & { memories: (Memory & { consolidation: MemoryConsolidation | null })[] }) | null
> {
  return await prisma.session.findUnique({
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

export async function consolidateMemory(
  memoryId: string,
  importance: number
): Promise<MemoryConsolidation> {
  return await prisma.memoryConsolidation.upsert({
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
      id: uuidv4(),
      memoryId,
      importance,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });
}

export async function createSpecialization(
  name: string,
  type: MemoryType,
  version: string,
  metadata: Prisma.InputJsonValue
): Promise<Specialization> {
  return await prisma.specialization.create({
    data: {
      id: uuidv4(),
      name,
      type,
      version,
      active: false,
      metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });
}

export async function activateSpecialization(id: string): Promise<Specialization> {
  // First, deactivate all specializations
  await prisma.specialization.updateMany({
    where: { active: true },
    data: { active: false },
  });

  // Then activate the specified specialization
  return await prisma.specialization.update({
    where: { id },
    data: { active: true },
  });
}

export async function createVectorIndex(
  embedding: number[],
  metadata: Prisma.InputJsonValue
): Promise<VectorIndex> {
  return await prisma.vectorIndex.create({
    data: {
      id: uuidv4(),
      embedding: embedding as unknown as Prisma.InputJsonValue, // Type assertion for vector type
      metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });
}

export async function cleanupDatabase(): Promise<void> {
  // Delete all data in reverse order of dependencies
  await prisma.searchResult.deleteMany();
  await prisma.searchQuery.deleteMany();
  await prisma.chunk.deleteMany();
  await prisma.document.deleteMany();
  await prisma.memoryConsolidation.deleteMany();
  await prisma.memory.deleteMany();
  await prisma.session.deleteMany();
  await prisma.specialization.deleteMany();
  await prisma.vectorIndex.deleteMany();
  await prisma.user.deleteMany();
}

export async function getMemories(
  filter: Partial<Pick<Memory, 'type'>>
): Promise<(Memory & { consolidation: MemoryConsolidation | null })[]> {
  return await prisma.memory.findMany({
    where: filter,
    include: {
      consolidation: true,
    },
  });
}

// User management functions
export async function createUser(email: string, name: string): Promise<User> {
  return await prisma.user.create({
    data: {
      id: uuidv4(),
      email,
      name,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });
}

export async function getUserById(id: string): Promise<User | null> {
  return await prisma.user.findUnique({
    where: { id },
  });
}

export async function getUserByEmail(email: string): Promise<User | null> {
  return await prisma.user.findUnique({
    where: { email },
  });
}

export async function findSimilarMemories(
  embedding: number[],
  limit: number = 5,
  threshold: number = 0.7
): Promise<(Memory & { consolidation: MemoryConsolidation | null })[]> {
  const results = await prisma.$queryRaw`
    SELECT 
      m.*,
      (1 - (m.embedding <=> ${embedding}::vector)) as similarity
    FROM 
      "Memory" m
    WHERE 
      (1 - (m.embedding <=> ${embedding}::vector)) > ${threshold}
    ORDER BY 
      similarity DESC
    LIMIT ${limit};
  `;

  return results as (Memory & { consolidation: MemoryConsolidation | null })[];
}
