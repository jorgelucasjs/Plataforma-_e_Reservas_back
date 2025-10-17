import { UserType } from '../types/auth';

/**
 * Core User interface representing the user document in Firestore
 */
export interface User {
  id: string;
  fullName: string;
  nif: string;
  email: string;
  passwordHash: string;
  userType: UserType;
  balance: number;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

/**
 * User creation data (without generated fields)
 */
export interface CreateUserData {
  fullName: string;
  nif: string;
  email: string;
  passwordHash: string;
  userType: UserType;
  balance?: number;
  isActive?: boolean;
}

/**
 * User update data (partial fields that can be updated)
 */
export interface UpdateUserData {
  fullName?: string;
  email?: string;
  passwordHash?: string;
  balance?: number;
  isActive?: boolean;
  updatedAt?: Date;
}

/**
 * User data for public responses (without sensitive information)
 */
export interface PublicUserData {
  id: string;
  fullName: string;
  email: string;
  userType: UserType;
  balance: number;
  createdAt: Date;
  isActive: boolean;
}

/**
 * User registration request interface
 */
export interface UserRegistrationRequest {
  fullName: string;
  nif: string;
  email: string;
  password: string;
  userType: UserType;
}

/**
 * User login request interface
 */
export interface UserLoginRequest {
  email: string;
  password: string;
}

/**
 * User registration response interface
 */
export interface UserRegistrationResponse {
  success: boolean;
  message: string;
  data?: {
    token: string;
    expiresIn: string;
    user: PublicUserData;
  };
  error?: string;
}

/**
 * User login response interface
 */
export interface UserLoginResponse {
  success: boolean;
  message: string;
  data?: {
    token: string;
    expiresIn: string;
    user: PublicUserData;
  };
  error?: string;
}

/**
 * Balance update operation interface
 */
export interface BalanceUpdateOperation {
  userId: string;
  amount: number;
  operation: 'add' | 'subtract';
  description?: string;
}