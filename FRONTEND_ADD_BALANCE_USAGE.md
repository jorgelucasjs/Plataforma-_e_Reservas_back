# Guia de Uso (Front-end) — Endpoint /auth/add-balance

Endpoint:
- POST /auth/add-balance
- Body: { "email": string, "amount": number }
- Requer autenticação: Bearer token (no servidor atual a rota exige role "provider")

Headers obrigatórios:
- Content-Type: application/json
- Authorization: Bearer {token}

Exemplo de request body:
```json
{
  "email": "cliente@exemplo.com",
  "amount": 50.00
}
```

Resposta de sucesso (200):
```json
{
  "success": true,
  "message": "Balance updated",
  "user": {
    "id": "user123",
    "fullName": "Cliente Exemplo",
    "email": "cliente@exemplo.com",
    "balance": 150.00,
    ...
  }
}
```

Resposta de erro (exemplos):
- 400 Validation Error — dados inválidos
- 401 Unauthorized — token inválido/expirado ou role insuficiente
- 404 Not Found — usuário não encontrado
- 500 Internal Server Error

Exemplo com fetch:
```javascript
const BASE_URL = 'https://us-central1-angolaeventos-cd238.cloudfunctions.net/sistemaDeReservaServer';

async function addBalanceFetch(token, email, amount) {
  const res = await fetch(`${BASE_URL}/auth/add-balance`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ email, amount })
  });

  const body = await res.json();
  if (!res.ok) throw body;
  return body;
}
```

Exemplo com axios:
```javascript
import axios from 'axios';
const api = axios.create({ baseURL: BASE_URL });

async function addBalanceAxios(token, email, amount) {
  try {
    const { data } = await api.post('/auth/add-balance', { email, amount }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return data;
  } catch (err) {
    // err.response?.data tem o payload padronizado da API
    throw err.response?.data || err;
  }
}
```

Interceptor axios (recomendado):
```javascript
import axios from 'axios';
const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});
```

Hook React para uso rápido:
```jsx
import { useState } from 'react';
import axios from 'axios';

export function useAddBalance() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function addBalance(email, amount) {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token'); // já configurado pelo login
      const { data } = await axios.post(`${BASE_URL}/auth/add-balance`, { email, amount }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return data;
    } catch (err) {
      setError(err.response?.data || err.message || 'Unknown error');
      throw err;
    } finally {
      setLoading(false);
    }
  }

  return { addBalance, loading, error };
}
```

Boas práticas:
- Verifique se o usuário autenticado tem permissão (role) antes de exibir UI de adição de saldo.
- Valide email e amount no cliente (email válido, amount > 0).
- Trate errors padronizados da API para exibir mensagens amigáveis.
- Use SSL (https) e armazene token com segurança (preferir HttpOnly cookies para maior segurança quando aplicável).
