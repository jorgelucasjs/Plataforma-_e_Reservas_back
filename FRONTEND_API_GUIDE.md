# Frontend API Guide - AgendaLa API

Este guia fornece todas as informações necessárias para que o desenvolvedor frontend consuma a API da plataforma AgendaLa, uma API RESTful para sistema de reservas de serviços.

## 📋 Visão Geral da API

- **Base URL**: `https://us-central1-angolaeventos-cd238.cloudfunctions.net/sistemaDeReservaServer`
- **Autenticação**: JWT (JSON Web Tokens)
- **Formato de Dados**: JSON
- **Codificação**: UTF-8
- **CORS**: Habilitado para domínios específicos

## 🔐 Autenticação

### Registro de Usuário

**Endpoint**: `POST /auth/register`

**Corpo da Requisição**:
```json
{
  "fullName": "João Silva",
  "nif": "123456789",
  "email": "joao.silva@email.com",
  "password": "senhaSegura123",
  "userType": "client" // ou "provider"
}
```

**Resposta de Sucesso**:
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
      "email": "joao.silva@email.com",
      "userType": "client",
      "balance": 0
    }
  }
}
```

### Login

**Endpoint**: `POST /auth/login`

**Corpo da Requisição**:
```json
{
  "email": "joao.silva@email.com",
  "password": "senhaSegura123"
}
```

**Resposta de Sucesso**:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": "24h",
    "user": {
      "id": "user123",
      "fullName": "João Silva",
      "email": "joao.silva@email.com",
      "userType": "client",
      "balance": 100.50
    }
  }
}
```

### Como Usar o Token JWT

Após obter o token, inclua-o no header `Authorization` de todas as requisições autenticadas:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 👤 Endpoints de Usuário

### Obter Perfil do Usuário

**Endpoint**: `GET /users/profile`

**Autenticação**: Necessária

**Resposta de Sucesso**:
```json
{
  "success": true,
  "message": "User profile retrieved successfully",
  "data": {
    "id": "user123",
    "fullName": "João Silva",
    "email": "joao.silva@email.com",
    "nif": "123456789",
    "userType": "client",
    "balance": 100.50,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "isActive": true
  }
}
```

### Obter Saldo do Usuário

**Endpoint**: `GET /users/balance`

**Autenticação**: Necessária

**Resposta de Sucesso**:
```json
{
  "success": true,
  "message": "User balance retrieved successfully",
  "data": {
    "balance": 100.50
  }
}
```

## 🛍️ Endpoints de Serviços

### Criar Serviço (Apenas Providers)

**Endpoint**: `POST /services`

**Autenticação**: Necessária (Provider)

**Corpo da Requisição**:
```json
{
  "name": "Corte de Cabelo Masculino",
  "description": "Corte moderno com acabamento profissional",
  "price": 25.00
}
```

**Resposta de Sucesso**:
```json
{
  "success": true,
  "message": "Service created successfully",
  "data": {
    "id": "service123",
    "name": "Corte de Cabelo Masculino",
    "description": "Corte moderno com acabamento profissional",
    "price": 25.00,
    "providerId": "provider456",
    "providerName": "Barbearia Silva",
    "isActive": true,
    "createdAt": "2024-01-15T14:20:00.000Z",
    "updatedAt": "2024-01-15T14:20:00.000Z"
  }
}
```

### Listar Serviços

**Endpoint**: `GET /services`

**Autenticação**: Não necessária

**Parâmetros de Query** (opcionais):
- `search`: Termo de busca (nome ou descrição)
- `minPrice`: Preço mínimo
- `maxPrice`: Preço máximo
- `sortBy`: Ordenação (name, price, createdAt, updatedAt)
- `sortOrder`: Ordem (asc, desc)
- `limit`: Limite de resultados
- `offset`: Deslocamento para paginação

**Exemplo**: `GET /services?search=corte&minPrice=10&maxPrice=50&sortBy=price&sortOrder=asc&limit=20`

**Resposta de Sucesso**:
```json
{
  "success": true,
  "message": "Services retrieved successfully",
  "data": {
    "services": [
      {
        "id": "service123",
        "name": "Corte de Cabelo Masculino",
        "description": "Corte moderno com acabamento profissional",
        "price": 25.00,
        "providerId": "provider456",
        "providerName": "Barbearia Silva",
        "isActive": true,
        "createdAt": "2024-01-15T14:20:00.000Z",
        "updatedAt": "2024-01-15T14:20:00.000Z"
      }
    ],
    "total": 1
  }
}
```

### Listar Serviços do Provider

**Endpoint**: `GET /services/my`

**Autenticação**: Necessária (Provider)

**Resposta**: Mesma estrutura do endpoint de listagem geral, mas apenas serviços do provider autenticado.

### Atualizar Serviço

**Endpoint**: `POST /services/{serviceId}`

**Autenticação**: Necessária (Provider - dono do serviço)

**Corpo da Requisição** (pelo menos um campo):
```json
{
  "name": "Corte de Cabelo Masculino Premium",
  "price": 30.00,
  "isActive": true
}
```

### Deletar Serviço

**Endpoint**: `DELETE /services/{serviceId}`

**Autenticação**: Necessária (Provider - dono do serviço)

**Resposta de Sucesso**:
```json
{
  "success": true,
  "message": "Service deleted successfully"
}
```

## 📅 Endpoints de Reservas

### Criar Reserva (Apenas Clients)

**Endpoint**: `POST /bookings`

**Autenticação**: Necessária (Client)

**Corpo da Requisição**:
```json
{
  "serviceId": "service123"
}
```

**Resposta de Sucesso**:
```json
{
  "success": true,
  "message": "Booking created successfully",
  "data": {
    "id": "booking123",
    "clientId": "client456",
    "clientName": "João Silva",
    "serviceId": "service123",
    "serviceName": "Corte de Cabelo Masculino",
    "providerId": "provider789",
    "providerName": "Barbearia Silva",
    "amount": 25.00,
    "status": "confirmed",
    "createdAt": "2024-01-15T16:00:00.000Z"
  }
}
```

### Listar Minhas Reservas

**Endpoint**: `GET /bookings/my`

**Autenticação**: Necessária

**Resposta de Sucesso**:
```json
{
  "success": true,
  "message": "Bookings retrieved successfully",
  "data": {
    "bookings": [
      {
        "id": "booking123",
        "clientId": "client456",
        "clientName": "João Silva",
        "serviceId": "service123",
        "serviceName": "Corte de Cabelo Masculino",
        "providerId": "provider789",
        "providerName": "Barbearia Silva",
        "amount": 25.00,
        "status": "confirmed",
        "createdAt": "2024-01-15T16:00:00.000Z"
      }
    ],
    "count": 1,
    "userType": "client"
  }
}
```

### Cancelar Reserva

**Endpoint**: `PUT /bookings/{bookingId}/cancel`

**Autenticação**: Necessária (Client dono da reserva ou Provider dono do serviço)

**Corpo da Requisição** (opcional):
```json
{
  "cancellationReason": "Cliente não pode comparecer"
}
```

### Histórico de Reservas

**Endpoint**: `GET /bookings/history`

**Autenticação**: Necessária

**Parâmetros de Query** (opcionais):
- `startDate`: Data inicial (ISO 8601)
- `endDate`: Data final (ISO 8601)
- `status`: Status (confirmed, cancelled)
- `minAmount`: Valor mínimo
- `maxAmount`: Valor máximo
- `serviceId`: ID do serviço
- `sortBy`: Ordenação (createdAt, amount, status)
- `sortOrder`: Ordem (asc, desc)
- `limit`: Limite
- `offset`: Deslocamento

**Exemplo**: `GET /bookings/history?startDate=2024-01-01&endDate=2024-01-31&status=confirmed&limit=10`

## 🔧 Endpoints Administrativos

### Verificar Saúde do Sistema

**Endpoint**: `GET /admin/health`

**Autenticação**: Não necessária

### Validar Schema da Base de Dados

**Endpoint**: `GET /admin/schema/validate`

**Autenticação**: Não necessária

### Inicializar Base de Dados

**Endpoint**: `POST /admin/initialize`

**Autenticação**: Não necessária

### Status do Sistema

**Endpoint**: `GET /admin/status`

**Autenticação**: Necessária

## 📊 Estrutura de Respostas

### Resposta de Sucesso Padrão

```json
{
  "success": true,
  "message": "Operação realizada com sucesso",
  "data": {
    // Dados específicos da operação
  }
}
```

### Resposta de Erro Padrão

```json
{
  "success": false,
  "error": "Código do erro",
  "message": "Mensagem descritiva do erro",
  "details": {
    // Detalhes adicionais do erro (opcional)
  }
}
```

## 🚨 Tratamento de Erros

### Códigos de Status HTTP

- **200**: Sucesso
- **201**: Criado
- **400**: Requisição inválida (dados incorretos)
- **401**: Não autorizado (token inválido/ausente)
- **403**: Proibido (permissão insuficiente)
- **404**: Não encontrado
- **409**: Conflito (recurso já existe)
- **500**: Erro interno do servidor

### Tipos de Erro Comuns

- `VALIDATION_ERROR`: Dados inválidos
- `AUTHENTICATION_ERROR`: Problemas de autenticação
- `AUTHORIZATION_ERROR`: Problemas de autorização
- `NOT_FOUND`: Recurso não encontrado
- `DUPLICATE_RESOURCE`: Recurso duplicado
- `INSUFFICIENT_BALANCE`: Saldo insuficiente
- `INVALID_OPERATION`: Operação inválida

## 🔒 Segurança

### Headers Necessários

Para todas as requisições autenticadas:
```
Authorization: Bearer {token}
Content-Type: application/json
```

### CORS

A API aceita requisições dos seguintes domínios:
- `http://localhost:8080`
- `http://localhost:3000`
- `http://localhost:5173`
- `https://angolaeventos-cd238.web.app`
- `https://angolaeventos-cd238.firebaseapp.com`
- `https://agendala.online`

## 📝 Validações

### Validações de Usuário
- `fullName`: Obrigatório, string não vazia
- `nif`: Obrigatório, string não vazia
- `email`: Obrigatório, formato de email válido
- `password`: Obrigatório, mínimo 6 caracteres
- `userType`: Obrigatório, "client" ou "provider"

### Validações de Serviço
- `name`: Obrigatório, string não vazia
- `description`: Obrigatório, string não vazia
- `price`: Obrigatório, número positivo

### Validações de Reserva
- `serviceId`: Obrigatório, ID válido de serviço

## 💡 Dicas para Implementação Frontend

1. **Armazenamento do Token**: Use localStorage ou sessionStorage para armazenar o token JWT
2. **Interceptação de Requisições**: Implemente um interceptor para adicionar automaticamente o token às requisições
3. **Tratamento de Token Expirado**: Implemente lógica para renovar token ou redirecionar para login
4. **Loading States**: Mostre indicadores de carregamento durante as requisições
5. **Error Handling**: Implemente tratamento de erros consistente para todos os endpoints
6. **Data Formatting**: Formate datas adequadamente para exibição (considere timezone)
7. **Pagination**: Implemente paginação para listagens grandes
8. **Real-time Updates**: Considere usar WebSockets ou polling para atualizações em tempo real

## 🧪 Testes

Use a coleção do Postman incluída no repositório (`AgendaLa_API_Postman_Collection.json`) para testar os endpoints durante o desenvolvimento.

## 📞 Suporte

Para dúvidas sobre a API, consulte a documentação técnica ou entre em contato com a equipe de desenvolvimento backend.