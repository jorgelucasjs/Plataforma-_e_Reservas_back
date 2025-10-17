import { 
  ValidationResult, 
  validateUserRegistration, 
  validateUserLogin,
  sanitizeUserRegistrationData,
  sanitizeUserLoginData
} from '../validation/userValidation';
import { 
  validateUserUniqueness, 
  UniquenessValidationResult 
} from '../validation/uniquenessValidation';
import { UserRegistrationRequest, UserLoginRequest } from '../models/user';

/**
 * Comprehensive validation result for user operations
 */
export interface ComprehensiveValidationResult {
  isValid: boolean;
  formatValidation: ValidationResult;
  uniquenessValidation?: UniquenessValidationResult[];
  sanitizedData?: UserRegistrationRequest | UserLoginRequest | Partial<UserRegistrationRequest>;
}

/**
 * Perform comprehensive validation for user registration
 * Includes format validation, uniqueness validation, and data sanitization
 */
export async function validateUserRegistrationComprehensive(
  data: UserRegistrationRequest
): Promise<ComprehensiveValidationResult> {
  try {
    // Step 1: Sanitize input data
    const sanitizedData = sanitizeUserRegistrationData(data);
    
    // Step 2: Validate format and required fields
    const formatValidation = validateUserRegistration(sanitizedData);
    
    // If format validation fails, return early without checking uniqueness
    if (!formatValidation.isValid) {
      return {
        isValid: false,
        formatValidation,
        sanitizedData
      };
    }
    
    // Step 3: Validate uniqueness (email and NIF)
    const uniquenessValidation = await validateUserUniqueness(
      sanitizedData.email,
      sanitizedData.nif
    );
    
    // Check if all uniqueness validations passed
    const isUnique = uniquenessValidation.every(result => result.isUnique);
    
    return {
      isValid: formatValidation.isValid && isUnique,
      formatValidation,
      uniquenessValidation,
      sanitizedData
    };
    
  } catch (error) {
    console.error('Error in comprehensive user registration validation:', error);
    throw new Error('Failed to validate user registration data');
  }
}

/**
 * Perform comprehensive validation for user login
 * Includes format validation and data sanitization
 */
export async function validateUserLoginComprehensive(
  data: UserLoginRequest
): Promise<ComprehensiveValidationResult> {
  try {
    // Step 1: Sanitize input data
    const sanitizedData = sanitizeUserLoginData(data);
    
    // Step 2: Validate format and required fields
    const formatValidation = validateUserLogin(sanitizedData);
    
    return {
      isValid: formatValidation.isValid,
      formatValidation,
      sanitizedData
    };
    
  } catch (error) {
    console.error('Error in comprehensive user login validation:', error);
    throw new Error('Failed to validate user login data');
  }
}

/**
 * Validate user data for updates (partial validation)
 * @param data - Partial user data for updates
 * @param userId - ID of the user being updated (for uniqueness checks)
 */
export async function validateUserUpdateComprehensive(
  data: Partial<UserRegistrationRequest>,
  userId: string
): Promise<ComprehensiveValidationResult> {
  try {
    const errors: any[] = [];
    let uniquenessValidation: UniquenessValidationResult[] = [];
    
    // Validate individual fields if provided
    if (data.email) {
      const emailValidation = await validateUserUniqueness(data.email, '', userId);
      uniquenessValidation.push(...emailValidation.filter(v => v.field === 'email'));
    }
    
    if (data.nif) {
      const nifValidation = await validateUserUniqueness('', data.nif, userId);
      uniquenessValidation.push(...nifValidation.filter(v => v.field === 'nif'));
    }
    
    // Check if all uniqueness validations passed
    const isUnique = uniquenessValidation.length === 0 || 
                     uniquenessValidation.every(result => result.isUnique);
    
    const formatValidation: ValidationResult = {
      isValid: errors.length === 0,
      errors
    };
    
    return {
      isValid: formatValidation.isValid && isUnique,
      formatValidation,
      uniquenessValidation: uniquenessValidation.length > 0 ? uniquenessValidation : undefined,
      sanitizedData: data
    };
    
  } catch (error) {
    console.error('Error in comprehensive user update validation:', error);
    throw new Error('Failed to validate user update data');
  }
}

/**
 * Create validation error response for API endpoints
 */
export function createValidationErrorResponse(
  validationResult: ComprehensiveValidationResult
): {
  success: false;
  error: string;
  message: string;
  details: any;
} {
  const details: any = {};
  
  // Add format validation errors
  if (validationResult.formatValidation.errors.length > 0) {
    details.formatErrors = validationResult.formatValidation.errors;
  }
  
  // Add uniqueness validation errors
  if (validationResult.uniquenessValidation) {
    const uniquenessErrors = validationResult.uniquenessValidation
      .filter(result => !result.isUnique)
      .map(result => ({
        field: result.field,
        message: result.message,
        code: 'DUPLICATE_VALUE'
      }));
    
    if (uniquenessErrors.length > 0) {
      details.uniquenessErrors = uniquenessErrors;
    }
  }
  
  return {
    success: false,
    error: 'Validation failed',
    message: 'The provided data contains validation errors',
    details
  };
}

/**
 * Extract all validation errors into a flat array
 */
export function extractAllValidationErrors(
  validationResult: ComprehensiveValidationResult
): Array<{ field: string; message: string; code: string }> {
  const allErrors: Array<{ field: string; message: string; code: string }> = [];
  
  // Add format validation errors
  allErrors.push(...validationResult.formatValidation.errors);
  
  // Add uniqueness validation errors
  if (validationResult.uniquenessValidation) {
    const uniquenessErrors = validationResult.uniquenessValidation
      .filter(result => !result.isUnique)
      .map(result => ({
        field: result.field,
        message: result.message || `${result.field} is not unique`,
        code: 'DUPLICATE_VALUE'
      }));
    
    allErrors.push(...uniquenessErrors);
  }
  
  return allErrors;
}