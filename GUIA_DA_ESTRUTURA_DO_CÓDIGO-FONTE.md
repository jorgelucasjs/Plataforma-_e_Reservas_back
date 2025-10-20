# Guia da Estrutura do Código - Plataforma de Reservas

## Visão Geral

Este é um sistema de reservas completo desenvolvido com Firebase Functions e TypeScript. A plataforma permite que provedores ofereçam serviços e clientes façam reservas, com gerenciamento de saldo e autenticação segura.

## Arquitetura Geral

### Tecnologias Principais
- **Backend**: Firebase Functions (Node.js 22)
- **Linguagem**: TypeScript
- **Framework Web**: Express.js
- **Banco de Dados**: Firestore
- **Autenticação**: JWT com bcrypt
- **Recursos Extras**: Socket.io, Algolia (busca), Recombee (recomendações)

### Estrutura de Diretórios

```
functions/
├── src/
│   ├── config/          # Configurações da aplicação
│   ├── controllers/     # Controladores (não implementado - lógica em services)
│   ├── middleware/      # Middlewares de segurança e validação
│   ├── models/         # Interfaces e tipos de dados
│   ├── routes/         # Definição das rotas da API
│   ├── scripts/        # Scripts de inicialização do banco
│   ├── services/       # Lógica de negócio
│   ├── types/          # Tipos TypeScript adicionais
│   ├── utils/          # Utilitários e helpers
│   └── validation/     # Validações de entrada
├── lib/                # Código compilado (TypeScript -> JavaScript)
└── [arquivos de config] # firebase.json, tsconfig.json, etc.
```

## Modelos de Dados (Core Entities)

### 1. Usuário (`models/user.ts`)

**Interface Principal**: `User`
```typescript
interface User {
  id: string;
  fullName: string;
  nif: string;           // Número de identificação fiscal
  email: string;
  passwordHash: string;
  userType: 'client' | 'provider';
  balance: number;       // Saldo do usuário
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}
```

**Tipos de Usuário**:
- **Client**: Usuários que fazem reservas
- **Provider**: Usuários que oferecem serviços

### 2. Serviço (`models/service.ts`)

**Interface Principal**: `Service`
```typescript
interface Service {
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
```

### 3. Reserva (`models/booking.ts`)

**Interface Principal**: `Booking`
```typescript
interface Booking {
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
```

## API Endpoints

### Autenticação (`/auth`)
- `POST /auth/register` - Registro de usuário
- `POST /auth/login` - Login de usuário

### Usuários (`/users`)
- `GET /users/profile` - Perfil do usuário atual
- `GET /users/balance` - Saldo do usuário

### Serviços (`/services`)
- `POST /services` - Criar serviço (apenas providers)
- `GET /services` - Listar serviços (com filtros)
- `GET /services/my` - Serviços do provider logado
- `PUT /services/:id` - Atualizar serviço
- `DELETE /services/:id` - Deletar serviço

### Reservas (`/bookings`)
- `POST /bookings` - Criar reserva
- `GET /bookings/my` - Reservas do usuário
- `PUT /bookings/:id/cancel` - Cancelar reserva
- `GET /bookings/history` - Histórico de reservas

### Administração (`/admin`)
- `GET /admin/health` - Verificação de saúde do banco
- `POST /admin/initialize` - Inicializar banco de dados
- `GET /admin/status` - Status do sistema

## Camadas da Arquitetura

### 1. Middleware (`middleware/`)

#### Segurança e Validação
- **`auth.ts`**: Autenticação JWT e autorização baseada em roles
- **`errorHandler.ts`**: Tratamento centralizado de erros
- **`validation.ts`**: Validação de entrada e sanitização

#### Recursos de Segurança
- CORS configurado
- Rate limiting
- Sanitização de entrada
- Validação de content-type
- Timeout de requests (30s)

### 2. Serviços (`services/`)

#### Core Business Logic
- **`userService.ts`**: Operações relacionadas a usuários
- **`bookingService.ts`**: Lógica de reservas e transações
- **`balanceService.ts`**: Gerenciamento de saldo com operações atômicas
- **`serviceManager.ts`**: Gerenciamento de serviços

### 3. Utilitários (`utils/`)

#### Helpers Essenciais
- **`database.ts`**: Operações com Firestore
- **`jwtUtils.ts`**: Geração e validação de tokens JWT
- **`passwordUtils.ts`**: Hash de senhas com bcrypt
- **`bookingUtils.ts`**: Utilitários para reservas
- **`monitoring.ts`**: Monitoramento de requests

### 4. Validação (`validation/`)

#### Validações de Entrada
- **`userValidation.ts`**: Validação de dados de usuário
- **`serviceValidation.ts`**: Validação de serviços
- **`bookingValidation.ts`**: Validação de reservas
- **`uniquenessValidation.ts`**: Verificação de unicidade

## Características de Segurança

### 1. Autenticação
- JWT tokens com expiração
- Hash de senhas com bcrypt
- Proteção contra ataques de força bruta

### 2. Autorização
- Role-based access control (RBAC)
- Verificação de propriedade (ex: provider só edita seus serviços)
- Middleware de autenticação em rotas protegidas

### 3. Validação de Dados
- Sanitização de entrada
- Validação de tipos e formatos
- Rate limiting
- Validação de tamanho de request (1MB)

### 4. Transações
- Operações de saldo atômicas
- Rollback em caso de erro
- Controle de concorrência

## Recursos Avançados

### 1. Sistema de Saldo
- Saldo inicial para novos usuários
- Transações atômicas (débito/crédito)
- Histórico de transações
- Rollback automático em falhas

### 2. Busca e Filtragem
- Filtros por preço, data, status
- Ordenação múltipla
- Paginação
- Busca textual (preparação para Algolia)

### 3. Real-time (Socket.io)
- Notificações em tempo real
- Preparação para chat
- Eventos de sistema

### 4. Recomendações (Recombee)
- Sistema de recomendações preparado
- Análise de comportamento do usuário

## Padrões de Desenvolvimento

### 1. Estrutura de Respostas
```typescript
interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}
```

### 2. Tratamento de Erros
- Erros centralizados no `errorHandler`
- Códigos de erro padronizados
- Logging estruturado

### 3. Validação
- Interfaces específicas para requests/responses
- Validação em camadas (middleware + serviço)
- Mensagens de erro claras

## Configuração e Deploy

### Scripts NPM
- `npm run build`: Compilar TypeScript
- `npm run serve`: Servidor de desenvolvimento local
- `npm run deploy`: Deploy para Firebase
- `npm run db:init`: Inicializar banco de dados

### Variáveis de Ambiente
- Configuração via `.env`
- Firebase project configuration
- JWT secrets
- API keys (Algolia, Recombee)

## Fluxo de Reserva

1. **Cliente** faz login e verifica saldo
2. **Busca** serviços disponíveis
3. **Cria** reserva (verificação de saldo automática)
4. **Sistema** debita valor do cliente e credita no provider
5. **Notificação** em tempo real para ambos
6. **Cancelamento** (opcional): rollback de saldo

## Considerações de Performance

- **Firestore**: Operações otimizadas com índices
- **Cache**: Preparação para implementação
- **Rate Limiting**: Controle de requests
- **Timeout**: 30s para requests, 540s para Cloud Functions
- **Monitoring**: Logs estruturados

Este guia fornece uma visão abrangente da arquitetura e estrutura do código da plataforma de reservas.