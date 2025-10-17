import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';

/**
 * Database initialization and utility functions
 */

export interface DatabaseHealthCheck {
  status: 'healthy' | 'unhealthy';
  timestamp: Date;
  details: {
    firestoreConnection: boolean;
    collectionsAccessible: boolean;
    indexesOptimal: boolean;
  };
  errors?: string[];
}

export interface SchemaValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates the database schema by checking required collections and their structure
 */
export async function validateDatabaseSchema(): Promise<SchemaValidationResult> {
  const db = getFirestore();
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Check if required collections exist and are accessible
    const requiredCollections = ['users', 'services', 'bookings'];
    
    for (const collectionName of requiredCollections) {
      try {
        const collection = db.collection(collectionName);
        // Try to read from the collection (limit 1 to minimize cost)
        await collection.limit(1).get();
        logger.info(`Collection '${collectionName}' is accessible`);
      } catch (error) {
        errors.push(`Collection '${collectionName}' is not accessible: ${error}`);
      }
    }

    // Validate user collection structure if it has documents
    try {
      const usersSnapshot = await db.collection('users').limit(1).get();
      if (!usersSnapshot.empty) {
        const userDoc = usersSnapshot.docs[0];
        const userData = userDoc.data();
        
        const requiredUserFields = ['fullName', 'nif', 'email', 'passwordHash', 'userType', 'balance', 'createdAt', 'isActive'];
        for (const field of requiredUserFields) {
          if (!(field in userData)) {
            warnings.push(`User document missing field: ${field}`);
          }
        }

        // Validate user types
        if (userData.userType && !['client', 'provider'].includes(userData.userType)) {
          errors.push(`Invalid userType found: ${userData.userType}`);
        }
      }
    } catch (error) {
      warnings.push(`Could not validate user collection structure: ${error}`);
    }

    // Validate services collection structure if it has documents
    try {
      const servicesSnapshot = await db.collection('services').limit(1).get();
      if (!servicesSnapshot.empty) {
        const serviceDoc = servicesSnapshot.docs[0];
        const serviceData = serviceDoc.data();
        
        const requiredServiceFields = ['name', 'description', 'price', 'providerId', 'providerName', 'isActive', 'createdAt'];
        for (const field of requiredServiceFields) {
          if (!(field in serviceData)) {
            warnings.push(`Service document missing field: ${field}`);
          }
        }

        // Validate price is a number
        if (serviceData.price && typeof serviceData.price !== 'number') {
          errors.push(`Service price must be a number, found: ${typeof serviceData.price}`);
        }
      }
    } catch (error) {
      warnings.push(`Could not validate services collection structure: ${error}`);
    }

    // Validate bookings collection structure if it has documents
    try {
      const bookingsSnapshot = await db.collection('bookings').limit(1).get();
      if (!bookingsSnapshot.empty) {
        const bookingDoc = bookingsSnapshot.docs[0];
        const bookingData = bookingDoc.data();
        
        const requiredBookingFields = ['clientId', 'clientName', 'serviceId', 'serviceName', 'providerId', 'providerName', 'amount', 'status', 'createdAt'];
        for (const field of requiredBookingFields) {
          if (!(field in bookingData)) {
            warnings.push(`Booking document missing field: ${field}`);
          }
        }

        // Validate booking status
        if (bookingData.status && !['confirmed', 'cancelled'].includes(bookingData.status)) {
          errors.push(`Invalid booking status found: ${bookingData.status}`);
        }

        // Validate amount is a number
        if (bookingData.amount && typeof bookingData.amount !== 'number') {
          errors.push(`Booking amount must be a number, found: ${typeof bookingData.amount}`);
        }
      }
    } catch (error) {
      warnings.push(`Could not validate bookings collection structure: ${error}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };

  } catch (error) {
    errors.push(`Database schema validation failed: ${error}`);
    return {
      isValid: false,
      errors,
      warnings
    };
  }
}

/**
 * Performs a comprehensive health check of the database
 */
export async function performDatabaseHealthCheck(): Promise<DatabaseHealthCheck> {
  const db = getFirestore();
  const details = {
    firestoreConnection: false,
    collectionsAccessible: false,
    indexesOptimal: true // Assume optimal unless we detect issues
  };
  const errors: string[] = [];

  try {
    // Test Firestore connection
    await db.collection('_health_check').doc('test').set({
      timestamp: FieldValue.serverTimestamp(),
      test: true
    });
    
    // Clean up test document
    await db.collection('_health_check').doc('test').delete();
    details.firestoreConnection = true;
    
  } catch (error) {
    errors.push(`Firestore connection failed: ${error}`);
  }

  try {
    // Test collection accessibility
    const collections = ['users', 'services', 'bookings'];
    let accessibleCount = 0;
    
    for (const collectionName of collections) {
      try {
        await db.collection(collectionName).limit(1).get();
        accessibleCount++;
      } catch (error) {
        errors.push(`Collection '${collectionName}' not accessible: ${error}`);
      }
    }
    
    details.collectionsAccessible = accessibleCount === collections.length;
    
  } catch (error) {
    errors.push(`Collection accessibility check failed: ${error}`);
  }

  // Test query performance (basic index optimization check)
  try {
    const startTime = Date.now();
    
    // Test a query that should use indexes
    await db.collection('users')
      .where('isActive', '==', true)
      .limit(1)
      .get();
    
    const queryTime = Date.now() - startTime;
    
    // If query takes more than 1 second, indexes might not be optimal
    if (queryTime > 1000) {
      details.indexesOptimal = false;
      errors.push(`Query performance degraded (${queryTime}ms), check indexes`);
    }
    
  } catch (error) {
    errors.push(`Index optimization check failed: ${error}`);
    details.indexesOptimal = false;
  }

  const status = errors.length === 0 ? 'healthy' : 'unhealthy';

  return {
    status,
    timestamp: new Date(),
    details,
    ...(errors.length > 0 && { errors })
  };
}

/**
 * Initializes the database with default settings and validates the setup
 */
export async function initializeDatabase(): Promise<{
  success: boolean;
  message: string;
  healthCheck?: DatabaseHealthCheck;
  schemaValidation?: SchemaValidationResult;
}> {
  try {
    logger.info('Starting database initialization...');

    // Perform health check
    const healthCheck = await performDatabaseHealthCheck();
    
    if (healthCheck.status === 'unhealthy') {
      return {
        success: false,
        message: 'Database health check failed',
        healthCheck
      };
    }

    // Validate schema
    const schemaValidation = await validateDatabaseSchema();
    
    if (!schemaValidation.isValid) {
      return {
        success: false,
        message: 'Database schema validation failed',
        healthCheck,
        schemaValidation
      };
    }

    logger.info('Database initialization completed successfully');
    
    return {
      success: true,
      message: 'Database initialized successfully',
      healthCheck,
      schemaValidation
    };

  } catch (error) {
    logger.error('Database initialization failed:', error);
    return {
      success: false,
      message: `Database initialization failed: ${error}`
    };
  }
}

/**
 * Creates initial data structure for a new user
 */
export async function initializeUserData(userId: string, userData: {
  fullName: string;
  nif: string;
  email: string;
  passwordHash: string;
  userType: 'client' | 'provider';
}): Promise<void> {
  const db = getFirestore();
  
  const userDoc = {
    ...userData,
    balance: 0,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    isActive: true
  };

  await db.collection('users').doc(userId).set(userDoc);
  logger.info(`Initialized user data for user: ${userId}`);
}

/**
 * Migration helper function for future schema changes
 */
export async function runMigration(migrationName: string, migrationFn: () => Promise<void>): Promise<{
  success: boolean;
  message: string;
}> {
  const db = getFirestore();
  const migrationDoc = db.collection('_migrations').doc(migrationName);
  
  try {
    // Check if migration already ran
    const migrationSnapshot = await migrationDoc.get();
    if (migrationSnapshot.exists) {
      return {
        success: true,
        message: `Migration '${migrationName}' already completed`
      };
    }

    // Run migration
    logger.info(`Running migration: ${migrationName}`);
    await migrationFn();
    
    // Mark migration as completed
    await migrationDoc.set({
      completedAt: FieldValue.serverTimestamp(),
      status: 'completed'
    });

    logger.info(`Migration '${migrationName}' completed successfully`);
    return {
      success: true,
      message: `Migration '${migrationName}' completed successfully`
    };

  } catch (error) {
    logger.error(`Migration '${migrationName}' failed:`, error);
    
    // Mark migration as failed
    await migrationDoc.set({
      failedAt: FieldValue.serverTimestamp(),
      status: 'failed',
      error: String(error)
    });

    return {
      success: false,
      message: `Migration '${migrationName}' failed: ${error}`
    };
  }
}