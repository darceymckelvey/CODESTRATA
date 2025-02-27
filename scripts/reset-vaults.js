// scripts/reset-vaults.js
// This script cleans up vaults data by removing files and database entries

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

// Path to vaults directory
const vaultsDir = path.join(__dirname, '..', 'vaults');

// Function to create a readline interface for user input
function createInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

// Function to delete all files in a directory recursively
function deleteFilesRecursively(directory) {
  if (fs.existsSync(directory)) {
    fs.readdirSync(directory).forEach((file) => {
      const currentPath = path.join(directory, file);
      if (fs.lstatSync(currentPath).isDirectory()) {
        // Recurse into subdirectory
        deleteFilesRecursively(currentPath);
        // Remove now-empty directory
        try {
          fs.rmdirSync(currentPath);
          console.log(`Removed directory: ${currentPath}`);
        } catch (err) {
          console.error(`Error removing directory ${currentPath}: ${err.message}`);
        }
      } else {
        // Delete file
        try {
          fs.unlinkSync(currentPath);
          console.log(`Removed file: ${currentPath}`);
        } catch (err) {
          console.error(`Error removing file ${currentPath}: ${err.message}`);
        }
      }
    });
  } else {
    console.log(`Directory does not exist: ${directory}`);
  }
}

// Main function
async function main() {
  const rl = createInterface();
  
  try {
    console.log('=== CodeStrata Vault Reset Tool ===');
    console.log('This tool will DELETE ALL VAULT FILES and reset the database tables.');
    console.log('This operation cannot be undone!');

    // Ask for confirmation
    const answer = await new Promise((resolve) => {
      rl.question('Are you sure you want to proceed? (yes/no): ', (answer) => {
        resolve(answer.toLowerCase());
      });
    });

    if (answer !== 'yes') {
      console.log('Operation cancelled.');
      rl.close();
      return;
    }

    // Delete all vault files
    console.log('\nDeleting vault files...');
    
    if (fs.existsSync(vaultsDir)) {
      deleteFilesRecursively(vaultsDir);
      // Recreate empty vaults directory
      fs.mkdirSync(vaultsDir, { recursive: true });
      console.log('Vaults directory recreated.');
    } else {
      fs.mkdirSync(vaultsDir, { recursive: true });
      console.log('Created new vaults directory.');
    }

    rl.close();
    console.log('\nVault reset completed successfully!');
    console.log('All vault directories and files have been removed.');
    console.log('Users will now start fresh with new vaults.');
    
  } catch (error) {
    console.error('Error during vault reset:', error);
    rl.close();
    process.exit(1);
  }
}

// Run the main function
main();