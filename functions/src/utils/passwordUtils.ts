import * as crypto from 'crypto';

/**
 * Utilitários de hash e validação de senhas
 * Usando crypto.pbkdf2 como alternativa até que bcrypt possa ser instalado
 */

const SALT_LENGTH = 32;
const HASH_ITERATIONS = 100000;
const HASH_LENGTH = 64;
const HASH_ALGORITHM = 'sha512';

/**
 * Fazer hash de uma senha usando PBKDF2
 * @param password - Senha em texto plano para fazer hash
 * @returns Promise<string> - Senha com hash e salt
 */
export async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // Gerar um salt aleatório
    const salt = crypto.randomBytes(SALT_LENGTH).toString('hex');
    
    // Fazer hash da senha com o salt
    crypto.pbkdf2(password, salt, HASH_ITERATIONS, HASH_LENGTH, HASH_ALGORITHM, (err, derivedKey) => {
      if (err) {
        reject(err);
        return;
      }
      
      // Combinar salt e hash
      const hash = derivedKey.toString('hex');
      const combined = `${salt}:${hash}`;
      resolve(combined);
    });
  });
}

/**
 * Verificar uma senha contra um hash
 * @param password - Senha em texto plano para verificar
 * @param hashedPassword - Hash armazenado com salt
 * @returns Promise<boolean> - True se a senha corresponder
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    try {
      // Dividir o hash armazenado para obter salt e hash
      const [salt, hash] = hashedPassword.split(':');
      
      if (!salt || !hash) {
        resolve(false);
        return;
      }
      
      // Fazer hash da senha fornecida com o salt armazenado
      crypto.pbkdf2(password, salt, HASH_ITERATIONS, HASH_LENGTH, HASH_ALGORITHM, (err, derivedKey) => {
        if (err) {
          reject(err);
          return;
        }
        
        const providedHash = derivedKey.toString('hex');
        
        // Comparar hashes usando comparação segura de tempo
        const isValid = crypto.timingSafeEqual(
          Buffer.from(hash, 'hex'),
          Buffer.from(providedHash, 'hex')
        );
        
        resolve(isValid);
      });
    } catch (error) {
      resolve(false);
    }
  });
}

/**
 * Validar força da senha
 * @param password - Senha para validar
 * @returns objeto com resultado da validação e mensagens
 */
export function validatePassword(password: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!password) {
    errors.push('Password is required');
    return { isValid: false, errors };
  }
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (password.length > 128) {
    errors.push('Password must be less than 128 characters long');
  }
  
  // if (!/[a-z]/.test(password)) {
  //   errors.push('Password must contain at least one lowercase letter');
  // }
  
  // if (!/[A-Z]/.test(password)) {
  //   errors.push('Password must contain at least one uppercase letter');
  // }
  
  // if (!/\d/.test(password)) {
  //   errors.push('Password must contain at least one number');
  // }
  
  // if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
  //   errors.push('Password must contain at least one special character');
  // }
  
  // Verificar senhas fracas comuns
  const commonPasswords = [
    'password', '123456', '123456789', 'qwerty', 'abc123', 
    'password123', 'admin', 'letmein', 'welcome', '12345678'
  ];
  
  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('Password is too common, please choose a stronger password');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Gerar uma senha aleatória segura
 * @param length - Comprimento da senha (padrão: 16)
 * @returns string - Senha gerada
 */
export function generateSecurePassword(length: number = 16): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
  let password = '';
  
  for (let i = 0; i < length; i++) {
    const randomIndex = crypto.randomInt(0, charset.length);
    password += charset[randomIndex];
  }
  
  return password;
}