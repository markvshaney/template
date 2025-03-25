import { NextResponse } from 'next/server';
import { Document, PrismaClient } from '@prisma/client';

export async function GET() {
  console.log('Basic API: Request received');
  // Create a new instance only when needed
  const prisma = new PrismaClient();

  // Fallback documents in case database access fails
  const fallbackDocuments: Document[] = [
    {
      id: 'fallback-1',
      title: 'Getting Started Guide',
      content: 'This is a guide to help you get started with our platform.',
      contentType: 'text/plain',
      source: 'Internal Documentation',
      processingStatus: 'completed',
      processingError: null,
      tagsString: 'guide,documentation,getting-started',
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: 'cm8nwyxk70000sgdgdws2ej0v',
      metadata: '{"author":"Admin","category":"Guides"}',
      fileName: null,
      fileSize: null,
      mimeType: null,
      isIndexed: false,
      indexedAt: null,
    },
    {
      id: 'fallback-2',
      title: 'API Documentation',
      content: 'Comprehensive documentation for our REST API endpoints.',
      contentType: 'text/markdown',
      source: 'Developer Portal',
      processingStatus: 'completed',
      processingError: null,
      tagsString: 'api,documentation,developer',
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: 'cm8nwyxk70000sgdgdws2ej0v',
      metadata: '{"version":"1.0","category":"Technical"}',
      fileName: null,
      fileSize: null,
      mimeType: null,
      isIndexed: false,
      indexedAt: null,
    },
    {
      id: 'fallback-3',
      title: 'User Manual',
      content: 'Complete user manual for the application.',
      contentType: 'text/plain',
      source: 'Support',
      processingStatus: 'completed',
      processingError: null,
      tagsString: 'manual,support,user',
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: 'cm8nwyxk70000sgdgdws2ej0v',
      metadata: '{"lastUpdated":"2023-04-01","category":"Support"}',
      fileName: null,
      fileSize: null,
      mimeType: null,
      isIndexed: false,
      indexedAt: null,
    },
  ];

  let documents: Document[] = [];
  let fromDatabase = true;

  try {
    console.log('Basic API: Starting document fetch');

    // Directly query the database for all documents
    const dbDocuments = await prisma.document.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    });

    if (dbDocuments && dbDocuments.length > 0) {
      console.log(`Basic API: Found ${dbDocuments.length} documents`);
      documents = dbDocuments;
    } else {
      console.log('Basic API: No documents in database, using fallback data');
      documents = fallbackDocuments;
      fromDatabase = false;
    }

    // Prepare successful response with proper headers
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
          fromDatabase,
          timestamp: new Date().toISOString(),
        },
        null,
        2
      ),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Cache-Control': 'no-store, must-revalidate, max-age=0',
        },
      }
    );
  } catch (error) {
    console.error('Error in basic documents API:', error);

    // Use fallback documents on error
    documents = fallbackDocuments;
    fromDatabase = false;

    // Return fallback documents even in error case
    return new NextResponse(
      JSON.stringify({
        documents,
        pagination: {
          total: documents.length,
          limit: 10,
          offset: 0,
          hasMore: false,
        },
        fromDatabase,
        error: 'Failed to retrieve documents from database',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200, // Return 200 even on error for better client handling
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Cache-Control': 'no-store, must-revalidate, max-age=0',
        },
      }
    );
  } finally {
    // Always disconnect Prisma client
    await prisma.$disconnect().catch(console.error);
  }
}
