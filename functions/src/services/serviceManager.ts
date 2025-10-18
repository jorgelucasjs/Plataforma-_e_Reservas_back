import * as admin from 'firebase-admin';
import { 
  Service, 
  CreateServiceRequest, 
  UpdateServiceRequest,
  CreateServiceData,
  UpdateServiceData,
  ServiceFilters,
  ServiceSearchResult
} from '../models/service';
import { User } from '../models/user';
import { 
  validateCreateService, 
  validateUpdateService,
  sanitizeCreateServiceData,
  sanitizeUpdateServiceData
} from '../validation/serviceValidation';
import { filterServices, validateServiceOwnership, canDeleteService } from '../utils/serviceUtils';
import { APIError, ErrorCodes } from '../types/responses';

/**
 * Service Manager Interface
 */
export interface ServiceManager {
  createService(serviceData: CreateServiceRequest, providerId: string): Promise<Service>;
  getServicesByProvider(providerId: string): Promise<Service[]>;
  getAllActiveServices(): Promise<Service[]>;
  getServiceById(serviceId: string): Promise<Service | null>;
  updateService(serviceId: string, updates: UpdateServiceRequest, providerId: string): Promise<Service>;
  deleteService(serviceId: string, providerId: string): Promise<void>;
  searchServices(filters: ServiceFilters): Promise<ServiceSearchResult>;
  verifyServiceOwnership(serviceId: string, providerId: string): Promise<boolean>;
}

/**
 * Service Manager Implementation
 */
export class ServiceManagerImpl implements ServiceManager {
  private db: FirebaseFirestore.Firestore;
  private servicesCollection: FirebaseFirestore.CollectionReference;
  private usersCollection: FirebaseFirestore.CollectionReference;
  private bookingsCollection: FirebaseFirestore.CollectionReference;

  constructor() {
    this.db = admin.firestore();
    this.servicesCollection = this.db.collection('services');
    this.usersCollection = this.db.collection('users');
    this.bookingsCollection = this.db.collection('bookings');
  }

  /**
   * Create a new service
   */
  async createService(serviceData: CreateServiceRequest, providerId: string): Promise<Service> {
    try {
      // Validate input data
      const validationResult = validateCreateService(serviceData);
      if (!validationResult.isValid) {
        const errorMessages = validationResult.errors.map(e => e.message);
        throw new APIError(
          `Service creation failed: ${errorMessages.join(', ')}`,
          400,
          ErrorCodes.VALIDATION_ERROR,
          validationResult.errors
        );
      }

      // Sanitize input data
      const sanitizedData = sanitizeCreateServiceData(serviceData);

      // Get provider information
      const providerDoc = await this.usersCollection.doc(providerId).get();
      if (!providerDoc.exists) {
        throw new APIError(
          'Provider not found',
          404,
          ErrorCodes.NOT_FOUND
        );
      }

      const providerData = providerDoc.data() as User;
      if (providerData.userType !== 'provider') {
        throw new APIError(
          'Only service providers can create services',
          403,
          ErrorCodes.AUTHORIZATION_ERROR
        );
      }

      if (!providerData.isActive) {
        throw new APIError(
          'Inactive providers cannot create services',
          403,
          ErrorCodes.AUTHORIZATION_ERROR
        );
      }

      // Create service document
      const serviceDoc = this.servicesCollection.doc();
      const now = new Date();

      const createServiceData: CreateServiceData = {
        name: sanitizedData.name,
        description: sanitizedData.description,
        price: sanitizedData.price,
        providerId: providerId,
        providerName: providerData.fullName,
        isActive: true
      };

      const serviceRecord: Service = {
        id: serviceDoc.id,
        name: createServiceData.name,
        description: createServiceData.description,
        price: createServiceData.price,
        providerId: createServiceData.providerId,
        providerName: createServiceData.providerName,
        isActive: createServiceData.isActive !== false, // Default to true
        createdAt: now,
        updatedAt: now
      };

      // Save to Firestore
      await serviceDoc.set({
        ...createServiceData,
        createdAt: new Date().getTime(),
        updatedAt: new Date().getTime()
      });

      return serviceRecord;

    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      console.error('Error creating service:', error);
      throw new APIError(
        'Service creation failed due to server error',
        500,
        ErrorCodes.INTERNAL_ERROR
      );
    }
  }

  /**
   * Get all services for a specific provider
   */
  async getServicesByProvider(providerId: string): Promise<Service[]> {
    try {
      const querySnapshot = await this.servicesCollection
        .where('providerId', '==', providerId)
        .orderBy('createdAt', 'desc')
        .get();

      const services: Service[] = [];
      querySnapshot.forEach(doc => {
        const data = doc.data();
        services.push({
          id: doc.id,
          name: data.name,
          description: data.description,
          price: data.price,
          providerId: data.providerId,
          providerName: data.providerName,
          isActive: data.isActive,
          createdAt: data.createdAt || new Date(),
          updatedAt: data.updatedAt || new Date()
        });
      });

      return services;

    } catch (error) {
      console.error('Error getting services by provider:', error);
      throw new APIError(
        'Failed to retrieve provider services',
        500,
        ErrorCodes.DATABASE_ERROR
      );
    }
  }

  /**
   * Get all active services
   */
  async getAllActiveServices(): Promise<Service[]> {
    try {
      const querySnapshot = await this.servicesCollection
        .where('isActive', '==', true)
        .orderBy('createdAt', 'desc')
        .get();

      const services: Service[] = [];
      querySnapshot.forEach(doc => {
        const data = doc.data();
        services.push({
          id: doc.id,
          name: data.name,
          description: data.description,
          price: data.price,
          providerId: data.providerId,
          providerName: data.providerName,
          isActive: data.isActive,
          createdAt: data.createdAt || new Date(),
          updatedAt: data.updatedAt || new Date()
        });
      });

      return services;

    } catch (error) {
      console.error('Error getting active services:', error);
      throw new APIError(
        'Failed to retrieve active services',
        500,
        ErrorCodes.DATABASE_ERROR
      );
    }
  }

  /**
   * Get service by ID
   */
  async getServiceById(serviceId: string): Promise<Service | null> {
    try {
      const serviceDoc = await this.servicesCollection.doc(serviceId).get();
      
      if (!serviceDoc.exists) {
        return null;
      }

      const data = serviceDoc.data();
      if (!data) {
        return null;
      }

      return {
        id: serviceDoc.id,
        name: data.name,
        description: data.description,
        price: data.price,
        providerId: data.providerId,
        providerName: data.providerName,
        isActive: data.isActive,
        createdAt: data.createdAt || new Date(),
        updatedAt: data.updatedAt || new Date()
      };

    } catch (error) {
      console.error('Error getting service by ID:', error);
      throw new APIError(
        'Failed to retrieve service',
        500,
        ErrorCodes.DATABASE_ERROR
      );
    }
  }

  /**
   * Update a service
   */
  async updateService(serviceId: string, updates: UpdateServiceRequest, providerId: string): Promise<Service> {
    try {
      // Validate input data
      const validationResult = validateUpdateService(updates);
      if (!validationResult.isValid) {
        const errorMessages = validationResult.errors.map(e => e.message);
        throw new APIError(
          `Service update failed: ${errorMessages.join(', ')}`,
          400,
          ErrorCodes.VALIDATION_ERROR,
          validationResult.errors
        );
      }

      // Get existing service
      const existingService = await this.getServiceById(serviceId);
      if (!existingService) {
        throw new APIError(
          'Service not found',
          404,
          ErrorCodes.NOT_FOUND
        );
      }

      // Verify ownership
      if (!validateServiceOwnership(existingService, providerId)) {
        throw new APIError(
          'You can only update your own services',
          403,
          ErrorCodes.AUTHORIZATION_ERROR
        );
      }

      // Sanitize update data
      const sanitizedUpdates = sanitizeUpdateServiceData(updates);

      // Prepare update data
      const updateData: UpdateServiceData = {
        ...sanitizedUpdates,
        updatedAt: new Date()
      };

      // Remove undefined values
      const cleanUpdateData = Object.fromEntries(
        Object.entries(updateData).filter(([_, value]) => value !== undefined)
      );

      // Use server timestamp for updates
      cleanUpdateData.updatedAt = new Date().getTime();

      // Update in Firestore
      await this.servicesCollection.doc(serviceId).update(cleanUpdateData);

      // Return updated service
      const updatedService = await this.getServiceById(serviceId);
      if (!updatedService) {
        throw new APIError(
          'Failed to retrieve updated service',
          500,
          ErrorCodes.INTERNAL_ERROR
        );
      }

      return updatedService;

    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      console.error('Error updating service:', error);
      throw new APIError(
        'Service update failed due to server error',
        500,
        ErrorCodes.INTERNAL_ERROR
      );
    }
  }

  /**
   * Delete a service
   */
  async deleteService(serviceId: string, providerId: string): Promise<void> {
    try {
      // Get existing service
      const existingService = await this.getServiceById(serviceId);
      if (!existingService) {
        throw new APIError(
          'Service not found',
          404,
          ErrorCodes.NOT_FOUND
        );
      }

      // Verify ownership
      if (!validateServiceOwnership(existingService, providerId)) {
        throw new APIError(
          'You can only delete your own services',
          403,
          ErrorCodes.AUTHORIZATION_ERROR
        );
      }

      // Check for active bookings
      const activeBookingsSnapshot = await this.bookingsCollection
        .where('serviceId', '==', serviceId)
        .where('status', '==', 'confirmed')
        .get();

      const activeBookings = activeBookingsSnapshot.docs.map(doc => ({
        serviceId: doc.data().serviceId,
        status: doc.data().status
      }));

      const deletionCheck = canDeleteService(existingService, activeBookings);
      if (!deletionCheck.canDelete) {
        throw new APIError(
          deletionCheck.reason || 'Cannot delete service with active bookings',
          409,
          ErrorCodes.INVALID_OPERATION
        );
      }

      // Delete from Firestore
      await this.servicesCollection.doc(serviceId).delete();

    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      console.error('Error deleting service:', error);
      throw new APIError(
        'Service deletion failed due to server error',
        500,
        ErrorCodes.INTERNAL_ERROR
      );
    }
  }

  /**
   * Search services with filters
   */
  async searchServices(filters: ServiceFilters): Promise<ServiceSearchResult> {
    try {
      // For now, get all services and filter in memory
      // In production, this should be optimized with proper database queries
      let services: Service[];

      if (filters.providerId) {
        services = await this.getServicesByProvider(filters.providerId);
      } else if (filters.isActive === false) {
        // Get all services (including inactive) - this would need a different query in production
        const querySnapshot = await this.servicesCollection
          .orderBy('createdAt', 'desc')
          .get();

        services = [];
        querySnapshot.forEach(doc => {
          const data = doc.data();
          services.push({
            id: doc.id,
            name: data.name,
            description: data.description,
            price: data.price,
            providerId: data.providerId,
            providerName: data.providerName,
            isActive: data.isActive,
            createdAt: data.createdAt || new Date(),
            updatedAt: data.updatedAt || new Date()
          });
        });
      } else {
        services = await this.getAllActiveServices();
      }

      // Apply filters using utility function
      return filterServices(services, filters);

    } catch (error) {
      console.error('Error searching services:', error);
      throw new APIError(
        'Service search failed due to server error',
        500,
        ErrorCodes.DATABASE_ERROR
      );
    }
  }

  /**
   * Verify service ownership
   */
  async verifyServiceOwnership(serviceId: string, providerId: string): Promise<boolean> {
    try {
      const service = await this.getServiceById(serviceId);
      if (!service) {
        return false;
      }

      return validateServiceOwnership(service, providerId);

    } catch (error) {
      console.error('Error verifying service ownership:', error);
      return false;
    }
  }
}