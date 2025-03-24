import { PrismaClient } from '@prisma/client';
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
  createDocument,
  getDocumentById,
  getDocumentsByUserId,
  deleteDocument,
  createChunk,
  getChunksByDocumentId,
  saveSearchQuery,
  saveSearchResult,
  getRecentSearches,
  type ContentType,
  createMemoryWithConsolidation,
  getMemoryById,
  getMemoryWithConsolidation,
  getMemoriesBySessionId,
  findSimilarMemories,
  createUser,
  getUserById,
  getUserByEmail,
  updateMemoryImportance,
  updateMemoryConsolidation,
  getSessionWithMemories,
  getActiveSpecialization,
} from './db';
import { generateRandomEmbedding } from './vector';

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

  // Document-centric tests
  describe('Document Management', () => {
    let documentId: string;

    it('should create a document', async () => {
      const document = await createDocument({
        title: 'Test Document',
        content: 'This is a test document with sample content.',
        contentType: 'text/plain' as ContentType,
        userId,
        source: 'unit-test',
        metadata: { testKey: 'testValue' },
      });

      expect(document).toBeDefined();
      expect(document.title).toBe('Test Document');
      expect(document.content).toBe('This is a test document with sample content.');
      expect(document.contentType).toBe('text/plain');
      expect(document.userId).toBe(userId);
      documentId = document.id;
    });

    it('should get document by ID', async () => {
      const document = await getDocumentById(documentId);
      expect(document).toBeDefined();
      expect(document?.title).toBe('Test Document');
    });

    it('should get documents by user ID', async () => {
      const documents = await getDocumentsByUserId(userId);
      expect(Array.isArray(documents)).toBe(true);
      expect(documents.length).toBeGreaterThan(0);
      expect(documents[0].userId).toBe(userId);
    });

    it('should create and retrieve chunks', async () => {
      const chunk = await createChunk({
        content: 'This is a test chunk from the document.',
        documentId,
        embedding: new Array(1536).fill(0),
        keywords: ['test', 'chunk', 'document'],
        metadata: { position: 1 },
      });

      expect(chunk).toBeDefined();
      expect(chunk.content).toBe('This is a test chunk from the document.');
      expect(chunk.documentId).toBe(documentId);

      const chunks = await getChunksByDocumentId(documentId);
      expect(Array.isArray(chunks)).toBe(true);
      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0].documentId).toBe(documentId);
    });

    it('should delete a document', async () => {
      const document = await createDocument({
        title: 'Document to Delete',
        content: 'This document will be deleted.',
        contentType: 'text/plain' as ContentType,
        userId,
      });

      const deleteResult = await deleteDocument(document.id);
      expect(deleteResult).toBeDefined();
      expect(deleteResult.id).toBe(document.id);

      const fetchResult = await getDocumentById(document.id);
      expect(fetchResult).toBeNull();
    });
  });

  // Search history tests
  describe('Search History', () => {
    let searchQueryId: string;

    it('should save a search query', async () => {
      const searchQuery = await saveSearchQuery({
        query: 'test search query',
        userId,
        metadata: { source: 'web' },
      });

      expect(searchQuery).toBeDefined();
      expect(searchQuery.query).toBe('test search query');
      expect(searchQuery.userId).toBe(userId);
      searchQueryId = searchQuery.id;
    });

    it('should save search results', async () => {
      const searchResult = await saveSearchResult({
        searchQueryId,
        title: 'Test Result',
        url: 'https://example.com/test',
        snippet: 'This is a test search result snippet.',
        position: 1,
        metadata: { relevance: 0.95 },
      });

      expect(searchResult).toBeDefined();
      expect(searchResult.searchQueryId).toBe(searchQueryId);
      expect(searchResult.title).toBe('Test Result');
      expect(searchResult.url).toBe('https://example.com/test');
    });

    it('should get recent searches with results', async () => {
      const searches = await getRecentSearches(userId);
      expect(Array.isArray(searches)).toBe(true);
      expect(searches.length).toBeGreaterThan(0);
      expect(searches[0].query).toBe('test search query');
      expect(searches[0].results.length).toBeGreaterThan(0);
      expect(searches[0].results[0].title).toBe('Test Result');
    });
  });

  // Legacy tests for memory system (maintained for compatibility)
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

describe('Database Operations', () => {
  // Clean up before and after all tests
  beforeEach(async () => {
    await cleanupDatabase();
  });

  afterAll(async () => {
    await cleanupDatabase();
  });

  describe('Document Management', () => {
    test('should create a document', async () => {
      const user = await createUser('test@example.com', 'Test User');

      const document = await createDocument({
        title: 'Test Document',
        content: 'This is a test document',
        contentType: ContentType.TEXT,
        source: 'unit-test',
        userId: user.id,
        metadata: { testKey: 'testValue' },
      });

      expect(document).toBeDefined();
      expect(document.title).toBe('Test Document');
      expect(document.content).toBe('This is a test document');
      expect(document.userId).toBe(user.id);
      expect(document.chunks).toEqual([]);
    });

    test('should retrieve a document by ID', async () => {
      const user = await createUser('test@example.com', 'Test User');

      const createdDoc = await createDocument({
        title: 'Test Document',
        content: 'This is a test document',
        contentType: ContentType.TEXT,
        source: 'unit-test',
        userId: user.id,
      });

      const document = await getDocumentById(createdDoc.id);

      expect(document).toBeDefined();
      expect(document?.id).toBe(createdDoc.id);
      expect(document?.title).toBe('Test Document');
    });

    test('should get documents by user ID', async () => {
      const user = await createUser('test@example.com', 'Test User');

      await createDocument({
        title: 'Document 1',
        content: 'Content 1',
        contentType: ContentType.TEXT,
        source: 'unit-test',
        userId: user.id,
      });

      await createDocument({
        title: 'Document 2',
        content: 'Content 2',
        contentType: ContentType.TEXT,
        source: 'unit-test',
        userId: user.id,
      });

      const documents = await getDocumentsByUserId(user.id);

      expect(documents).toBeDefined();
      expect(documents.length).toBe(2);
      expect(documents[0].title).toBe('Document 1');
      expect(documents[1].title).toBe('Document 2');
    });

    test('should create and retrieve chunks', async () => {
      const user = await createUser('test@example.com', 'Test User');

      const document = await createDocument({
        title: 'Test Document',
        content: 'This is a test document',
        contentType: ContentType.TEXT,
        source: 'unit-test',
        userId: user.id,
      });

      const embedding = generateRandomEmbedding(1536);

      const chunk = await createChunk({
        content: 'This is a chunk from the document',
        documentId: document.id,
        embedding,
        keywords: ['test', 'document', 'chunk'],
        metadata: { position: 1 },
      });

      expect(chunk).toBeDefined();
      expect(chunk.content).toBe('This is a chunk from the document');
      expect(chunk.documentId).toBe(document.id);

      const chunks = await getChunksByDocumentId(document.id);

      expect(chunks).toBeDefined();
      expect(chunks.length).toBe(1);
      expect(chunks[0].id).toBe(chunk.id);
    });

    test('should delete a document', async () => {
      const user = await createUser('test@example.com', 'Test User');

      const document = await createDocument({
        title: 'Test Document',
        content: 'This is a test document',
        contentType: ContentType.TEXT,
        source: 'unit-test',
        userId: user.id,
      });

      // Add a chunk to the document
      await createChunk({
        content: 'This is a chunk from the document',
        documentId: document.id,
        embedding: generateRandomEmbedding(1536),
        keywords: ['test', 'document', 'chunk'],
      });

      // Delete the document (should cascade delete the chunk)
      const deletedDoc = await deleteDocument(document.id);

      expect(deletedDoc).toBeDefined();
      expect(deletedDoc?.id).toBe(document.id);

      // Document should no longer exist
      const retrievedDoc = await getDocumentById(document.id);
      expect(retrievedDoc).toBeNull();

      // Chunks should also be deleted
      const chunks = await getChunksByDocumentId(document.id);
      expect(chunks.length).toBe(0);
    });
  });

  describe('Search History', () => {
    test('should save a search query', async () => {
      const user = await createUser('test@example.com', 'Test User');

      const query = await saveSearchQuery('test search query', user.id, { source: 'web' });

      expect(query).toBeDefined();
      expect(query.query).toBe('test search query');
      expect(query.userId).toBe(user.id);
      expect(query.results).toEqual([]);
    });

    test('should save search results', async () => {
      const user = await createUser('test@example.com', 'Test User');

      const query = await saveSearchQuery('test search query', user.id);

      const result = await saveSearchResult(
        query.id,
        'Test Result Title',
        'https://example.com',
        'This is a test result snippet',
        1,
        { relevance: 0.95 }
      );

      expect(result).toBeDefined();
      expect(result.title).toBe('Test Result Title');
      expect(result.searchQueryId).toBe(query.id);
    });

    test('should get recent searches with results', async () => {
      const user = await createUser('test@example.com', 'Test User');

      const query1 = await saveSearchQuery('first search', user.id);
      const query2 = await saveSearchQuery('second search', user.id);

      await saveSearchResult(query1.id, 'Result 1', 'https://example.com/1', 'Snippet 1', 1);

      await saveSearchResult(query2.id, 'Result 2', 'https://example.com/2', 'Snippet 2', 1);

      const recentSearches = await getRecentSearches(user.id, 2);

      expect(recentSearches).toBeDefined();
      expect(recentSearches.length).toBe(2);
      expect(recentSearches[0].query).toBe('second search'); // Most recent first
      expect(recentSearches[1].query).toBe('first search');
      expect(recentSearches[0].results.length).toBe(1);
      expect(recentSearches[0].results[0].title).toBe('Result 2');
    });
  });

  describe('Memory Management', () => {
    test('should create a memory', async () => {
      const user = await createUser('test@example.com', 'Test User');
      const session = await createSession(user.id, 'Test Session');

      const memory = await createMemory({
        userId: user.id,
        sessionId: session.id,
        type: 'factual',
        content: 'This is a test memory',
        importance: 0.8,
        embedding: new Array(1536).fill(0),
        keywords: ['test', 'memory'],
      });

      expect(memory).toBeDefined();
      expect(memory.content).toBe('This is a test memory');
      expect(memory.type).toBe('factual');
      expect(memory.userId).toBe(user.id);
      expect(memory.sessionId).toBe(session.id);
    });

    test('should create a memory with consolidation', async () => {
      const user = await createUser('test@example.com', 'Test User');
      const session = await createSession(user.id, 'Test Session');

      const memory = await createMemoryWithConsolidation({
        userId: user.id,
        sessionId: session.id,
        type: 'factual',
        content: 'This is a test memory with consolidation',
        importance: 0.8,
        embedding: new Array(1536).fill(0),
        keywords: ['test', 'memory', 'consolidation'],
      });

      expect(memory).toBeDefined();
      expect(memory.content).toBe('This is a test memory with consolidation');
      expect(memory.consolidation).toBeDefined();
      expect(memory.consolidation.importance).toBe(0.8);
      expect(memory.consolidation.memoryId).toBe(memory.id);
    });

    test('should retrieve a memory by ID', async () => {
      const user = await createUser('test@example.com', 'Test User');
      const session = await createSession(user.id, 'Test Session');

      const createdMemory = await createMemory({
        userId: user.id,
        sessionId: session.id,
        type: 'factual',
        content: 'This is a retrievable memory',
        importance: 0.8,
        embedding: new Array(1536).fill(0),
        keywords: ['test', 'memory', 'retrieve'],
      });

      const memory = await getMemoryById(createdMemory.id);

      expect(memory).toBeDefined();
      expect(memory?.id).toBe(createdMemory.id);
      expect(memory?.content).toBe('This is a retrievable memory');
    });

    test('should find memories by user ID', async () => {
      const user = await createUser('test@example.com', 'Test User');
      const session = await createSession(user.id, 'Test Session');

      await createMemory({
        userId: user.id,
        sessionId: session.id,
        type: 'factual',
        content: 'Memory 1',
        importance: 0.8,
        embedding: new Array(1536).fill(0),
        keywords: ['test', 'memory', '1'],
      });

      await createMemory({
        userId: user.id,
        sessionId: session.id,
        type: 'factual',
        content: 'Memory 2',
        importance: 0.8,
        embedding: new Array(1536).fill(0),
        keywords: ['test', 'memory', '2'],
      });

      const memories = await getMemoriesByUserId(user.id);

      expect(memories).toBeDefined();
      expect(memories.length).toBe(2);
    });
  });

  describe('Session Management', () => {
    test('should create a session', async () => {
      const user = await createUser('test@example.com', 'Test User');

      const session = await createSession(user.id, 'Test Session');

      expect(session).toBeDefined();
      expect(session.name).toBe('Test Session');
      expect(session.userId).toBe(user.id);
    });

    test('should retrieve a session by ID', async () => {
      const user = await createUser('test@example.com', 'Test User');

      const createdSession = await createSession(user.id, 'Test Session');

      const session = await getSessionById(createdSession.id);

      expect(session).toBeDefined();
      expect(session?.id).toBe(createdSession.id);
      expect(session?.name).toBe('Test Session');
    });

    test('should get session with memories', async () => {
      const user = await createUser('test@example.com', 'Test User');
      const session = await createSession(user.id, 'Test Session');

      await createMemory({
        userId: user.id,
        sessionId: session.id,
        type: 'factual',
        content: 'Session Memory',
        importance: 0.8,
        embedding: new Array(1536).fill(0),
        keywords: ['test', 'session', 'memory'],
      });

      const sessionWithMemories = await getSessionWithMemories(session.id);

      expect(sessionWithMemories).toBeDefined();
      expect(sessionWithMemories?.memories).toBeDefined();
      expect(sessionWithMemories?.memories.length).toBe(1);
      expect(sessionWithMemories?.memories[0].content).toBe('Session Memory');
    });
  });

  describe('Memory Consolidation', () => {
    test('should update memory importance', async () => {
      const user = await createUser('test@example.com', 'Test User');
      const session = await createSession(user.id, 'Test Session');

      const memory = await createMemory({
        userId: user.id,
        sessionId: session.id,
        type: 'factual',
        content: 'Memory to update importance',
        importance: 0.5,
        embedding: new Array(1536).fill(0),
        keywords: ['test'],
      });

      const updatedMemory = await updateMemoryImportance(memory.id, 0.9);

      expect(updatedMemory).toBeDefined();
      expect(updatedMemory.importance).toBe(0.9);
    });

    test('should update memory consolidation', async () => {
      const user = await createUser('test@example.com', 'Test User');
      const session = await createSession(user.id, 'Test Session');

      const memory = await createMemory({
        userId: user.id,
        sessionId: session.id,
        type: 'factual',
        content: 'Memory for consolidation',
        importance: 0.5,
        embedding: new Array(1536).fill(0),
        keywords: ['test'],
      });

      const consolidation = await updateMemoryConsolidation(memory.id, 0.9, 5);

      expect(consolidation).toBeDefined();
      expect(consolidation.importance).toBe(0.9);
      expect(consolidation.reviewCount).toBe(5);
    });
  });

  describe('Specialization Management', () => {
    test('should create a specialization', async () => {
      const specialization = await createSpecialization('TestSpecialization', 'factual', '1.0.0', {
        description: 'Test specialization',
      });

      expect(specialization).toBeDefined();
      expect(specialization.name).toBe('TestSpecialization');
      expect(specialization.type).toBe('factual');
      expect(specialization.active).toBe(false);
    });

    test('should activate a specialization', async () => {
      const specialization1 = await createSpecialization('TestSpec1', 'factual', '1.0.0');

      const specialization2 = await createSpecialization('TestSpec2', 'factual', '1.0.0');

      // Activate the first specialization
      await activateSpecialization(specialization1.id);

      // Then activate the second (should deactivate the first)
      const activated = await activateSpecialization(specialization2.id);

      expect(activated).toBeDefined();
      expect(activated.id).toBe(specialization2.id);
      expect(activated.active).toBe(true);

      // The first one should now be inactive
      const active = await getActiveSpecialization('factual');
      expect(active?.id).toBe(specialization2.id);
    });
  });

  describe('Vector Operations', () => {
    test('should create a vector index', async () => {
      const embedding = new Array(1536).fill(0.1);

      const vector = await createVectorIndex(embedding, { description: 'Test vector' });

      expect(vector).toBeDefined();
      expect(vector.embedding).toEqual(embedding);
    });

    test('should find similar memories', async () => {
      const user = await createUser('test@example.com', 'Test User');
      const session = await createSession(user.id, 'Test Session');

      // Create multiple memories
      await createMemory({
        userId: user.id,
        sessionId: session.id,
        type: 'factual',
        content: 'Memory 1',
        importance: 0.8,
        embedding: new Array(1536).fill(0.1),
        keywords: ['test'],
      });

      await createMemory({
        userId: user.id,
        sessionId: session.id,
        type: 'factual',
        content: 'Memory 2',
        importance: 0.8,
        embedding: new Array(1536).fill(0.2),
        keywords: ['test'],
      });

      // Find similar memories using a test embedding
      const similarMemories = await findSimilarMemories(new Array(1536).fill(0.15), 0.5, 2);

      // With our mock, both memories will be returned with the same similarity
      expect(similarMemories).toBeDefined();
      expect(similarMemories.length).toBe(2);
    });
  });
});
