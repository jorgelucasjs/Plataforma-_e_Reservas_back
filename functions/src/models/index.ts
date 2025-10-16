// Core data model interfaces for the booking platform

export interface User {
  id: string;
  fullName: string;
  nif: string;
  email: string;
  passwordHash: string;
  userType: 'client' | 'provider';
  balance: number;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

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

// Request/Response types for API endpoints
export interface RegisterRequest {
  fullName: string;
  nif: string;
  email: string;
  password: string;
  userType: 'client' | 'provider';
}

export interface LoginRequest {
  email: string;
  password: string;
}

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