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
        source: undefined,
        userId: 'user123',
        metadata: document.metadata,
        fileName: 'test.txt',
        fileSize: 1024,
        mimeType: 'text/plain',
        processingStatus: 'pending',
        isIndexed: false,
        tags: [],
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
        source: undefined,
        userId: 'user123',
        metadata: {},
        fileName: undefined,
        fileSize: undefined,
        mimeType: undefined,
        processingStatus: 'pending',
        isIndexed: false,
        tags: [],
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
        tags: ['test'],
        metadata: {
          author: 'Test Author',
          keywords: ['test', 'document'],
        },
      };

      const result = dbDocumentToAppFormat(dbDocument as any);

      expect(result).toEqual({
        id: 'doc123',
        content: 'Test content',
        metadata: {
          ...dbDocument.metadata,
          title: 'Test Document',
          url: 'http://example.com',
          documentType: 'text/plain',
          fileName: 'test.txt',
          fileSize: 1024,
          mimeType: 'text/plain',
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
          metadata: {},
          tags: [],
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
});
