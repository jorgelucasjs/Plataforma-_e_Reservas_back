#!/usr/bin/env node

/**
 * Database initialization script
 * Can be run independently to initialize and validate the database setup
 */

import * as admin from 'firebase-admin';
import { initializeDatabase, performDatabaseHealthCheck, validateDatabaseSchema } from '../utils/database';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp();
}

async function main() {
  console.log('🚀 Starting database initialization...\n');

  try {
    // Step 1: Health Check
    console.log('📊 Performing database health check...');
    const healthCheck = await performDatabaseHealthCheck();
    
    console.log(`Health Status: ${healthCheck.status}`);
    console.log(`Firestore Connection: ${healthCheck.details.firestoreConnection ? '✅' : '❌'}`);
    console.log(`Collections Accessible: ${healthCheck.details.collectionsAccessible ? '✅' : '❌'}`);
    console.log(`Indexes Optimal: ${healthCheck.details.indexesOptimal ? '✅' : '❌'}`);
    
    if (healthCheck.errors && healthCheck.errors.length > 0) {
      console.log('\n⚠️  Health Check Errors:');
      healthCheck.errors.forEach(error => console.log(`  - ${error}`));
    }
    
    console.log('');

    // Step 2: Schema Validation
    console.log('🔍 Validating database schema...');
    const schemaValidation = await validateDatabaseSchema();
    
    console.log(`Schema Valid: ${schemaValidation.isValid ? '✅' : '❌'}`);
    
    if (schemaValidation.errors.length > 0) {
      console.log('\n❌ Schema Errors:');
      schemaValidation.errors.forEach(error => console.log(`  - ${error}`));
    }
    
    if (schemaValidation.warnings.length > 0) {
      console.log('\n⚠️  Schema Warnings:');
      schemaValidation.warnings.forEach(warning => console.log(`  - ${warning}`));
    }
    
    console.log('');

    // Step 3: Full Initialization
    console.log('🔧 Running full database initialization...');
    const initResult = await initializeDatabase();
    
    if (initResult.success) {
      console.log('✅ Database initialization completed successfully!');
    } else {
      console.log('❌ Database initialization failed:');
      console.log(`   ${initResult.message}`);
      process.exit(1);
    }

    console.log('\n🎉 Database setup complete!');
    console.log('\nNext steps:');
    console.log('1. Deploy your Firestore indexes: firebase deploy --only firestore:indexes');
    console.log('2. Start your application');
    console.log('3. Test the API endpoints');

  } catch (error) {
    console.error('💥 Database initialization failed:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main().then(() => {
    console.log('\n✨ Script completed successfully');
    process.exit(0);
  }).catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });
}

export { main as initializeDatabaseScript };