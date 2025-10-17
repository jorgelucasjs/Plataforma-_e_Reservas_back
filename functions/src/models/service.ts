/**
 * Service data models, validation schemas, and utilities
 * This module contains all service-related interfaces, validation functions,
 * and filtering utilities for the booking platform API.
 */

/**
 * Core Service interface representing the service document in Firestore
 */
export interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  providerId: string;
  providerName: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Service creation data (without generated fields)
 */
export interface CreateServiceData {
  name: string;
  description: string;
  price: number;
  providerId: string;
  providerName: string;
  isActive?: boolean;
}

/**
 * Service update data (partial fields that can be updated)
 */
export interface UpdateServiceData {
  name?: string;
  description?: string;
  price?: number;
  isActive?: boolean;
  updatedAt?: Date;
}

/**
 * Service creation request interface (from API)
 */
export interface CreateServiceRequest {
  name: string;
  description: string;
  price: number;
}

/**
 * Service update request interface (from API)
 */
export interface UpdateServiceRequest {
  name?: string;
  description?: string;
  price?: number;
  isActive?: boolean;
}

/**
 * Service filtering options for search and listing
 */
export interface ServiceFilters {
  providerId?: string;
  isActive?: boolean;
  minPrice?: number;
  maxPrice?: number;
  searchTerm?: string; // Search in name and description
  sortBy?: 'name' | 'price' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

/**
 * Service search result interface
 */
export interface ServiceSearchResult {
  services: Service[];
  total: number;
  hasMore: boolean;
  filters: ServiceFilters;
}

/**
 * Service validation result interface
 */
export interface ServiceValidationResult {
  isValid: boolean;
  errors: ServiceValidationError[];
}

/**
 * Individual service validation error
 */
export interface ServiceValidationError {
  field: string;
  message: string;
  code: string;
}

/**
 * Service statistics interface (for providers)
 */
export interface ServiceStats {
  serviceId: string;
  serviceName: string;
  totalBookings: number;
  totalRevenue: number;
  averageRating?: number;
  isActive: boolean;
}

/**
 * Service with booking count (for listing with popularity)
 */
export interface ServiceWithStats extends Service {
  bookingCount: number;
  totalRevenue: number;
}