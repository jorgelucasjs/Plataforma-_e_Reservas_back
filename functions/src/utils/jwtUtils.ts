import * as jwt from 'jsonwebtoken';
import { AUTH_CONFIG } from '../config/authConfig';

/**
 * Utilitários de Gerenciamento de Token JWT
 */

// Configuração JWT da config
const JWT_SECRET = AUTH_CONFIG.jwt.secret;
const JWT_EXPIRES_IN = AUTH_CONFIG.jwt.expiresIn;
const JWT_ISSUER = AUTH_CONFIG.jwt.issuer;

/**
 * Interface de Payload JWT
 */
export interface JWTPayload {
  userId: string;
  email: string;
  userType: 'client' | 'provider';
  iat?: number;
  exp?: number;
  iss?: string;
}

/**
 * Interface de resultado de geração de token
 */
export interface TokenResult {
  token: string;
  expiresIn: string;
  payload: JWTPayload;
}

/**
 * Interface de resultado de verificação de token
 */
export interface TokenVerificationResult {
  isValid: boolean;
  payload?: JWTPayload;
  error?: string;
}

/**
 * Gerar um token JWT para um usuário
 * @param payload - Dados do usuário para incluir no token
 * @returns TokenResult - Token gerado com metadados
 */
export function generateToken(payload: Omit<JWTPayload, 'iat' | 'exp' | 'iss'>): TokenResult {
  try {
    const tokenPayload: JWTPayload = {
      ...payload
    };

    // Usar jwt.sign com parâmetros separados para evitar problemas de tipo
    const token = jwt.sign(
      tokenPayload, 
      JWT_SECRET, 
      { 
        expiresIn: '24h', // Usar string literal para evitar problemas de tipo
        issuer: JWT_ISSUER 
      }
    );

    return {
      token,
      expiresIn: JWT_EXPIRES_IN,
      payload: tokenPayload
    };
  } catch (error) {
    throw new Error(`Failed to generate token: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Verificar e decodificar um token JWT
 * @param token - Token JWT para verificar
 * @returns TokenVerificationResult - Resultado da verificação com payload ou erro
 */
export function verifyToken(token: string): TokenVerificationResult {
  try {
    if (!token) {
      return {
        isValid: false,
        error: 'Token is required'
      };
    }

    // Remover prefixo 'Bearer ' se presente
    const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token;

    const decoded = jwt.verify(cleanToken, JWT_SECRET, {
      issuer: JWT_ISSUER
    }) as JWTPayload;

    return {
      isValid: true,
      payload: decoded
    };
  } catch (error) {
    let errorMessage = 'Invalid token';
    
    if (error instanceof jwt.TokenExpiredError) {
      errorMessage = 'Token has expired';
    } else if (error instanceof jwt.JsonWebTokenError) {
      errorMessage = 'Invalid token format';
    } else if (error instanceof jwt.NotBeforeError) {
      errorMessage = 'Token not active yet';
    }

    return {
      isValid: false,
      error: errorMessage
    };
  }
}

/**
 * Decode a JWT token without verification (for debugging purposes)
 * @param token - JWT token to decode
 * @returns Decoded payload or null
 */
export function decodeToken(token: string): JWTPayload | null {
  try {
    const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token;
    const decoded = jwt.decode(cleanToken) as JWTPayload;
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Check if a token is expired
 * @param token - JWT token to check
 * @returns boolean - True if token is expired
 */
export function isTokenExpired(token: string): boolean {
  try {
    const decoded = decodeToken(token);
    if (!decoded || !decoded.exp) {
      return true;
    }

    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp < currentTime;
  } catch (error) {
    return true;
  }
}

/**
 * Get token expiration time
 * @param token - JWT token
 * @returns Date - Expiration date or null if invalid
 */
export function getTokenExpiration(token: string): Date | null {
  try {
    const decoded = decodeToken(token);
    if (!decoded || !decoded.exp) {
      return null;
    }

    return new Date(decoded.exp * 1000);
  } catch (error) {
    return null;
  }
}

/**
 * Refresh a token (generate a new one with the same payload)
 * @param token - Current JWT token
 * @returns TokenResult - New token or throws error
 */
export function refreshToken(token: string): TokenResult {
  const verification = verifyToken(token);
  
  if (!verification.isValid || !verification.payload) {
    throw new Error('Cannot refresh invalid token');
  }

  // Generate new token with same user data
  return generateToken({
    userId: verification.payload.userId,
    email: verification.payload.email,
    userType: verification.payload.userType
  });
}

/**
 * Extract user ID from token
 * @param token - JWT token
 * @returns string - User ID or null if invalid
 */
export function getUserIdFromToken(token: string): string | null {
  const verification = verifyToken(token);
  return verification.isValid && verification.payload ? verification.payload.userId : null;
}

/**
 * Extract user type from token
 * @param token - JWT token
 * @returns string - User type or null if invalid
 */
export function getUserTypeFromToken(token: string): 'client' | 'provider' | null {
  const verification = verifyToken(token);
  return verification.isValid && verification.payload ? verification.payload.userType : null;
}

/**
 * Validate JWT configuration
 * @returns boolean - True if JWT is properly configured
 */
export function validateJWTConfig(): boolean {
  if (!JWT_SECRET || JWT_SECRET === 'your-super-secret-jwt-key-change-in-production') {
    console.warn('JWT_SECRET is not properly configured. Please set a secure secret in environment variables.');
    return false;
  }

  if (JWT_SECRET.length < 32) {
    console.warn('JWT_SECRET should be at least 32 characters long for security.');
    return false;
  }

  return true;
}