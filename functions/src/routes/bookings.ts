import { Router, Response } from 'express';
import { bookingService } from '../services/bookingService';
import { CreateBookingRequest, CancelBookingRequest, BookingFilters } from '../models/booking';
import { AuthenticatedRequest } from '../types/auth';
import { authenticateToken } from '../middleware/auth';
import { ErrorResponse, APIError } from '../types/responses';
import { 
  validateCreateBooking, 
  validateCancelBooking, 
  validateBookingFilters,
  sanitizeCreateBookingData,
  sanitizeCancelBookingData,
  sanitizeBookingFilters
} from '../validation/bookingValidation';

const router = Router();

/**
 * POST /bookings - Create booking (clients only)
 * Requirements: 5.1, 8.2
 */
router.post('/', authenticateToken({ roles: ['client'] }), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const bookingData: CreateBookingRequest = req.body;

    // Validate required fields
    if (!bookingData.serviceId) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: 'Validation Error',
        message: 'serviceId is required'
      };
      return res.status(400).json(errorResponse);
    }

    // Validate booking data
    const validationResult = validateCreateBooking(bookingData);
    if (!validationResult.isValid) {
      const errors = validationResult.errors.map(e => e.message);
      const errorResponse: ErrorResponse = {
        success: false,
        error: 'Validation Error',
        message: errors.join(', ')
      };
      return res.status(400).json(errorResponse);
    }

    // Sanitize data
    const sanitizedData = sanitizeCreateBookingData(bookingData);

    // Create booking using booking service
    const booking = await bookingService.createBooking(req.user!.userId, sanitizedData.serviceId);

    const response = {
      success: true,
      message: 'Booking created successfully',
      data: booking
    };

    return res.status(201).json(response);

  } catch (error) {
    console.error('Create booking endpoint error:', error);

    if (error instanceof APIError) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: error.code,
        message: error.message,
        details: error.details
      };
      return res.status(error.statusCode).json(errorResponse);
    }

    // Handle specific booking errors
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    let statusCode = 500;

    if (errorMessage.includes('not found')) {
      statusCode = 404;
    } else if (errorMessage.includes('insufficient balance') || 
               errorMessage.includes('not active') ||
               errorMessage.includes('Only clients')) {
      statusCode = 400;
    }

    const errorResponse: ErrorResponse = {
      success: false,
      error: 'Booking Creation Failed',
      message: errorMessage
    };

    return res.status(statusCode).json(errorResponse);
  }
});

/**
 * GET /bookings/my - Get user's bookings
 * Requirements: 6.1, 6.2, 8.2
 */
router.get('/my', authenticateToken(), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const userType = req.user!.userType;

    let bookings;

    // Get bookings based on user type
    if (userType === 'client') {
      bookings = await bookingService.getBookingsByClient(userId);
    } else if (userType === 'provider') {
      bookings = await bookingService.getBookingsByProvider(userId);
    } else {
      const errorResponse: ErrorResponse = {
        success: false,
        error: 'Authorization Error',
        message: 'Invalid user type'
      };
      return res.status(403).json(errorResponse);
    }

    const response = {
      success: true,
      message: 'Bookings retrieved successfully',
      data: {
        bookings,
        count: bookings.length,
        userType
      }
    };

    return res.status(200).json(response);

  } catch (error) {
    console.error('Get user bookings endpoint error:', error);

    const errorResponse: ErrorResponse = {
      success: false,
      error: 'Retrieval Failed',
      message: error instanceof Error ? error.message : 'Failed to retrieve bookings'
    };

    return res.status(500).json(errorResponse);
  }
});

/**
 * PUT /bookings/:id/cancel - Cancel booking
 * Requirements: 6.1, 6.2, 8.2
 */
router.put('/:id/cancel', authenticateToken(), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const bookingId = req.params.id;
    const userId = req.user!.userId;
    const userType = req.user!.userType;
    const cancellationData: CancelBookingRequest = req.body || {};

    // Validate booking ID
    if (!bookingId || typeof bookingId !== 'string') {
      const errorResponse: ErrorResponse = {
        success: false,
        error: 'Validation Error',
        message: 'Valid booking ID is required'
      };
      return res.status(400).json(errorResponse);
    }

    // Validate cancellation data
    const validationResult = validateCancelBooking(cancellationData);
    if (!validationResult.isValid) {
      const errors = validationResult.errors.map(e => e.message);
      const errorResponse: ErrorResponse = {
        success: false,
        error: 'Validation Error',
        message: errors.join(', ')
      };
      return res.status(400).json(errorResponse);
    }

    // Sanitize data
    const sanitizedData = sanitizeCancelBookingData(cancellationData);

    // Cancel booking using booking service
    const cancelledBooking = await bookingService.cancelBooking(
      bookingId, 
      userId, 
      userType as 'client' | 'provider',
      sanitizedData.cancellationReason
    );

    const response = {
      success: true,
      message: 'Booking cancelled successfully',
      data: cancelledBooking
    };

    return res.status(200).json(response);

  } catch (error) {
    console.error('Cancel booking endpoint error:', error);

    if (error instanceof APIError) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: error.code,
        message: error.message,
        details: error.details
      };
      return res.status(error.statusCode).json(errorResponse);
    }

    // Handle specific cancellation errors
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    let statusCode = 500;

    if (errorMessage.includes('not found')) {
      statusCode = 404;
    } else if (errorMessage.includes('permission') || 
               errorMessage.includes('do not have')) {
      statusCode = 403;
    } else if (errorMessage.includes('cannot be cancelled') ||
               errorMessage.includes('Only confirmed')) {
      statusCode = 400;
    }

    const errorResponse: ErrorResponse = {
      success: false,
      error: 'Booking Cancellation Failed',
      message: errorMessage
    };

    return res.status(statusCode).json(errorResponse);
  }
});

/**
 * GET /bookings/history - Get booking history with filtering
 * Requirements: 7.1, 8.2
 */
router.get('/history', authenticateToken(), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const userType = req.user!.userType;

    // Parse query parameters for filtering
    const filters: BookingFilters = {};

    // Date filters
    if (req.query.startDate) {
      filters.startDate = new Date(req.query.startDate as string);
    }

    if (req.query.endDate) {
      filters.endDate = new Date(req.query.endDate as string);
    }

    // Status filter
    if (req.query.status) {
      filters.status = req.query.status as 'confirmed' | 'cancelled';
    }

    // Amount filters
    if (req.query.minAmount) {
      filters.minAmount = parseFloat(req.query.minAmount as string);
    }

    if (req.query.maxAmount) {
      filters.maxAmount = parseFloat(req.query.maxAmount as string);
    }

    // Service filter
    if (req.query.serviceId) {
      filters.serviceId = req.query.serviceId as string;
    }

    // Sorting
    if (req.query.sortBy) {
      filters.sortBy = req.query.sortBy as 'createdAt' | 'amount' | 'status';
    }

    if (req.query.sortOrder) {
      filters.sortOrder = req.query.sortOrder as 'asc' | 'desc';
    }

    // Pagination
    if (req.query.limit) {
      filters.limit = parseInt(req.query.limit as string, 10);
    }

    if (req.query.offset) {
      filters.offset = parseInt(req.query.offset as string, 10);
    }

    // Apply user-specific filters based on user type
    if (userType === 'client') {
      filters.clientId = userId;
    } else if (userType === 'provider') {
      filters.providerId = userId;
    }

    // Validate filters
    const validationResult = validateBookingFilters(filters);
    if (!validationResult.isValid) {
      const errors = validationResult.errors.map(e => e.message);
      const errorResponse: ErrorResponse = {
        success: false,
        error: 'Validation Error',
        message: errors.join(', ')
      };
      return res.status(400).json(errorResponse);
    }

    // Sanitize filters
    const sanitizedFilters = sanitizeBookingFilters(filters);

    // Get booking history using booking service
    const result = await bookingService.getBookingHistory(sanitizedFilters);

    const response = {
      success: true,
      message: 'Booking history retrieved successfully',
      data: {
        bookings: result.bookings,
        total: result.total,
        hasMore: result.hasMore,
        filters: result.filters,
        userType
      }
    };

    return res.status(200).json(response);

  } catch (error) {
    console.error('Get booking history endpoint error:', error);

    const errorResponse: ErrorResponse = {
      success: false,
      error: 'History Retrieval Failed',
      message: error instanceof Error ? error.message : 'Failed to retrieve booking history'
    };

    return res.status(500).json(errorResponse);
  }
});

export { router as bookingRoutes };