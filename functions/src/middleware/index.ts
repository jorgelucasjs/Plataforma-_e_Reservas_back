// Middleware exports

// Authentication middleware
export {
    authenticateToken,
    requireAuth,
    requireClient,
    requireProvider,
    requireUser,
    optionalAuth,
    RoleGuard,
    requireOwnership,
    authLogger,
    authErrorHandler
} from './auth';

// Other middleware (to be implemented in subsequent tasks)
// export * from './validation';
// export * from './errorHandler';