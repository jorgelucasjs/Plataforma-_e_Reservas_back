// Configurar variáveis de ambiente
import * as dotenv from "dotenv";
dotenv.config();

// Inicializar Firebase Admin SDK
import * as admin from "firebase-admin";

// Inicializar Firebase Admin apenas se ainda não foi inicializado
if (!admin.apps.length) {
  admin.initializeApp();
}

// Importações
import express, { Request, Response } from "express";
import { onRequest } from "firebase-functions/v2/https";
import cors from "cors";

import { ALLOWED_ORIGINS, CORS_METHODS, CORS_HEADERS, CORS_MAX_AGE } from "./config/corsConfig";

// Importar middleware
import { 
  errorHandler, 
  notFoundHandler, 
  timeoutHandler, 
  securityErrorHandler 
} from './middleware/errorHandler';
import { 
  sanitizeInput, 
  validateContentType, 
  validateRequestSize 
} from './middleware/validation';

// Importar utilitários de monitoramento
import { createRequestMonitoringMiddleware } from './utils/monitoring';

// Importar rotas
import { authRoutes, userRoutes, serviceRoutes, bookingRoutes } from './routes';
import adminRoutes from './routes/admin';

// Criar aplicação Express
const app = express();

// Middleware de segurança - aplicar cedo
app.use(timeoutHandler(30000)); // Timeout de 30 segundos
app.use(validateRequestSize(1024 * 1024)); // Limite de tamanho de requisição de 1MB
app.use(securityErrorHandler);

// Configuração CORS
const extraAllowedOrigins = [
  'https://bulir-angola.web.app' // origem adicionada para permitir requests do frontend Bulir
];

const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Permitir requisições sem origem (ex: aplicações móveis, Postman)
    if (!origin) return callback(null, true);
    
    if (ALLOWED_ORIGINS.indexOf(origin) !== -1 || extraAllowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'), false);
    }
  },
  credentials: true,
  methods: CORS_METHODS,
  allowedHeaders: CORS_HEADERS,
  exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar'],
  maxAge: CORS_MAX_AGE
};

app.use(cors(corsOptions));

// Middleware adicional para garantir cabeçalhos CORS em todas as respostas
app.use((req: Request, res: Response, next: express.NextFunction) => {
  const origin = req.headers.origin;
  
  if (origin && (ALLOWED_ORIGINS.includes(origin) || extraAllowedOrigins.includes(origin))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', CORS_METHODS.join(', '));
  res.setHeader('Access-Control-Allow-Headers', CORS_HEADERS.join(', '));
  res.setHeader('Access-Control-Max-Age', CORS_MAX_AGE.toString());
  
  // Responder a requisições OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  next();
});

// Middleware de parsing do corpo da requisição
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Validação de Content-Type para requisições POST/PUT
app.use(validateContentType('application/json'));

// Middleware de sanitização de entrada
app.use(sanitizeInput);

// Middleware de monitoramento de requisições aprimorado (tarefa 7.3)
app.use(createRequestMonitoringMiddleware());

// Montar rotas com aplicação adequada de middleware
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/services', serviceRoutes);
app.use('/bookings', bookingRoutes);
app.use('/admin', adminRoutes);

// Endpoint de informações da API (aprimorado para tarefa 7.2)
app.get("/info", (req: Request, res: Response) => {
  res.json({
    success: true,
    message: "RESTful API for Booking Platform",
    version: "1.0.0",
    status: "operational",
    timestamp: new Date().toISOString(),
    documentation: {
      description: "Complete booking platform API with user management, service management, and booking system",
      features: [
        "JWT-based authentication",
        "Role-based authorization (clients and providers)",
        "Balance management with atomic transactions",
        "Comprehensive booking history",
        "Input validation and sanitization",
        "Error handling and logging"
      ]
    },
    endpoints: {
      authentication: {
        "POST /auth/register": {
          description: "User registration",
          authentication: "none",
          roles: "none",
          body: "{ fullName, nif, email, password, userType }"
        },
        "POST /auth/login": {
          description: "User authentication",
          authentication: "none", 
          roles: "none",
          body: "{ email, password }"
        }
      },
      users: {
        "GET /users/profile": {
          description: "Get current user profile",
          authentication: "required",
          roles: "client, provider"
        },
        "GET /users/balance": {
          description: "Get current user balance",
          authentication: "required",
          roles: "client, provider"
        }
      },
      services: {
        "POST /services": {
          description: "Create service",
          authentication: "required",
          roles: "provider",
          body: "{ name, description, price }"
        },
        "GET /services": {
          description: "List all active services",
          authentication: "none",
          roles: "none",
          queryParams: "search, minPrice, maxPrice, sortBy, sortOrder, limit, offset"
        },
        "GET /services/my": {
          description: "Get provider's services",
          authentication: "required",
          roles: "provider"
        },
        "PUT /services/:id": {
          description: "Update service",
          authentication: "required",
          roles: "provider (owner only)",
          body: "{ name?, description?, price?, isActive? }"
        },
        "DELETE /services/:id": {
          description: "Delete service",
          authentication: "required",
          roles: "provider (owner only)"
        }
      },
      bookings: {
        "POST /bookings": {
          description: "Create booking",
          authentication: "required",
          roles: "client",
          body: "{ serviceId }"
        },
        "GET /bookings/my": {
          description: "Get user's bookings",
          authentication: "required",
          roles: "client, provider"
        },
        "PUT /bookings/:id/cancel": {
          description: "Cancel booking",
          authentication: "required",
          roles: "client, provider (owner only)",
          body: "{ cancellationReason? }"
        },
        "GET /bookings/history": {
          description: "Get booking history with filtering",
          authentication: "required",
          roles: "client, provider",
          queryParams: "startDate, endDate, status, minAmount, maxAmount, serviceId, sortBy, sortOrder, limit, offset"
        }
      },
      admin: {
        "GET /admin/health": {
          description: "Database health check",
          authentication: "none",
          roles: "none"
        },
        "GET /admin/schema/validate": {
          description: "Validate database schema",
          authentication: "none",
          roles: "none"
        },
        "POST /admin/initialize": {
          description: "Initialize database",
          authentication: "none",
          roles: "none"
        },
        "GET /admin/status": {
          description: "System status check",
          authentication: "required",
          roles: "client, provider"
        }
      }
    },
    requirements: {
      "1.1": "User registration with validation",
      "2.1": "JWT authentication system", 
      "2.2": "Token validation and user context",
      "3.1": "Service creation and management",
      "3.2": "Service provider ownership verification",
      "4.1": "Service listing and filtering",
      "5.1": "Booking creation with balance verification",
      "5.2": "Atomic balance operations",
      "5.3": "Booking cancellation with refunds",
      "6.1": "User-specific booking retrieval",
      "6.2": "Booking management by role",
      "7.1": "Complete booking history tracking",
      "8.1": "Authentication middleware",
      "8.2": "Role-based authorization",
      "9.1": "User balance initialization",
      "9.2": "Balance management operations",
      "9.3": "User profile and balance endpoints",
      "9.4": "Atomic transaction handling",
      "9.5": "Balance rollback mechanisms",
      "10.1": "Input validation and error handling",
      "10.2": "Database error handling",
      "10.4": "Security event logging",
      "10.5": "Request sanitization"
    }
  });
});

// Manipulador 404 para rotas não encontradas
app.use(notFoundHandler);

// Middleware global de tratamento de erros (deve ser o último)
app.use(errorHandler);



// Exportar função Firebase
exports.sistemaDeReservaServer = onRequest(app);