// Error handling middleware - placeholder for global error handling
// This will be implemented in task 6.1

import { Request, Response, NextFunction } from 'express';
import { ErrorResponse } from '../types/responses';

// Placeholder for global error handler middleware
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Implementation will be added in task 6.1
  console.error('Error:', error);
  
  const errorResponse: ErrorResponse = {
    success: false,
    error: 'Internal Server Error',
    message: 'An unexpected error occurred'
  };
  
  res.status(500).json(errorResponse);
};