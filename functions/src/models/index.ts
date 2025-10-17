// Core data model interfaces for the booking platform

// Re-export user models from dedicated user module
export * from './user';

// Re-export service models from dedicated service module
export * from './service';

// Re-export booking models from dedicated booking module
export * from './booking';

// JWT Token payload interface
export interface JWTPayload {
  userId: string;
  email: string;
  userType: 'client' | 'provider';
  iat: number;
  exp: number;
}