import { NextRequest, NextResponse } from 'next/server';
import { RetrievalOptions, retrieveContext } from '@/lib/rag/retrieval';
import { EmbeddingGenerator } from '@/lib/ai/embeddings';
import { getVectorStore } from './process/route';

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

    // Get vector store
    const vectorStore = getVectorStore();

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

    // Retrieve relevant context
    const retrievalResult = await retrieveContext(vectorStore, queryEmbedding, retrievalOptions);

    // Return the results
    return NextResponse.json({
      query,
      context: retrievalResult.context,
      results: retrievalResult.results,
      sources: retrievalResult.sources,
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

    // Get vector store
    const vectorStore = getVectorStore();

    // Generate embedding for the query
    const queryEmbedding = await embeddingGenerator.generateEmbedding(query);

    // Use default retrieval options
    const retrievalResult = await retrieveContext(vectorStore, queryEmbedding);

    // Return the results
    return NextResponse.json({
      query,
      context: retrievalResult.context,
      results: retrievalResult.results,
      sources: retrievalResult.sources,
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
