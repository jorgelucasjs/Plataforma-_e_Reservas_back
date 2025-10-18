/**
 * Modelos de dados de reserva, esquemas de validação e utilitários
 * Este módulo contém todas as interfaces relacionadas a reservas, funções de validação,
 * e utilitários de filtragem para a API da plataforma de reservas.
 */

/**
 * Interface principal da Reserva representando o documento da reserva no Firestore
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
 * Enumeração de status da reserva
 */
export type BookingStatus = 'confirmed' | 'cancelled';

/**
 * Dados de criação da reserva (sem campos gerados)
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
 * Interface de requisição de criação de reserva (da API)
 */
export interface CreateBookingRequest {
  serviceId: string;
}

/**
 * Interface de requisição de cancelamento de reserva (da API)
 */
export interface CancelBookingRequest {
  cancellationReason?: string;
}

/**
 * Dados de atualização da reserva (para cancelamento)
 */
export interface UpdateBookingData {
  status?: BookingStatus;
  cancelledAt?: Date;
  cancellationReason?: string;
}

/**
 * Opções de filtragem de reservas para busca e histórico
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