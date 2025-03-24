/**
 * Database setup script
 *
 * This script will create the database if it doesn't exist
 * and set up the necessary schema for RAGKit
 */
import { exec } from 'child_process';
import fs from 'fs';

// Check if .env file exists
if (!fs.existsSync('.env')) {
  console.log('Creating .env file with default database configuration...');
  fs.writeFileSync(
    '.env',
    'DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ragkit?schema=public"\n'
  );
}

// Function to execute shell commands
function executeCommand(command) {
  return new Promise((resolve, reject) => {
    console.log(`Executing: ${command}`);
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error: ${error.message}`);
        return reject(error);
      }
      if (stderr) {
        console.log(`stderr: ${stderr}`);
      }
      console.log(`stdout: ${stdout}`);
      resolve(stdout);
    });
  });
}

// Main function
async function setup() {
  try {
    console.log('Setting up RAGKit database...');

    // Generate Prisma client
    await executeCommand('npx prisma generate');

    // Run database migrations
    await executeCommand('npx prisma migrate dev --name init');

    console.log('Database setup complete!');
    console.log("You can now start the application with 'npm run dev'");
  } catch (error) {
    console.error('Database setup failed:', error);
    console.log('\nTroubleshooting:');
    console.log('1. Make sure PostgreSQL is installed and running');
    console.log('2. Check that the database credentials in .env are correct');
    console.log('3. Ensure you have the necessary permissions to create databases');
  }
}

// Run the setup
setup();
