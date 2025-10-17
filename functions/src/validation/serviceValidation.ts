import { 
  CreateServiceRequest, 
  UpdateServiceRequest, 
  ServiceFilters,
  ServiceValidationResult,
  ServiceValidationError 
} from '../models/service';

/**
 * Service name validation constraints
 */
const SERVICE_NAME_MIN_LENGTH = 3;
const SERVICE_NAME_MAX_LENGTH = 100;

/**
 * Service description validation constraints
 */
const SERVICE_DESCRIPTION_MIN_LENGTH = 10;
const SERVICE_DESCRIPTION_MAX_LENGTH = 1000;

/**
 * Service price validation constraints
 */
const SERVICE_MIN_PRICE = 0.01;
const SERVICE_MAX_PRICE = 999999.99;

/**
 * Search term validation constraints
 */
const SEARCH_TERM_MAX_LENGTH = 100;

/**
 * Validate service creation data
 */
export function validateCreateService(data: CreateServiceRequest): ServiceValidationResult {
  const errors: ServiceValidationError[] = [];

  // Validate service name
  if (!data.name || typeof data.name !== 'string') {
    errors.push({
      field: 'name',
      message: 'Service name is required',
      code: 'REQUIRED_FIELD'
    });
  } else if (data.name.trim().length < SERVICE_NAME_MIN_LENGTH) {
    errors.push({
      field: 'name',
      message: `Service name must be at least ${SERVICE_NAME_MIN_LENGTH} characters long`,
      code: 'MIN_LENGTH'
    });
  } else if (data.name.trim().length > SERVICE_NAME_MAX_LENGTH) {
    errors.push({
      field: 'name',
      message: `Service name must not exceed ${SERVICE_NAME_MAX_LENGTH} characters`,
      code: 'MAX_LENGTH'
    });
  }

  // Validate service description
  if (!data.description || typeof data.description !== 'string') {
    errors.push({
      field: 'description',
      message: 'Service description is required',
      code: 'REQUIRED_FIELD'
    });
  } else if (data.description.trim().length < SERVICE_DESCRIPTION_MIN_LENGTH) {
    errors.push({
      field: 'description',
      message: `Service description must be at least ${SERVICE_DESCRIPTION_MIN_LENGTH} characters long`,
      code: 'MIN_LENGTH'
    });
  } else if (data.description.trim().length > SERVICE_DESCRIPTION_MAX_LENGTH) {
    errors.push({
      field: 'description',
      message: `Service description must not exceed ${SERVICE_DESCRIPTION_MAX_LENGTH} characters`,
      code: 'MAX_LENGTH'
    });
  }

  // Validate service price
  if (data.price === undefined || data.price === null || typeof data.price !== 'number') {
    errors.push({
      field: 'price',
      message: 'Service price is required',
      code: 'REQUIRED_FIELD'
    });
  } else if (isNaN(data.price)) {
    errors.push({
      field: 'price',
      message: 'Service price must be a valid number',
      code: 'INVALID_FORMAT'
    });
  } else if (data.price < SERVICE_MIN_PRICE) {
    errors.push({
      field: 'price',
      message: `Service price must be at least ${SERVICE_MIN_PRICE}`,
      code: 'MIN_VALUE'
    });
  } else if (data.price > SERVICE_MAX_PRICE) {
    errors.push({
      field: 'price',
      message: `Service price must not exceed ${SERVICE_MAX_PRICE}`,
      code: 'MAX_VALUE'
    });
  } else if (!Number.isFinite(data.price)) {
    errors.push({
      field: 'price',
      message: 'Service price must be a finite number',
      code: 'INVALID_FORMAT'
    });
  } else {
    // Check for reasonable decimal places (max 2)
    const decimalPlaces = (data.price.toString().split('.')[1] || '').length;
    if (decimalPlaces > 2) {
      errors.push({
        field: 'price',
        message: 'Service price can have at most 2 decimal places',
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
 * Validate service update data
 */
export function validateUpdateService(data: UpdateServiceRequest): ServiceValidationResult {
  const errors: ServiceValidationError[] = [];

  // Validate service name (if provided)
  if (data.name !== undefined) {
    if (!data.name || typeof data.name !== 'string') {
      errors.push({
        field: 'name',
        message: 'Service name must be a non-empty string',
        code: 'INVALID_TYPE'
      });
    } else if (data.name.trim().length < SERVICE_NAME_MIN_LENGTH) {
      errors.push({
        field: 'name',
        message: `Service name must be at least ${SERVICE_NAME_MIN_LENGTH} characters long`,
        code: 'MIN_LENGTH'
      });
    } else if (data.name.trim().length > SERVICE_NAME_MAX_LENGTH) {
      errors.push({
        field: 'name',
        message: `Service name must not exceed ${SERVICE_NAME_MAX_LENGTH} characters`,
        code: 'MAX_LENGTH'
      });
    }
  }

  // Validate service description (if provided)
  if (data.description !== undefined) {
    if (!data.description || typeof data.description !== 'string') {
      errors.push({
        field: 'description',
        message: 'Service description must be a non-empty string',
        code: 'INVALID_TYPE'
      });
    } else if (data.description.trim().length < SERVICE_DESCRIPTION_MIN_LENGTH) {
      errors.push({
        field: 'description',
        message: `Service description must be at least ${SERVICE_DESCRIPTION_MIN_LENGTH} characters long`,
        code: 'MIN_LENGTH'
      });
    } else if (data.description.trim().length > SERVICE_DESCRIPTION_MAX_LENGTH) {
      errors.push({
        field: 'description',
        message: `Service description must not exceed ${SERVICE_DESCRIPTION_MAX_LENGTH} characters`,
        code: 'MAX_LENGTH'
      });
    }
  }

  // Validate service price (if provided)
  if (data.price !== undefined) {
    if (data.price === null || typeof data.price !== 'number') {
      errors.push({
        field: 'price',
        message: 'Service price must be a number',
        code: 'INVALID_TYPE'
      });
    } else if (isNaN(data.price)) {
      errors.push({
        field: 'price',
        message: 'Service price must be a valid number',
        code: 'INVALID_FORMAT'
      });
    } else if (data.price < SERVICE_MIN_PRICE) {
      errors.push({
        field: 'price',
        message: `Service price must be at least ${SERVICE_MIN_PRICE}`,
        code: 'MIN_VALUE'
      });
    } else if (data.price > SERVICE_MAX_PRICE) {
      errors.push({
        field: 'price',
        message: `Service price must not exceed ${SERVICE_MAX_PRICE}`,
        code: 'MAX_VALUE'
      });
    } else if (!Number.isFinite(data.price)) {
      errors.push({
        field: 'price',
        message: 'Service price must be a finite number',
        code: 'INVALID_FORMAT'
      });
    } else {
      // Check for reasonable decimal places (max 2)
      const decimalPlaces = (data.price.toString().split('.')[1] || '').length;
      if (decimalPlaces > 2) {
        errors.push({
          field: 'price',
          message: 'Service price can have at most 2 decimal places',
          code: 'INVALID_FORMAT'
        });
      }
    }
  }

  // Validate isActive (if provided)
  if (data.isActive !== undefined && typeof data.isActive !== 'boolean') {
    errors.push({
      field: 'isActive',
      message: 'isActive must be a boolean value',
      code: 'INVALID_TYPE'
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate service filters for search and listing
 */
export function validateServiceFilters(filters: ServiceFilters): ServiceValidationResult {
  const errors: ServiceValidationError[] = [];

  // Validate minPrice (if provided)
  if (filters.minPrice !== undefined) {
    if (typeof filters.minPrice !== 'number' || isNaN(filters.minPrice)) {
      errors.push({
        field: 'minPrice',
        message: 'minPrice must be a valid number',
        code: 'INVALID_TYPE'
      });
    } else if (filters.minPrice < 0) {
      errors.push({
        field: 'minPrice',
        message: 'minPrice must be non-negative',
        code: 'MIN_VALUE'
      });
    }
  }

  // Validate maxPrice (if provided)
  if (filters.maxPrice !== undefined) {
    if (typeof filters.maxPrice !== 'number' || isNaN(filters.maxPrice)) {
      errors.push({
        field: 'maxPrice',
        message: 'maxPrice must be a valid number',
        code: 'INVALID_TYPE'
      });
    } else if (filters.maxPrice < 0) {
      errors.push({
        field: 'maxPrice',
        message: 'maxPrice must be non-negative',
        code: 'MIN_VALUE'
      });
    }
  }

  // Validate price range consistency
  if (filters.minPrice !== undefined && filters.maxPrice !== undefined) {
    if (filters.minPrice > filters.maxPrice) {
      errors.push({
        field: 'priceRange',
        message: 'minPrice cannot be greater than maxPrice',
        code: 'INVALID_RANGE'
      });
    }
  }

  // Validate searchTerm (if provided)
  if (filters.searchTerm !== undefined) {
    if (typeof filters.searchTerm !== 'string') {
      errors.push({
        field: 'searchTerm',
        message: 'searchTerm must be a string',
        code: 'INVALID_TYPE'
      });
    } else if (filters.searchTerm.length > SEARCH_TERM_MAX_LENGTH) {
      errors.push({
        field: 'searchTerm',
        message: `searchTerm must not exceed ${SEARCH_TERM_MAX_LENGTH} characters`,
        code: 'MAX_LENGTH'
      });
    }
  }

  // Validate sortBy (if provided)
  if (filters.sortBy !== undefined) {
    const validSortFields = ['name', 'price', 'createdAt', 'updatedAt'];
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

  // Validate isActive (if provided)
  if (filters.isActive !== undefined && typeof filters.isActive !== 'boolean') {
    errors.push({
      field: 'isActive',
      message: 'isActive must be a boolean value',
      code: 'INVALID_TYPE'
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Sanitize service creation data
 */
export function sanitizeCreateServiceData(data: CreateServiceRequest): CreateServiceRequest {
  return {
    name: data.name?.trim() || '',
    description: data.description?.trim() || '',
    price: typeof data.price === 'number' ? Math.round(data.price * 100) / 100 : 0
  };
}

/**
 * Sanitize service update data
 */
export function sanitizeUpdateServiceData(data: UpdateServiceRequest): UpdateServiceRequest {
  const sanitized: UpdateServiceRequest = {};

  if (data.name !== undefined) {
    sanitized.name = data.name.trim();
  }

  if (data.description !== undefined) {
    sanitized.description = data.description.trim();
  }

  if (data.price !== undefined && typeof data.price === 'number') {
    sanitized.price = Math.round(data.price * 100) / 100;
  }

  if (data.isActive !== undefined) {
    sanitized.isActive = data.isActive;
  }

  return sanitized;
}

/**
 * Sanitize service filters
 */
export function sanitizeServiceFilters(filters: ServiceFilters): ServiceFilters {
  const sanitized: ServiceFilters = {};

  if (filters.providerId !== undefined) {
    sanitized.providerId = filters.providerId.trim();
  }

  if (filters.isActive !== undefined) {
    sanitized.isActive = filters.isActive;
  }

  if (filters.minPrice !== undefined && typeof filters.minPrice === 'number') {
    sanitized.minPrice = Math.max(0, Math.round(filters.minPrice * 100) / 100);
  }

  if (filters.maxPrice !== undefined && typeof filters.maxPrice === 'number') {
    sanitized.maxPrice = Math.max(0, Math.round(filters.maxPrice * 100) / 100);
  }

  if (filters.searchTerm !== undefined) {
    sanitized.searchTerm = filters.searchTerm.trim().toLowerCase();
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