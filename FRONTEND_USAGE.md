# Guia rápido de uso (Front-end) — AgendaLa API

Base URL (exemplo):
```
https://us-central1-angolaeventos-cd238.cloudfunctions.net/sistemaDeReservaServer
```

Autenticação:
- Use JWT no header `Authorization: Bearer {token}` para endpoints protegidos.
- Armazene token em localStorage/sessionStorage e envie nos headers.

1) Buscar serviços por providerId (novo endpoint)
- Endpoint: GET /services/provider/:providerId
- Público (não requer token)

Exemplo com fetch:
```javascript
// GET services by providerId (fetch)
async function fetchServicesByProvider(providerId) {
  const resp = await fetch(`${BASE_URL}/services/provider/${providerId}`);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const body = await resp.json();
  return body.data.services; // array de services
}
```

Exemplo com axios (tratamento de erros):
```javascript
// GET services by providerId (axios)
import axios from 'axios';

async function fetchServicesByProviderAxios(providerId) {
  try {
    const { data } = await axios.get(`${BASE_URL}/services/provider/${providerId}`);
    return data.data.services;
  } catch (err) {
    // err.response?.data tem os detalhes padronizados de erro
    throw err.response?.data || err;
  }
}
```

2) Exemplo em React (hook) — listar serviços do provider
```jsx
// React Hook example
import { useEffect, useState } from 'react';
import axios from 'axios';

function useProviderServices(providerId) {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!providerId) return;
    setLoading(true);
    axios.get(`${BASE_URL}/services/provider/${providerId}`)
      .then(res => setServices(res.data.data.services))
      .catch(e => setError(e.response?.data || e))
      .finally(() => setLoading(false));
  }, [providerId]);

  return { services, loading, error };
}

// Uso no componente
function ProviderServicesList({ providerId }) {
  const { services, loading, error } = useProviderServices(providerId);

  if (loading) return <div>Carregando...</div>;
  if (error) return <div>Erro: {error.message || JSON.stringify(error)}</div>;
  if (services.length === 0) return <div>Nenhum serviço encontrado</div>;

  return (
    <ul>
      {services.map(s => (
        <li key={s.id}>
          <strong>{s.name}</strong> — {s.price.toFixed(2)}€<br/>
          <small>{s.description}</small>
        </li>
      ))}
    </ul>
  );
}
```

3) Exemplos adicionais úteis

- Listar serviços com filtros, paginação e busca:
  GET /services?search=corte&minPrice=10&maxPrice=50&sortBy=price&sortOrder=asc&limit=20&offset=0

- Criar serviço (provider) — requer token:
```javascript
await fetch(`${BASE_URL}/services`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ name: 'Corte', description: 'Corte premium', price: 25 })
});
```

- Atualizar serviço (provider, dono do serviço):
  POST /services/:id (o projeto usa POST para update)
  Incluir Authorization header com token do provider.

- Deletar serviço:
  DELETE /services/:id com Authorization header do provider.

4) Boas práticas
- Trate erros com base no formato padrão da API:
  { success: false, error: 'CODE', message: '...', details?: {...} }
- Use interceptors (axios) para injetar token em todos os requests e tratar 401 (redirecionar para login).
- Para paginação em produção prefira cursor-based pagination (Firestore), aqui a API aceita limit/offset como parâmetros.
- Valide dados no cliente antes de enviar (nome, descrição, price positivo).
- CORS: o servidor permite origens listadas; em dev, use localhost nas origens permitidas ou configure proxy.

5) Exemplo rápido de interceptor axios
```javascript
import axios from 'axios';

const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      // redirecionar para login ou renovar token
    }
    return Promise.reject(err);
  }
);

export default api;
```

Resposta da API (estrutura):
- Sucesso: { success: true, message: string, data: {...} }
- Erro: { success: false, error: string, message: string, details?: any }

Pronto — use estes exemplos para integrar rapidamente o endpoint GET /services/provider/:providerId e demais rotas de serviços no front-end.
