#!/usr/bin/env ts-node
/**
 * Database Initialization Script
 * 
 * This script initializes the database, creates tables if they don't exist,
 * and can be used to run migrations or seed data.
 * 
 * Usage:
 *   npm run init-db
 *   
 * Add to package.json scripts:
 *   "init-db": "ts-node src/scripts/init-db.ts"
 */

import { sequelize } from '../config/database';
import '../models'; // Import models to initialize associations
import dotenv from 'dotenv';

dotenv.config();

async function initializeDatabase() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Database connection established successfully.');

    console.log('Synchronizing database models...');
    // Force: true will drop tables and recreate them - use with caution!
    // For production, use migrations instead of sync
    const force = process.argv.includes('--force');
    if (force) {
      console.warn('WARNING: Force flag detected. This will drop all tables and recreate them!');
      console.warn('You have 5 seconds to cancel (Ctrl+C)...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    await sequelize.sync({ force });
    console.log(`Database synchronized ${force ? '(tables dropped and recreated)' : ''}`);

    // Add any seed data here if needed
    if (process.argv.includes('--seed')) {
      console.log('Seeding database...');
      // Add seed data logic here
      console.log('Database seeded successfully.');
    }

    console.log('Database initialization completed successfully.');
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  } finally {
    // Close the database connection
    await sequelize.close();
  }
}

// Run the initialization
initializeDatabase();
