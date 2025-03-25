import { NextRequest, NextResponse } from 'next/server';
import {
  getDocumentById,
  updateDocument,
  deleteDocument,
  dbDocumentToAppFormat,
  getDocumentChunks,
} from '@/lib/db/documents';

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * GET handler for retrieving a single document
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;

    // Get document from database
    const document = await getDocumentById(id);

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Check if user has permission to access this document
    // In a real app, we would verify the user session

    // Get query params
    const searchParams = request.nextUrl.searchParams;
    const includeChunks = searchParams.get('includeChunks') === 'true';

    // Convert document to app format
    const formattedDocument = dbDocumentToAppFormat(document);

    // Get chunks if requested
    const chunks = includeChunks ? await getDocumentChunks(id) : undefined;

    // Return formatted response
    return NextResponse.json({
      document: formattedDocument,
      chunks,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`Error retrieving document:`, error);

    return NextResponse.json(
      {
        error: 'Failed to retrieve document',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH handler for updating a document
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;
    const body = await request.json();

    // Check if document exists
    const existingDocument = await getDocumentById(id);

    if (!existingDocument) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Check if user has permission to update this document
    // In a real app, we would verify the user session

    // Update document
    const updatedDocument = await updateDocument(id, {
      title: body.title,
      metadata:
        typeof body.metadata === 'string' ? body.metadata : JSON.stringify(body.metadata || {}),
      tagsString: body.tags ? body.tags.join(',') : existingDocument.tagsString,
    });

    // Return success response
    return NextResponse.json({
      success: true,
      document: updatedDocument,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`Error updating document:`, error);

    return NextResponse.json(
      {
        error: 'Failed to update document',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE handler for removing a document
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;

    // Check if document exists
    const existingDocument = await getDocumentById(id);

    if (!existingDocument) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Check if user has permission to delete this document
    // In a real app, we would verify the user session

    // Delete document
    await deleteDocument(id);

    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Document deleted successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`Error deleting document:`, error);

    return NextResponse.json(
      {
        error: 'Failed to delete document',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
