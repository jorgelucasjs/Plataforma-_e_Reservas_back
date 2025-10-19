// Configuração centralizada de CORS
export const ALLOWED_ORIGINS = [
  // Desenvolvimento local
  'http://localhost:8080',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:8080',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
  
  // Produção Firebase
  'https://angolaeventos-cd238.web.app',
  'https://angolaeventos-cd238.firebaseapp.com',
  'https://agendala.online',	
  
  // Adicione aqui outros domínios conforme necessário
  'https://bulir-angola.web.app',
  
];

export const CORS_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'];

export const CORS_HEADERS = [
  'Origin',
  'X-Requested-With',
  'Content-Type',
  'Accept',
  'Authorization',
  'Cache-Control',
  'X-API-Key'
];

export const CORS_MAX_AGE = 86400; // 24 horas