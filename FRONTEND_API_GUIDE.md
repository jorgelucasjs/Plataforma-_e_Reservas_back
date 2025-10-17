# Guia da API para Programadores Front-end

## Visão Geral

Esta API RESTful oferece um sistema completo de reservas com gestão de utilizadores, serviços e reservas. A API utiliza autenticação JWT e controlo de acesso baseado em funções (RBAC).

**URL Base**: `https://your-firebase-project.cloudfunctions.net/agendaLaServer`
**Emulador Local**: `http://localhost:5002/agendaLaServer`

## Autenticação

### Sistema de Tokens JWT

A API utiliza tokens JWT para autenticação. Após o login bem-sucedido, receberá um token que deve ser incluído no cabeçalho `Authorization` de todas as requisições protegidas.

```javascript
// Exemplo de cabeçalho de autorização
headers: {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
}
```

### Tipos de Utilizador

- **client**: Pode criar reservas e gerir o seu perfil
- **provider**: Pode criar serviços, gerir reservas recebidas e o seu perfil

## Endpoints da API

### 1. Autenticação (`/auth`)

#### 1.1 Registo de Utilizador
```http
POST /auth/register
```

**Corpo da Requisição:**
```json
{
  "fullName": "João Silva",
  "nif": "123456789",
  "email": "joao@exemplo.com",
  "password": "senha123",
  "userType": "client" // ou "provider"
}
```

**Resposta de Sucesso (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": "24h",
    "user": {
      "id": "user123",
      "fullName": "João Silva",
      "email": "joao@exemplo.com",
      "userType": "client",
      "balance": 100.00
    }
  }
}
```

**Erros Comuns:**
- `400`: Dados de validação inválidos
- `409`: Email ou NIF já existem

#### 1.2 Login de Utilizador
```http
POST /auth/login
```

**Corpo da Requisição:**
```json
{
  "email": "joao@exemplo.com",
  "password": "senha123"
}
```

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "message": "Authentication successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": "24h",
    "user": {
      "id": "user123",
      "fullName": "João Silva",
      "email": "joao@exemplo.com",
      "userType": "client",
      "balance": 100.00
    }
  }
}
```

**Erros Comuns:**
- `401`: Credenciais inválidas
- `401`: Conta inativa

### 2. Gestão de Utilizadores (`/users`)

#### 2.1 Obter Perfil do Utilizador
```http
GET /users/profile
Authorization: Bearer {token}
```

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "message": "User profile retrieved successfully",
  "data": {
    "id": "user123",
    "fullName": "João Silva",
    "email": "joao@exemplo.com",
    "nif": "123456789",
    "userType": "client",
    "balance": 100.00,
    "createdAt": "2024-01-15T10:30:00Z",
    "isActive": true
  }
}
```

#### 2.2 Obter Saldo do Utilizador
```http
GET /users/balance
Authorization: Bearer {token}
```

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "message": "User balance retrieved successfully",
  "data": {
    "balance": 100.00
  }
}
```

### 3. Gestão de Serviços (`/services`)

#### 3.1 Listar Todos os Serviços Ativos
```http
GET /services?search=massage&minPrice=20&maxPrice=100&sortBy=price&sortOrder=asc&limit=10&offset=0
```

**Parâmetros de Query (opcionais):**
- `search`: Termo de pesquisa (nome e descrição)
- `minPrice`: Preço mínimo
- `maxPrice`: Preço máximo
- `sortBy`: Campo de ordenação (`name`, `price`, `createdAt`, `updatedAt`)
- `sortOrder`: Ordem (`asc`, `desc`)
- `limit`: Número máximo de resultados
- `offset`: Número de resultados a saltar

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "message": "Services retrieved successfully",
  "data": {
    "services": [
      {
        "id": "service123",
        "name": "Massagem Relaxante",
        "description": "Massagem de corpo inteiro para relaxamento",
        "price": 50.00,
        "providerId": "provider123",
        "providerName": "Maria Santos",
        "isActive": true,
        "createdAt": "2024-01-15T10:30:00Z",
        "updatedAt": "2024-01-15T10:30:00Z"
      }
    ],
    "total": 1
  }
}
```

#### 3.2 Criar Serviço (Apenas Providers)
```http
POST /services
Authorization: Bearer {token}
```

**Corpo da Requisição:**
```json
{
  "name": "Massagem Relaxante",
  "description": "Massagem de corpo inteiro para relaxamento",
  "price": 50.00
}
```

**Resposta de Sucesso (201):**
```json
{
  "success": true,
  "message": "Service created successfully",
  "data": {
    "id": "service123",
    "name": "Massagem Relaxante",
    "description": "Massagem de corpo inteiro para relaxamento",
    "price": 50.00,
    "providerId": "provider123",
    "providerName": "Maria Santos",
    "isActive": true,
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

#### 3.3 Obter Serviços do Provider
```http
GET /services/my
Authorization: Bearer {token}
```

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "message": "Provider services retrieved successfully",
  "data": {
    "services": [
      {
        "id": "service123",
        "name": "Massagem Relaxante",
        "description": "Massagem de corpo inteiro para relaxamento",
        "price": 50.00,
        "providerId": "provider123",
        "providerName": "Maria Santos",
        "isActive": true,
        "createdAt": "2024-01-15T10:30:00Z",
        "updatedAt": "2024-01-15T10:30:00Z"
      }
    ],
    "total": 1
  }
}
```

#### 3.4 Atualizar Serviço
```http
PUT /services/{serviceId}
Authorization: Bearer {token}
```

**Corpo da Requisição:**
```json
{
  "name": "Massagem Relaxante Premium",
  "description": "Massagem de corpo inteiro com óleos essenciais",
  "price": 60.00,
  "isActive": true
}
```

#### 3.5 Eliminar Serviço
```http
DELETE /services/{serviceId}
Authorization: Bearer {token}
```

### 4. Gestão de Reservas (`/bookings`)

#### 4.1 Criar Reserva (Apenas Clients)
```http
POST /bookings
Authorization: Bearer {token}
```

**Corpo da Requisição:**
```json
{
  "serviceId": "service123"
}
```

**Resposta de Sucesso (201):**
```json
{
  "success": true,
  "message": "Booking created successfully",
  "data": {
    "id": "booking123",
    "clientId": "client123",
    "clientName": "João Silva",
    "serviceId": "service123",
    "serviceName": "Massagem Relaxante",
    "providerId": "provider123",
    "providerName": "Maria Santos",
    "amount": 50.00,
    "status": "confirmed",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

**Erros Comuns:**
- `400`: Saldo insuficiente
- `404`: Serviço não encontrado
- `400`: Serviço inativo

#### 4.2 Obter Reservas do Utilizador
```http
GET /bookings/my
Authorization: Bearer {token}
```

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "message": "Bookings retrieved successfully",
  "data": {
    "bookings": [
      {
        "id": "booking123",
        "clientId": "client123",
        "clientName": "João Silva",
        "serviceId": "service123",
        "serviceName": "Massagem Relaxante",
        "providerId": "provider123",
        "providerName": "Maria Santos",
        "amount": 50.00,
        "status": "confirmed",
        "createdAt": "2024-01-15T10:30:00Z"
      }
    ],
    "count": 1,
    "userType": "client"
  }
}
```

#### 4.3 Cancelar Reserva
```http
PUT /bookings/{bookingId}/cancel
Authorization: Bearer {token}
```

**Corpo da Requisição (opcional):**
```json
{
  "cancellationReason": "Conflito de horário"
}
```

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "message": "Booking cancelled successfully",
  "data": {
    "id": "booking123",
    "clientId": "client123",
    "clientName": "João Silva",
    "serviceId": "service123",
    "serviceName": "Massagem Relaxante",
    "providerId": "provider123",
    "providerName": "Maria Santos",
    "amount": 50.00,
    "status": "cancelled",
    "createdAt": "2024-01-15T10:30:00Z",
    "cancelledAt": "2024-01-15T11:00:00Z",
    "cancellationReason": "Conflito de horário"
  }
}
```

#### 4.4 Histórico de Reservas com Filtros
```http
GET /bookings/history?startDate=2024-01-01&endDate=2024-01-31&status=confirmed&minAmount=20&maxAmount=100&serviceId=service123&sortBy=createdAt&sortOrder=desc&limit=10&offset=0
Authorization: Bearer {token}
```

**Parâmetros de Query (opcionais):**
- `startDate`: Data de início (ISO 8601)
- `endDate`: Data de fim (ISO 8601)
- `status`: Estado da reserva (`confirmed`, `cancelled`)
- `minAmount`: Valor mínimo
- `maxAmount`: Valor máximo
- `serviceId`: ID do serviço específico
- `sortBy`: Campo de ordenação (`createdAt`, `amount`, `status`)
- `sortOrder`: Ordem (`asc`, `desc`)
- `limit`: Número máximo de resultados
- `offset`: Número de resultados a saltar

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "message": "Booking history retrieved successfully",
  "data": {
    "bookings": [
      {
        "id": "booking123",
        "clientId": "client123",
        "clientName": "João Silva",
        "serviceId": "service123",
        "serviceName": "Massagem Relaxante",
        "providerId": "provider123",
        "providerName": "Maria Santos",
        "amount": 50.00,
        "status": "confirmed",
        "createdAt": "2024-01-15T10:30:00Z"
      }
    ],
    "total": 1,
    "hasMore": false,
    "filters": {
      "startDate": "2024-01-01T00:00:00Z",
      "endDate": "2024-01-31T23:59:59Z",
      "status": "confirmed"
    },
    "userType": "client"
  }
}
```

### 5. Administração (`/admin`)

#### 5.1 Verificação de Saúde da Base de Dados
```http
GET /admin/health
```

#### 5.2 Estado do Sistema
```http
GET /admin/status
Authorization: Bearer {token}
```

## Tratamento de Erros

### Estrutura de Resposta de Erro

```json
{
  "success": false,
  "error": "VALIDATION_ERROR",
  "message": "Email and password are required",
  "code": "VALIDATION_ERROR",
  "details": {
    "field": "email",
    "value": null
  }
}
```

### Códigos de Estado HTTP

- `200`: Sucesso
- `201`: Criado com sucesso
- `400`: Erro de validação ou dados inválidos
- `401`: Não autorizado (token inválido ou em falta)
- `403`: Proibido (sem permissões)
- `404`: Recurso não encontrado
- `409`: Conflito (recurso já existe)
- `500`: Erro interno do servidor

### Códigos de Erro da API

- `VALIDATION_ERROR`: Erro de validação de dados
- `AUTHENTICATION_ERROR`: Erro de autenticação
- `AUTHORIZATION_ERROR`: Erro de autorização
- `NOT_FOUND`: Recurso não encontrado
- `DUPLICATE_RESOURCE`: Recurso duplicado
- `INSUFFICIENT_BALANCE`: Saldo insuficiente
- `INVALID_OPERATION`: Operação inválida
- `DATABASE_ERROR`: Erro da base de dados
- `INTERNAL_ERROR`: Erro interno

## Exemplos de Implementação

### JavaScript/TypeScript (Fetch API)

```javascript
class BookingAPI {
  constructor(baseURL, token = null) {
    this.baseURL = baseURL;
    this.token = token;
  }

  setToken(token) {
    this.token = token;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { 'Authorization': `Bearer ${this.token}` }),
        ...options.headers,
      },
      ...options,
    };

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Request failed');
      }

      return data;
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  }

  // Autenticação
  async register(userData) {
    return this.request('/auth/register', {
      method: 'POST',
      body: userData,
    });
  }

  async login(credentials) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: credentials,
    });
    
    if (response.success && response.data.token) {
      this.setToken(response.data.token);
    }
    
    return response;
  }

  // Utilizadores
  async getProfile() {
    return this.request('/users/profile');
  }

  async getBalance() {
    return this.request('/users/balance');
  }

  // Serviços
  async getServices(filters = {}) {
    const queryString = new URLSearchParams(filters).toString();
    return this.request(`/services${queryString ? `?${queryString}` : ''}`);
  }

  async createService(serviceData) {
    return this.request('/services', {
      method: 'POST',
      body: serviceData,
    });
  }

  async getMyServices() {
    return this.request('/services/my');
  }

  async updateService(serviceId, updateData) {
    return this.request(`/services/${serviceId}`, {
      method: 'PUT',
      body: updateData,
    });
  }

  async deleteService(serviceId) {
    return this.request(`/services/${serviceId}`, {
      method: 'DELETE',
    });
  }

  // Reservas
  async createBooking(serviceId) {
    return this.request('/bookings', {
      method: 'POST',
      body: { serviceId },
    });
  }

  async getMyBookings() {
    return this.request('/bookings/my');
  }

  async cancelBooking(bookingId, reason = null) {
    return this.request(`/bookings/${bookingId}/cancel`, {
      method: 'PUT',
      body: reason ? { cancellationReason: reason } : {},
    });
  }

  async getBookingHistory(filters = {}) {
    const queryString = new URLSearchParams(filters).toString();
    return this.request(`/bookings/history${queryString ? `?${queryString}` : ''}`);
  }
}

// Exemplo de uso
const api = new BookingAPI('http://localhost:5002/agendaLaServer');

// Login
try {
  const loginResponse = await api.login({
    email: 'joao@exemplo.com',
    password: 'senha123'
  });
  
  console.log('Login bem-sucedido:', loginResponse.data.user);
  
  // Obter serviços
  const services = await api.getServices({ 
    search: 'massage', 
    limit: 10 
  });
  
  console.log('Serviços encontrados:', services.data.services);
  
  // Criar reserva
  if (services.data.services.length > 0) {
    const booking = await api.createBooking(services.data.services[0].id);
    console.log('Reserva criada:', booking.data);
  }
  
} catch (error) {
  console.error('Erro:', error.message);
}
```

### React Hook Personalizado

```javascript
import { useState, useEffect, useCallback } from 'react';

export const useBookingAPI = (baseURL) => {
  const [token, setToken] = useState(localStorage.getItem('authToken'));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const api = new BookingAPI(baseURL, token);

  useEffect(() => {
    if (token) {
      localStorage.setItem('authToken', token);
      api.setToken(token);
    } else {
      localStorage.removeItem('authToken');
    }
  }, [token]);

  const handleRequest = useCallback(async (requestFn) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await requestFn();
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (credentials) => {
    return handleRequest(async () => {
      const response = await api.login(credentials);
      setToken(response.data.token);
      setUser(response.data.user);
      return response;
    });
  }, [handleRequest]);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setError(null);
  }, []);

  const register = useCallback(async (userData) => {
    return handleRequest(async () => {
      const response = await api.register(userData);
      setToken(response.data.token);
      setUser(response.data.user);
      return response;
    });
  }, [handleRequest]);

  return {
    api,
    token,
    user,
    loading,
    error,
    login,
    logout,
    register,
    isAuthenticated: !!token,
  };
};
```

## Boas Práticas

### 1. Gestão de Tokens
- Armazene tokens de forma segura (localStorage para web, keychain para mobile)
- Implemente renovação automática de tokens
- Limpe tokens ao fazer logout

### 2. Tratamento de Erros
- Sempre verifique o campo `success` na resposta
- Implemente retry logic para erros de rede
- Mostre mensagens de erro amigáveis ao utilizador

### 3. Performance
- Use paginação para listas grandes
- Implemente cache para dados que não mudam frequentemente
- Use debouncing para pesquisas em tempo real

### 4. Segurança
- Nunca armazene senhas no frontend
- Valide dados no frontend antes de enviar
- Use HTTPS em produção

### 5. UX/UI
- Mostre estados de loading durante requisições
- Implemente feedback visual para ações (sucesso/erro)
- Use optimistic updates quando apropriado

## Configuração CORS

A API está configurada para aceitar requisições de origens específicas. Para desenvolvimento local, certifique-se de que a sua aplicação frontend está a correr numa porta permitida ou configure as origens permitidas no ficheiro `functions/src/config/corsConfig.ts`.

## Ambiente de Desenvolvimento

Para testar a API localmente:

1. Inicie o emulador Firebase: `firebase emulators:start`
2. A API estará disponível em: `http://localhost:5002/agendaLaServer`
3. Use o endpoint `/info` para verificar se a API está a funcionar

## Suporte

Para questões técnicas ou problemas com a API, consulte:
- Logs do Firebase Functions
- Documentação do Firebase
- Código fonte da API no diretório `functions/src/`