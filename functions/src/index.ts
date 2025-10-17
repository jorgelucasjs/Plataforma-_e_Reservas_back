// Configurar dotenv para carregar variáveis de ambiente
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


// Criar aplicação Express
const app = express();

// Configuração robusta de CORS
const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Permitir requisições sem origin (ex: aplicações mobile, Postman)
    if (!origin) return callback(null, true);
    
    if (ALLOWED_ORIGINS.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Não permitido pelo CORS'), false);
    }
  },
  credentials: true,
  methods: CORS_METHODS,
  allowedHeaders: CORS_HEADERS,
  exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar'],
  maxAge: CORS_MAX_AGE
};

app.use(cors(corsOptions));

// Middleware adicional para garantir headers CORS em todas as respostas
app.use((req: Request, res: Response, next: express.NextFunction) => {
  const origin = req.headers.origin;
  
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
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

app.use(express.json());

// Middleware de logging
app.use((req: Request, res: Response, next: express.NextFunction) => {
  console.log(`${req.method} ${req.path}`, req.body);
  next();
});

// Import routes
import { authRoutes, userRoutes, serviceRoutes } from './routes';

// Mount routes
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/services', serviceRoutes);

// Informações da API
app.get("/info", (req: Request, res: Response) => {
  res.json({
    success: true,
    message: "API RESTful para Plataforma de Reservas",
    version: "1.0.0",
    endpoints: {
      authentication: {
        "POST /auth/register": "User registration",
        "POST /auth/login": "User authentication"
      },
      users: {
        "GET /users/profile": "Get current user profile (requires authentication)",
        "GET /users/balance": "Get current user balance (requires authentication)"
      },
      services: {
        "POST /services": "Create service (providers only, requires authentication)",
        "GET /services": "List all active services (public)",
        "GET /services/my": "Get provider's services (providers only, requires authentication)",
        "PUT /services/:id": "Update service (providers only, requires authentication)",
        "DELETE /services/:id": "Delete service (providers only, requires authentication)"
      }
    }
      
  });
});

// Rota de fallback
app.use("/*path", (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: "Endpoint não encontrado",
    message: "Verifique a documentação da API"
  });
});



// Exportar função Firebase
exports.agendaLaServer = onRequest(app);