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

// Validation middleware
export {
    validateRequest,
    validateUserRegistration,
    validateUserLogin,
    validateCreateService,
    validateUpdateService,
    validateServiceFilters,
    validateCreateBooking,
    validateCancelBooking,
    validateBookingFilters,
    sanitizeInput,
    validateContentType,
    validateRequestSize,
    validateIdParam,
    convertQueryParams
} from './validation';

// Error handling middleware
export {
    errorHandler,
    notFoundHandler,
    asyncHandler,
    timeoutHandler,
    securityErrorHandler,
    logError
} from './errorHandler';