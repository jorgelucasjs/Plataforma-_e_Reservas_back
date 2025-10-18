import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwtUtils';
import { UserType, UserContext, AuthMiddlewareOptions, AuthenticatedRequest } from '../types/auth';
import { SecurityMonitor } from '../utils/monitoring';
import * as admin from 'firebase-admin';

/**
 * Middleware de autenticação para validar tokens JWT e injetar contexto do usuário
 */
export function authenticateToken(options: AuthMiddlewareOptions = {}) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { required = true, roles = [], skipRoutes = [] } = options;

      // Pular autenticação para rotas especificadas
      if (skipRoutes.some(route => req.path.includes(route))) {
        return next();
      }

      // Obter token do cabeçalho Authorization
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.startsWith('Bearer ') 
        ? authHeader.slice(7) 
        : authHeader;

      // Se o token não for fornecido e a autenticação for obrigatória
      if (!token) {
        if (required) {
          // Registrar falha de autenticação usando monitor de segurança
          SecurityMonitor.logAuthFailure(
            'Autenticação obrigatória mas nenhum token fornecido',
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

      // Verificar o token
      const verification = verifyToken(token);

      if (!verification.isValid) {
        // Registrar falha de verificação de token usando monitor de segurança
        SecurityMonitor.logAuthFailure(
          'Falha na verificação do token',
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

      // Obter detalhes do usuário do Firestore para garantir que o usuário ainda existe e está ativo
      const db = admin.firestore();
      const userDoc = await db.collection('users').doc(verification.payload.userId).get();

      if (!userDoc.exists) {
        // Registrar evento de segurança de usuário não encontrado usando monitor de segurança
        SecurityMonitor.logSuspiciousActivity(
          'Token referencia usuário inexistente',
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
        // Registrar tentativa de acesso de conta desativada usando monitor de segurança
        SecurityMonitor.logAuthFailure(
          'Tentativa de acesso de conta desativada',
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

      // Criar contexto do usuário
      const userContext: UserContext = {
        userId: verification.payload.userId,
        email: verification.payload.email,
        userType: verification.payload.userType,
        fullName: userData.fullName,
        balance: userData.balance || 0
      };

      // Verificar acesso baseado em função se funções forem especificadas
      if (roles.length > 0 && !roles.includes(userContext.userType)) {
        // Registrar falha de autorização usando monitor de segurança
        SecurityMonitor.logPermissionDenied(
          'Permissões insuficientes para acesso baseado em função',
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

      // Registrar autenticação bem-sucedida usando monitor de segurança
      SecurityMonitor.logAuthSuccess(
        userContext.userId,
        userContext.userType,
        req.ip || 'unknown',
        req.path,
        req.method,
        req.get('User-Agent')
      );

      // Injetar contexto do usuário na requisição
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
 * Middleware para exigir autenticação (atalho para authenticateToken com required: true)
 */
export const requireAuth = authenticateToken({ required: true });

/**
 * Middleware para exigir função de cliente
 */
export const requireClient = authenticateToken({ 
  required: true, 
  roles: ['client'] 
});

/**
 * Middleware para exigir função de provedor
 */
export const requireProvider = authenticateToken({ 
  required: true, 
  roles: ['provider'] 
});

/**
 * Middleware para exigir função de cliente ou provedor (qualquer usuário autenticado)
 */
export const requireUser = authenticateToken({ 
  required: true, 
  roles: ['client', 'provider'] 
});

/**
 * Middleware de autenticação opcional (não falha se nenhum token for fornecido)
 */
export const optionalAuth = authenticateToken({ required: false });

/**
 * Auxiliar de controle de acesso baseado em função
 */
export class RoleGuard {
  /**
   * Verificar se o usuário tem permissão para executar uma ação
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
   * Middleware para verificar permissões específicas
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
 * Middleware para verificar propriedade do recurso
 */
export function requireOwnership(resourceIdParam: string = 'id', resourceCollection: string) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
          message: 'Contexto do usuário não encontrado'
        });
      }

      const resourceId = req.params[resourceIdParam];
      if (!resourceId) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request',
          message: `Parâmetro de ID do recurso '${resourceIdParam}' é obrigatório`
        });
      }

      // Obter recurso do Firestore
      const db = admin.firestore();
      const resourceDoc = await db.collection(resourceCollection).doc(resourceId).get();

      if (!resourceDoc.exists) {
        return res.status(404).json({
          success: false,
          error: 'Resource not found',
          message: `${resourceCollection} não encontrado`
        });
      }

      const resourceData = resourceDoc.data();
      
      // Verificar propriedade baseada no tipo de recurso
      let isOwner = false;
      if (resourceCollection === 'services') {
        isOwner = resourceData?.providerId === req.user.userId;
      } else if (resourceCollection === 'bookings') {
        isOwner = resourceData?.clientId === req.user.userId || 
                  resourceData?.providerId === req.user.userId;
      } else {
        // Verificação genérica de propriedade - procurar por userId, clientId, ou providerId
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
 * Middleware para registrar eventos de autenticação
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
 * Manipulador de erros para erros relacionados à autenticação
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