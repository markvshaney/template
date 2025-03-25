import { NextRequest, NextResponse } from 'next/server';
import { getUserDocuments, createDocument } from '@/lib/db/documents';

/**
 * GET handler for listing documents
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse query parameters
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const searchTerm = searchParams.get('search') || undefined;
    const filterByStatus = searchParams.get('status') || undefined;
    const tags = searchParams.get('tags')?.split(',') || undefined;

    // Always use our test user ID for now
    const userId = 'cm8nwyxk70000sgdgdws2ej0v';

    console.log('Documents API request with userId:', userId);

    // Get documents from database
    const documents = await getUserDocuments(userId, {
      limit,
      offset,
      filterByStatus,
      searchTerm,
      tags,
    });

    console.log('Documents API found:', documents.length, 'documents');

    // Return simple response
    return NextResponse.json(
      {
        documents,
        pagination: {
          total: documents.length,
          limit,
          offset,
          hasMore: false,
        },
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  } catch (error) {
    console.error('Error listing documents:', error);

    // Return an empty documents array but still with a valid response structure
    // This helps the UI to render properly even on errors
    return NextResponse.json(
      {
        documents: [],
        pagination: {
          total: 0,
          limit: 10,
          offset: 0,
          hasMore: false,
        },
        error: 'Failed to list documents',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      {
        status: 200, // Return 200 even on error for better UI stability
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  }
}

/**
 * POST handler for creating a document
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    if (!body.title || !body.content || !body.contentType) {
      return NextResponse.json(
        { error: 'Missing required fields: title, content, contentType' },
        { status: 400 }
      );
    }

    // In a real app, we would get the user ID from the session
    const userId = body.userId || 'user_placeholder';

    // Create document in database
    const document = await createDocument({
      title: body.title,
      content: body.content,
      contentType: body.contentType,
      userId,
      source: body.source,
      metadata: body.metadata || {},
      fileName: body.fileName,
      fileSize: body.fileSize,
      mimeType: body.mimeType,
      tags: body.tags,
    });

    // Return success response
    return NextResponse.json(
      {
        success: true,
        document,
        timestamp: new Date().toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating document:', error);

    return NextResponse.json(
      {
        error: 'Failed to create document',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
