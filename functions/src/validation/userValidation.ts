import { UserRegistrationRequest, UserLoginRequest } from '../models/user';
import { UserType } from '../types/auth';

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

/**
 * Individual validation error
 */
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

/**
 * Email validation regex pattern
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * NIF validation regex pattern (Portuguese tax identification number)
 * Accepts 9 digits
 */
const NIF_REGEX = /^\d{9}$/;

/**
 * Password validation requirements
 */
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;

/**
 * Validate user registration data
 */
export function validateUserRegistration(data: UserRegistrationRequest): ValidationResult {
  const errors: ValidationError[] = [];

  // Validate full name
  if (!data.fullName || typeof data.fullName !== 'string') {
    errors.push({
      field: 'fullName',
      message: 'Full name is required',
      code: 'REQUIRED_FIELD'
    });
  } else if (data.fullName.trim().length < 2) {
    errors.push({
      field: 'fullName',
      message: 'Full name must be at least 2 characters long',
      code: 'MIN_LENGTH'
    });
  } else if (data.fullName.trim().length > 100) {
    errors.push({
      field: 'fullName',
      message: 'Full name must not exceed 100 characters',
      code: 'MAX_LENGTH'
    });
  }

  // Validate NIF
  if (!data.nif || typeof data.nif !== 'string') {
    errors.push({
      field: 'nif',
      message: 'NIF is required',
      code: 'REQUIRED_FIELD'
    });
  } else if (!NIF_REGEX.test(data.nif.trim())) {
    errors.push({
      field: 'nif',
      message: 'NIF must be exactly 9 digits',
      code: 'INVALID_FORMAT'
    });
  }

  // Validate email
  if (!data.email || typeof data.email !== 'string') {
    errors.push({
      field: 'email',
      message: 'Email is required',
      code: 'REQUIRED_FIELD'
    });
  } else if (!EMAIL_REGEX.test(data.email.trim().toLowerCase())) {
    errors.push({
      field: 'email',
      message: 'Email format is invalid',
      code: 'INVALID_FORMAT'
    });
  } else if (data.email.trim().length > 254) {
    errors.push({
      field: 'email',
      message: 'Email must not exceed 254 characters',
      code: 'MAX_LENGTH'
    });
  }

  // Validate password
  if (!data.password || typeof data.password !== 'string') {
    errors.push({
      field: 'password',
      message: 'Password is required',
      code: 'REQUIRED_FIELD'
    });
  } else if (data.password.length < PASSWORD_MIN_LENGTH) {
    errors.push({
      field: 'password',
      message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters long`,
      code: 'MIN_LENGTH'
    });
  } else if (!PASSWORD_REGEX.test(data.password)) {
    errors.push({
      field: 'password',
      message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      code: 'INVALID_FORMAT'
    });
  }

  // Validate user type
  if (!data.userType || typeof data.userType !== 'string') {
    errors.push({
      field: 'userType',
      message: 'User type is required',
      code: 'REQUIRED_FIELD'
    });
  } else if (!['client', 'provider'].includes(data.userType as UserType)) {
    errors.push({
      field: 'userType',
      message: 'User type must be either "client" or "provider"',
      code: 'INVALID_VALUE'
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate user login data
 */
export function validateUserLogin(data: UserLoginRequest): ValidationResult {
  const errors: ValidationError[] = [];

  // Validate email
  if (!data.email || typeof data.email !== 'string') {
    errors.push({
      field: 'email',
      message: 'Email is required',
      code: 'REQUIRED_FIELD'
    });
  } else if (!EMAIL_REGEX.test(data.email.trim().toLowerCase())) {
    errors.push({
      field: 'email',
      message: 'Email format is invalid',
      code: 'INVALID_FORMAT'
    });
  }

  // Validate password
  if (!data.password || typeof data.password !== 'string') {
    errors.push({
      field: 'password',
      message: 'Password is required',
      code: 'REQUIRED_FIELD'
    });
  } else if (data.password.length === 0) {
    errors.push({
      field: 'password',
      message: 'Password cannot be empty',
      code: 'REQUIRED_FIELD'
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate email format only (for updates)
 */
export function validateEmail(email: string): ValidationResult {
  const errors: ValidationError[] = [];

  if (!email || typeof email !== 'string') {
    errors.push({
      field: 'email',
      message: 'Email is required',
      code: 'REQUIRED_FIELD'
    });
  } else if (!EMAIL_REGEX.test(email.trim().toLowerCase())) {
    errors.push({
      field: 'email',
      message: 'Email format is invalid',
      code: 'INVALID_FORMAT'
    });
  } else if (email.trim().length > 254) {
    errors.push({
      field: 'email',
      message: 'Email must not exceed 254 characters',
      code: 'MAX_LENGTH'
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate NIF format only (for updates)
 */
export function validateNIF(nif: string): ValidationResult {
  const errors: ValidationError[] = [];

  if (!nif || typeof nif !== 'string') {
    errors.push({
      field: 'nif',
      message: 'NIF is required',
      code: 'REQUIRED_FIELD'
    });
  } else if (!NIF_REGEX.test(nif.trim())) {
    errors.push({
      field: 'nif',
      message: 'NIF must be exactly 9 digits',
      code: 'INVALID_FORMAT'
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): ValidationResult {
  const errors: ValidationError[] = [];

  if (!password || typeof password !== 'string') {
    errors.push({
      field: 'password',
      message: 'Password is required',
      code: 'REQUIRED_FIELD'
    });
  } else if (password.length < PASSWORD_MIN_LENGTH) {
    errors.push({
      field: 'password',
      message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters long`,
      code: 'MIN_LENGTH'
    });
  } else if (!PASSWORD_REGEX.test(password)) {
    errors.push({
      field: 'password',
      message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      code: 'INVALID_FORMAT'
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Sanitize user input data
 */
export function sanitizeUserRegistrationData(data: UserRegistrationRequest): UserRegistrationRequest {
  return {
    fullName: data.fullName?.trim() || '',
    nif: data.nif?.trim() || '',
    email: data.email?.trim().toLowerCase() || '',
    password: data.password || '',
    userType: data.userType as UserType
  };
}

/**
 * Sanitize user login data
 */
export function sanitizeUserLoginData(data: UserLoginRequest): UserLoginRequest {
  return {
    email: data.email?.trim().toLowerCase() || '',
    password: data.password || ''
  };
}