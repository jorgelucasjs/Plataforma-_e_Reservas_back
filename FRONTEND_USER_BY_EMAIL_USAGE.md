# Guia rápido (Front-end) — Buscar usuário por email e usar docID

Base URL (exemplo):
```
https://us-central1-angolaeventos-cd238.cloudfunctions.net/sistemaDeReservaServer
```

Resumo:
- GET /services/user-by-email?email={email} — retorna dados do usuário encontrado (requer autenticação; roles: client|provider). O objeto retornado inclui campo `docID` com o ID do documento Firestore.
- POST /auth/add-balance — body { email, amount } (requer autenticação; role: provider). Útil para atualizar saldo do usuário por email.

Headers comuns:
- Content-Type: application/json
- Authorization: Bearer {token}

1) Obter usuário por email (ex.: axios)

```javascript
// GET user by email (axios)
import axios from 'axios';
const BASE_URL = 'https://us-central1-angolaeventos-cd238.cloudfunctions.net/sistemaDeReservaServer';

async function getUserByEmail(token, email) {
  const res = await axios.get(`${BASE_URL}/services/user-by-email`, {
    params: { email },
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data.data; // { docID, id, fullName, email, ... }
}
```

2) Exemplo com fetch

```javascript
// GET user by email (fetch)
async function getUserByEmailFetch(token, email) {
  const url = new URL(`${BASE_URL}/services/user-by-email`);
  url.searchParams.append('email', email);

  const res = await fetch(url.toString(), {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  const body = await res.json();
  if (!res.ok) throw body;
  return body.data;
}
```

3) Usando docID retornado
- `docID` é o document id no Firestore; pode ser útil para operações administrativas, logging, ou consultas diretas.
- Nunca exponha campos sensíveis no cliente; retorne apenas o necessário.

4) Exemplo de chamada para adicionar saldo (POST /auth/add-balance)

```javascript
// add balance (axios)
async function addBalance(token, email, amount) {
  const { data } = await axios.post(
    `${BASE_URL}/auth/add-balance`,
    { email, amount },
    { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
  );
  return data; // { success: true, message: 'Balance updated', user: { ... } }
}
```

4) Hook React simples para obter usuário por email

```jsx
// useUserByEmail.js
import { useState, useEffect } from 'react';
import axios from 'axios';

export function useUserByEmail(email) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!email) return;
    let cancelled = false;
    const token = localStorage.getItem('token');

    async function fetchUser() {
      setLoading(true);
      setError(null);
      try {
        const res = await axios.get(`${BASE_URL}/services/user-by-email`, {
          params: { email },
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!cancelled) setUser(res.data.data);
      } catch (err) {
        if (!cancelled) setError(err.response?.data || err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchUser();
    return () => { cancelled = true; };
  }, [email]);

  return { user, loading, error };
}
```

5) Tratamento de erros e boas práticas
- Verifique status HTTP e corpo padronizado: { success: false, error, message, details? }.
- Valide email no cliente (formato) antes de enviar.
- Use interceptors (axios) para injetar token e tratar 401 (redirecionar para login).
- Proteja informações sensíveis: a rota exige autenticação; ajuste roles conforme política da sua aplicação.
- Para operações críticas (ex.: alterar saldo), registre ação no servidor (auditoria) e trate idempotência.

Pronto — use estes exemplos no front-end para buscar usuários por email (recebendo docID) e para atualizar saldo via endpoint existente.
