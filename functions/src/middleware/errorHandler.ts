// Global error handling middleware

import { Request, Response, NextFunction } from 'express';
import { ErrorResponse, APIError, ValidationAPIError, ErrorCodes } from '../types/responses';
import * as functions from 'firebase-functions';

// Enhanced error logging utility
export const logError = (error: Error, req: Request, context?: any): void => {
  const errorInfo = {
    message: error.message,
    stack: error.stack,
    name: error.name,
    timestamp: new Date().toISOString(),
    requestId: req.headers['x-request-id'] || 'unknown',
    method: req.method,
    url: req.originalUrl,
    userAgent: req.headers['user-agent'],
    ip: req.ip,
    userId: (req as any).user?.userId,
    context
  };

  // Use Firebase Functions logger for structured logging
  if (error instanceof APIError && error.statusCode < 500) {
    // Client errors - log as warning
    functions.logger.warn('Client error occurred', errorInfo);
  } else {
    // Server errors - log as error
    functions.logger.error('Server error occurred', errorInfo);
  }
};

// Global error handler middleware
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Log the error with context
  logError(error, req);

  // Handle different error types
  if (error instanceof ValidationAPIError) {
    const errorResponse: ErrorResponse = {
      success: false,
      error: 'Validation Error',
      message: error.message,
      code: error.code,
      details: error.validationErrors
    };
    res.status(error.statusCode).json(errorResponse);
    return;
  }

  if (error instanceof APIError) {
    const errorResponse: ErrorResponse = {
      success: false,
      error: error.name,
      message: error.message,
      code: error.code,
      details: error.details
    };
    res.status(error.statusCode).json(errorResponse);
    return;
  }

  // Handle Firebase Admin SDK errors
  if (error.name === 'FirebaseError' || error.message.includes('firebase')) {
    const errorResponse: ErrorResponse = {
      success: false,
      error: 'Database Error',
      message: 'A database operation failed',
      code: ErrorCodes.DATABASE_ERROR
    };
    res.status(500).json(errorResponse);
    return;
  }

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
    const errorResponse: ErrorResponse = {
      success: false,
      error: 'Authentication Error',
      message: 'Invalid or expired token',
      code: ErrorCodes.AUTHENTICATION_ERROR
    };
    res.status(401).json(errorResponse);
    return;
  }

  // Handle validation errors from express-validator or joi
  if (error.name === 'ValidationError') {
    const errorResponse: ErrorResponse = {
      success: false,
      error: 'Validation Error',
      message: error.message,
      code: ErrorCodes.VALIDATION_ERROR
    };
    res.status(400).json(errorResponse);
    return;
  }

  // Handle syntax errors (malformed JSON, etc.)
  if (error instanceof SyntaxError && 'body' in error) {
    const errorResponse: ErrorResponse = {
      success: false,
      error: 'Bad Request',
      message: 'Invalid JSON in request body',
      code: ErrorCodes.VALIDATION_ERROR
    };
    res.status(400).json(errorResponse);
    return;
  }

  // Default error response for unhandled errors
  const errorResponse: ErrorResponse = {
    success: false,
    error: 'Internal Server Error',
    message: 'An unexpected error occurred',
    code: ErrorCodes.INTERNAL_ERROR
  };

  res.status(500).json(errorResponse);
};

// 404 handler for unmatched routes
export const notFoundHandler = (req: Request, res: Response): void => {
  const errorResponse: ErrorResponse = {
    success: false,
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} not found`,
    code: ErrorCodes.NOT_FOUND
  };
  
  functions.logger.warn('Route not found', {
    method: req.method,
    url: req.originalUrl,
    timestamp: new Date().toISOString(),
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });

  res.status(404).json(errorResponse);
};

// Async error wrapper utility
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Request timeout handler
export const timeoutHandler = (timeoutMs: number = 30000) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const timeout = setTimeout(() => {
      const error = new APIError(
        'Request timeout',
        408,
        ErrorCodes.INTERNAL_ERROR
      );
      next(error);
    }, timeoutMs);

    // Clear timeout when response finishes
    res.on('finish', () => clearTimeout(timeout));
    res.on('close', () => clearTimeout(timeout));

    next();
  };
};

// Security error handler for rate limiting, etc.
export const securityErrorHandler = (error: any, req: Request, res: Response, next: NextFunction): void => {
  if (error.type === 'entity.too.large') {
    const errorResponse: ErrorResponse = {
      success: false,
      error: 'Payload Too Large',
      message: 'Request payload exceeds size limit',
      code: ErrorCodes.VALIDATION_ERROR
    };
    res.status(413).json(errorResponse);
    return;
  }

  if (error.code === 'LIMIT_FILE_SIZE') {
    const errorResponse: ErrorResponse = {
      success: false,
      error: 'File Too Large',
      message: 'Uploaded file exceeds size limit',
      code: ErrorCodes.VALIDATION_ERROR
    };
    res.status(413).json(errorResponse);
    return;
  }

  next(error);
};