# Manual de Usuario - Divisando API

## 1. Proposito
Guia rapida para consumir la API de Divisando desde Postman, curl o la app.

## Indice
- 1. Proposito
- 2. Requisitos
- 3. Headers requeridos
- 4. Contrato de respuestas
- 5. Endpoints principales
- 6. Ejemplos por endpoint
- 7. Codigos de error por endpoint
- 8. Configuracion de pruebas (sugerida)
- 9. Notas
- 10. Licencia
- 11. Equipo

---

## 2. Requisitos
- Cliente HTTP (Postman, curl, app movil)
- API Key valida (`x-api-key`)
- User-Agent autorizado

---

## 3. Headers requeridos
```
x-api-key: <API_KEY>
User-Agent: DivisandoApp/1.0
Authorization: Bearer <JWT>
```

---

## 4. Contrato de respuestas

Todas las respuestas siguen el mismo patron:

**Exito (2xx):**
```json
{ "success": true }
{ "success": true, "user": { ... } }
{ "success": true, "refreshToken": "...", "expiresAt": "..." }
```

**Error (4xx / 5xx):**
```json
{ "success": false, "error": "<codigo_error>" }
```

Los codigos de error son strings en snake_case. La app (Flutter) es responsable de mapear cada codigo a un mensaje de UI. Nunca se devuelven textos de pantalla desde la API.

---

## 5. Endpoints principales

Autenticacion:
- `POST /auth/register`
- `POST /auth/code/verification`
- `POST /auth/code/resend`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `POST /auth/password/forgot`
- `POST /auth/password/reset`
- `POST /auth/google` (mobile)
- `POST /auth/apple` (mobile)
- `GET  /auth/profile`
- `PUT  /auth/profile`
- `DELETE /auth/account`

Exchange:
- `GET /exchange/currencies`
- `GET /exchange/compare?baseCurrency=USD&targetCurrency=MXN`
- `GET /exchange/:currency`
- `POST /exchange/refresh` (mantenimiento)
- `GET /exchange/rate-changes`

Health:
- `GET /health`
- `GET /health/database`
- `GET /favicon.ico` (tecnico, respuesta `204 No Content`)

Operacion tecnica:
- `GET /script/get-ip`

---

## 6. Ejemplos por endpoint

### POST /auth/register
```bash
curl -X POST "http://localhost:5000/auth/register" \
  -H "Content-Type: application/json" \
  -H "x-api-key: <API_KEY>" \
  -H "User-Agent: DivisandoApp/1.0" \
  -d "{\"username\":\"demo\",\"email\":\"demo@mail.com\",\"password\":\"123456\"}"
```
```json
{ "success": true, "userId": "<userId>" }
```

### POST /auth/code/verification (account_verification)
```bash
curl -X POST "http://localhost:5000/auth/code/verification" \
  -H "Content-Type: application/json" \
  -H "x-api-key: <API_KEY>" \
  -H "User-Agent: DivisandoApp/1.0" \
  -d "{\"userId\":\"<userId>\",\"code\":\"123456\"}"
```
```json
{ "success": true, "refreshToken": "<token>", "expiresAt": "2026-02-10T02:10:00.000Z", "user": { "id": "...", "username": "...", "email": "...", "provider": "local" } }
```

### POST /auth/code/verification (password_reset)
```json
{ "success": true, "userId": "<userId>", "email": "demo@mail.com" }
```

### POST /auth/code/resend
```bash
curl -X POST "http://localhost:5000/auth/code/resend" \
  -H "Content-Type: application/json" \
  -H "x-api-key: <API_KEY>" \
  -H "User-Agent: DivisandoApp/1.0" \
  -d "{\"userId\":\"<userId>\",\"email\":\"demo@mail.com\"}"
```
```json
{ "success": true }
```

### POST /auth/login
```bash
curl -X POST "http://localhost:5000/auth/login" \
  -H "Content-Type: application/json" \
  -H "x-api-key: <API_KEY>" \
  -H "User-Agent: DivisandoApp/1.0" \
  -d "{\"email\":\"demo@mail.com\",\"password\":\"123456\"}"
```
```json
{ "success": true, "refreshToken": "<token>", "expiresAt": "2026-02-10T02:10:00.000Z", "user": { "id": "...", "username": "...", "email": "...", "provider": "local" } }
```

### POST /auth/refresh
```bash
curl -X POST "http://localhost:5000/auth/refresh" \
  -H "Content-Type: application/json" \
  -H "x-api-key: <API_KEY>" \
  -H "User-Agent: DivisandoApp/1.0" \
  -d "{\"refreshToken\":\"<token>\"}"
```
```json
{ "success": true, "refreshToken": "<token>", "expiresAt": "2026-02-10T02:10:00.000Z", "user": { "id": "...", "username": "...", "email": "...", "provider": "local" } }
```

### POST /auth/logout
```bash
curl -X POST "http://localhost:5000/auth/logout" \
  -H "Content-Type: application/json" \
  -H "x-api-key: <API_KEY>" \
  -H "User-Agent: DivisandoApp/1.0" \
  -d "{\"refreshToken\":\"<token>\"}"
```
```json
{ "success": true }
```

### POST /auth/password/forgot
```bash
curl -X POST "http://localhost:5000/auth/password/forgot" \
  -H "Content-Type: application/json" \
  -H "x-api-key: <API_KEY>" \
  -H "User-Agent: DivisandoApp/1.0" \
  -d "{\"email\":\"demo@mail.com\"}"
```
```json
{ "success": true, "userId": "<userId>" }
```

### POST /auth/password/reset
```bash
curl -X POST "http://localhost:5000/auth/password/reset" \
  -H "Content-Type: application/json" \
  -H "x-api-key: <API_KEY>" \
  -H "User-Agent: DivisandoApp/1.0" \
  -d "{\"email\":\"demo@mail.com\",\"code\":\"123456\",\"newPassword\":\"nuevo123\"}"
```
```json
{ "success": true }
```

### POST /auth/google (mobile)
```bash
curl -X POST "http://localhost:5000/auth/google" \
  -H "Content-Type: application/json" \
  -H "x-api-key: <API_KEY>" \
  -H "User-Agent: DivisandoApp/1.0" \
  -d "{\"idToken\":\"<google_id_token>\"}"
```
```json
{ "success": true, "refreshToken": "<token>", "expiresAt": "2026-02-10T02:10:00.000Z", "user": { "id": "...", "username": "...", "email": "...", "provider": "google" } }
```

### GET /auth/profile
```bash
curl -X GET "http://localhost:5000/auth/profile" \
  -H "x-api-key: <API_KEY>" \
  -H "User-Agent: DivisandoApp/1.0" \
  -H "Authorization: Bearer <JWT>"
```
```json
{ "success": true, "user": { "id": "...", "username": "...", "email": "...", "provider": "local", "isVerified": true, "status": "active" } }
```

### PUT /auth/profile
```bash
curl -X PUT "http://localhost:5000/auth/profile" \
  -H "Content-Type: application/json" \
  -H "x-api-key: <API_KEY>" \
  -H "User-Agent: DivisandoApp/1.0" \
  -H "Authorization: Bearer <JWT>" \
  -d "{\"username\":\"nuevo_nombre\"}"
```
```json
{ "success": true, "user": { "id": "...", "username": "nuevo_nombre", "email": "...", "provider": "local" } }
```

### DELETE /auth/account
```bash
curl -X DELETE "http://localhost:5000/auth/account" \
  -H "Content-Type: application/json" \
  -H "x-api-key: <API_KEY>" \
  -H "User-Agent: DivisandoApp/1.0" \
  -H "Authorization: Bearer <JWT>" \
  -d "{\"password\":\"123456\"}"
```
```json
{ "success": true }
```

### GET /exchange/compare
```bash
curl -X GET "http://localhost:5000/exchange/compare?baseCurrency=USD&targetCurrency=MXN" \
  -H "x-api-key: <API_KEY>" \
  -H "User-Agent: DivisandoApp/1.0" \
  -H "Authorization: Bearer <JWT>"
```
```json
{ "baseCurrency": "USD", "targetCurrency": "MXN", "currentRate": 17.12 }
```

### GET /exchange/currencies
```bash
curl -X GET "http://localhost:5000/exchange/currencies" \
  -H "x-api-key: <API_KEY>" \
  -H "User-Agent: DivisandoApp/1.0" \
  -H "Authorization: Bearer <JWT>"
```
```json
{ "currencies": ["USD", "MXN", "EUR", "CAD"], "updatedAt": "2026-02-10T02:10:00.000Z" }
```

### GET /exchange/:currency
```bash
curl -X GET "http://localhost:5000/exchange/USD" \
  -H "x-api-key: <API_KEY>" \
  -H "User-Agent: DivisandoApp/1.0" \
  -H "Authorization: Bearer <JWT>"
```
```json
{ "base_currency": "USD", "rates": [{ "currency": "MXN", "value": 17.10 }, { "currency": "EUR", "value": 0.92 }], "last_updated": "2026-02-10T02:10:00.000Z" }
```

### POST /exchange/refresh (mantenimiento)
```bash
curl -X POST "http://localhost:5000/exchange/refresh" \
  -H "x-api-key: <API_KEY>" \
  -H "User-Agent: DivisandoApp/1.0" \
  -H "Authorization: Bearer <JWT>"
```
```json
{ "success": true }
```

### GET /health
```bash
curl -X GET "http://localhost:5000/health"
```
```json
{ "status": "ok", "message": "API en funcionamiento" }
```

### GET /health/database
```bash
curl -X GET "http://localhost:5000/health/database" \
  -H "x-api-key: <API_KEY>"
```
```json
{ "status": "healthy", "database": { "connected": true, "host": "<host>", "latency": "5ms", "circuitBreaker": "CLOSED", "consecutiveFailures": 0 }, "timestamp": "2026-02-10T02:10:00.000Z" }
```

Compatibilidad:
- `/api/health` y `/api/health/database` se mantienen disponibles.

---

## 7. Codigos de error por endpoint

| Endpoint | HTTP | Codigo de error |
|---|---|---|
| `POST /auth/register` | 400 | `usuario_ya_registrado` |
| `POST /auth/register` | 503 | `error_envio_correo` |
| `POST /auth/register` | 500 | `error_interno` |
| `POST /auth/code/verification` | 404 | `usuario_no_encontrado` |
| `POST /auth/code/verification` | 400 | `codigo_invalido` |
| `POST /auth/code/verification` | 400 | `codigo_expirado` |
| `POST /auth/code/verification` | 403 | `codigo_bloqueado` |
| `POST /auth/code/verification` | 400 | `tipo_codigo_invalido` |
| `POST /auth/code/resend` | 404 | `usuario_no_encontrado` |
| `POST /auth/code/resend` | 400 | `codigo_activo_existente` |
| `POST /auth/login` | 401 | `credenciales_invalidas` |
| `POST /auth/refresh` | 400 | `refresh_token_requerido` |
| `POST /auth/refresh` | 401 | `refresh_token_invalido` |
| `POST /auth/logout` | 400 | `refresh_token_requerido` |
| `POST /auth/logout` | 403 | `refresh_token_no_encontrado` |
| `POST /auth/password/forgot` | 404 | `usuario_no_encontrado` |
| `POST /auth/password/reset` | 404 | `usuario_no_encontrado` |
| `POST /auth/password/reset` | 400 | `codigo_invalido_o_expirado` |
| `POST /auth/google` | 400 | `idtoken_requerido` |
| `POST /auth/google` | 401 | `token_google_invalido` |
| `GET  /auth/profile` | 401 | `token_invalido` |
| `GET  /auth/profile` | 404 | `usuario_no_encontrado` |
| `GET  /auth/profile` | 500 | `error_interno` |
| `PUT  /auth/profile` | 400 | `campos_requeridos` |
| `PUT  /auth/profile` | 401 | `token_invalido` |
| `PUT  /auth/profile` | 404 | `usuario_no_encontrado` |
| `PUT  /auth/profile` | 400 | `username_invalido` |
| `PUT  /auth/profile` | 409 | `username_en_uso` |
| `PUT  /auth/profile` | 400 | `email_invalido` |
| `PUT  /auth/profile` | 409 | `email_en_uso` |
| `PUT  /auth/profile` | 500 | `error_interno` |
| `DELETE /auth/account` | 401 | `token_invalido` |
| `DELETE /auth/account` | 404 | `usuario_no_encontrado` |
| `DELETE /auth/account` | 400 | `cuenta_ya_cancelada` |
| `DELETE /auth/account` | 401 | `contrasena_incorrecta` |
| `DELETE /auth/account` | 500 | `error_interno` |

Errores de middlewares (aplican a todos los endpoints protegidos):

| HTTP | Codigo de error (campo `error`) |
|---|---|
| 401 | `Clave API faltante. Acceso denegado.` |
| 403 | `Clave API invalida. Acceso denegado.` |
| 403 | `Token expirado.` |
| 429 | `Demasiadas solicitudes desde esta IP, intentalo de nuevo despues de 1 minuto.` |

---

## 8. Configuracion de pruebas (sugerida)
- Cron: cada 6 horas
- Monedas: USD, MXN, EUR, CAD
- Ventana reciente: 6 horas

Uso de `EXCHANGE_RATE_CURRENCIES`:
- Lista explicita (ej. `USD,MXN,EUR,CAD`) => usa esos valores.
- Valor `ALL` => toma la lista desde MongoDB. Si no hay datos, usa fallback seguro.

---

## 9. Notas
- Si el endpoint responde 401/403, revisar API Key, User-Agent o JWT.
- Para pruebas con limites bajos, la actualizacion puede ser cada 1h o mas.
- Los mensajes de UI son responsabilidad de la app (Flutter). La API solo devuelve codigos de error en snake_case.

---

## 10. Licencia
MIT

---

## 11. Equipo
LU Devs Team
