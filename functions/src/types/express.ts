// Extended Express types for authentication context

import { Request } from 'express';
import { JWTPayload } from '../models';

// Extend Express Request interface to include user context
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

// Authenticated request type for type safety
export interface AuthenticatedRequest extends Request {
  user: JWTPayload;
}

// Request types for different user roles
export interface ClientRequest extends AuthenticatedRequest {
  user: JWTPayload & { userType: 'client' };
}

export interface ProviderRequest extends AuthenticatedRequest {
  user: JWTPayload & { userType: 'provider' };
}