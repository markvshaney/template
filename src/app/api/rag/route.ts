import { NextRequest, NextResponse } from 'next/server';
import { RetrievalOptions } from '@/lib/rag/retrieval';
import { EmbeddingGenerator } from '@/lib/ai/embeddings';
import { similaritySearch } from '@/lib/db/embeddings';
import { getDocumentById } from '@/lib/db/documents';

// Initialize embedding generator
const embeddingGenerator = new EmbeddingGenerator();

export async function POST(request: NextRequest) {
  try {
    const { query, options = {} } = await request.json();

    // Validate the request
    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Invalid query. Query must be a non-empty string.' },
        { status: 400 }
      );
    }

    // Generate embedding for the query
    const queryEmbedding = await embeddingGenerator.generateEmbedding(query);

    // Set default retrieval options
    const retrievalOptions: RetrievalOptions = {
      limit: 5,
      minScore: 0.7,
      includeMetadata: true,
      includeSources: true,
      format: 'text',
      ...options,
    };

    // Perform similarity search using database
    const searchResults = await similaritySearch(queryEmbedding, {
      limit: retrievalOptions.limit,
      minScore: retrievalOptions.minScore,
      includeDocument: retrievalOptions.includeSources,
    });

    // Format results into context and sources
    let context = '';
    const sources: { id: string; title: string; url?: string }[] = [];
    const documentIds = new Set<string>();

    // Build context from search results
    searchResults.forEach((result) => {
      const chunk = result.chunk;

      // Add chunk content to context
      context += `${chunk.content}\n\n`;

      // Track document ID for sources
      documentIds.add(chunk.documentId);
    });

    // Get document information for sources if requested
    if (retrievalOptions.includeSources) {
      await Promise.all(
        Array.from(documentIds).map(async (docId) => {
          const document = await getDocumentById(docId);
          if (document) {
            sources.push({
              id: document.id,
              title: document.title,
              url: document.source || undefined,
            });
          }
        })
      );
    }

    // Return the results
    return NextResponse.json({
      query,
      context,
      results: searchResults,
      sources: retrievalOptions.includeSources ? sources : undefined,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in RAG retrieval API:', error);

    return NextResponse.json(
      {
        error: 'Retrieval failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// GET handler for simpler queries
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query');

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Invalid query. Query must be a non-empty string.' },
        { status: 400 }
      );
    }

    // Generate embedding for the query
    const queryEmbedding = await embeddingGenerator.generateEmbedding(query);

    // Perform similarity search with default options
    const searchResults = await similaritySearch(queryEmbedding, {
      limit: 5,
      minScore: 0.7,
      includeDocument: true,
    });

    // Format results into context and sources
    let context = '';
    const sources: { id: string; title: string; url?: string }[] = [];
    const documentIds = new Set<string>();

    // Build context from search results
    searchResults.forEach((result) => {
      const chunk = result.chunk;

      // Add chunk content to context
      context += `${chunk.content}\n\n`;

      // Track document ID for sources
      documentIds.add(chunk.documentId);
    });

    // Get document information for sources
    await Promise.all(
      Array.from(documentIds).map(async (docId) => {
        const document = await getDocumentById(docId);
        if (document) {
          sources.push({
            id: document.id,
            title: document.title,
            url: document.source || undefined,
          });
        }
      })
    );

    // Return the results
    return NextResponse.json({
      query,
      context,
      results: searchResults,
      sources,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in RAG retrieval API:', error);

    return NextResponse.json(
      {
        error: 'Retrieval failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
