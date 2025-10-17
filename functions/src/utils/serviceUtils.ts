import {
    Service,
    ServiceFilters,
    ServiceSearchResult,
    ServiceWithStats
} from '../models/service';

/**
 * Default pagination settings
 */
export const DEFAULT_SERVICE_LIMIT = 20;
export const DEFAULT_SERVICE_OFFSET = 0;
export const MAX_SERVICE_LIMIT = 100;

/**
 * Apply text search filter to services
 * Searches in service name and description (case-insensitive)
 */
export function applyTextSearch(services: Service[], searchTerm: string): Service[] {
    if (!searchTerm || searchTerm.trim().length === 0) {
        return services;
    }

    const normalizedSearchTerm = searchTerm.toLowerCase().trim();

    return services.filter(service => {
        const nameMatch = service.name.toLowerCase().includes(normalizedSearchTerm);
        const descriptionMatch = service.description.toLowerCase().includes(normalizedSearchTerm);
        return nameMatch || descriptionMatch;
    });
}

/**
 * Apply price range filter to services
 */
export function applyPriceFilter(
    services: Service[],
    minPrice?: number,
    maxPrice?: number
): Service[] {
    return services.filter(service => {
        if (minPrice !== undefined && service.price < minPrice) {
            return false;
        }
        if (maxPrice !== undefined && service.price > maxPrice) {
            return false;
        }
        return true;
    });
}

/**
 * Apply active status filter to services
 */
export function applyActiveFilter(services: Service[], isActive?: boolean): Service[] {
    if (isActive === undefined) {
        return services;
    }

    return services.filter(service => service.isActive === isActive);
}

/**
 * Apply provider filter to services
 */
export function applyProviderFilter(services: Service[], providerId?: string): Service[] {
    if (!providerId) {
        return services;
    }

    return services.filter(service => service.providerId === providerId);
}

/**
 * Sort services based on specified criteria
 */
export function sortServices(
    services: Service[],
    sortBy: 'name' | 'price' | 'createdAt' | 'updatedAt' = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc'
): Service[] {
    return [...services].sort((a, b) => {
        let comparison = 0;

        switch (sortBy) {
            case 'name':
                comparison = a.name.localeCompare(b.name);
                break;
            case 'price':
                comparison = a.price - b.price;
                break;
            case 'createdAt':
                comparison = a.createdAt.getTime() - b.createdAt.getTime();
                break;
            case 'updatedAt':
                comparison = a.updatedAt.getTime() - b.updatedAt.getTime();
                break;
            default:
                comparison = a.createdAt.getTime() - b.createdAt.getTime();
        }

        return sortOrder === 'asc' ? comparison : -comparison;
    });
}

/**
 * Apply pagination to services
 */
export function applyPagination(
    services: Service[],
    limit: number = DEFAULT_SERVICE_LIMIT,
    offset: number = DEFAULT_SERVICE_OFFSET
): { services: Service[]; hasMore: boolean } {
    const normalizedLimit = Math.min(Math.max(1, limit), MAX_SERVICE_LIMIT);
    const normalizedOffset = Math.max(0, offset);

    const paginatedServices = services.slice(normalizedOffset, normalizedOffset + normalizedLimit);
    const hasMore = services.length > normalizedOffset + normalizedLimit;

    return {
        services: paginatedServices,
        hasMore
    };
}

/**
 * Apply all filters to a list of services
 */
export function filterServices(services: Service[], filters: ServiceFilters): ServiceSearchResult {
    let filteredServices = [...services];

    // Apply provider filter
    if (filters.providerId) {
        filteredServices = applyProviderFilter(filteredServices, filters.providerId);
    }

    // Apply active status filter
    if (filters.isActive !== undefined) {
        filteredServices = applyActiveFilter(filteredServices, filters.isActive);
    }

    // Apply price range filter
    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
        filteredServices = applyPriceFilter(filteredServices, filters.minPrice, filters.maxPrice);
    }

    // Apply text search filter
    if (filters.searchTerm) {
        filteredServices = applyTextSearch(filteredServices, filters.searchTerm);
    }

    // Sort services
    if (filters.sortBy || filters.sortOrder) {
        filteredServices = sortServices(
            filteredServices,
            filters.sortBy || 'createdAt',
            filters.sortOrder || 'desc'
        );
    }

    // Store total count before pagination
    const totalCount = filteredServices.length;

    // Apply pagination
    const { services: paginatedServices, hasMore } = applyPagination(
        filteredServices,
        filters.limit,
        filters.offset
    );

    return {
        services: paginatedServices,
        total: totalCount,
        hasMore,
        filters
    };
}

/**
 * Create a service search query for Firestore based on filters
 * This helps optimize database queries by applying filters at the database level
 */
export function buildFirestoreServiceQuery(filters: ServiceFilters): {
    whereConditions: Array<{ field: string; operator: any; value: any }>;
    orderBy?: { field: string; direction: 'asc' | 'desc' };
    limit?: number;
    offset?: number;
} {
    const whereConditions: Array<{ field: string; operator: any; value: any }> = [];

    // Provider filter
    if (filters.providerId) {
        whereConditions.push({
            field: 'providerId',
            operator: '==',
            value: filters.providerId
        });
    }

    // Active status filter
    if (filters.isActive !== undefined) {
        whereConditions.push({
            field: 'isActive',
            operator: '==',
            value: filters.isActive
        });
    }

    // Price range filters
    if (filters.minPrice !== undefined) {
        whereConditions.push({
            field: 'price',
            operator: '>=',
            value: filters.minPrice
        });
    }

    if (filters.maxPrice !== undefined) {
        whereConditions.push({
            field: 'price',
            operator: '<=',
            value: filters.maxPrice
        });
    }

    // Order by
    let orderBy: { field: string; direction: 'asc' | 'desc' } | undefined;
    if (filters.sortBy && filters.sortBy !== 'name') { // Firestore doesn't support ordering by name efficiently with other filters
        orderBy = {
            field: filters.sortBy,
            direction: filters.sortOrder || 'desc'
        };
    }

    return {
        whereConditions,
        orderBy,
        limit: filters.limit,
        offset: filters.offset
    };
}

/**
 * Calculate service statistics
 */
export function calculateServiceStats(
    service: Service,
    bookings: Array<{ amount: number; status: string }>
): ServiceWithStats {
    const confirmedBookings = bookings.filter(booking => booking.status === 'confirmed');

    return {
        ...service,
        bookingCount: confirmedBookings.length,
        totalRevenue: confirmedBookings.reduce((total, booking) => total + booking.amount, 0)
    };
}

/**
 * Format service price for display
 */
export function formatServicePrice(price: number, currency: string = '€'): string {
    return `${price.toFixed(2)}${currency}`;
}

/**
 * Check if a service name is unique among existing services for a provider
 */
export function isServiceNameUniqueForProvider(
    serviceName: string,
    providerId: string,
    existingServices: Service[],
    excludeServiceId?: string
): boolean {
    const normalizedName = serviceName.toLowerCase().trim();

    return !existingServices.some(service =>
        service.providerId === providerId &&
        service.name.toLowerCase().trim() === normalizedName &&
        service.id !== excludeServiceId
    );
}

/**
 * Generate service search suggestions based on existing services
 */
export function generateServiceSearchSuggestions(
    services: Service[],
    searchTerm: string,
    maxSuggestions: number = 5
): string[] {
    if (!searchTerm || searchTerm.trim().length < 2) {
        return [];
    }

    const normalizedSearchTerm = searchTerm.toLowerCase().trim();
    const suggestions = new Set<string>();

    // Extract words from service names and descriptions
    services.forEach(service => {
        const words = [
            ...service.name.toLowerCase().split(/\s+/),
            ...service.description.toLowerCase().split(/\s+/)
        ];

        words.forEach(word => {
            if (word.length >= 3 && word.includes(normalizedSearchTerm)) {
                suggestions.add(word);
            }
        });
    });

    return Array.from(suggestions)
        .sort((a, b) => {
            // Prioritize words that start with the search term
            const aStartsWith = a.startsWith(normalizedSearchTerm);
            const bStartsWith = b.startsWith(normalizedSearchTerm);

            if (aStartsWith && !bStartsWith) return -1;
            if (!aStartsWith && bStartsWith) return 1;

            // Then sort by length (shorter words first)
            return a.length - b.length;
        })
        .slice(0, maxSuggestions);
}

/**
 * Validate service ownership
 */
export function validateServiceOwnership(service: Service, userId: string): boolean {
    return service.providerId === userId;
}

/**
 * Check if a service can be deleted (no active bookings)
 */
export function canDeleteService(
    service: Service,
    activeBookings: Array<{ serviceId: string; status: string }>
): { canDelete: boolean; reason?: string } {
    const serviceActiveBookings = activeBookings.filter(
        booking => booking.serviceId === service.id && booking.status === 'confirmed'
    );

    if (serviceActiveBookings.length > 0) {
        return {
            canDelete: false,
            reason: `Cannot delete service with ${serviceActiveBookings.length} active booking(s)`
        };
    }

    return { canDelete: true };
}