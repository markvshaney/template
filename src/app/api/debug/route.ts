import { NextResponse } from 'next/server';
import { getUserDocuments } from '@/lib/db/documents';

export async function GET() {
  try {
    // Use the known user ID from our database check
    const userId = 'cm8nwyxk70000sgdgdws2ej0v';

    // Get documents from database
    const documents = await getUserDocuments(userId, {
      limit: 10,
      offset: 0,
    });

    // Return formatted JSON response with indentation for better readability
    return new NextResponse(
      JSON.stringify(
        {
          documents,
          pagination: {
            total: documents.length,
            limit: 10,
            offset: 0,
            hasMore: false,
          },
        },
        null,
        2
      ),
      {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (error) {
    console.error('Debug API error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
