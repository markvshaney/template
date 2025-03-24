/**
 * Database setup script
 *
 * This script will create the database if it doesn't exist
 * and set up the necessary schema for RAGKit
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Setting up RAGKit database...');

// Create prisma directory if it doesn't exist
const prismaDir = path.join(__dirname, 'prisma');
if (!fs.existsSync(prismaDir)) {
  fs.mkdirSync(prismaDir);
}

try {
  // Generate Prisma client
  console.log('Executing: npx prisma generate');
  const generateOutput = execSync('npx prisma generate');
  console.log('stdout:', generateOutput.toString());

  // Push the schema to the database (with SQLite we don't need migrations)
  console.log('Executing: npx prisma db push');
  const dbPushOutput = execSync('npx prisma db push --force-reset');
  console.log('stdout:', dbPushOutput.toString());

  console.log('Database setup completed successfully!');
} catch (error) {
  console.error('Database setup failed:', error);
  console.log('\nTroubleshooting:');
  console.log(
    '1. Check that you have the correct database configuration in your prisma/schema.prisma file'
  );
  console.log('2. Make sure you have write permissions in the prisma directory');
  console.log(
    '3. Try running the commands manually: "npx prisma generate" and "npx prisma db push"'
  );
}
