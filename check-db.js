// Simple script to check database contents
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    // Get all users
    const users = await prisma.user.findMany();
    console.log('Users:', users);

    // Get all documents
    const docs = await prisma.document.findMany();
    console.log(
      'Documents:',
      docs.map((d) => ({
        id: d.id,
        title: d.title,
        userId: d.userId,
      }))
    );

    // Count documents
    const count = await prisma.document.count();
    console.log('Total documents:', count);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
