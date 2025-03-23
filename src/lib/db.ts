import { PrismaClient } from '@prisma/client';

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

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
  metadata: Record<string, unknown>;
}

// Memory Utility Functions
export async function createMemory(input: CreateMemoryInput) {
  return prisma.memory.create({
    data: {
      content: input.content,
      type: input.type,
      importance: input.importance || 0,
      userId: input.userId,
      sessionId: input.sessionId,
      embedding: input.embedding as any, // Type assertion needed for vector type
      keywords: input.keywords,
      metadata: input.metadata,
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
    await prisma.memoryConsolidation.deleteMany();
    await prisma.memory.deleteMany();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
    await prisma.specialization.deleteMany();
    await prisma.vectorIndex.deleteMany();
  }
}
