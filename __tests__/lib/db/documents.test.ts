import {
  createDocument,
  createDocumentFromApp,
  getDocumentById,
  getUserDocuments,
  updateDocument,
  updateDocumentStatus,
  deleteDocument,
  documentToDbFormat,
  dbDocumentToAppFormat,
  createChunk,
  createChunks,
  chunksToDbFormat,
  storeDocumentWithChunks,
  countUserDocuments,
  getDocumentChunks,
  deleteDocumentChunks,
} from '@/lib/db/documents';
import { Document, DocumentChunk } from '@/lib/rag/document-processing';
import { PrismaClient } from '@prisma/client';
import { DocumentProcessingStatus } from '@/lib/db/types';

// Mock Prisma client
jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    document: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    chunk: {
      create: jest.fn(),
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn((callback) => {
      if (typeof callback === 'function') {
        return callback(mockPrismaClient);
      }
      return Promise.all(callback);
    }),
  };

  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
  };
});

describe('Document Storage Utilities', () => {
  let prisma: ReturnType<typeof PrismaClient>;

  beforeEach(() => {
    // Get the mocked instance and reset all mocks
    prisma = new PrismaClient();
    jest.clearAllMocks();
  });

  describe('documentToDbFormat', () => {
    it('should convert application document to database format', () => {
      const document: Document = {
        id: 'doc123',
        content: 'Test content',
        metadata: {
          title: 'Test Document',
          documentType: 'text/plain',
          fileName: 'test.txt',
          fileSize: 1024,
          mimeType: 'text/plain',
        },
      };

      const userId = 'user123';
      const result = documentToDbFormat(document, userId);

      expect(result).toEqual({
        title: 'Test Document',
        content: 'Test content',
        contentType: 'text/plain',
        source: null,
        userId: 'user123',
        metadata: JSON.stringify(document.metadata),
        fileName: 'test.txt',
        fileSize: 1024,
        mimeType: 'text/plain',
        processingStatus: 'pending',
        processingError: null,
        isIndexed: false,
        indexedAt: null,
        tagsString: '',
      });
    });

    it('should handle missing fields with defaults', () => {
      const document: Document = {
        id: 'doc123',
        content: 'Test content',
        metadata: {},
      };

      const userId = 'user123';
      const result = documentToDbFormat(document, userId);

      expect(result).toEqual({
        title: 'Untitled Document',
        content: 'Test content',
        contentType: 'text/plain',
        source: null,
        userId: 'user123',
        metadata: '{}',
        fileName: null,
        fileSize: null,
        mimeType: null,
        processingStatus: 'pending',
        processingError: null,
        isIndexed: false,
        indexedAt: null,
        tagsString: '',
      });
    });
  });

  describe('dbDocumentToAppFormat', () => {
    it('should convert database document to application format', () => {
      const dbDocument = {
        id: 'doc123',
        createdAt: new Date(),
        updatedAt: new Date(),
        title: 'Test Document',
        content: 'Test content',
        contentType: 'text/plain',
        source: 'http://example.com',
        userId: 'user123',
        fileName: 'test.txt',
        fileSize: 1024,
        mimeType: 'text/plain',
        processingStatus: 'completed',
        processingError: null,
        isIndexed: true,
        indexedAt: new Date(),
        tagsString: 'test,document',
        metadata: JSON.stringify({
          author: 'Test Author',
          keywords: ['test', 'document'],
        }),
      };

      const result = dbDocumentToAppFormat(dbDocument as any);

      expect(result).toEqual({
        id: 'doc123',
        content: 'Test content',
        metadata: {
          author: 'Test Author',
          keywords: ['test', 'document'],
          title: 'Test Document',
          url: 'http://example.com',
          documentType: 'text/plain',
          fileName: 'test.txt',
          fileSize: 1024,
          mimeType: 'text/plain',
          tags: ['test', 'document'],
        },
      });
    });
  });

  describe('createDocument', () => {
    it('should create a document in the database', async () => {
      const documentInput = {
        title: 'Test Document',
        content: 'Test content',
        contentType: 'text/plain',
        userId: 'user123',
      };

      const mockDbDocument = {
        id: 'doc123',
        ...documentInput,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.document.create as jest.Mock).mockResolvedValue(mockDbDocument);

      const result = await createDocument(documentInput);

      expect(prisma.document.create).toHaveBeenCalledWith({
        data: {
          ...documentInput,
          metadata: '{}',
          tagsString: '',
        },
      });

      expect(result).toEqual(mockDbDocument);
    });
  });

  describe('getUserDocuments', () => {
    it('should get documents for a user with default options', async () => {
      const userId = 'user123';
      const mockDocuments = [
        { id: 'doc1', title: 'Document 1' },
        { id: 'doc2', title: 'Document 2' },
      ];

      (prisma.document.findMany as jest.Mock).mockResolvedValue(mockDocuments);

      const result = await getUserDocuments(userId);

      expect(prisma.document.findMany).toHaveBeenCalledWith({
        where: { userId },
        include: { chunks: false },
        take: 10,
        skip: 0,
        orderBy: { createdAt: 'desc' },
      });

      expect(result).toEqual(mockDocuments);
    });

    it('should get documents with custom options', async () => {
      const userId = 'user123';
      const options = {
        limit: 5,
        offset: 10,
        includeChunks: true,
        filterByStatus: 'completed',
        searchTerm: 'test',
        tags: ['doc', 'important'],
      };

      const mockDocuments = [
        { id: 'doc1', title: 'Test Document 1' },
        { id: 'doc2', title: 'Test Document 2' },
      ];

      (prisma.document.findMany as jest.Mock).mockResolvedValue(mockDocuments);

      const result = await getUserDocuments(userId, options);

      expect(prisma.document.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          processingStatus: 'completed',
          OR: [
            { title: { contains: 'test', mode: 'insensitive' } },
            { content: { contains: 'test', mode: 'insensitive' } },
          ],
          tags: { hasSome: ['doc', 'important'] },
        },
        include: { chunks: true },
        take: 5,
        skip: 10,
        orderBy: { createdAt: 'desc' },
      });

      expect(result).toEqual(mockDocuments);
    });
  });

  describe('storeDocumentWithChunks', () => {
    it('should store document and chunks in a transaction', async () => {
      const document: Document = {
        id: 'doc123',
        content: 'Test content',
        metadata: {
          title: 'Test Document',
        },
      };

      const chunks: DocumentChunk[] = [
        {
          id: 'chunk1',
          content: 'Test chunk 1',
          documentId: 'doc123',
          metadata: {},
        },
      ];

      const mockDbDocument = {
        id: 'doc123',
        title: 'Test Document',
        content: 'Test content',
      };

      const mockDbChunks = [
        {
          id: 'chunk1',
          content: 'Test chunk 1',
          documentId: 'doc123',
        },
      ];

      // Mock user.findUnique to return a user
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user123',
        email: 'test@example.com',
        name: 'Test User',
      });

      (prisma.document.create as jest.Mock).mockResolvedValue(mockDbDocument);
      (prisma.chunk.create as jest.Mock).mockResolvedValue(mockDbChunks[0]);

      const result = await storeDocumentWithChunks(document, chunks, 'user123');

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(result).toEqual({
        document: {
          ...mockDbDocument,
          // Only check for fields that exist in the result
          title: 'Test Document',
          content: 'Test content',
          id: 'doc123',
        },
        chunks: mockDbChunks,
      });
    });
  });

  describe('updateDocumentStatus', () => {
    it('should update document status', async () => {
      const documentId = 'doc123';
      const status = DocumentProcessingStatus.COMPLETED;

      const mockUpdatedDocument = {
        id: documentId,
        processingStatus: status,
        isIndexed: true,
        indexedAt: expect.any(Date),
      };

      (prisma.document.update as jest.Mock).mockResolvedValue(mockUpdatedDocument);

      const result = await updateDocumentStatus(documentId, status);

      expect(prisma.document.update).toHaveBeenCalledWith({
        where: { id: documentId },
        data: {
          processingStatus: status,
          processingError: undefined,
          isIndexed: true,
          indexedAt: expect.any(Date),
        },
      });

      expect(result).toEqual(mockUpdatedDocument);
    });

    it('should update document status with error', async () => {
      const documentId = 'doc123';
      const status = DocumentProcessingStatus.FAILED;
      const error = 'Processing failed';

      const mockUpdatedDocument = {
        id: documentId,
        processingStatus: status,
        processingError: error,
      };

      (prisma.document.update as jest.Mock).mockResolvedValue(mockUpdatedDocument);

      const result = await updateDocumentStatus(documentId, status, error);

      expect(prisma.document.update).toHaveBeenCalledWith({
        where: { id: documentId },
        data: {
          processingStatus: status,
          processingError: error,
        },
      });

      expect(result).toEqual(mockUpdatedDocument);
    });
  });

  describe('createChunk', () => {
    it('should create a document chunk in the database', async () => {
      const chunkInput = {
        documentId: 'doc123',
        content: 'Test chunk content',
        startPosition: 0,
        endPosition: 100,
        metadata: JSON.stringify({ type: 'text' }),
        keywordsString: 'keyword1,keyword2',
        chunkIndex: 0,
        isFirst: true,
        isLast: false,
        tokens: 20,
        embeddingModel: 'text-embedding-ada-002',
      };

      const mockDbChunk = {
        id: 'chunk1',
        ...chunkInput,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.chunk.create as jest.Mock).mockResolvedValue(mockDbChunk);

      const result = await createChunk(chunkInput);

      expect(prisma.chunk.create).toHaveBeenCalledWith({
        data: chunkInput,
      });

      expect(result).toEqual(mockDbChunk);
    });
  });

  describe('countUserDocuments', () => {
    it('should count documents for a user with default options', async () => {
      const userId = 'user123';

      (prisma.document.count as jest.Mock).mockResolvedValue(5);

      const result = await countUserDocuments(userId);

      expect(prisma.document.count).toHaveBeenCalledWith({
        where: { userId },
      });

      expect(result).toBe(5);
    });

    it('should count documents with filtering options', async () => {
      const userId = 'user123';
      const options = {
        filterByStatus: 'completed',
        searchTerm: 'test',
        tags: ['important'],
      };

      (prisma.document.count as jest.Mock).mockResolvedValue(3);

      const result = await countUserDocuments(userId, options);

      expect(prisma.document.count).toHaveBeenCalledWith({
        where: {
          userId,
          processingStatus: 'completed',
          OR: [
            { title: { contains: 'test', mode: 'insensitive' } },
            { content: { contains: 'test', mode: 'insensitive' } },
          ],
          tags: { hasSome: ['important'] },
        },
      });

      expect(result).toBe(3);
    });
  });

  describe('getDocumentById', () => {
    it('should get a document by ID with its chunks', async () => {
      const documentId = 'doc123';
      const mockDocument = {
        id: documentId,
        title: 'Test Document',
        content: 'Test content',
        chunks: [
          { id: 'chunk1', content: 'Chunk 1', documentId },
          { id: 'chunk2', content: 'Chunk 2', documentId },
        ],
      };

      (prisma.document.findUnique as jest.Mock).mockResolvedValue(mockDocument);

      const result = await getDocumentById(documentId);

      expect(prisma.document.findUnique).toHaveBeenCalledWith({
        where: { id: documentId },
        include: { chunks: true },
      });

      expect(result).toEqual(mockDocument);
    });

    it('should return null if document is not found', async () => {
      const documentId = 'nonexistent';

      (prisma.document.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await getDocumentById(documentId);

      expect(prisma.document.findUnique).toHaveBeenCalledWith({
        where: { id: documentId },
        include: { chunks: true },
      });

      expect(result).toBeNull();
    });
  });

  describe('updateDocument', () => {
    it('should update a document with provided data', async () => {
      const documentId = 'doc123';
      const updateData = {
        title: 'Updated Title',
        content: 'Updated content',
        isIndexed: true,
      };

      const mockUpdatedDocument = {
        id: documentId,
        ...updateData,
        updatedAt: new Date(),
      };

      (prisma.document.update as jest.Mock).mockResolvedValue(mockUpdatedDocument);

      const result = await updateDocument(documentId, updateData);

      expect(prisma.document.update).toHaveBeenCalledWith({
        where: { id: documentId },
        data: updateData,
      });

      expect(result).toEqual(mockUpdatedDocument);
    });
  });

  describe('deleteDocument', () => {
    it('should delete a document', async () => {
      const documentId = 'doc123';

      // Mock successful delete (returns undefined in our implementation)
      (prisma.document.delete as jest.Mock).mockResolvedValue(undefined);

      await deleteDocument(documentId);

      // Verify delete was called with correct id
      expect(prisma.document.delete).toHaveBeenCalledWith({
        where: { id: documentId },
      });
    });
  });

  describe('chunksToDbFormat', () => {
    it('should convert application chunks to database format', () => {
      const documentId = 'doc123';
      const documentChunks: DocumentChunk[] = [
        {
          id: 'chunk1',
          documentId,
          content: 'Chunk 1 content',
          startPosition: 0,
          endPosition: 100,
          metadata: {
            keywords: ['test', 'chunk'],
            tokens: 20,
            embeddingModel: 'test-model',
          },
        },
        {
          id: 'chunk2',
          documentId,
          content: 'Chunk 2 content',
          startPosition: 101,
          endPosition: 200,
          metadata: {
            tokens: 15,
          },
        },
      ];

      const result = chunksToDbFormat(documentChunks, documentId);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        content: 'Chunk 1 content',
        documentId,
        keywordsString: 'test,chunk',
        metadata: JSON.stringify(documentChunks[0].metadata),
        startPosition: 0,
        endPosition: 100,
        chunkIndex: 0,
        isFirst: true,
        isLast: false,
        tokens: 20,
        embeddingModel: 'test-model',
      });

      expect(result[1]).toEqual({
        content: 'Chunk 2 content',
        documentId,
        keywordsString: '',
        metadata: JSON.stringify(documentChunks[1].metadata),
        startPosition: 101,
        endPosition: 200,
        chunkIndex: 1,
        isFirst: false,
        isLast: true,
        tokens: 15,
        embeddingModel: null,
      });
    });
  });

  describe('createDocumentFromApp', () => {
    it('should create a document from application format', async () => {
      const userId = 'user123';
      const appDocument: Document = {
        id: 'doc123',
        content: 'Test content',
        metadata: {
          title: 'Test Document',
          documentType: 'text/plain',
        },
      };

      // Mock user exists
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: userId,
        email: 'test@example.com',
      });

      const mockDbDocument = {
        id: 'doc123',
        title: 'Test Document',
        content: 'Test content',
        contentType: 'text/plain',
        metadata: JSON.stringify(appDocument.metadata),
        userId,
      };

      (prisma.document.create as jest.Mock).mockResolvedValue(mockDbDocument);

      const result = await createDocumentFromApp(appDocument, userId);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });

      expect(prisma.document.create).toHaveBeenCalled();
      expect(result.id).toBe(appDocument.id);
      expect(result.content).toBe(appDocument.content);
    });

    it('should create user if not exists before creating document', async () => {
      const userId = 'new-user';
      const appDocument: Document = {
        id: 'doc123',
        content: 'Test content',
        metadata: {
          title: 'Test Document',
        },
      };

      // Mock user doesn't exist then user create succeeds
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: userId,
        email: `user_${userId}@example.com`,
        name: `Test User ${userId}`,
      });

      const mockDbDocument = {
        id: 'doc123',
        title: 'Test Document',
        content: 'Test content',
        metadata: JSON.stringify(appDocument.metadata),
        userId,
      };

      (prisma.document.create as jest.Mock).mockResolvedValue(mockDbDocument);

      const result = await createDocumentFromApp(appDocument, userId);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          id: userId,
          email: `user_${userId}@example.com`,
          name: `Test User ${userId}`,
        },
      });

      expect(prisma.document.create).toHaveBeenCalled();
      expect(result.id).toBe(appDocument.id);
    });
  });

  describe('getDocumentChunks', () => {
    it('should get chunks for a document', async () => {
      const documentId = 'doc123';
      const mockChunks = [
        { id: 'chunk1', content: 'Chunk 1', documentId },
        { id: 'chunk2', content: 'Chunk 2', documentId },
      ];

      (prisma.chunk.findMany as jest.Mock).mockResolvedValue(mockChunks);

      const result = await getDocumentChunks(documentId);

      expect(prisma.chunk.findMany).toHaveBeenCalledWith({
        where: { documentId },
        orderBy: { chunkIndex: 'asc' },
      });

      expect(result).toEqual(mockChunks);
    });
  });

  describe('deleteDocumentChunks', () => {
    it('should delete all chunks for a document', async () => {
      const documentId = 'doc123';
      const mockDeleteResult = { count: 5 };

      (prisma.chunk.deleteMany as jest.Mock).mockResolvedValue(mockDeleteResult);

      await deleteDocumentChunks(documentId);

      expect(prisma.chunk.deleteMany).toHaveBeenCalledWith({
        where: { documentId },
      });
    });
  });

  describe('createChunks', () => {
    it('should create multiple document chunks', async () => {
      const chunks = [
        {
          documentId: 'doc123',
          content: 'Chunk 1 content',
          keywordsString: 'key1,key2',
          metadata: JSON.stringify({ chunkType: 'text' }),
          startPosition: 0,
          endPosition: 100,
          chunkIndex: 0,
          isFirst: true,
          isLast: false,
          tokens: 20,
        },
        {
          documentId: 'doc123',
          content: 'Chunk 2 content',
          keywordsString: 'key3,key4',
          metadata: JSON.stringify({ chunkType: 'text' }),
          startPosition: 101,
          endPosition: 200,
          chunkIndex: 1,
          isFirst: false,
          isLast: true,
          tokens: 15,
        },
      ];

      const mockChunks = chunks.map((chunk, index) => ({
        id: `chunk${index + 1}`,
        ...chunk,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      // Mock the transaction to return the created chunks
      (prisma.$transaction as jest.Mock).mockResolvedValue(mockChunks);

      const result = await createChunks(chunks);

      // Verify each chunk is created
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(result).toEqual(mockChunks);
      expect(result.length).toBe(2);
    });

    it('should handle metadata conversion correctly', async () => {
      const chunks = [
        {
          documentId: 'doc123',
          content: 'Chunk with object metadata',
          keywordsString: '',
          metadata: JSON.stringify({ type: 'object metadata' }),
          startPosition: 0,
          endPosition: 100,
          chunkIndex: 0,
          isFirst: true,
          isLast: true,
          tokens: 20,
        },
      ];

      const mockChunk = {
        id: 'chunk1',
        ...chunks[0],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock the create call to return the chunk
      (prisma.chunk.create as jest.Mock).mockResolvedValue(mockChunk);
      (prisma.$transaction as jest.Mock).mockImplementation((callback) => {
        if (Array.isArray(callback)) {
          return Promise.resolve([mockChunk]);
        }
        return Promise.resolve([mockChunk]);
      });

      const result = await createChunks(chunks);

      expect(result).toEqual([mockChunk]);
    });
  });
});
