import { UserType } from '../types/auth';

/**
 * Interface principal do Usuário representando o documento do usuário no Firestore
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
 * Dados de criação do usuário (sem campos gerados)
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
 * Dados de atualização do usuário (campos parciais que podem ser atualizados)
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
 * Dados do usuário para respostas públicas (sem informações sensíveis)
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
 * Interface de requisição de registro de usuário
 */
export interface UserRegistrationRequest {
  fullName: string;
  nif: string;
  email: string;
  password: string;
  userType: UserType;
}

/**
 * Interface de requisição de login de usuário
 */
export interface UserLoginRequest {
  email: string;
  password: string;
}

/**
 * Interface de resposta de registro de usuário
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
 * Interface de resposta de login de usuário
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
 * Interface de operação de atualização de saldo
 */
export interface BalanceUpdateOperation {
  userId: string;
  amount: number;
  operation: 'add' | 'subtract';
  description?: string;
}