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
    const includeChunks = searchParams.get('includeChunks') === 'true';

    // In a real app, we would get the user ID from the session
    // For now we'll use a placeholder user ID for testing
    const userId = searchParams.get('userId') || 'user_placeholder';

    // Get documents from database
    const documents = await getUserDocuments(userId, {
      limit,
      offset,
      includeChunks,
      filterByStatus,
      searchTerm,
      tags,
    });

    // Get total document count for pagination
    const total = await getUserDocuments(userId, {
      ...(filterByStatus && { filterByStatus }),
      ...(searchTerm && { searchTerm }),
      ...(tags && { tags }),
    }).then((docs) => docs.length);

    // Return formatted response
    return NextResponse.json({
      documents,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + documents.length < total,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error listing documents:', error);

    return NextResponse.json(
      {
        error: 'Failed to list documents',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
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
