// Request validation middleware using existing validation schemas

import { Request, Response, NextFunction } from 'express';
import { ValidationAPIError, ValidationError } from '../types/responses';
import {
  validateUserRegistration as validateUserRegistrationData,
  validateUserLogin as validateUserLoginData,
  sanitizeUserRegistrationData,
  sanitizeUserLoginData,
  ValidationResult
} from '../validation/userValidation';
import {
  validateCreateService as validateCreateServiceData,
  validateUpdateService as validateUpdateServiceData,
  validateServiceFilters as validateServiceFiltersData,
  sanitizeCreateServiceData,
  sanitizeUpdateServiceData,
  sanitizeServiceFilters
} from '../validation/serviceValidation';
import {
  validateCreateBooking as validateCreateBookingData,
  validateCancelBooking as validateCancelBookingData,
  validateBookingFilters as validateBookingFiltersData,
  sanitizeCreateBookingData,
  sanitizeCancelBookingData,
  sanitizeBookingFilters
} from '../validation/bookingValidation';

// Generic validation middleware factory
export const validateRequest = <T>(
  validationFn: (data: T) => ValidationResult | any,
  sanitizeFn?: (data: T) => T,
  dataSource: 'body' | 'query' | 'params' = 'body'
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Get data from the specified source
      let data: T;
      switch (dataSource) {
        case 'body':
          data = req.body;
          break;
        case 'query':
          data = req.query as T;
          break;
        case 'params':
          data = req.params as T;
          break;
        default:
          data = req.body;
      }

      // Sanitize data if sanitization function is provided
      if (sanitizeFn) {
        data = sanitizeFn(data);
        // Update the request object with sanitized data
        switch (dataSource) {
          case 'body':
            req.body = data;
            break;
          case 'query':
            req.query = data as any;
            break;
          case 'params':
            req.params = data as any;
            break;
        }
      }

      // Validate the data
      const validationResult = validationFn(data);

      if (!validationResult.isValid) {
        // Convert validation errors to the expected format
        const validationErrors: ValidationError[] = validationResult.errors.map((error: any) => ({
          field: error.field,
          message: error.message,
          value: (data as any)?.[error.field]
        }));

        throw new ValidationAPIError('Validation failed', validationErrors);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Specific validation middleware for user registration
export const validateUserRegistration = validateRequest(
  validateUserRegistrationData,
  sanitizeUserRegistrationData,
  'body'
);

// Specific validation middleware for user login
export const validateUserLogin = validateRequest(
  validateUserLoginData,
  sanitizeUserLoginData,
  'body'
);

// Specific validation middleware for service creation
export const validateCreateService = validateRequest(
  validateCreateServiceData,
  sanitizeCreateServiceData,
  'body'
);

// Specific validation middleware for service updates
export const validateUpdateService = validateRequest(
  validateUpdateServiceData,
  sanitizeUpdateServiceData,
  'body'
);

// Specific validation middleware for service filters (query parameters)
export const validateServiceFilters = validateRequest(
  validateServiceFiltersData,
  sanitizeServiceFilters,
  'query'
);

// Specific validation middleware for booking creation
export const validateCreateBooking = validateRequest(
  validateCreateBookingData,
  sanitizeCreateBookingData,
  'body'
);

// Specific validation middleware for booking cancellation
export const validateCancelBooking = validateRequest(
  validateCancelBookingData,
  sanitizeCancelBookingData,
  'body'
);

// Specific validation middleware for booking filters (query parameters)
export const validateBookingFilters = validateRequest(
  validateBookingFiltersData,
  sanitizeBookingFilters,
  'query'
);

// Input sanitization middleware for general use
export const sanitizeInput = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Recursively sanitize strings in request body
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body);
    }

    // Sanitize query parameters
    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeObject(req.query);
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Helper function to recursively sanitize object properties
function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }

  return obj;
}

// Helper function to sanitize individual strings
function sanitizeString(str: string): string {
  if (typeof str !== 'string') {
    return str;
  }

  return str
    .trim()
    // Remove null bytes
    .replace(/\0/g, '')
    // Remove control characters except newlines and tabs
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ');
}

// Content-Type validation middleware
export const validateContentType = (expectedType: string = 'application/json') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.method === 'GET' || req.method === 'DELETE') {
      // Skip content-type validation for GET and DELETE requests
      next();
      return;
    }

    const contentType = req.headers['content-type'];
    
    if (!contentType || !contentType.includes(expectedType)) {
      const error = new ValidationAPIError('Invalid content type', [
        {
          field: 'content-type',
          message: `Expected ${expectedType}`,
          value: contentType
        }
      ]);
      next(error);
      return;
    }

    next();
  };
};

// Request size validation middleware
export const validateRequestSize = (maxSizeBytes: number = 1024 * 1024) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = req.headers['content-length'];
    
    if (contentLength && parseInt(contentLength) > maxSizeBytes) {
      const error = new ValidationAPIError('Request too large', [
        {
          field: 'content-length',
          message: `Request size exceeds ${maxSizeBytes} bytes`,
          value: contentLength
        }
      ]);
      next(error);
      return;
    }

    next();
  };
};

// ID parameter validation middleware
export const validateIdParam = (paramName: string = 'id') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const id = req.params[paramName];
    
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      const error = new ValidationAPIError('Invalid ID parameter', [
        {
          field: paramName,
          message: 'ID parameter is required and must be a non-empty string',
          value: id
        }
      ]);
      next(error);
      return;
    }

    // Sanitize the ID parameter
    req.params[paramName] = id.trim();
    next();
  };
};

// Query parameter type conversion middleware
export const convertQueryParams = (conversions: Record<string, 'number' | 'boolean' | 'date'>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      for (const [param, type] of Object.entries(conversions)) {
        const value = req.query[param];
        
        if (value !== undefined && value !== null && value !== '') {
          switch (type) {
            case 'number':
              const numValue = Number(value);
              if (!isNaN(numValue)) {
                req.query[param] = numValue as any;
              }
              break;
            case 'boolean':
              if (typeof value === 'string') {
                req.query[param] = (value.toLowerCase() === 'true') as any;
              }
              break;
            case 'date':
              if (typeof value === 'string') {
                const dateValue = new Date(value);
                if (!isNaN(dateValue.getTime())) {
                  req.query[param] = dateValue as any;
                }
              }
              break;
          }
        }
      }
      next();
    } catch (error) {
      next(error);
    }
  };
};