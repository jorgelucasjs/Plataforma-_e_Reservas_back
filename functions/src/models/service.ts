/**
 * Modelos de dados de serviço, esquemas de validação e utilitários
 * Este módulo contém todas as interfaces relacionadas a serviços, funções de validação,
 * e utilitários de filtragem para a API da plataforma de reservas.
 */

/**
 * Interface principal do Serviço representando o documento do serviço no Firestore
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
 * Dados de criação do serviço (sem campos gerados)
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
 * Dados de atualização do serviço (campos parciais que podem ser atualizados)
 */
export interface UpdateServiceData {
  name?: string;
  description?: string;
  price?: number;
  isActive?: boolean;
  updatedAt?: Date;
}

/**
 * Interface de requisição de criação de serviço (da API)
 */
export interface CreateServiceRequest {
  name: string;
  description: string;
  price: number;
}

/**
 * Interface de requisição de atualização de serviço (da API)
 */
export interface UpdateServiceRequest {
  name?: string;
  description?: string;
  price?: number;
  isActive?: boolean;
}

/**
 * Opções de filtragem de serviços para busca e listagem
 */
export interface ServiceFilters {
  providerId?: string;
  isActive?: boolean;
  minPrice?: number;
  maxPrice?: number;
  searchTerm?: string; // Buscar em nome e descrição
  sortBy?: 'name' | 'price' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

/**
 * Interface de resultado de busca de serviços
 */
export interface ServiceSearchResult {
  services: Service[];
  total: number;
  hasMore: boolean;
  filters: ServiceFilters;
}

/**
 * Interface de resultado de validação de serviço
 */
export interface ServiceValidationResult {
  isValid: boolean;
  errors: ServiceValidationError[];
}

/**
 * Erro individual de validação de serviço
 */
export interface ServiceValidationError {
  field: string;
  message: string;
  code: string;
}

/**
 * Interface de estatísticas de serviço (para provedores)
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
 * Serviço com contagem de reservas (para listagem com popularidade)
 */
export interface ServiceWithStats extends Service {
  bookingCount: number;
  totalRevenue: number;
}