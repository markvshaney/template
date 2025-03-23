import {
  prisma,
  createMemory,
  getMemoriesByUserId,
  getMemoriesByType,
  createSession,
  getSessionById,
  consolidateMemory,
  createSpecialization,
  activateSpecialization,
  createVectorIndex,
  cleanupDatabase,
  type MemoryType,
} from './db';

describe('Database Utilities', () => {
  let userId: string;
  let sessionId: string;

  beforeAll(async () => {
    // Create a test user
    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        name: 'Test User',
      },
    });
    userId = user.id;

    // Create a test session
    const session = await prisma.session.create({
      data: {
        userId,
      },
    });
    sessionId = session.id;
  });

  afterAll(async () => {
    await cleanupDatabase();
    await prisma.$disconnect();
  });

  describe('Memory Management', () => {
    it('should create a memory', async () => {
      const memory = await createMemory({
        content: 'Test memory content',
        type: 'factual',
        importance: 0.8,
        userId,
        sessionId,
        embedding: new Array(1536).fill(0),
        keywords: ['test', 'memory'],
        metadata: { source: 'test' },
      });

      expect(memory).toBeDefined();
      expect(memory.content).toBe('Test memory content');
      expect(memory.type).toBe('factual');
      expect(memory.importance).toBe(0.8);
    });

    it('should get memories by user ID', async () => {
      const memories = await getMemoriesByUserId(userId);
      expect(Array.isArray(memories)).toBe(true);
      expect(memories.length).toBeGreaterThan(0);
    });

    it('should get memories by type', async () => {
      const memories = await getMemoriesByType(userId, 'factual');
      expect(Array.isArray(memories)).toBe(true);
      expect(memories.every((m) => m.type === 'factual')).toBe(true);
    });
  });

  describe('Session Management', () => {
    it('should create a session', async () => {
      const session = await createSession(userId);
      expect(session).toBeDefined();
      expect(session.userId).toBe(userId);
    });

    it('should get session by ID', async () => {
      const session = await getSessionById(sessionId);
      expect(session).toBeDefined();
      expect(session?.userId).toBe(userId);
    });
  });

  describe('Memory Consolidation', () => {
    it('should consolidate a memory', async () => {
      const memory = await createMemory({
        content: 'Memory to consolidate',
        type: 'episodic',
        userId,
        sessionId,
        embedding: new Array(1536).fill(0),
        keywords: ['consolidate'],
        metadata: {},
      });

      const consolidation = await consolidateMemory(memory.id, 0.9);
      expect(consolidation).toBeDefined();
      expect(consolidation.importance).toBe(0.9);
      expect(consolidation.reviewCount).toBe(0);
    });
  });

  describe('Specialization Management', () => {
    it('should create and activate a specialization', async () => {
      const specialization = await createSpecialization('TestSpecialization', 'factual', '1.0.0', {
        description: 'Test specialization',
      });

      expect(specialization).toBeDefined();
      expect(specialization.name).toBe('TestSpecialization');
      expect(specialization.active).toBe(false);

      const activated = await activateSpecialization(specialization.id);
      expect(activated.active).toBe(true);
    });
  });

  describe('Vector Operations', () => {
    it('should create a vector index', async () => {
      const vectorIndex = await createVectorIndex(new Array(1536).fill(0), {
        description: 'Test vector',
      });

      expect(vectorIndex).toBeDefined();
      expect(vectorIndex.metadata).toEqual({ description: 'Test vector' });
    });
  });
});
