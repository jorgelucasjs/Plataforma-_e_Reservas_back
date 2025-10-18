/**
 * Configurações de autenticação
 */

export const AUTH_CONFIG = {
  // Configurações JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    issuer: process.env.JWT_ISSUER || 'booking-platform-api',
    algorithm: 'HS256' as const
  },

  // Requisitos de Senha
  password: {
    minLength: 8,
    maxLength: 128,
    requireLowercase: true,
    requireUppercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    forbidCommonPasswords: true
  },

  // Configurações de Sessão
  session: {
    maxConcurrentSessions: 5,
    sessionTimeout: 24 * 60 * 60 * 1000, // 24 horas em milissegundos
    refreshTokenThreshold: 2 * 60 * 60 * 1000 // 2 horas em milissegundos
  },

  // Configurações de Segurança
  security: {
    maxLoginAttempts: 5,
    lockoutDuration: 15 * 60 * 1000, // 15 minutos em milissegundos
    rateLimitWindow: 15 * 60 * 1000, // 15 minutos em milissegundos
    rateLimitMaxRequests: 100,
    enableBruteForceProtection: true
  },

  // Rotas públicas que não requerem autenticação
  publicRoutes: [
    '/info',
    '/health',
    '/auth/register',
    '/auth/login',
    '/services' // Listagem pública de serviços
  ],

  // Rotas que requerem funções específicas
  roleBasedRoutes: {
    client: [
      '/bookings',
      '/bookings/my',
      '/bookings/:id/cancel'
    ],
    provider: [
      '/services/my',
      '/services/:id',
      '/services'
    ]
  }
};

/**
 * Validar configuração de autenticação
 */
export function validateAuthConfig(): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Verificar segredo JWT
  if (!AUTH_CONFIG.jwt.secret || AUTH_CONFIG.jwt.secret === 'your-super-secret-jwt-key-change-in-production') {
    errors.push('JWT_SECRET deve ser definido com um valor seguro em produção');
  }

  if (AUTH_CONFIG.jwt.secret.length < 32) {
    errors.push('JWT_SECRET deve ter pelo menos 32 caracteres');
  }

  // Verificar requisitos de senha
  if (AUTH_CONFIG.password.minLength < 6) {
    errors.push('Comprimento mínimo da senha deve ser pelo menos 6 caracteres');
  }

  if (AUTH_CONFIG.password.maxLength > 256) {
    errors.push('Comprimento máximo da senha não deve exceder 256 caracteres');
  }

  // Verificar configurações de sessão
  if (AUTH_CONFIG.session.sessionTimeout < 60000) { // Menos de 1 minuto
    errors.push('Timeout de sessão deve ser pelo menos 1 minuto');
  }

  // Verificar configurações de segurança
  if (AUTH_CONFIG.security.maxLoginAttempts < 3) {
    errors.push('Máximo de tentativas de login deve ser pelo menos 3');
  }

  if (AUTH_CONFIG.security.lockoutDuration < 60000) { // Menos de 1 minuto
    errors.push('Duração do bloqueio deve ser pelo menos 1 minuto');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Obter permissões de função
 */
export function getRolePermissions(userType: 'client' | 'provider') {
  const permissions = {
    client: {
      canCreateBooking: true,
      canViewOwnBookings: true,
      canCancelOwnBookings: true,
      canViewServices: true,
      canCreateService: false,
      canManageServices: false,
      canViewAllBookings: false,
      canManageUsers: false
    },
    provider: {
      canCreateBooking: false,
      canViewOwnBookings: false,
      canCancelOwnBookings: false,
      canViewServices: true,
      canCreateService: true,
      canManageServices: true,
      canViewAllBookings: false,
      canManageUsers: false
    }
  };

  return permissions[userType];
}

/**
 * Verificar se uma rota é pública (não requer autenticação)
 */
export function isPublicRoute(path: string): boolean {
  return AUTH_CONFIG.publicRoutes.some(route => {
    // Lidar com correspondências exatas
    if (route === path) return true;
    
    // Lidar com correspondências com wildcard
    if (route.includes('*')) {
      const pattern = route.replace(/\*/g, '.*');
      return new RegExp(`^${pattern}$`).test(path);
    }
    
    return false;
  });
}

/**
 * Verificar se uma rota requer uma função específica
 */
export function getRequiredRole(path: string): 'client' | 'provider' | null {
  for (const [role, routes] of Object.entries(AUTH_CONFIG.roleBasedRoutes)) {
    if (routes.some(route => {
      // Lidar com rotas com parâmetros como /services/:id
      const pattern = route.replace(/:[\w]+/g, '[^/]+');
      return new RegExp(`^${pattern}$`).test(path);
    })) {
      return role as 'client' | 'provider';
    }
  }
  return null;
}