import { Router, Request, Response } from 'express';
import { ServiceManagerImpl } from '../services/serviceManager';
import { CreateServiceRequest, UpdateServiceRequest, ServiceFilters } from '../models/service';
import { AuthenticatedRequest } from '../types/auth';
import { authenticateToken } from '../middleware/auth';
import { ErrorResponse, ServiceResponse, ServicesListResponse } from '../types/responses';
import { APIError } from '../types/responses';

const router = Router();
const serviceManager = new ServiceManagerImpl();

/**
 * POST /services - Create service (providers only)
 * Requirements: 3.1, 3.2, 8.2
 */
router.post('/', authenticateToken({ roles: ['provider'] }), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const serviceData: CreateServiceRequest = req.body;

    // Validate required fields
    if (!serviceData.name || !serviceData.description || serviceData.price === undefined) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: 'Validation Error',
        message: 'All fields are required: name, description, price'
      };
      return res.status(400).json(errorResponse);
    }

    // Create service using service manager
    const service = await serviceManager.createService(serviceData, req.user!.userId);

    const response: ServiceResponse = {
      success: true,
      message: 'Service created successfully',
      data: service
    };

    return res.status(201).json(response);

  } catch (error) {
    console.error('Create service endpoint error:', error);

    if (error instanceof APIError) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: error.code,
        message: error.message,
        details: error.details
      };
      return res.status(error.statusCode).json(errorResponse);
    }

    const errorResponse: ErrorResponse = {
      success: false,
      error: 'Internal Server Error',
      message: 'An unexpected error occurred while creating the service'
    };
    return res.status(500).json(errorResponse);
  }
});

/**
 * GET /services - List all active services
 * Requirements: 4.1
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    // Parse query parameters for filtering
    const filters: ServiceFilters = {
      searchTerm: req.query.search as string,
      minPrice: req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined,
      maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined,
      sortBy: req.query.sortBy as 'name' | 'price' | 'createdAt' | 'updatedAt',
      sortOrder: req.query.sortOrder as 'asc' | 'desc',
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
      isActive: true // Only show active services for public listing
    };

    // Get services using service manager
    const result = await serviceManager.searchServices(filters);

    const response: ServicesListResponse = {
      success: true,
      message: 'Services retrieved successfully',
      data: {
        services: result.services,
        total: result.total
      }
    };

    return res.status(200).json(response);

  } catch (error) {
    console.error('Get services endpoint error:', error);

    if (error instanceof APIError) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: error.code,
        message: error.message,
        details: error.details
      };
      return res.status(error.statusCode).json(errorResponse);
    }

    const errorResponse: ErrorResponse = {
      success: false,
      error: 'Internal Server Error',
      message: 'An unexpected error occurred while retrieving services'
    };
    return res.status(500).json(errorResponse);
  }
});

/**
 * GET /services/my - Get provider's services (providers only)
 * Requirements: 3.2, 8.2
 */
router.get('/my', authenticateToken({ roles: ['provider'] }), async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Get services for the authenticated provider
    const services = await serviceManager.getServicesByProvider(req.user!.userId);

    const response: ServicesListResponse = {
      success: true,
      message: 'Provider services retrieved successfully',
      data: {
        services: services,
        total: services.length
      }
    };

    return res.status(200).json(response);

  } catch (error) {
    console.error('Get provider services endpoint error:', error);

    if (error instanceof APIError) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: error.code,
        message: error.message,
        details: error.details
      };
      return res.status(error.statusCode).json(errorResponse);
    }

    const errorResponse: ErrorResponse = {
      success: false,
      error: 'Internal Server Error',
      message: 'An unexpected error occurred while retrieving your services'
    };
    return res.status(500).json(errorResponse);
  }
});

/**
 * PUT /services/:id - Update service (providers only)
 * Requirements: 3.1, 3.2, 8.2
 */
router.put('/:id', authenticateToken({ roles: ['provider'] }), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const serviceId = req.params.id;
    const updateData: UpdateServiceRequest = req.body;

    // Validate service ID
    if (!serviceId) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: 'Validation Error',
        message: 'Service ID is required'
      };
      return res.status(400).json(errorResponse);
    }

    // Validate that at least one field is provided for update
    if (!updateData.name && !updateData.description && updateData.price === undefined && updateData.isActive === undefined) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: 'Validation Error',
        message: 'At least one field must be provided for update: name, description, price, or isActive'
      };
      return res.status(400).json(errorResponse);
    }

    // Update service using service manager
    const updatedService = await serviceManager.updateService(serviceId, updateData, req.user!.userId);

    const response: ServiceResponse = {
      success: true,
      message: 'Service updated successfully',
      data: updatedService
    };

    return res.status(200).json(response);

  } catch (error) {
    console.error('Update service endpoint error:', error);

    if (error instanceof APIError) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: error.code,
        message: error.message,
        details: error.details
      };
      return res.status(error.statusCode).json(errorResponse);
    }

    const errorResponse: ErrorResponse = {
      success: false,
      error: 'Internal Server Error',
      message: 'An unexpected error occurred while updating the service'
    };
    return res.status(500).json(errorResponse);
  }
});

/**
 * DELETE /services/:id - Delete service (providers only)
 * Requirements: 3.1, 3.2, 8.2
 */
router.delete('/:id', authenticateToken({ roles: ['provider'] }), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const serviceId = req.params.id;

    // Validate service ID
    if (!serviceId) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: 'Validation Error',
        message: 'Service ID is required'
      };
      return res.status(400).json(errorResponse);
    }

    // Delete service using service manager
    await serviceManager.deleteService(serviceId, req.user!.userId);

    const response = {
      success: true,
      message: 'Service deleted successfully'
    };

    return res.status(200).json(response);

  } catch (error) {
    console.error('Delete service endpoint error:', error);

    if (error instanceof APIError) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: error.code,
        message: error.message,
        details: error.details
      };
      return res.status(error.statusCode).json(errorResponse);
    }

    const errorResponse: ErrorResponse = {
      success: false,
      error: 'Internal Server Error',
      message: 'An unexpected error occurred while deleting the service'
    };
    return res.status(500).json(errorResponse);
  }
});

export { router as serviceRoutes };