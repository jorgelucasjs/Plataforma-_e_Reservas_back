import { 
  CreateBookingRequest, 
  CancelBookingRequest, 
  BookingFilters,
  BookingValidationResult,
  BookingValidationError,
  BookingStatus 
} from '../models/booking';

/**
 * Booking amount validation constraints
 */
const BOOKING_MIN_AMOUNT = 0.01;
const BOOKING_MAX_AMOUNT = 999999.99;

/**
 * Cancellation reason validation constraints
 */
const CANCELLATION_REASON_MAX_LENGTH = 500;

/**
 * Validate booking creation request
 */
export function validateCreateBooking(data: CreateBookingRequest): BookingValidationResult {
  const errors: BookingValidationError[] = [];

  // Validate service ID
  if (!data.serviceId || typeof data.serviceId !== 'string') {
    errors.push({
      field: 'serviceId',
      message: 'Service ID is required',
      code: 'REQUIRED_FIELD'
    });
  } else if (data.serviceId.trim().length === 0) {
    errors.push({
      field: 'serviceId',
      message: 'Service ID cannot be empty',
      code: 'INVALID_VALUE'
    });
  } else if (data.serviceId.trim().length > 100) {
    errors.push({
      field: 'serviceId',
      message: 'Service ID is too long',
      code: 'MAX_LENGTH'
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate booking cancellation request
 */
export function validateCancelBooking(data: CancelBookingRequest): BookingValidationResult {
  const errors: BookingValidationError[] = [];

  // Validate cancellation reason (if provided)
  if (data.cancellationReason !== undefined) {
    if (typeof data.cancellationReason !== 'string') {
      errors.push({
        field: 'cancellationReason',
        message: 'Cancellation reason must be a string',
        code: 'INVALID_TYPE'
      });
    } else if (data.cancellationReason.trim().length > CANCELLATION_REASON_MAX_LENGTH) {
      errors.push({
        field: 'cancellationReason',
        message: `Cancellation reason must not exceed ${CANCELLATION_REASON_MAX_LENGTH} characters`,
        code: 'MAX_LENGTH'
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate booking filters for search and history
 */
export function validateBookingFilters(filters: BookingFilters): BookingValidationResult {
  const errors: BookingValidationError[] = [];

  // Validate startDate (if provided)
  if (filters.startDate !== undefined) {
    if (!(filters.startDate instanceof Date) || isNaN(filters.startDate.getTime())) {
      errors.push({
        field: 'startDate',
        message: 'startDate must be a valid date',
        code: 'INVALID_TYPE'
      });
    }
  }

  // Validate endDate (if provided)
  if (filters.endDate !== undefined) {
    if (!(filters.endDate instanceof Date) || isNaN(filters.endDate.getTime())) {
      errors.push({
        field: 'endDate',
        message: 'endDate must be a valid date',
        code: 'INVALID_TYPE'
      });
    }
  }

  // Validate date range consistency
  if (filters.startDate && filters.endDate) {
    if (filters.startDate > filters.endDate) {
      errors.push({
        field: 'dateRange',
        message: 'startDate cannot be after endDate',
        code: 'INVALID_RANGE'
      });
    }
  }

  // Validate status (if provided)
  if (filters.status !== undefined) {
    const validStatuses: BookingStatus[] = ['confirmed', 'cancelled'];
    if (!validStatuses.includes(filters.status)) {
      errors.push({
        field: 'status',
        message: `status must be one of: ${validStatuses.join(', ')}`,
        code: 'INVALID_VALUE'
      });
    }
  }

  // Validate clientId (if provided)
  if (filters.clientId !== undefined) {
    if (typeof filters.clientId !== 'string' || filters.clientId.trim().length === 0) {
      errors.push({
        field: 'clientId',
        message: 'clientId must be a non-empty string',
        code: 'INVALID_TYPE'
      });
    }
  }

  // Validate providerId (if provided)
  if (filters.providerId !== undefined) {
    if (typeof filters.providerId !== 'string' || filters.providerId.trim().length === 0) {
      errors.push({
        field: 'providerId',
        message: 'providerId must be a non-empty string',
        code: 'INVALID_TYPE'
      });
    }
  }

  // Validate serviceId (if provided)
  if (filters.serviceId !== undefined) {
    if (typeof filters.serviceId !== 'string' || filters.serviceId.trim().length === 0) {
      errors.push({
        field: 'serviceId',
        message: 'serviceId must be a non-empty string',
        code: 'INVALID_TYPE'
      });
    }
  }

  // Validate minAmount (if provided)
  if (filters.minAmount !== undefined) {
    if (typeof filters.minAmount !== 'number' || isNaN(filters.minAmount)) {
      errors.push({
        field: 'minAmount',
        message: 'minAmount must be a valid number',
        code: 'INVALID_TYPE'
      });
    } else if (filters.minAmount < 0) {
      errors.push({
        field: 'minAmount',
        message: 'minAmount must be non-negative',
        code: 'MIN_VALUE'
      });
    }
  }

  // Validate maxAmount (if provided)
  if (filters.maxAmount !== undefined) {
    if (typeof filters.maxAmount !== 'number' || isNaN(filters.maxAmount)) {
      errors.push({
        field: 'maxAmount',
        message: 'maxAmount must be a valid number',
        code: 'INVALID_TYPE'
      });
    } else if (filters.maxAmount < 0) {
      errors.push({
        field: 'maxAmount',
        message: 'maxAmount must be non-negative',
        code: 'MIN_VALUE'
      });
    }
  }

  // Validate amount range consistency
  if (filters.minAmount !== undefined && filters.maxAmount !== undefined) {
    if (filters.minAmount > filters.maxAmount) {
      errors.push({
        field: 'amountRange',
        message: 'minAmount cannot be greater than maxAmount',
        code: 'INVALID_RANGE'
      });
    }
  }

  // Validate sortBy (if provided)
  if (filters.sortBy !== undefined) {
    const validSortFields = ['createdAt', 'amount', 'status'];
    if (!validSortFields.includes(filters.sortBy)) {
      errors.push({
        field: 'sortBy',
        message: `sortBy must be one of: ${validSortFields.join(', ')}`,
        code: 'INVALID_VALUE'
      });
    }
  }

  // Validate sortOrder (if provided)
  if (filters.sortOrder !== undefined) {
    const validSortOrders = ['asc', 'desc'];
    if (!validSortOrders.includes(filters.sortOrder)) {
      errors.push({
        field: 'sortOrder',
        message: `sortOrder must be one of: ${validSortOrders.join(', ')}`,
        code: 'INVALID_VALUE'
      });
    }
  }

  // Validate limit (if provided)
  if (filters.limit !== undefined) {
    if (typeof filters.limit !== 'number' || !Number.isInteger(filters.limit)) {
      errors.push({
        field: 'limit',
        message: 'limit must be an integer',
        code: 'INVALID_TYPE'
      });
    } else if (filters.limit < 1) {
      errors.push({
        field: 'limit',
        message: 'limit must be at least 1',
        code: 'MIN_VALUE'
      });
    } else if (filters.limit > 100) {
      errors.push({
        field: 'limit',
        message: 'limit must not exceed 100',
        code: 'MAX_VALUE'
      });
    }
  }

  // Validate offset (if provided)
  if (filters.offset !== undefined) {
    if (typeof filters.offset !== 'number' || !Number.isInteger(filters.offset)) {
      errors.push({
        field: 'offset',
        message: 'offset must be an integer',
        code: 'INVALID_TYPE'
      });
    } else if (filters.offset < 0) {
      errors.push({
        field: 'offset',
        message: 'offset must be non-negative',
        code: 'MIN_VALUE'
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate booking amount
 */
export function validateBookingAmount(amount: number): BookingValidationResult {
  const errors: BookingValidationError[] = [];

  if (typeof amount !== 'number' || isNaN(amount)) {
    errors.push({
      field: 'amount',
      message: 'Amount must be a valid number',
      code: 'INVALID_TYPE'
    });
  } else if (amount < BOOKING_MIN_AMOUNT) {
    errors.push({
      field: 'amount',
      message: `Amount must be at least ${BOOKING_MIN_AMOUNT}`,
      code: 'MIN_VALUE'
    });
  } else if (amount > BOOKING_MAX_AMOUNT) {
    errors.push({
      field: 'amount',
      message: `Amount must not exceed ${BOOKING_MAX_AMOUNT}`,
      code: 'MAX_VALUE'
    });
  } else if (!Number.isFinite(amount)) {
    errors.push({
      field: 'amount',
      message: 'Amount must be a finite number',
      code: 'INVALID_FORMAT'
    });
  } else {
    // Check for reasonable decimal places (max 2)
    const decimalPlaces = (amount.toString().split('.')[1] || '').length;
    if (decimalPlaces > 2) {
      errors.push({
        field: 'amount',
        message: 'Amount can have at most 2 decimal places',
        code: 'INVALID_FORMAT'
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate booking status
 */
export function validateBookingStatus(status: string): BookingValidationResult {
  const errors: BookingValidationError[] = [];
  const validStatuses: BookingStatus[] = ['confirmed', 'cancelled'];

  if (!status || typeof status !== 'string') {
    errors.push({
      field: 'status',
      message: 'Status is required',
      code: 'REQUIRED_FIELD'
    });
  } else if (!validStatuses.includes(status as BookingStatus)) {
    errors.push({
      field: 'status',
      message: `Status must be one of: ${validStatuses.join(', ')}`,
      code: 'INVALID_VALUE'
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Sanitize booking creation data
 */
export function sanitizeCreateBookingData(data: CreateBookingRequest): CreateBookingRequest {
  return {
    serviceId: data.serviceId?.trim() || ''
  };
}

/**
 * Sanitize booking cancellation data
 */
export function sanitizeCancelBookingData(data: CancelBookingRequest): CancelBookingRequest {
  const sanitized: CancelBookingRequest = {};

  if (data.cancellationReason !== undefined) {
    sanitized.cancellationReason = data.cancellationReason.trim();
  }

  return sanitized;
}

/**
 * Sanitize booking filters
 */
export function sanitizeBookingFilters(filters: BookingFilters): BookingFilters {
  const sanitized: BookingFilters = {};

  if (filters.startDate !== undefined) {
    sanitized.startDate = filters.startDate;
  }

  if (filters.endDate !== undefined) {
    sanitized.endDate = filters.endDate;
  }

  if (filters.status !== undefined) {
    sanitized.status = filters.status;
  }

  if (filters.clientId !== undefined) {
    sanitized.clientId = filters.clientId.trim();
  }

  if (filters.providerId !== undefined) {
    sanitized.providerId = filters.providerId.trim();
  }

  if (filters.serviceId !== undefined) {
    sanitized.serviceId = filters.serviceId.trim();
  }

  if (filters.minAmount !== undefined && typeof filters.minAmount === 'number') {
    sanitized.minAmount = Math.max(0, Math.round(filters.minAmount * 100) / 100);
  }

  if (filters.maxAmount !== undefined && typeof filters.maxAmount === 'number') {
    sanitized.maxAmount = Math.max(0, Math.round(filters.maxAmount * 100) / 100);
  }

  if (filters.sortBy !== undefined) {
    sanitized.sortBy = filters.sortBy;
  }

  if (filters.sortOrder !== undefined) {
    sanitized.sortOrder = filters.sortOrder;
  }

  if (filters.limit !== undefined && typeof filters.limit === 'number') {
    sanitized.limit = Math.min(100, Math.max(1, Math.floor(filters.limit)));
  }

  if (filters.offset !== undefined && typeof filters.offset === 'number') {
    sanitized.offset = Math.max(0, Math.floor(filters.offset));
  }

  return sanitized;
}