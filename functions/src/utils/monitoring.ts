// Utilitários de monitoramento de performance e logging

import * as functions from 'firebase-functions';

export interface DatabaseOperationMetrics {
  operation: string;
  collection: string;
  documentId?: string;
  duration: number;
  success: boolean;
  error?: string;
  timestamp: string;
  userId?: string;
  userType?: string;
}

export interface RequestMetrics {
  method: string;
  path: string;
  statusCode: number;
  duration: number;
  timestamp: string;
  ip: string;
  userAgent?: string;
  userId?: string;
  userType?: string;
  contentLength?: number;
}

export interface SecurityEvent {
  type: 'auth_failure' | 'auth_success' | 'permission_denied' | 'suspicious_activity' | 'rate_limit_exceeded';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: string;
  ip: string;
  userAgent?: string;
  userId?: string;
  userType?: string;
  path: string;
  method: string;
  details?: any;
}

/**
 * Monitorar operações de banco de dados para rastreamento de performance
 */
export class DatabaseMonitor {
  /**
   * Envolver uma operação de banco de dados com monitoramento de performance
   */
  static async monitor<T>(
    operation: string,
    collection: string,
    documentId: string | undefined,
    dbOperation: () => Promise<T>,
    userId?: string,
    userType?: string
  ): Promise<T> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();
    
    try {
      const result = await dbOperation();
      const duration = Date.now() - startTime;
      
      const metrics: DatabaseOperationMetrics = {
        operation,
        collection,
        documentId,
        duration,
        success: true,
        timestamp,
        userId,
        userType
      };
      
      // Registrar métricas de performance
      if (duration > 1000) {
        // Registrar operações lentas como avisos
        functions.logger.warn('Operação lenta de banco de dados detectada', metrics);
      } else {
        functions.logger.info('Operação de banco de dados concluída', metrics);
      }
      
      return result;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      const metrics: DatabaseOperationMetrics = {
        operation,
        collection,
        documentId,
        duration,
        success: false,
        error: errorMessage,
        timestamp,
        userId,
        userType
      };
      
      functions.logger.error('Database operation failed', metrics);
      throw error;
    }
  }
}

/**
 * Monitoramento de performance de requisições
 */
export class RequestMonitor {
  /**
   * Registrar métricas de requisição
   */
  static logRequest(metrics: RequestMetrics): void {
    if (metrics.statusCode >= 500) {
      functions.logger.error('Server error response', metrics);
    } else if (metrics.statusCode >= 400) {
      functions.logger.warn('Client error response', metrics);
    } else if (metrics.duration > 5000) {
      functions.logger.warn('Slow request detected', metrics);
    } else {
      functions.logger.info('Request completed', metrics);
    }
  }
}

/**
 * Monitoramento de eventos de segurança
 */
export class SecurityMonitor {
  /**
   * Registrar eventos de segurança
   */
  static logSecurityEvent(event: SecurityEvent): void {
    const logLevel = event.severity === 'critical' || event.severity === 'high' ? 'error' : 
                    event.severity === 'medium' ? 'warn' : 'info';
    
    functions.logger[logLevel](`[SECURITY] ${event.type.toUpperCase()}`, event);
    
    // Para eventos críticos, também registrar no console para visibilidade imediata
    if (event.severity === 'critical') {
      console.error(`[EVENTO DE SEGURANÇA CRÍTICO] ${event.message}`, event);
    }
  }
  
  /**
   * Log authentication failure
   */
  static logAuthFailure(
    message: string,
    ip: string,
    path: string,
    method: string,
    userAgent?: string,
    userId?: string,
    details?: any
  ): void {
    this.logSecurityEvent({
      type: 'auth_failure',
      severity: 'medium',
      message,
      timestamp: new Date().toISOString(),
      ip,
      userAgent,
      userId,
      path,
      method,
      details
    });
  }
  
  /**
   * Log successful authentication
   */
  static logAuthSuccess(
    userId: string,
    userType: string,
    ip: string,
    path: string,
    method: string,
    userAgent?: string
  ): void {
    this.logSecurityEvent({
      type: 'auth_success',
      severity: 'low',
      message: 'User authenticated successfully',
      timestamp: new Date().toISOString(),
      ip,
      userAgent,
      userId,
      userType,
      path,
      method
    });
  }
  
  /**
   * Log permission denied events
   */
  static logPermissionDenied(
    message: string,
    userId: string,
    userType: string,
    ip: string,
    path: string,
    method: string,
    userAgent?: string,
    details?: any
  ): void {
    this.logSecurityEvent({
      type: 'permission_denied',
      severity: 'medium',
      message,
      timestamp: new Date().toISOString(),
      ip,
      userAgent,
      userId,
      userType,
      path,
      method,
      details
    });
  }
  
  /**
   * Log suspicious activity
   */
  static logSuspiciousActivity(
    message: string,
    ip: string,
    path: string,
    method: string,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'high',
    userAgent?: string,
    userId?: string,
    userType?: string,
    details?: any
  ): void {
    this.logSecurityEvent({
      type: 'suspicious_activity',
      severity,
      message,
      timestamp: new Date().toISOString(),
      ip,
      userAgent,
      userId,
      userType,
      path,
      method,
      details
    });
  }
}

/**
 * Performance thresholds for monitoring
 */
export const PERFORMANCE_THRESHOLDS = {
  SLOW_REQUEST_MS: 5000,
  SLOW_DB_OPERATION_MS: 1000,
  VERY_SLOW_DB_OPERATION_MS: 3000,
  MAX_REQUEST_SIZE_BYTES: 1024 * 1024, // 1MB
  MAX_RESPONSE_SIZE_BYTES: 10 * 1024 * 1024 // 10MB
};

/**
 * Middleware factory for request monitoring
 */
export function createRequestMonitoringMiddleware() {
  return (req: any, res: any, next: any) => {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();
    
    // Capture original end function
    const originalEnd = res.end;
    
    // Override end function to capture metrics
    res.end = function(chunk: any, encoding: any) {
      const duration = Date.now() - startTime;
      
      const metrics: RequestMetrics = {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
        timestamp,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: req.user?.userId,
        userType: req.user?.userType,
        contentLength: req.get('Content-Length') ? parseInt(req.get('Content-Length')) : undefined
      };
      
      RequestMonitor.logRequest(metrics);
      
      // Call original end function
      originalEnd.call(this, chunk, encoding);
    };
    
    next();
  };
}