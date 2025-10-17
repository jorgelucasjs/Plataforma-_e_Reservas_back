import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwtUtils';
import { UserType, UserContext, AuthMiddlewareOptions, AuthenticatedRequest } from '../types/auth';
import { SecurityMonitor } from '../utils/monitoring';
import * as admin from 'firebase-admin';

/**
 * Authentication middleware to validate JWT tokens and inject user context
 */
export function authenticateToken(options: AuthMiddlewareOptions = {}) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { required = true, roles = [], skipRoutes = [] } = options;

      // Skip authentication for specified routes
      if (skipRoutes.some(route => req.path.includes(route))) {
        return next();
      }

      // Get token from Authorization header
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.startsWith('Bearer ') 
        ? authHeader.slice(7) 
        : authHeader;

      // If token is not provided and authentication is required
      if (!token) {
        if (required) {
          // Log authentication failure using security monitor
          SecurityMonitor.logAuthFailure(
            'Authentication required but no token provided',
            req.ip || 'unknown',
            req.path,
            req.method,
            req.get('User-Agent')
          );
          
          return res.status(401).json({
            success: false,
            error: 'Authentication required',
            message: 'Access token is missing'
          });
        }
        return next();
      }

      // Verify the token
      const verification = verifyToken(token);

      if (!verification.isValid) {
        // Log token verification failure using security monitor
        SecurityMonitor.logAuthFailure(
          'Token verification failed',
          req.ip || 'unknown',
          req.path,
          req.method,
          req.get('User-Agent'),
          undefined,
          { error: verification.error, tokenPresent: !!token }
        );
        
        return res.status(401).json({
          success: false,
          error: 'Invalid token',
          message: verification.error || 'Token verification failed'
        });
      }

      if (!verification.payload) {
        return res.status(401).json({
          success: false,
          error: 'Invalid token payload',
          message: 'Token does not contain valid user information'
        });
      }

      // Get user details from Firestore to ensure user still exists and is active
      const db = admin.firestore();
      const userDoc = await db.collection('users').doc(verification.payload.userId).get();

      if (!userDoc.exists) {
        // Log user not found security event using security monitor
        SecurityMonitor.logSuspiciousActivity(
          'Token references non-existent user',
          req.ip || 'unknown',
          req.path,
          req.method,
          'high',
          req.get('User-Agent'),
          verification.payload.userId,
          undefined,
          { tokenUserId: verification.payload.userId }
        );
        
        return res.status(401).json({
          success: false,
          error: 'User not found',
          message: 'User associated with this token no longer exists'
        });
      }

      const userData = userDoc.data();
      if (!userData?.isActive) {
        // Log deactivated account access attempt using security monitor
        SecurityMonitor.logAuthFailure(
          'Deactivated account access attempt',
          req.ip || 'unknown',
          req.path,
          req.method,
          req.get('User-Agent'),
          verification.payload.userId,
          { email: verification.payload.email, userType: verification.payload.userType }
        );
        
        return res.status(401).json({
          success: false,
          error: 'Account deactivated',
          message: 'User account has been deactivated'
        });
      }

      // Create user context
      const userContext: UserContext = {
        userId: verification.payload.userId,
        email: verification.payload.email,
        userType: verification.payload.userType,
        fullName: userData.fullName,
        balance: userData.balance || 0
      };

      // Check role-based access if roles are specified
      if (roles.length > 0 && !roles.includes(userContext.userType)) {
        // Log authorization failure using security monitor
        SecurityMonitor.logPermissionDenied(
          'Insufficient permissions for role-based access',
          userContext.userId,
          userContext.userType,
          req.ip || 'unknown',
          req.path,
          req.method,
          req.get('User-Agent'),
          { requiredRoles: roles, email: userContext.email }
        );
        
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions',
          message: `Access denied. Required roles: ${roles.join(', ')}`
        });
      }

      // Log successful authentication using security monitor
      SecurityMonitor.logAuthSuccess(
        userContext.userId,
        userContext.userType,
        req.ip || 'unknown',
        req.path,
        req.method,
        req.get('User-Agent')
      );

      // Inject user context into request
      req.user = userContext;
      next();

    } catch (error) {
      console.error('Authentication middleware error:', error);
      return res.status(500).json({
        success: false,
        error: 'Authentication error',
        message: 'Internal server error during authentication'
      });
    }
  };
}

/**
 * Middleware to require authentication (shorthand for authenticateToken with required: true)
 */
export const requireAuth = authenticateToken({ required: true });

/**
 * Middleware to require client role
 */
export const requireClient = authenticateToken({ 
  required: true, 
  roles: ['client'] 
});

/**
 * Middleware to require provider role
 */
export const requireProvider = authenticateToken({ 
  required: true, 
  roles: ['provider'] 
});

/**
 * Middleware to require either client or provider role (any authenticated user)
 */
export const requireUser = authenticateToken({ 
  required: true, 
  roles: ['client', 'provider'] 
});

/**
 * Optional authentication middleware (doesn't fail if no token provided)
 */
export const optionalAuth = authenticateToken({ required: false });

/**
 * Role-based access control helper
 */
export class RoleGuard {
  /**
   * Check if user has permission to perform an action
   */
  static hasPermission(userType: UserType, action: string): boolean {
    const permissions: Record<UserType, Record<string, boolean>> = {
      client: {
        createBooking: true,
        viewOwnBookings: true,
        cancelOwnBookings: true,
        viewServices: true,
        viewProfile: true,
        updateProfile: true
      },
      provider: {
        createService: true,
        manageOwnServices: true,
        viewOwnServices: true,
        viewBookingsForOwnServices: true,
        viewServices: true,
        viewProfile: true,
        updateProfile: true
      }
    };

    return permissions[userType]?.[action] || false;
  }

  /**
   * Middleware to check specific permissions
   */
  static requirePermission(action: string) {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
          message: 'User context not found'
        });
      }

      if (!RoleGuard.hasPermission(req.user.userType, action)) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions',
          message: `You don't have permission to ${action}`
        });
      }

      return next();
    };
  }
}

/**
 * Middleware to verify resource ownership
 */
export function requireOwnership(resourceIdParam: string = 'id', resourceCollection: string) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
          message: 'User context not found'
        });
      }

      const resourceId = req.params[resourceIdParam];
      if (!resourceId) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request',
          message: `Resource ID parameter '${resourceIdParam}' is required`
        });
      }

      // Get resource from Firestore
      const db = admin.firestore();
      const resourceDoc = await db.collection(resourceCollection).doc(resourceId).get();

      if (!resourceDoc.exists) {
        return res.status(404).json({
          success: false,
          error: 'Resource not found',
          message: `${resourceCollection} not found`
        });
      }

      const resourceData = resourceDoc.data();
      
      // Check ownership based on resource type
      let isOwner = false;
      if (resourceCollection === 'services') {
        isOwner = resourceData?.providerId === req.user.userId;
      } else if (resourceCollection === 'bookings') {
        isOwner = resourceData?.clientId === req.user.userId || 
                  resourceData?.providerId === req.user.userId;
      } else {
        // Generic ownership check - look for userId, clientId, or providerId
        isOwner = resourceData?.userId === req.user.userId ||
                  resourceData?.clientId === req.user.userId ||
                  resourceData?.providerId === req.user.userId;
      }

      if (!isOwner) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
          message: 'You can only access your own resources'
        });
      }

      return next();

    } catch (error) {
      console.error('Ownership verification error:', error);
      return res.status(500).json({
        success: false,
        error: 'Authorization error',
        message: 'Internal server error during ownership verification'
      });
    }
  };
}

/**
 * Middleware to log authentication events
 */
export function authLogger(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization;
  const userId = req.user?.userId;
  const userType = req.user?.userType;
  
  console.log(`Auth Event: ${req.method} ${req.path}`, {
    hasToken: !!token,
    userId: userId || 'anonymous',
    userType: userType || 'none',
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  return next();
}

/**
 * Error handler for authentication-related errors
 */
export function authErrorHandler(error: any, req: Request, res: Response, next: NextFunction) {
  if (error.name === 'UnauthorizedError') {
    return res.status(401).json({
      success: false,
      error: 'Authentication failed',
      message: error.message
    });
  }

  if (error.name === 'ForbiddenError') {
    return res.status(403).json({
      success: false,
      error: 'Access denied',
      message: error.message
    });
  }

  return next(error);
}