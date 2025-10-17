// Core data model interfaces for the booking platform

// Re-export user models from dedicated user module
export * from './user';

// Re-export service models from dedicated service module
export * from './service';

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

// Legacy service interfaces - these are now defined in ./service.ts
// Keeping for backward compatibility, but prefer importing from ./service.ts

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