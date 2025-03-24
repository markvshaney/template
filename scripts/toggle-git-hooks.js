#!/usr/bin/env node

/**
 * Script to toggle git hooks on or off
 *
 * Usage:
 *   - npm run hooks:disable - Disables all git hooks
 *   - npm run hooks:enable  - Enables all git hooks
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Get command-line arguments
const args = process.argv.slice(2);
const action = args[0] || 'status';

// Path to store backup hooks
const hooksBackupDir = path.join(__dirname, '..', '.git', 'hooks-backup');
const hooksDir = path.join(__dirname, '..', '.git', 'hooks');
const huskyDir = path.join(__dirname, '..', '.husky');

// Ensure backup directory exists
if (!fs.existsSync(hooksBackupDir)) {
  fs.mkdirSync(hooksBackupDir, { recursive: true });
}

// Function to check if hooks are enabled
function areHooksEnabled() {
  try {
    const result = execSync('git config --local core.hooksPath').toString().trim();
    return !result || result === '.git/hooks';
  } catch (error) {
    return true; // Default is enabled
  }
}

// Display status
function showStatus() {
  const enabled = areHooksEnabled();
  console.log(`Git hooks are currently ${enabled ? 'ENABLED ✅' : 'DISABLED ❌'}`);

  if (enabled) {
    console.log('\nTo disable git hooks, run: npm run hooks:disable');
  } else {
    console.log('\nTo enable git hooks, run: npm run hooks:enable');
  }
}

// Disable hooks
function disableHooks() {
  try {
    // Backup any existing hooks
    if (fs.existsSync(hooksDir)) {
      const files = fs.readdirSync(hooksDir);
      files.forEach((file) => {
        if (!file.endsWith('.sample')) {
          const source = path.join(hooksDir, file);
          const dest = path.join(hooksBackupDir, file);
          fs.copyFileSync(source, dest);
        }
      });
    }

    // Point hooks to a non-existent directory to disable them
    execSync('git config --local core.hooksPath .git/hooks-disabled');
    console.log('✅ Git hooks have been disabled.');
    console.log('You can now commit and push without running hooks.');
    console.log('To re-enable hooks, run: npm run hooks:enable');
  } catch (error) {
    console.error('❌ Failed to disable git hooks:', error.message);
    process.exit(1);
  }
}

// Enable hooks
function enableHooks() {
  try {
    // Restore hooks directory
    execSync('git config --local core.hooksPath .git/hooks');

    // Restore any backed up hooks
    if (fs.existsSync(hooksBackupDir)) {
      const files = fs.readdirSync(hooksBackupDir);
      files.forEach((file) => {
        const source = path.join(hooksBackupDir, file);
        const dest = path.join(hooksDir, file);
        fs.copyFileSync(source, dest);
        fs.chmodSync(dest, 0o755); // Make executable
      });
    }

    console.log('✅ Git hooks have been enabled.');
  } catch (error) {
    console.error('❌ Failed to enable git hooks:', error.message);
    process.exit(1);
  }
}

// Run the requested action
switch (action.toLowerCase()) {
  case 'disable':
    disableHooks();
    break;
  case 'enable':
    enableHooks();
    break;
  case 'status':
  default:
    showStatus();
    break;
}
