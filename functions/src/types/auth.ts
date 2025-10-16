import { Request } from 'express';

/**
 * Authentication-related type definitions
 */

/**
 * User types in the system
 */
export type UserType = 'client' | 'provider';

/**
 * JWT payload structure
 */
export interface JWTPayload {
    userId: string;
    email: string;
    userType: UserType;
    iat?: number;
    exp?: number;
    iss?: string;
}

/**
 * Authentication request interfaces
 */
export interface LoginRequest {
    email: string;
    password: string;
}

export interface RegisterRequest {
    fullName: string;
    nif: string;
    email: string;
    password: string;
    userType: UserType;
}

/**
 * Authentication response interfaces
 */
export interface AuthResponse {
    success: boolean;
    message: string;
    data?: {
        token: string;
        expiresIn: string;
        user: {
            id: string;
            fullName: string;
            email: string;
            userType: UserType;
            balance: number;
        };
    };
    error?: string;
}

export interface TokenValidationResult {
    isValid: boolean;
    payload?: JWTPayload;
    error?: string;
}

/**
 * User context interface (injected into requests)
 */
export interface UserContext {
    userId: string;
    email: string;
    userType: UserType;
    fullName?: string;
    balance?: number;
}

/**
 * Extended Express Request with user context
 */
export interface AuthenticatedRequest extends Omit<Request, 'user'> {
    user?: UserContext;
}

/**
 * Password validation result
 */
export interface PasswordValidationResult {
    isValid: boolean;
    errors: string[];
}

/**
 * Role-based access control
 */
export interface RolePermissions {
    canCreateService: boolean;
    canManageServices: boolean;
    canCreateBooking: boolean;
    canViewAllBookings: boolean;
    canManageUsers: boolean;
}

/**
 * Authentication middleware options
 */
export interface AuthMiddlewareOptions {
    required?: boolean;
    roles?: UserType[];
    skipRoutes?: string[];
}