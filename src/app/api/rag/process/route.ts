import { NextRequest, NextResponse } from 'next/server';
import { chunkDocument, DocumentMetadata } from '@/lib/rag/document-processing';
import { EmbeddingGenerator } from '@/lib/ai/embeddings';
import { getDocumentById, updateDocumentStatus, storeDocumentWithChunks } from '@/lib/db/documents';
import { storeEmbedding, EmbeddingInput } from '@/lib/db/embeddings';
import { DocumentProcessingStatus } from '@/lib/db/types';

// Initialize embedding generator
const embeddingGenerator = new EmbeddingGenerator();

export async function POST(request: NextRequest) {
  try {
    const { documentIds } = await request.json();

    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      return NextResponse.json({ error: 'No document IDs provided' }, { status: 400 });
    }

    // Track documents that were successfully processed
    const processedDocuments = [];
    const failedDocuments = [];

    // Process each document
    for (const documentId of documentIds) {
      try {
        // Update status to processing
        await updateDocumentStatus(documentId, DocumentProcessingStatus.PROCESSING);

        // Get document from database
        const dbDocument = await getDocumentById(documentId);

        if (!dbDocument) {
          failedDocuments.push({
            id: documentId,
            error: 'Document not found',
          });

          await updateDocumentStatus(
            documentId,
            DocumentProcessingStatus.FAILED,
            'Document not found'
          );

          continue;
        }

        // Convert to application document format
        const document = {
          id: dbDocument.id,
          content: dbDocument.content,
          metadata: {
            ...(JSON.parse(dbDocument.metadata) as DocumentMetadata),
            title: dbDocument.title,
          },
        };

        // Chunk the document
        const chunks = chunkDocument(document);

        // Generate embeddings for each chunk
        const chunkEmbeddings: { chunkId: string; vector: number[] }[] = [];

        for (const chunk of chunks) {
          try {
            // Generate embedding for the chunk
            const embedding = await embeddingGenerator.generateEmbedding(chunk.content);
            chunkEmbeddings.push({ chunkId: chunk.id, vector: embedding });
          } catch (embeddingError) {
            console.error(`Error generating embedding for chunk ${chunk.id}:`, embeddingError);
            // Continue with next chunk if one fails
          }
        }

        // Store document with chunks in database
        const { document: storedDocument } = await storeDocumentWithChunks(
          document,
          chunks,
          dbDocument.userId
        );

        // Store embeddings separately
        const embeddingPromises = chunkEmbeddings.map(({ chunkId, vector }) => {
          const embeddingInput: EmbeddingInput = {
            chunkId,
            modelName: 'ollama/nomic-embed-text',
            dimensions: vector.length,
            vector,
          };

          return storeEmbedding(embeddingInput);
        });

        await Promise.all(embeddingPromises);

        // Update document status to completed
        await updateDocumentStatus(documentId, DocumentProcessingStatus.COMPLETED);

        processedDocuments.push(storedDocument);
      } catch (docError) {
        console.error(`Error processing document ${documentId}:`, docError);

        failedDocuments.push({
          id: documentId,
          error: docError instanceof Error ? docError.message : 'Unknown error',
        });

        await updateDocumentStatus(
          documentId,
          DocumentProcessingStatus.FAILED,
          docError instanceof Error ? docError.message : 'Unknown error'
        );
      }
    }

    // Return results
    return NextResponse.json({
      success: true,
      processedCount: processedDocuments.length,
      failedCount: failedDocuments.length,
      documents: processedDocuments,
      failed: failedDocuments,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in document processing API:', error);

    return NextResponse.json(
      {
        error: 'Document processing failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
