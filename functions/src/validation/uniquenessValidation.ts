import * as admin from 'firebase-admin';

/**
 * Uniqueness validation result interface
 */
export interface UniquenessValidationResult {
  isUnique: boolean;
  field: string;
  message?: string;
  existingUserId?: string;
}

/**
 * Get Firestore instance
 */
const db = admin.firestore();

/**
 * Validate email uniqueness in the users collection
 * @param email - Email to validate
 * @param excludeUserId - Optional user ID to exclude from the check (for updates)
 * @returns Promise<UniquenessValidationResult>
 */
export async function validateEmailUniqueness(
  email: string, 
  excludeUserId?: string
): Promise<UniquenessValidationResult> {
  try {
    // Normalize email to lowercase for consistent checking
    const normalizedEmail = email.trim().toLowerCase();
    
    // Query users collection for existing email
    const emailQuery = db.collection('users')
      .where('email', '==', normalizedEmail)
      .where('isActive', '==', true)
      .limit(1);
    
    const emailSnapshot = await emailQuery.get();
    
    // If no documents found, email is unique
    if (emailSnapshot.empty) {
      return {
        isUnique: true,
        field: 'email'
      };
    }
    
    // Check if the found user is the one being excluded (for updates)
    const existingUser = emailSnapshot.docs[0];
    const existingUserId = existingUser.id;
    
    if (excludeUserId && existingUserId === excludeUserId) {
      return {
        isUnique: true,
        field: 'email'
      };
    }
    
    // Email is not unique
    return {
      isUnique: false,
      field: 'email',
      message: 'Email address is already registered',
      existingUserId
    };
    
  } catch (error) {
    console.error('Error validating email uniqueness:', error);
    throw new Error('Failed to validate email uniqueness');
  }
}

/**
 * Validate NIF uniqueness in the users collection
 * @param nif - NIF to validate
 * @param excludeUserId - Optional user ID to exclude from the check (for updates)
 * @returns Promise<UniquenessValidationResult>
 */
export async function validateNIFUniqueness(
  nif: string, 
  excludeUserId?: string
): Promise<UniquenessValidationResult> {
  try {
    // Normalize NIF by trimming whitespace
    const normalizedNIF = nif.trim();
    
    // Query users collection for existing NIF
    const nifQuery = db.collection('users')
      .where('nif', '==', normalizedNIF)
      .where('isActive', '==', true)
      .limit(1);
    
    const nifSnapshot = await nifQuery.get();
    
    // If no documents found, NIF is unique
    if (nifSnapshot.empty) {
      return {
        isUnique: true,
        field: 'nif'
      };
    }
    
    // Check if the found user is the one being excluded (for updates)
    const existingUser = nifSnapshot.docs[0];
    const existingUserId = existingUser.id;
    
    if (excludeUserId && existingUserId === excludeUserId) {
      return {
        isUnique: true,
        field: 'nif'
      };
    }
    
    // NIF is not unique
    return {
      isUnique: false,
      field: 'nif',
      message: 'NIF is already registered',
      existingUserId
    };
    
  } catch (error) {
    console.error('Error validating NIF uniqueness:', error);
    throw new Error('Failed to validate NIF uniqueness');
  }
}

/**
 * Validate both email and NIF uniqueness simultaneously
 * @param email - Email to validate
 * @param nif - NIF to validate
 * @param excludeUserId - Optional user ID to exclude from the check (for updates)
 * @returns Promise<UniquenessValidationResult[]>
 */
export async function validateUserUniqueness(
  email: string, 
  nif: string, 
  excludeUserId?: string
): Promise<UniquenessValidationResult[]> {
  try {
    // Run both validations in parallel for better performance
    const [emailResult, nifResult] = await Promise.all([
      validateEmailUniqueness(email, excludeUserId),
      validateNIFUniqueness(nif, excludeUserId)
    ]);
    
    return [emailResult, nifResult];
    
  } catch (error) {
    console.error('Error validating user uniqueness:', error);
    throw new Error('Failed to validate user uniqueness');
  }
}

/**
 * Check if user exists by email (for login purposes)
 * @param email - Email to check
 * @returns Promise<{ exists: boolean; userId?: string; userData?: any }>
 */
export async function checkUserExistsByEmail(email: string): Promise<{
  exists: boolean;
  userId?: string;
  userData?: any;
}> {
  try {
    const normalizedEmail = email.trim().toLowerCase();
    
    const userQuery = db.collection('users')
      .where('email', '==', normalizedEmail)
      .where('isActive', '==', true)
      .limit(1);
    
    const userSnapshot = await userQuery.get();
    
    if (userSnapshot.empty) {
      return { exists: false };
    }
    
    const userDoc = userSnapshot.docs[0];
    return {
      exists: true,
      userId: userDoc.id,
      userData: userDoc.data()
    };
    
  } catch (error) {
    console.error('Error checking user existence by email:', error);
    throw new Error('Failed to check user existence');
  }
}

/**
 * Check if user exists by ID
 * @param userId - User ID to check
 * @returns Promise<{ exists: boolean; userData?: any }>
 */
export async function checkUserExistsById(userId: string): Promise<{
  exists: boolean;
  userData?: any;
}> {
  try {
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return { exists: false };
    }
    
    const userData = userDoc.data();
    
    // Check if user is active
    if (!userData?.isActive) {
      return { exists: false };
    }
    
    return {
      exists: true,
      userData
    };
    
  } catch (error) {
    console.error('Error checking user existence by ID:', error);
    throw new Error('Failed to check user existence');
  }
}

/**
 * Batch validation for multiple users (useful for bulk operations)
 * @param users - Array of user data to validate
 * @returns Promise<Map<string, UniquenessValidationResult[]>>
 */
export async function batchValidateUserUniqueness(
  users: Array<{ email: string; nif: string; id?: string }>
): Promise<Map<string, UniquenessValidationResult[]>> {
  const results = new Map<string, UniquenessValidationResult[]>();
  
  try {
    // Process validations in parallel
    const validationPromises = users.map(async (user, index) => {
      const key = user.id || `user_${index}`;
      const validationResults = await validateUserUniqueness(
        user.email, 
        user.nif, 
        user.id
      );
      return { key, validationResults };
    });
    
    const allResults = await Promise.all(validationPromises);
    
    // Build results map
    allResults.forEach(({ key, validationResults }) => {
      results.set(key, validationResults);
    });
    
    return results;
    
  } catch (error) {
    console.error('Error in batch validation:', error);
    throw new Error('Failed to perform batch validation');
  }
}