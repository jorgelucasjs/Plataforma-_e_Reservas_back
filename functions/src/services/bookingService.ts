import * as admin from 'firebase-admin';
import {
    Booking,
    BookingFilters,
    CreateBookingData,
    BookingStatus,
    BookingCreationContext,
    BookingSearchResult
} from '../models/booking';
import { userService } from './userService';
import { ServiceManagerImpl } from './serviceManager';
import { balanceService } from './balanceService';
import {
    generateBookingId,
    canUserCancelBooking,
    validateBookingBusinessRules,
    calculateRefundAmount
} from '../utils/bookingUtils';

/**
 * Booking Service Interface
 */
export interface BookingService {
    createBooking(clientId: string, serviceId: string): Promise<Booking>;
    cancelBooking(bookingId: string, userId: string, userType: 'client' | 'provider', cancellationReason?: string): Promise<Booking>;
    getBookingsByClient(clientId: string): Promise<Booking[]>;
    getBookingsByProvider(providerId: string): Promise<Booking[]>;
    getBookingById(bookingId: string): Promise<Booking | null>;
    getBookingHistory(filters?: BookingFilters): Promise<BookingSearchResult>;
    validateBookingCreation(clientId: string, serviceId: string): Promise<BookingCreationContext>;
}

/**
 * Booking Service Implementation
 */
export class BookingServiceImpl implements BookingService {
    private db: FirebaseFirestore.Firestore;
    private bookingsCollection: FirebaseFirestore.CollectionReference;
    private serviceManager: ServiceManagerImpl;

    constructor() {
        this.db = admin.firestore();
        this.bookingsCollection = this.db.collection('bookings');
        this.serviceManager = new ServiceManagerImpl();
    }

    /**
     * Create a new booking with balance verification and atomic payment
     */
    async createBooking(clientId: string, serviceId: string): Promise<Booking> {
        try {
            // Validate booking creation context
            const context = await this.validateBookingCreation(clientId, serviceId);

            // Validate business rules
            const businessRulesValidation = validateBookingBusinessRules(
                context.clientBalance,
                context.servicePrice,
                context.serviceActive,
                context.providerActive
            );

            if (!businessRulesValidation.isValid) {
                throw new Error(businessRulesValidation.errors.join(', '));
            }

            // Get service and client details
            const service = await this.serviceManager.getServiceById(serviceId);
            const client = await userService.getUserById(clientId);

            if (!service || !client) {
                throw new Error('Service or client not found');
            }

            // Generate booking ID
            const bookingId = generateBookingId();

            // Create booking data
            const bookingData: CreateBookingData = {
                clientId: client.id,
                clientName: client.fullName,
                serviceId: service.id,
                serviceName: service.name,
                providerId: service.providerId,
                providerName: service.providerName,
                amount: service.price,
                status: 'confirmed'
            };

            const booking: Booking = {
                id: bookingId,
                ...bookingData,
                createdAt: new Date()
            };

            // Execute atomic transaction: create booking + balance transfers
            await this.db.runTransaction(async (transaction) => {
                // Create booking document
                const bookingRef = this.bookingsCollection.doc(bookingId);
                transaction.set(bookingRef, {
                    ...bookingData,
                    createdAt: new Date().getTime()
                });

                // Execute balance operations (client debit + provider credit)
                const balanceOperations = balanceService.createBookingPaymentOperations(
                    client.id,
                    service.providerId,
                    service.price,
                    bookingId,
                    service.name
                );

                // Execute balance transfers within the same transaction
                const balanceResults = await balanceService.executeMultiUserOperation(balanceOperations);

                // Check if balance operations were successful
                const failedOperations = balanceResults.filter(result => !result.success);
                if (failedOperations.length > 0) {
                    throw new Error(`Balance operation failed: ${failedOperations[0].error}`);
                }
            });

            return booking;

        } catch (error) {
            console.error('Error creating booking:', error);
            throw new Error(error instanceof Error ? error.message : 'Failed to create booking');
        }
    }

    /**
     * Cancel a booking with balance refund
     */
    async cancelBooking(
        bookingId: string,
        userId: string,
        userType: 'client' | 'provider',
        cancellationReason?: string
    ): Promise<Booking> {
        try {
            // Get existing booking
            const existingBooking = await this.getBookingById(bookingId);

            if (!existingBooking) {
                throw new Error('Booking not found');
            }

            // Verify user can cancel this booking
            if (!canUserCancelBooking(existingBooking, userId, userType)) {
                throw new Error('You do not have permission to cancel this booking');
            }

            // Check if booking can be cancelled
            if (existingBooking.status !== 'confirmed') {
                throw new Error('Only confirmed bookings can be cancelled');
            }

            // Calculate refund amount
            const refundAmount = calculateRefundAmount(existingBooking);

            // Execute atomic transaction: update booking + balance refunds
            let updatedBooking: Booking;

            await this.db.runTransaction(async (transaction) => {
                const bookingRef = this.bookingsCollection.doc(bookingId);

                // Update booking status
                const updateData = {
                    status: 'cancelled' as BookingStatus,
                    cancelledAt: new Date().getTime(),
                    cancellationReason: cancellationReason || undefined
                };

                transaction.update(bookingRef, updateData);

                // Create updated booking object
                updatedBooking = {
                    ...existingBooking,
                    status: 'cancelled',
                    cancelledAt: new Date(),
                    cancellationReason
                };

                // Execute balance refund operations (client credit + provider debit)
                const refundOperations = balanceService.createBookingRefundOperations(
                    existingBooking.clientId,
                    existingBooking.providerId,
                    refundAmount,
                    bookingId,
                    existingBooking.serviceName
                );

                // Execute balance refunds within the same transaction
                const balanceResults = await balanceService.executeMultiUserOperation(refundOperations);

                // Check if balance operations were successful
                const failedOperations = balanceResults.filter(result => !result.success);
                if (failedOperations.length > 0) {
                    throw new Error(`Refund operation failed: ${failedOperations[0].error}`);
                }
            });

            return updatedBooking!;

        } catch (error) {
            console.error('Error cancelling booking:', error);
            throw new Error(error instanceof Error ? error.message : 'Failed to cancel booking');
        }
    }

    /**
     * Get all bookings for a specific client
     */
    async getBookingsByClient(clientId: string): Promise<Booking[]> {
        try {
            const querySnapshot = await this.bookingsCollection
                .where('clientId', '==', clientId)
                .orderBy('createdAt', 'desc')
                .get();

            const bookings: Booking[] = [];

            querySnapshot.forEach(doc => {
                const data = doc.data();
                bookings.push({
                    id: doc.id,
                    clientId: data.clientId,
                    clientName: data.clientName,
                    serviceId: data.serviceId,
                    serviceName: data.serviceName,
                    providerId: data.providerId,
                    providerName: data.providerName,
                    amount: data.amount,
                    status: data.status,
                    createdAt: data.createdAt || new Date(),
                    cancelledAt: data.cancelledAt,
                    cancellationReason: data.cancellationReason
                });
            });

            return bookings;

        } catch (error) {
            console.error('Error getting bookings by client:', error);
            throw new Error('Failed to retrieve client bookings');
        }
    }

    /**
     * Get all bookings for a specific provider
     */
    async getBookingsByProvider(providerId: string): Promise<Booking[]> {
        try {
            const querySnapshot = await this.bookingsCollection
                .where('providerId', '==', providerId)
                .orderBy('createdAt', 'desc')
                .get();

            const bookings: Booking[] = [];

            querySnapshot.forEach(doc => {
                const data = doc.data();
                bookings.push({
                    id: doc.id,
                    clientId: data.clientId,
                    clientName: data.clientName,
                    serviceId: data.serviceId,
                    serviceName: data.serviceName,
                    providerId: data.providerId,
                    providerName: data.providerName,
                    amount: data.amount,
                    status: data.status,
                    createdAt: data.createdAt || new Date(),
                    cancelledAt: data.cancelledAt,
                    cancellationReason: data.cancellationReason
                });
            });

            return bookings;

        } catch (error) {
            console.error('Error getting bookings by provider:', error);
            throw new Error('Failed to retrieve provider bookings');
        }
    }

    /**
     * Get booking by ID
     */
    async getBookingById(bookingId: string): Promise<Booking | null> {
        try {
            const bookingDoc = await this.bookingsCollection.doc(bookingId).get();

            if (!bookingDoc.exists) {
                return null;
            }

            const data = bookingDoc.data();
            if (!data) {
                return null;
            }

            return {
                id: bookingDoc.id,
                clientId: data.clientId,
                clientName: data.clientName,
                serviceId: data.serviceId,
                serviceName: data.serviceName,
                providerId: data.providerId,
                providerName: data.providerName,
                amount: data.amount,
                status: data.status,
                createdAt: data.createdAt || new Date(),
                cancelledAt: data.cancelledAt,
                cancellationReason: data.cancellationReason
            };

        } catch (error) {
            console.error('Error getting booking by ID:', error);
            throw new Error('Failed to retrieve booking');
        }
    }

    /**
     * Get booking history with filtering and pagination
     */
    async getBookingHistory(filters?: BookingFilters): Promise<BookingSearchResult> {
        try {
            // Build query based on filters
            let query: FirebaseFirestore.Query = this.bookingsCollection;

            // Apply filters
            if (filters?.clientId) {
                query = query.where('clientId', '==', filters.clientId);
            }

            if (filters?.providerId) {
                query = query.where('providerId', '==', filters.providerId);
            }

            if (filters?.serviceId) {
                query = query.where('serviceId', '==', filters.serviceId);
            }

            if (filters?.status) {
                query = query.where('status', '==', filters.status);
            }

            // Apply date range filters
            if (filters?.startDate) {
                query = query.where('createdAt', '>=', admin.firestore.Timestamp.fromMillis(filters.startDate.getTime()));
            }

            if (filters?.endDate) {
                query = query.where('createdAt', '<=', admin.firestore.Timestamp.fromMillis(filters.endDate.getTime()));
            }

            // Apply sorting
            const sortBy = filters?.sortBy || 'createdAt';
            const sortOrder = filters?.sortOrder || 'desc';
            query = query.orderBy(sortBy, sortOrder);

            // Apply limit for pagination
            const limit = Math.min(filters?.limit || 50, 100);
            query = query.limit(limit + 1); // Get one extra to check if there are more results

            // Apply offset
            if (filters?.offset && filters.offset > 0) {
                // Note: Firestore doesn't support offset directly, so we'll handle this in memory
                // For production, consider using cursor-based pagination
            }

            const querySnapshot = await query.get();
            const allBookings: Booking[] = [];

            querySnapshot.forEach(doc => {
                const data = doc.data();
                allBookings.push({
                    id: doc.id,
                    clientId: data.clientId,
                    clientName: data.clientName,
                    serviceId: data.serviceId,
                    serviceName: data.serviceName,
                    providerId: data.providerId,
                    providerName: data.providerName,
                    amount: data.amount,
                    status: data.status,
                    createdAt: data.createdAt || new Date(),
                    cancelledAt: data.cancelledAt,
                    cancellationReason: data.cancellationReason
                });
            });

            // Apply additional filtering that couldn't be done in Firestore
            let filteredBookings = allBookings;

            if (filters?.minAmount !== undefined) {
                filteredBookings = filteredBookings.filter(b => b.amount >= filters.minAmount!);
            }

            if (filters?.maxAmount !== undefined) {
                filteredBookings = filteredBookings.filter(b => b.amount <= filters.maxAmount!);
            }

            // Apply offset and limit
            const offset = filters?.offset || 0;
            const hasMore = filteredBookings.length > limit;

            if (hasMore) {
                filteredBookings = filteredBookings.slice(0, limit);
            }

            if (offset > 0) {
                filteredBookings = filteredBookings.slice(offset);
            }

            return {
                bookings: filteredBookings,
                total: filteredBookings.length,
                hasMore,
                filters: filters || {}
            };

        } catch (error) {
            console.error('Error getting booking history:', error);
            throw new Error('Failed to retrieve booking history');
        }
    }

    /**
     * Validate booking creation context
     */
    async validateBookingCreation(clientId: string, serviceId: string): Promise<BookingCreationContext> {
        try {
            // Get client details
            const client = await userService.getUserById(clientId);
            if (!client) {
                throw new Error('Client not found');
            }

            if (!client.isActive) {
                throw new Error('Client account is inactive');
            }

            if (client.userType !== 'client') {
                throw new Error('Only clients can create bookings');
            }

            // Get service details
            const service = await this.serviceManager.getServiceById(serviceId);
            if (!service) {
                throw new Error('Service not found');
            }

            if (!service.isActive) {
                throw new Error('Service is not active');
            }

            // Get provider details
            const provider = await userService.getUserById(service.providerId);
            if (!provider) {
                throw new Error('Service provider not found');
            }

            if (!provider.isActive) {
                throw new Error('Service provider account is inactive');
            }

            return {
                clientId: client.id,
                serviceId: service.id,
                clientBalance: client.balance,
                servicePrice: service.price,
                serviceActive: service.isActive,
                providerActive: provider.isActive
            };

        } catch (error) {
            console.error('Error validating booking creation:', error);
            throw new Error(error instanceof Error ? error.message : 'Failed to validate booking creation');
        }
    }
}

// Export singleton instance
export const bookingService = new BookingServiceImpl();