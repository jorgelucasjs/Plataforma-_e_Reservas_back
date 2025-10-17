import {
  validateUserRegistration,
  validateUserLogin,
  validateEmail,
  validateNIF,
  validatePassword,
  sanitizeUserRegistrationData,
  sanitizeUserLoginData
} from '../userValidation';
import { UserRegistrationRequest, UserLoginRequest } from '../../models/user';

describe('User Validation', () => {
  describe('validateUserRegistration', () => {
    it('should validate correct registration data', () => {
      const validData: UserRegistrationRequest = {
        fullName: 'João Silva',
        nif: '123456789',
        email: 'joao@example.com',
        password: 'Password123!',
        userType: 'client'
      };

      const result = validateUserRegistration(validData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject registration with missing required fields', () => {
      const invalidData = {} as UserRegistrationRequest;

      const result = validateUserRegistration(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(5); // All fields are required
    });

    it('should reject invalid email format', () => {
      const invalidData: UserRegistrationRequest = {
        fullName: 'João Silva',
        nif: '123456789',
        email: 'invalid-email',
        password: 'Password123!',
        userType: 'client'
      };

      const result = validateUserRegistration(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'email' && e.code === 'INVALID_FORMAT')).toBe(true);
    });

    it('should reject invalid NIF format', () => {
      const invalidData: UserRegistrationRequest = {
        fullName: 'João Silva',
        nif: '12345', // Too short
        email: 'joao@example.com',
        password: 'Password123!',
        userType: 'client'
      };

      const result = validateUserRegistration(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'nif' && e.code === 'INVALID_FORMAT')).toBe(true);
    });

    it('should reject weak password', () => {
      const invalidData: UserRegistrationRequest = {
        fullName: 'João Silva',
        nif: '123456789',
        email: 'joao@example.com',
        password: 'weak', // Too weak
        userType: 'client'
      };

      const result = validateUserRegistration(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'password')).toBe(true);
    });

    it('should reject invalid user type', () => {
      const invalidData: UserRegistrationRequest = {
        fullName: 'João Silva',
        nif: '123456789',
        email: 'joao@example.com',
        password: 'Password123!',
        userType: 'invalid' as any
      };

      const result = validateUserRegistration(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'userType' && e.code === 'INVALID_VALUE')).toBe(true);
    });
  });

  describe('validateUserLogin', () => {
    it('should validate correct login data', () => {
      const validData: UserLoginRequest = {
        email: 'joao@example.com',
        password: 'Password123!'
      };

      const result = validateUserLogin(validData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject login with missing fields', () => {
      const invalidData = {} as UserLoginRequest;

      const result = validateUserLogin(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2); // Email and password required
    });

    it('should reject invalid email in login', () => {
      const invalidData: UserLoginRequest = {
        email: 'invalid-email',
        password: 'password'
      };

      const result = validateUserLogin(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'email' && e.code === 'INVALID_FORMAT')).toBe(true);
    });
  });

  describe('validateEmail', () => {
    it('should validate correct email', () => {
      const result = validateEmail('test@example.com');
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid email', () => {
      const result = validateEmail('invalid-email');
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('INVALID_FORMAT');
    });
  });

  describe('validateNIF', () => {
    it('should validate correct NIF', () => {
      const result = validateNIF('123456789');
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid NIF', () => {
      const result = validateNIF('12345');
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('INVALID_FORMAT');
    });
  });

  describe('validatePassword', () => {
    it('should validate strong password', () => {
      const result = validatePassword('Password123!');
      expect(result.isValid).toBe(true);
    });

    it('should reject weak password', () => {
      const result = validatePassword('weak');
      expect(result.isValid).toBe(false);
    });
  });

  describe('sanitizeUserRegistrationData', () => {
    it('should sanitize registration data', () => {
      const dirtyData: UserRegistrationRequest = {
        fullName: '  João Silva  ',
        nif: '  123456789  ',
        email: '  JOAO@EXAMPLE.COM  ',
        password: 'Password123!',
        userType: 'client'
      };

      const sanitized = sanitizeUserRegistrationData(dirtyData);
      expect(sanitized.fullName).toBe('João Silva');
      expect(sanitized.nif).toBe('123456789');
      expect(sanitized.email).toBe('joao@example.com');
    });
  });

  describe('sanitizeUserLoginData', () => {
    it('should sanitize login data', () => {
      const dirtyData: UserLoginRequest = {
        email: '  JOAO@EXAMPLE.COM  ',
        password: 'Password123!'
      };

      const sanitized = sanitizeUserLoginData(dirtyData);
      expect(sanitized.email).toBe('joao@example.com');
      expect(sanitized.password).toBe('Password123!');
    });
  });
});