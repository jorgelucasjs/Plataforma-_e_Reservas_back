import { 
  Booking, 
  BookingStatus, 
  BookingHistoryEntry, 
  BalanceTransaction,
  BookingStats,
  UserBookingSummary,
  BookingFilters 
} from '../models/booking';

/**
 * Generate a unique booking ID
 */
export function generateBookingId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 8);
  return `booking_${timestamp}_${randomPart}`;
}

/**
 * Generate a unique balance transaction ID
 */
export function generateTransactionId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 8);
  return `txn_${timestamp}_${randomPart}`;
}

/**
 * Check if a booking can be cancelled
 */
export function canCancelBooking(booking: Booking): boolean {
  return booking.status === 'confirmed';
}

/**
 * Check if a user can cancel a specific booking
 */
export function canUserCancelBooking(
  booking: Booking, 
  userId: string, 
  userType: 'client' | 'provider'
): boolean {
  if (!canCancelBooking(booking)) {
    return false;
  }

  // Clients can cancel their own bookings
  if (userType === 'client' && booking.clientId === userId) {
    return true;
  }

  // Providers can cancel bookings for their services
  if (userType === 'provider' && booking.providerId === userId) {
    return true;
  }

  return false;
}

/**
 * Create a booking history entry
 */
export function createBookingHistoryEntry(
  bookingId: string,
  previousStatus: BookingStatus | undefined,
  newStatus: BookingStatus,
  updatedBy: string,
  reason?: string
): BookingHistoryEntry {
  return {
    bookingId,
    previousStatus,
    newStatus,
    timestamp: new Date(),
    reason,
    updatedBy
  };
}

/**
 * Create a balance transaction record
 */
export function createBalanceTransaction(
  userId: string,
  bookingId: string,
  amount: number,
  type: 'debit' | 'credit',
  description: string,
  balanceBefore: number,
  balanceAfter: number
): BalanceTransaction {
  return {
    id: generateTransactionId(),
    userId,
    bookingId,
    amount: Math.round(amount * 100) / 100, // Ensure 2 decimal places
    type,
    description,
    timestamp: new Date(),
    balanceBefore: Math.round(balanceBefore * 100) / 100,
    balanceAfter: Math.round(balanceAfter * 100) / 100
  };
}

/**
 * Calculate booking statistics from a list of bookings
 */
export function calculateBookingStats(bookings: Booking[]): BookingStats {
  const totalBookings = bookings.length;
  const confirmedBookings = bookings.filter(b => b.status === 'confirmed').length;
  const cancelledBookings = bookings.filter(b => b.status === 'cancelled').length;
  
  const totalRevenue = bookings
    .filter(b => b.status === 'confirmed')
    .reduce((sum, b) => sum + b.amount, 0);
  
  const averageBookingAmount = totalBookings > 0 
    ? bookings.reduce((sum, b) => sum + b.amount, 0) / totalBookings 
    : 0;
  
  const cancellationRate = totalBookings > 0 
    ? (cancelledBookings / totalBookings) * 100 
    : 0;

  return {
    totalBookings,
    confirmedBookings,
    cancelledBookings,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    averageBookingAmount: Math.round(averageBookingAmount * 100) / 100,
    cancellationRate: Math.round(cancellationRate * 100) / 100
  };
}

/**
 * Create user booking summary
 */
export function createUserBookingSummary(
  userId: string,
  userType: 'client' | 'provider',
  bookings: Booking[],
  recentLimit: number = 5
): UserBookingSummary {
  const stats = calculateBookingStats(bookings);
  
  // Sort bookings by creation date (most recent first) and take the limit
  const recentBookings = bookings
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, recentLimit);

  return {
    userId,
    userType,
    totalBookings: stats.totalBookings,
    confirmedBookings: stats.confirmedBookings,
    cancelledBookings: stats.cancelledBookings,
    totalAmount: userType === 'client' 
      ? -stats.totalRevenue // Negative for clients (money spent)
      : stats.totalRevenue,  // Positive for providers (money earned)
    recentBookings
  };
}

/**
 * Filter bookings based on provided filters
 */
export function filterBookings(bookings: Booking[], filters: BookingFilters): Booking[] {
  let filtered = [...bookings];

  // Filter by date range
  if (filters.startDate) {
    filtered = filtered.filter(b => b.createdAt >= filters.startDate!);
  }

  if (filters.endDate) {
    filtered = filtered.filter(b => b.createdAt <= filters.endDate!);
  }

  // Filter by status
  if (filters.status) {
    filtered = filtered.filter(b => b.status === filters.status);
  }

  // Filter by client ID
  if (filters.clientId) {
    filtered = filtered.filter(b => b.clientId === filters.clientId);
  }

  // Filter by provider ID
  if (filters.providerId) {
    filtered = filtered.filter(b => b.providerId === filters.providerId);
  }

  // Filter by service ID
  if (filters.serviceId) {
    filtered = filtered.filter(b => b.serviceId === filters.serviceId);
  }

  // Filter by amount range
  if (filters.minAmount !== undefined) {
    filtered = filtered.filter(b => b.amount >= filters.minAmount!);
  }

  if (filters.maxAmount !== undefined) {
    filtered = filtered.filter(b => b.amount <= filters.maxAmount!);
  }

  return filtered;
}

/**
 * Sort bookings based on provided sort criteria
 */
export function sortBookings(bookings: Booking[], sortBy?: string, sortOrder?: string): Booking[] {
  if (!sortBy) {
    return bookings;
  }

  const sorted = [...bookings];
  const order = sortOrder === 'desc' ? -1 : 1;

  sorted.sort((a, b) => {
    let aValue: any;
    let bValue: any;

    switch (sortBy) {
      case 'createdAt':
        aValue = a.createdAt.getTime();
        bValue = b.createdAt.getTime();
        break;
      case 'amount':
        aValue = a.amount;
        bValue = b.amount;
        break;
      case 'status':
        aValue = a.status;
        bValue = b.status;
        break;
      default:
        return 0;
    }

    if (aValue < bValue) return -1 * order;
    if (aValue > bValue) return 1 * order;
    return 0;
  });

  return sorted;
}

/**
 * Paginate bookings based on limit and offset
 */
export function paginateBookings(bookings: Booking[], limit?: number, offset?: number): Booking[] {
  let result = bookings;

  if (offset && offset > 0) {
    result = result.slice(offset);
  }

  if (limit && limit > 0) {
    result = result.slice(0, limit);
  }

  return result;
}

/**
 * Format booking amount for display
 */
export function formatBookingAmount(amount: number, currency: string = 'EUR'): string {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

/**
 * Format booking date for display
 */
export function formatBookingDate(date: Date, locale: string = 'pt-PT'): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

/**
 * Get booking status display text
 */
export function getBookingStatusText(status: BookingStatus, locale: string = 'en'): string {
  const statusTexts: Record<string, Record<BookingStatus, string>> = {
    en: {
      confirmed: 'Confirmed',
      cancelled: 'Cancelled'
    },
    pt: {
      confirmed: 'Confirmado',
      cancelled: 'Cancelado'
    }
  };

  return statusTexts[locale]?.[status] || statusTexts.en[status];
}

/**
 * Validate booking business rules
 */
export function validateBookingBusinessRules(
  clientBalance: number,
  servicePrice: number,
  serviceActive: boolean,
  providerActive: boolean
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!serviceActive) {
    errors.push('Service is not active');
  }

  if (!providerActive) {
    errors.push('Service provider is not active');
  }

  if (clientBalance < servicePrice) {
    errors.push('Insufficient balance to complete booking');
  }

  if (servicePrice <= 0) {
    errors.push('Service price must be greater than zero');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Calculate refund amount for booking cancellation
 */
export function calculateRefundAmount(booking: Booking): number {
  // For now, full refund is provided
  // This could be enhanced with cancellation policies in the future
  return booking.amount;
}

/**
 * Generate booking description for transactions
 */
export function generateBookingDescription(
  action: 'create' | 'cancel',
  serviceName: string,
  bookingId: string
): string {
  switch (action) {
    case 'create':
      return `Booking payment for service: ${serviceName} (${bookingId})`;
    case 'cancel':
      return `Refund for cancelled booking: ${serviceName} (${bookingId})`;
    default:
      return `Booking transaction: ${serviceName} (${bookingId})`;
  }
}