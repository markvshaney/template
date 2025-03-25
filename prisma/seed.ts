import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create test user if not exists
  const user = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      name: 'Test User',
    },
  });

  console.log('Created user:', user.id);

  // Add test documents
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

  for (const doc of docs) {
    const document = await prisma.document.create({
      data: doc,
    });
    console.log(`Created document: ${document.id} - ${document.title}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
