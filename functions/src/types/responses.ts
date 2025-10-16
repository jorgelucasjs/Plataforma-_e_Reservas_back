// Base response interfaces and error types

export interface BaseResponse {
  success: boolean;
  message?: string;
}

export interface SuccessResponse<T = any> extends BaseResponse {
  success: true;
  data: T;
  message?: string;
}

export interface ErrorResponse extends BaseResponse {
  success: false;
  error: string;
  message: string;
  code?: string;
  details?: any;
}

// Authentication response types
export interface AuthResponse extends SuccessResponse<{
  token: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    userType: 'client' | 'provider';
    balance: number;
  };
}> {}

export interface UserProfileResponse extends SuccessResponse<{
  id: string;
  fullName: string;
  email: string;
  nif: string;
  userType: 'client' | 'provider';
  balance: number;
  createdAt: Date;
  isActive: boolean;
}> {}

export interface BalanceResponse extends SuccessResponse<{
  balance: number;
}> {}

// Service response types
export interface ServiceResponse extends SuccessResponse<{
  id: string;
  name: string;
  description: string;
  price: number;
  providerId: string;
  providerName: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}> {}

export interface ServicesListResponse extends SuccessResponse<{
  services: Array<{
    id: string;
    name: string;
    description: string;
    price: number;
    providerId: string;
    providerName: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }>;
  total: number;
}> {}

// Booking response types
export interface BookingResponse extends SuccessResponse<{
  id: string;
  clientId: string;
  clientName: string;
  serviceId: string;
  serviceName: string;
  providerId: string;
  providerName: string;
  amount: number;
  status: 'confirmed' | 'cancelled';
  createdAt: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
}> {}

export interface BookingsListResponse extends SuccessResponse<{
  bookings: Array<{
    id: string;
    clientId: string;
    clientName: string;
    serviceId: string;
    serviceName: string;
    providerId: string;
    providerName: string;
    amount: number;
    status: 'confirmed' | 'cancelled';
    createdAt: Date;
    cancelledAt?: Date;
    cancellationReason?: string;
  }>;
  total: number;
}> {}

// Error types and codes
export enum ErrorCodes {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  DUPLICATE_RESOURCE = 'DUPLICATE_RESOURCE',
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  INVALID_OPERATION = 'INVALID_OPERATION',
  DATABASE_ERROR = 'DATABASE_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR'
}

export class APIError extends Error {
  public statusCode: number;
  public code: string;
  public details?: any;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = ErrorCodes.INTERNAL_ERROR,
    details?: any
  ) {
    super(message);
    this.name = 'APIError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

// Validation error type
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export class ValidationAPIError extends APIError {
  public validationErrors: ValidationError[];

  constructor(message: string, validationErrors: ValidationError[]) {
    super(message, 400, ErrorCodes.VALIDATION_ERROR, validationErrors);
    this.validationErrors = validationErrors;
  }
}