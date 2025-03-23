# Database Guidelines

This document outlines the standards and best practices for database usage in this project.

## Database Architecture

The project uses PostgreSQL with Prisma ORM and pgvector extension for vector storage.

### Connection Setup

```typescript
// lib/db.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

## Prisma Schema Organization

Organize Prisma schema by domain:

```prisma
// prisma/schema.prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}

datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  extensions = [pgvector(map: "vector")]
}

// Core models
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  sessions  Session[]
  memories  Memory[]
}

model Session {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  expiresAt DateTime
  memories  Memory[]
}

// Memory models
model Memory {
  id          String   @id @default(cuid())
  content     String
  embedding   Unsupported("vector(384)")? // Using pgvector
  importance  Float    @default(0)
  createdAt   DateTime @default(now())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  sessionId   String?
  session     Session? @relation(fields: [sessionId], references: [id], onDelete: SetNull)

  @@index([userId])
  @@index([sessionId])
}

// Specialization models
model Specialization {
  id          String   @id @default(cuid())
  name        String   @unique
  description String?
  modelPath   String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

## Database Access Patterns

### Repository Pattern

Use the repository pattern to encapsulate database access:

```typescript
// lib/repositories/memory-repository.ts
import { prisma } from '../db';
import type { Memory, Prisma } from '@prisma/client';

export class MemoryRepository {
  async create(data: Prisma.MemoryCreateInput): Promise<Memory> {
    return prisma.memory.create({
      data,
    });
  }

  async findById(id: string): Promise<Memory | null> {
    return prisma.memory.findUnique({
      where: { id },
    });
  }

  async findByUserId(userId: string): Promise<Memory[]> {
    return prisma.memory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: string, data: Prisma.MemoryUpdateInput): Promise<Memory> {
    return prisma.memory.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<Memory> {
    return prisma.memory.delete({
      where: { id },
    });
  }

  async findSimilar(embedding: number[], limit: number = 5): Promise<Memory[]> {
    // Using pgvector for similarity search
    return prisma.$queryRaw`
      SELECT id, content, importance, "createdAt", "userId", "sessionId"
      FROM "Memory"
      ORDER BY embedding <-> ${embedding}::vector
      LIMIT ${limit}
    `;
  }
}
```

## Transactions

Use transactions for operations that modify multiple records:

```typescript
async function createUserWithSession(
  email: string,
  name: string
): Promise<{ user: User; session: Session }> {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email,
        name,
      },
    });

    const session = await tx.session.create({
      data: {
        userId: user.id,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    });

    return { user, session };
  });
}
```

## Vector Operations with pgvector

For vector operations, use pgvector extension:

```typescript
// lib/vector-operations.ts
import { prisma } from './db';
import type { EmbeddingVector } from '../types';

export async function storeMemoryWithEmbedding(
  content: string,
  embedding: EmbeddingVector,
  userId: string,
  sessionId?: string
): Promise<string> {
  const result = await prisma.$executeRaw`
    INSERT INTO "Memory" (id, content, embedding, importance, "createdAt", "userId", "sessionId")
    VALUES (
      ${crypto.randomUUID()},
      ${content},
      ${embedding.values}::vector,
      ${0},
      ${new Date()},
      ${userId},
      ${sessionId || null}
    )
    RETURNING id
  `;

  return result[0].id;
}

export async function findSimilarMemories(
  embedding: EmbeddingVector,
  userId: string,
  limit: number = 5
): Promise<Array<{ id: string; content: string; similarity: number }>> {
  const results = await prisma.$queryRaw`
    SELECT id, content, 1 - (embedding <=> ${embedding.values}::vector) as similarity
    FROM "Memory"
    WHERE "userId" = ${userId}
    ORDER BY embedding <=> ${embedding.values}::vector
    LIMIT ${limit}
  `;

  return results;
}
```

## Database Migrations

### Migration Workflow

1. Make changes to `schema.prisma`
2. Generate migration: `npx prisma migrate dev --name descriptive_name`
3. Apply migration: `npx prisma migrate deploy`

### Migration Best Practices

1. **Descriptive Names**: Use descriptive names for migrations
2. **Small Changes**: Make small, focused changes in each migration
3. **Testing**: Test migrations in development before applying to production
4. **Rollback Plan**: Have a rollback plan for each migration
5. **Data Preservation**: Ensure migrations preserve existing data

## Environment Configuration

Use different environment configurations for development, testing, and production:

```
# .env.example
DATABASE_URL="postgresql://user:password@localhost:5432/mydb?schema=public"

# .env.test
DATABASE_URL="postgresql://user:password@localhost:5432/mydb_test?schema=public"

# .env.production
DATABASE_URL="postgresql://user:password@production-host:5432/mydb_prod?schema=public"
```

## Performance Optimization

### Indexing Strategy

1. **Primary Keys**: Every table should have a primary key
2. **Foreign Keys**: Index foreign key columns
3. **Query Patterns**: Add indexes based on common query patterns
4. **Composite Indexes**: Use composite indexes for queries with multiple conditions
5. **Vector Indexes**: Use appropriate vector indexes for similarity searches

```prisma
model Memory {
  // ... fields

  @@index([userId])
  @@index([sessionId])
  @@index([createdAt])
}
```

### Query Optimization

1. **Select Specific Fields**: Only select the fields you need
2. **Pagination**: Use pagination for large result sets
3. **Eager Loading**: Use `include` to eager load related data
4. **Batching**: Use batching for multiple operations

```typescript
// Good: Select only needed fields with pagination
const memories = await prisma.memory.findMany({
  where: { userId },
  select: { id: true, content: true, createdAt: true },
  orderBy: { createdAt: 'desc' },
  skip: (page - 1) * pageSize,
  take: pageSize,
});

// Good: Eager loading related data
const user = await prisma.user.findUnique({
  where: { id: userId },
  include: {
    sessions: {
      orderBy: { createdAt: 'desc' },
      take: 5,
    },
  },
});
```

## Testing Database Code

### Test Setup

```typescript
// tests/setup.ts
import { prisma } from '../lib/db';

beforeEach(async () => {
  // Clean up database before each test
  await prisma.$transaction([
    prisma.memory.deleteMany(),
    prisma.session.deleteMany(),
    prisma.user.deleteMany(),
  ]);
});

afterAll(async () => {
  // Disconnect Prisma after all tests
  await prisma.$disconnect();
});
```

### Repository Tests

```typescript
// tests/repositories/memory-repository.test.ts
import { MemoryRepository } from '../../lib/repositories/memory-repository';
import { prisma } from '../../lib/db';

describe('MemoryRepository', () => {
  const repository = new MemoryRepository();
  let userId: string;

  beforeEach(async () => {
    // Create a test user
    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        name: 'Test User',
      },
    });
    userId = user.id;
  });

  it('should create a memory', async () => {
    const memory = await repository.create({
      content: 'Test memory',
      userId,
    });

    expect(memory).toBeDefined();
    expect(memory.content).toBe('Test memory');
    expect(memory.userId).toBe(userId);
  });

  it('should find memories by user ID', async () => {
    // Create test memories
    await repository.create({ content: 'Memory 1', userId });
    await repository.create({ content: 'Memory 2', userId });

    const memories = await repository.findByUserId(userId);

    expect(memories).toHaveLength(2);
    expect(memories[0].content).toBe('Memory 2'); // Most recent first
    expect(memories[1].content).toBe('Memory 1');
  });
});
```

## Security Considerations

1. **Parameterized Queries**: Always use parameterized queries to prevent SQL injection
2. **Least Privilege**: Use database users with minimal required permissions
3. **Connection Pooling**: Use connection pooling for efficient resource usage
4. **Sensitive Data**: Encrypt sensitive data before storing
5. **Audit Logging**: Implement audit logging for sensitive operations

## Error Handling

```typescript
async function safeDbOperation<T>(operation: () => Promise<T>): Promise<[T | null, Error | null]> {
  try {
    const result = await operation();
    return [result, null];
  } catch (error) {
    console.error('Database operation failed:', error);
    return [null, error instanceof Error ? error : new Error(String(error))];
  }
}

// Usage
const [user, error] = await safeDbOperation(() =>
  prisma.user.findUnique({ where: { id: userId } })
);

if (error) {
  // Handle error
} else {
  // Use user data
}
```
