// Core data model interfaces for the booking platform

// Re-export user models from dedicated user module
export * from './user';

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

export interface Booking {
  id: string;
  clientId: string;
  clientName: string;
  serviceId: string;
  serviceName: string;
  providerId: string;
  providerName: string;
  amount: number;
  status: 'confirmed' | 'cancelled';
  createdAt: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
}

// Service-related request/response types
export interface CreateServiceRequest {
  name: string;
  description: string;
  price: number;
}

export interface UpdateServiceRequest {
  name?: string;
  description?: string;
  price?: number;
  isActive?: boolean;
}

// Booking-related request/response types
export interface CreateBookingRequest {
  serviceId: string;
}

export interface CancelBookingRequest {
  cancellationReason?: string;
}

// JWT Token payload interface
export interface JWTPayload {
  userId: string;
  email: string;
  userType: 'client' | 'provider';
  iat: number;
  exp: number;
}

// Booking filters for history queries
export interface BookingFilters {
  startDate?: Date;
  endDate?: Date;
  status?: 'confirmed' | 'cancelled';
  clientId?: string;
  providerId?: string;
}