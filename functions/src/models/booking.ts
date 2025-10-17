/**
 * Booking data models, validation schemas, and utilities
 * This module contains all booking-related interfaces, validation functions,
 * and filtering utilities for the booking platform API.
 */

/**
 * Core Booking interface representing the booking document in Firestore
 */
export interface Booking {
  id: string;
  clientId: string;
  clientName: string;
  serviceId: string;
  serviceName: string;
  providerId: string;
  providerName: string;
  amount: number;
  status: BookingStatus;
  createdAt: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
}

/**
 * Booking status enumeration
 */
export type BookingStatus = 'confirmed' | 'cancelled';

/**
 * Booking creation data (without generated fields)
 */
export interface CreateBookingData {
  clientId: string;
  clientName: string;
  serviceId: string;
  serviceName: string;
  providerId: string;
  providerName: string;
  amount: number;
  status: BookingStatus;
}

/**
 * Booking creation request interface (from API)
 */
export interface CreateBookingRequest {
  serviceId: string;
}

/**
 * Booking cancellation request interface (from API)
 */
export interface CancelBookingRequest {
  cancellationReason?: string;
}

/**
 * Booking update data (for cancellation)
 */
export interface UpdateBookingData {
  status?: BookingStatus;
  cancelledAt?: Date;
  cancellationReason?: string;
}

/**
 * Booking filtering options for search and history
 */
export interface BookingFilters {
  startDate?: Date;
  endDate?: Date;
  status?: BookingStatus;
  clientId?: string;
  providerId?: string;
  serviceId?: string;
  minAmount?: number;
  maxAmount?: number;
  sortBy?: 'createdAt' | 'amount' | 'status';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

/**
 * Booking search result interface
 */
export interface BookingSearchResult {
  bookings: Booking[];
  total: number;
  hasMore: boolean;
  filters: BookingFilters;
}

/**
 * Booking validation result interface
 */
export interface BookingValidationResult {
  isValid: boolean;
  errors: BookingValidationError[];
}

/**
 * Individual booking validation error
 */
export interface BookingValidationError {
  field: string;
  message: string;
  code: string;
}

/**
 * Booking statistics interface (for analytics)
 */
export interface BookingStats {
  totalBookings: number;
  confirmedBookings: number;
  cancelledBookings: number;
  totalRevenue: number;
  averageBookingAmount: number;
  cancellationRate: number;
}

/**
 * User booking summary interface
 */
export interface UserBookingSummary {
  userId: string;
  userType: 'client' | 'provider';
  totalBookings: number;
  confirmedBookings: number;
  cancelledBookings: number;
  totalAmount: number;
  recentBookings: Booking[];
}

/**
 * Booking history entry interface (for tracking status changes)
 */
export interface BookingHistoryEntry {
  bookingId: string;
  previousStatus?: BookingStatus;
  newStatus: BookingStatus;
  timestamp: Date;
  reason?: string;
  updatedBy: string;
}

/**
 * Balance transaction interface (for booking-related balance changes)
 */
export interface BalanceTransaction {
  id: string;
  userId: string;
  bookingId: string;
  amount: number;
  type: 'debit' | 'credit';
  description: string;
  timestamp: Date;
  balanceBefore: number;
  balanceAfter: number;
}

/**
 * Booking creation context interface (for service layer)
 */
export interface BookingCreationContext {
  clientId: string;
  serviceId: string;
  clientBalance: number;
  servicePrice: number;
  serviceActive: boolean;
  providerActive: boolean;
}

/**
 * Booking cancellation context interface (for service layer)
 */
export interface BookingCancellationContext {
  bookingId: string;
  userId: string;
  userType: 'client' | 'provider';
  currentStatus: BookingStatus;
  bookingAmount: number;
  clientId: string;
  providerId: string;
  cancellationReason?: string;
}