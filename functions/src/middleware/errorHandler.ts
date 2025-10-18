// Middleware global de tratamento de erros

import { Request, Response, NextFunction } from 'express';
import { ErrorResponse, APIError, ValidationAPIError, ErrorCodes } from '../types/responses';
import * as functions from 'firebase-functions';

// Utilitário aprimorado de registro de erros
export const logError = (error: Error, req: Request, context?: any): void => {
  const errorInfo = {
    message: error.message,
    stack: error.stack,
    name: error.name,
    timestamp: new Date().toISOString(),
    requestId: req.headers['x-request-id'] || 'unknown',
    method: req.method,
    url: req.originalUrl,
    userAgent: req.headers['user-agent'],
    ip: req.ip,
    userId: (req as any).user?.userId,
    context
  };

  // Usar logger do Firebase Functions para registro estruturado
  if (error instanceof APIError && error.statusCode < 500) {
    // Erros do cliente - registrar como aviso
    functions.logger.warn('Erro do cliente ocorreu', errorInfo);
  } else {
    // Erros do servidor - registrar como erro
    functions.logger.error('Erro do servidor ocorreu', errorInfo);
  }
};

// Middleware global de tratamento de erros
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Registrar o erro com contexto
  logError(error, req);

  // Lidar com diferentes tipos de erro
  if (error instanceof ValidationAPIError) {
    const errorResponse: ErrorResponse = {
      success: false,
      error: 'Validation Error',
      message: error.message,
      code: error.code,
      details: error.validationErrors
    };
    res.status(error.statusCode).json(errorResponse);
    return;
  }

  if (error instanceof APIError) {
    const errorResponse: ErrorResponse = {
      success: false,
      error: error.name,
      message: error.message,
      code: error.code,
      details: error.details
    };
    res.status(error.statusCode).json(errorResponse);
    return;
  }

  // Lidar com erros do Firebase Admin SDK
  if (error.name === 'FirebaseError' || error.message.includes('firebase')) {
    const errorResponse: ErrorResponse = {
      success: false,
      error: 'Database Error',
      message: 'Uma operação de banco de dados falhou',
      code: ErrorCodes.DATABASE_ERROR
    };
    res.status(500).json(errorResponse);
    return;
  }

  // Lidar com erros JWT
  if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
    const errorResponse: ErrorResponse = {
      success: false,
      error: 'Authentication Error',
      message: 'Token inválido ou expirado',
      code: ErrorCodes.AUTHENTICATION_ERROR
    };
    res.status(401).json(errorResponse);
    return;
  }

  // Lidar com erros de validação do express-validator ou joi
  if (error.name === 'ValidationError') {
    const errorResponse: ErrorResponse = {
      success: false,
      error: 'Validation Error',
      message: error.message,
      code: ErrorCodes.VALIDATION_ERROR
    };
    res.status(400).json(errorResponse);
    return;
  }

  // Lidar com erros de sintaxe (JSON malformado, etc.)
  if (error instanceof SyntaxError && 'body' in error) {
    const errorResponse: ErrorResponse = {
      success: false,
      error: 'Bad Request',
      message: 'JSON inválido no corpo da requisição',
      code: ErrorCodes.VALIDATION_ERROR
    };
    res.status(400).json(errorResponse);
    return;
  }

  // Resposta de erro padrão para erros não tratados
  const errorResponse: ErrorResponse = {
    success: false,
    error: 'Internal Server Error',
    message: 'Ocorreu um erro inesperado',
    code: ErrorCodes.INTERNAL_ERROR
  };

  res.status(500).json(errorResponse);
};

// Manipulador 404 para rotas não encontradas
export const notFoundHandler = (req: Request, res: Response): void => {
  const errorResponse: ErrorResponse = {
    success: false,
    error: 'Not Found',
    message: `Rota ${req.method} ${req.originalUrl} não encontrada`,
    code: ErrorCodes.NOT_FOUND
  };
  
  functions.logger.warn('Rota não encontrada', {
    method: req.method,
    url: req.originalUrl,
    timestamp: new Date().toISOString(),
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });

  res.status(404).json(errorResponse);
};

// Utilitário wrapper de erro assíncrono
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Manipulador de timeout de requisição
export const timeoutHandler = (timeoutMs: number = 30000) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const timeout = setTimeout(() => {
      const error = new APIError(
        'Timeout da requisição',
        408,
        ErrorCodes.INTERNAL_ERROR
      );
      next(error);
    }, timeoutMs);

    // Limpar timeout quando a resposta terminar
    res.on('finish', () => clearTimeout(timeout));
    res.on('close', () => clearTimeout(timeout));

    next();
  };
};

// Manipulador de erros de segurança para limitação de taxa, etc.
export const securityErrorHandler = (error: any, req: Request, res: Response, next: NextFunction): void => {
  if (error.type === 'entity.too.large') {
    const errorResponse: ErrorResponse = {
      success: false,
      error: 'Payload Too Large',
      message: 'Request payload exceeds size limit',
      code: ErrorCodes.VALIDATION_ERROR
    };
    res.status(413).json(errorResponse);
    return;
  }

  if (error.code === 'LIMIT_FILE_SIZE') {
    const errorResponse: ErrorResponse = {
      success: false,
      error: 'File Too Large',
      message: 'Uploaded file exceeds size limit',
      code: ErrorCodes.VALIDATION_ERROR
    };
    res.status(413).json(errorResponse);
    return;
  }

  next(error);
};