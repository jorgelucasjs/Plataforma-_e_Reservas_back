/**
 * Authentication configuration settings
 */

export const AUTH_CONFIG = {
  // JWT Settings
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    issuer: process.env.JWT_ISSUER || 'booking-platform-api',
    algorithm: 'HS256' as const
  },

  // Password Requirements
  password: {
    minLength: 8,
    maxLength: 128,
    requireLowercase: true,
    requireUppercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    forbidCommonPasswords: true
  },

  // Session Settings
  session: {
    maxConcurrentSessions: 5,
    sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
    refreshTokenThreshold: 2 * 60 * 60 * 1000 // 2 hours in milliseconds
  },

  // Security Settings
  security: {
    maxLoginAttempts: 5,
    lockoutDuration: 15 * 60 * 1000, // 15 minutes in milliseconds
    rateLimitWindow: 15 * 60 * 1000, // 15 minutes in milliseconds
    rateLimitMaxRequests: 100,
    enableBruteForceProtection: true
  },

  // Public routes that don't require authentication
  publicRoutes: [
    '/info',
    '/health',
    '/auth/register',
    '/auth/login',
    '/services' // Public service listing
  ],

  // Routes that require specific roles
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
 * Validate authentication configuration
 */
export function validateAuthConfig(): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check JWT secret
  if (!AUTH_CONFIG.jwt.secret || AUTH_CONFIG.jwt.secret === 'your-super-secret-jwt-key-change-in-production') {
    errors.push('JWT_SECRET must be set to a secure value in production');
  }

  if (AUTH_CONFIG.jwt.secret.length < 32) {
    errors.push('JWT_SECRET should be at least 32 characters long');
  }

  // Check password requirements
  if (AUTH_CONFIG.password.minLength < 6) {
    errors.push('Minimum password length should be at least 6 characters');
  }

  if (AUTH_CONFIG.password.maxLength > 256) {
    errors.push('Maximum password length should not exceed 256 characters');
  }

  // Check session settings
  if (AUTH_CONFIG.session.sessionTimeout < 60000) { // Less than 1 minute
    errors.push('Session timeout should be at least 1 minute');
  }

  // Check security settings
  if (AUTH_CONFIG.security.maxLoginAttempts < 3) {
    errors.push('Maximum login attempts should be at least 3');
  }

  if (AUTH_CONFIG.security.lockoutDuration < 60000) { // Less than 1 minute
    errors.push('Lockout duration should be at least 1 minute');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Get role permissions
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
 * Check if a route is public (doesn't require authentication)
 */
export function isPublicRoute(path: string): boolean {
  return AUTH_CONFIG.publicRoutes.some(route => {
    // Handle exact matches
    if (route === path) return true;
    
    // Handle wildcard matches
    if (route.includes('*')) {
      const pattern = route.replace(/\*/g, '.*');
      return new RegExp(`^${pattern}$`).test(path);
    }
    
    return false;
  });
}

/**
 * Check if a route requires a specific role
 */
export function getRequiredRole(path: string): 'client' | 'provider' | null {
  for (const [role, routes] of Object.entries(AUTH_CONFIG.roleBasedRoutes)) {
    if (routes.some(route => {
      // Handle parameter routes like /services/:id
      const pattern = route.replace(/:[\w]+/g, '[^/]+');
      return new RegExp(`^${pattern}$`).test(path);
    })) {
      return role as 'client' | 'provider';
    }
  }
  return null;
}