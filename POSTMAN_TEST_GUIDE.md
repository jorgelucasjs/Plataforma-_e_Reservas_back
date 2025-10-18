# Guia de Testes da API AgendaLa no Postman

## Configuração Inicial

### 1. Importar Collection e Environment
1. Abra o Postman
2. Importe o arquivo `AgendaLa_API_Postman_Collection.json`
3. Importe o arquivo `AgendaLa_Environment.json`
4. Selecione o environment "AgendaLa Local Environment"

### 2. Verificar Configurações
- **Base URL**: `http://127.0.0.1:5002/angolaeventos-cd238/us-central1/agendaLaServer`
- Certifique-se de que o emulador Firebase está rodando

## Fluxo de Testes Recomendado

### Passo 1: Verificar API
```
GET /info
```
- Teste básico para verificar se a API está funcionando

### Passo 2: Registrar Usuários
```
POST /auth/register
```
**Cliente:**
```json
{
  "fullName": "João Silva",
  "nif": "123456789",
  "email": "joao@exemplo.com",
  "password": "senha123",
  "userType": "client",
  "phone": "+244900000000"
}
```

**Provider:**
```json
{
  "fullName": "Maria Santos",
  "nif": "987654321",
  "email": "maria@exemplo.com",
  "password": "senha123",
  "userType": "provider",
  "phone": "+244900000001"
}
```

### Passo 3: Login e Obter Token
```
POST /auth/login
```
- O token será automaticamente salvo na variável `{{token}}`
- Use diferentes logins para testar como client e provider

### Passo 4: Testar Perfil
```
GET /auth/profile
```
- Verifica se a autenticação está funcionando

### Passo 5: Criar Serviços (Como Provider)
```
POST /services
```
- Faça login como provider primeiro
- Crie alguns serviços para testar reservas

### Passo 6: Listar Serviços
```
GET /services
```
- Teste os filtros disponíveis
- Anote os IDs dos serviços para usar nas reservas

### Passo 7: Criar Reservas (Como Client)
```
POST /bookings
```
- Faça login como client
- Use um serviceId válido dos serviços criados

### Passo 8: Gerenciar Reservas
```
GET /bookings/my
GET /bookings/history
PUT /bookings/{bookingId}/cancel
```

## Variáveis Importantes

### Variáveis de Environment
- `baseUrl`: URL base da API
- `token`: Token JWT (preenchido automaticamente no login)
- `serviceId`: ID do serviço (preencha manualmente)
- `bookingId`: ID da reserva (preencha manualmente)

### Como Usar as Variáveis
1. Após criar um serviço, copie o ID da resposta
2. Cole no environment como `serviceId`
3. Use `{{serviceId}}` nas requisições que precisam do ID

## Cenários de Teste

### 1. Fluxo Completo do Cliente
1. Registrar como client
2. Login
3. Listar serviços disponíveis
4. Criar reserva
5. Ver minhas reservas
6. Cancelar reserva

### 2. Fluxo Completo do Provider
1. Registrar como provider
2. Login
3. Criar serviços
4. Ver reservas recebidas
5. Atualizar serviços

### 3. Testes de Filtros e Paginação
1. Criar múltiplos serviços
2. Testar filtros de preço, busca, ordenação
3. Testar paginação com limit/offset

### 4. Testes de Validação
1. Tentar criar reserva sem saldo
2. Tentar acessar endpoints sem token
3. Tentar operações não permitidas (client criando serviço)

## Códigos de Resposta Esperados

- **200**: Sucesso
- **201**: Criado com sucesso
- **400**: Erro de validação/dados inválidos
- **401**: Não autorizado (token inválido/ausente)
- **403**: Proibido (sem permissão)
- **404**: Recurso não encontrado
- **500**: Erro interno do servidor

## Dicas de Troubleshooting

1. **Token expirado**: Faça login novamente
2. **CORS Error**: Verifique se o emulador está rodando
3. **404 na API**: Confirme a URL base no environment
4. **Validation errors**: Verifique o formato dos dados enviados

## Scripts de Teste Automático

A collection inclui scripts que:
- Salvam automaticamente o token após login
- Validam respostas de sucesso
- Extraem IDs importantes das respostas

Para ver os scripts, vá em "Tests" tab de cada requisição.