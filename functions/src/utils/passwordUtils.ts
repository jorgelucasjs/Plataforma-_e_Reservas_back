import * as crypto from 'crypto';

/**
 * Password hashing and validation utilities
 * Using crypto.pbkdf2 as a fallback until bcrypt can be installed
 */

const SALT_LENGTH = 32;
const HASH_ITERATIONS = 100000;
const HASH_LENGTH = 64;
const HASH_ALGORITHM = 'sha512';

/**
 * Hash a password using PBKDF2
 * @param password - Plain text password to hash
 * @returns Promise<string> - Hashed password with salt
 */
export async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // Generate a random salt
    const salt = crypto.randomBytes(SALT_LENGTH).toString('hex');
    
    // Hash the password with the salt
    crypto.pbkdf2(password, salt, HASH_ITERATIONS, HASH_LENGTH, HASH_ALGORITHM, (err, derivedKey) => {
      if (err) {
        reject(err);
        return;
      }
      
      // Combine salt and hash
      const hash = derivedKey.toString('hex');
      const combined = `${salt}:${hash}`;
      resolve(combined);
    });
  });
}

/**
 * Verify a password against a hash
 * @param password - Plain text password to verify
 * @param hashedPassword - Stored hash with salt
 * @returns Promise<boolean> - True if password matches
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    try {
      // Split the stored hash to get salt and hash
      const [salt, hash] = hashedPassword.split(':');
      
      if (!salt || !hash) {
        resolve(false);
        return;
      }
      
      // Hash the provided password with the stored salt
      crypto.pbkdf2(password, salt, HASH_ITERATIONS, HASH_LENGTH, HASH_ALGORITHM, (err, derivedKey) => {
        if (err) {
          reject(err);
          return;
        }
        
        const providedHash = derivedKey.toString('hex');
        
        // Compare hashes using timing-safe comparison
        const isValid = crypto.timingSafeEqual(
          Buffer.from(hash, 'hex'),
          Buffer.from(providedHash, 'hex')
        );
        
        resolve(isValid);
      });
    } catch (error) {
      resolve(false);
    }
  });
}

/**
 * Validate password strength
 * @param password - Password to validate
 * @returns object with validation result and messages
 */
export function validatePassword(password: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!password) {
    errors.push('Password is required');
    return { isValid: false, errors };
  }
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (password.length > 128) {
    errors.push('Password must be less than 128 characters long');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  // Check for common weak passwords
  const commonPasswords = [
    'password', '123456', '123456789', 'qwerty', 'abc123', 
    'password123', 'admin', 'letmein', 'welcome', '12345678'
  ];
  
  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('Password is too common, please choose a stronger password');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Generate a secure random password
 * @param length - Length of the password (default: 16)
 * @returns string - Generated password
 */
export function generateSecurePassword(length: number = 16): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
  let password = '';
  
  for (let i = 0; i < length; i++) {
    const randomIndex = crypto.randomInt(0, charset.length);
    password += charset[randomIndex];
  }
  
  return password;
}