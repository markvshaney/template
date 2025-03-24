import { NextRequest, NextResponse } from 'next/server';
import { chunkDocument, Document } from '@/lib/rag/document-processing';
import { InMemoryVectorStore, VectorChunk } from '@/lib/rag/vector-store';
import { EmbeddingGenerator } from '@/lib/ai/embeddings';

// In a real application, these would be stored in a database
// For now, we'll use in-memory storage
const documentStore: Record<string, Document> = {};
const vectorStore = new InMemoryVectorStore();
const embeddingGenerator = new EmbeddingGenerator();

export async function POST(request: NextRequest) {
  try {
    const { documentIds } = await request.json();

    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      return NextResponse.json({ error: 'No document IDs provided' }, { status: 400 });
    }

    // Track documents that were successfully processed
    const processedDocuments: Document[] = [];
    const failedDocuments: { id: string; error: string }[] = [];

    // Process each document
    for (const documentId of documentIds) {
      try {
        const document = documentStore[documentId];

        if (!document) {
          failedDocuments.push({
            id: documentId,
            error: 'Document not found',
          });
          continue;
        }

        // Chunk the document
        const chunks = chunkDocument(document);

        // Generate embeddings for each chunk
        for (const chunk of chunks) {
          try {
            // Generate embedding for the chunk
            const embedding = await embeddingGenerator.generateEmbedding(chunk.content);

            // Create a VectorChunk object
            const vectorChunk: VectorChunk = {
              id: chunk.id,
              documentId: chunk.documentId,
              chunk,
              embedding,
              metadata: chunk.metadata,
            };

            // Store the chunk and its embedding
            vectorStore.addVector(vectorChunk);
          } catch (embeddingError) {
            console.error(`Error generating embedding for chunk ${chunk.id}:`, embeddingError);
            // Continue with next chunk if one fails
          }
        }

        processedDocuments.push(document);
      } catch (docError) {
        console.error(`Error processing document ${documentId}:`, docError);
        failedDocuments.push({
          id: documentId,
          error: docError instanceof Error ? docError.message : 'Unknown error',
        });
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

// Store a document in memory (this would normally go to a database)
export function storeDocument(document: Document): void {
  documentStore[document.id] = document;
}

// Get the vector store instance (for testing/debugging)
export function getVectorStore(): InMemoryVectorStore {
  return vectorStore;
}
