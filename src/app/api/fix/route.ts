import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

// This is a special emergency endpoint to fix document issues
export async function GET() {
  const prisma = new PrismaClient();

  try {
    // Delete existing documents
    await prisma.document.deleteMany({});

    // Create test user if needed
    const user = await prisma.user.upsert({
      where: { email: 'test@example.com' },
      update: {},
      create: {
        email: 'test@example.com',
        name: 'Test User',
      },
    });

    // Add test documents directly
    const docs = [
      {
        title: 'Getting Started Guide',
        content: 'This is a guide to help you get started with our platform.',
        contentType: 'text/plain',
        source: 'Internal Documentation',
        userId: user.id,
        processingStatus: 'completed',
        tagsString: 'guide,documentation,getting-started',
        metadata: JSON.stringify({ author: 'Admin', category: 'Guides' }),
      },
      {
        title: 'API Documentation',
        content: 'Comprehensive documentation for our REST API endpoints.',
        contentType: 'text/markdown',
        source: 'Developer Portal',
        userId: user.id,
        processingStatus: 'completed',
        tagsString: 'api,documentation,developer',
        metadata: JSON.stringify({ version: '1.0', category: 'Technical' }),
      },
      {
        title: 'User Manual',
        content: 'Complete user manual for the application.',
        contentType: 'text/plain',
        source: 'Support',
        userId: user.id,
        processingStatus: 'completed',
        tagsString: 'manual,support,user',
        metadata: JSON.stringify({ lastUpdated: '2023-04-01', category: 'Support' }),
      },
    ];

    // Create documents
    const createdDocs = [];
    for (const doc of docs) {
      const document = await prisma.document.create({
        data: doc,
      });
      createdDocs.push(document);
    }

    return NextResponse.json({
      success: true,
      message: 'Documents reset successfully',
      userId: user.id,
      count: createdDocs.length,
      documents: createdDocs.map((d) => ({ id: d.id, title: d.title })),
    });
  } catch (error) {
    console.error('Fix API error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
