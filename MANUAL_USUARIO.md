# Manual de Usuario - Divisando API

## 1. Proposito
Guia rapida para consumir la API de Divisando desde Postman, curl o la app.

## Indice
- 1. Proposito
- 2. Requisitos
- 3. Headers requeridos
- 4. Endpoints principales
- 5. Ejemplos por endpoint
- 6. Configuracion de pruebas (sugerida)
- 7. Notas
- 8. Errores comunes (ejemplos)

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

## 4. Endpoints principales

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
- `GET /auth/google` (web)
- `GET /auth/google/callback` (web)
- `GET /auth/facebook` (web)
- `GET /auth/facebook/callback` (web)

Exchange:
- `GET /exchange/currencies`
- `GET /exchange/compare?baseCurrency=USD&targetCurrency=MXN`
- `GET /exchange/:currency`

Health:
- `GET /api/health`
- `GET /api/health/database`

---

## 5. Ejemplos por endpoint

Autenticacion (registro):
```bash
curl -X POST "http://localhost:5000/auth/register" \
  -H "Content-Type: application/json" \
  -H "x-api-key: <API_KEY>" \
  -H "User-Agent: DivisandoApp/1.0" \
  -d "{\"username\":\"demo\",\"email\":\"demo@mail.com\",\"password\":\"123456\"}"
```
```json
{ "userId": "<userId>" }
```

Verificar codigo (account_verification):
```bash
curl -X POST "http://localhost:5000/auth/code/verification" \
  -H "Content-Type: application/json" \
  -H "x-api-key: <API_KEY>" \
  -H "User-Agent: DivisandoApp/1.0" \
  -d "{\"userId\":\"<userId>\",\"code\":\"123456\"}"
```
```json
{ "success": true, "refreshToken": "<token>", "expiresAt": "2026-02-10T02:10:00.000Z" }
```

Reenviar codigo:
```bash
curl -X POST "http://localhost:5000/auth/code/resend" \
  -H "Content-Type: application/json" \
  -H "x-api-key: <API_KEY>" \
  -H "User-Agent: DivisandoApp/1.0" \
  -d "{\"userId\":\"<userId>\",\"email\":\"demo@mail.com\"}"
```
```json
{ "success": true, "message": "Nuevo codigo de verificacion enviado." }
```

Login:
```bash
curl -X POST "http://localhost:5000/auth/login" \
  -H "Content-Type: application/json" \
  -H "x-api-key: <API_KEY>" \
  -H "User-Agent: DivisandoApp/1.0" \
  -d "{\"email\":\"demo@mail.com\",\"password\":\"123456\"}"
```
```json
{ "refreshToken": "<token>", "expiresAt": "2026-02-10T02:10:00.000Z" }
```

Refresh token:
```bash
curl -X POST "http://localhost:5000/auth/refresh" \
  -H "Content-Type: application/json" \
  -H "x-api-key: <API_KEY>" \
  -H "User-Agent: DivisandoApp/1.0" \
  -d "{\"refreshToken\":\"<token>\"}"
```
```json
{ "refreshToken": "<token>", "expiresAt": "2026-02-10T02:10:00.000Z" }
```

Logout:
```bash
curl -X POST "http://localhost:5000/auth/logout" \
  -H "Content-Type: application/json" \
  -H "x-api-key: <API_KEY>" \
  -H "User-Agent: DivisandoApp/1.0" \
  -d "{\"refreshToken\":\"<token>\"}"
```
```json
{ "message": "Sesion cerrada correctamente." }
```

Recuperacion (forgot):
```bash
curl -X POST "http://localhost:5000/auth/password/forgot" \
  -H "Content-Type: application/json" \
  -H "x-api-key: <API_KEY>" \
  -H "User-Agent: DivisandoApp/1.0" \
  -d "{\"email\":\"demo@mail.com\"}"
```
```json
{ "success": true, "message": "Codigo de recuperacion enviado.", "userId": "<userId>" }
```

Recuperacion (verificar codigo):
```bash
curl -X POST "http://localhost:5000/auth/code/verification" \
  -H "Content-Type: application/json" \
  -H "x-api-key: <API_KEY>" \
  -H "User-Agent: DivisandoApp/1.0" \
  -d "{\"userId\":\"<userId>\",\"code\":\"123456\"}"
```
```json
{ "success": true, "userId": "<userId>", "email": "demo@mail.com" }
```

Recuperacion (reset):
```bash
curl -X POST "http://localhost:5000/auth/password/reset" \
  -H "Content-Type: application/json" \
  -H "x-api-key: <API_KEY>" \
  -H "User-Agent: DivisandoApp/1.0" \
  -d "{\"email\":\"demo@mail.com\",\"code\":\"123456\",\"newPassword\":\"nuevo123\"}"
```
```json
{ "success": true, "message": "Contrasena restablecida correctamente." }
```

Login con Google (mobile):
```bash
curl -X POST "http://localhost:5000/auth/google" \
  -H "Content-Type: application/json" \
  -H "x-api-key: <API_KEY>" \
  -H "User-Agent: DivisandoApp/1.0" \
  -d "{\"idToken\":\"<google_id_token>\"}"
```
```json
{ "refreshToken": "<token>", "expiresAt": "2026-02-10T02:10:00.000Z" }
```

Login con Apple (mobile):
```bash
curl -X POST "http://localhost:5000/auth/apple" \
  -H "Content-Type: application/json" \
  -H "x-api-key: <API_KEY>" \
  -H "User-Agent: DivisandoApp/1.0" \
  -d "{\"identityToken\":\"<apple_identity_token>\"}"
```
```json
{ "refreshToken": "<token>", "expiresAt": "2026-02-10T02:10:00.000Z" }
```

OAuth web (Google/Facebook):
- Abre `GET /auth/google` o `GET /auth/facebook` en navegador.
- El callback devuelve `{ refreshToken }` si es exitoso.

Comparacion:
```bash
curl -X GET "http://localhost:5000/exchange/compare?baseCurrency=USD&targetCurrency=MXN" \
  -H "x-api-key: <API_KEY>" \
  -H "User-Agent: DivisandoApp/1.0" \
  -H "Authorization: Bearer <JWT>"
```
```json
{
  "baseCurrency": "USD",
  "targetCurrency": "MXN",
  "currentRate": 17.10,
  "previousRate": 17.05,
  "updatedAt": "2026-02-10T02:10:00.000Z",
  "status": "up"
}
```

Monedas disponibles:
```bash
curl -X GET "http://localhost:5000/exchange/currencies" \
  -H "x-api-key: <API_KEY>" \
  -H "User-Agent: DivisandoApp/1.0" \
  -H "Authorization: Bearer <JWT>"
```
```json
{
  "currencies": ["USD", "MXN", "EUR", "CAD"],
  "updatedAt": "2026-02-10T02:10:00.000Z"
}
```

Tasas por moneda:
```bash
curl -X GET "http://localhost:5000/exchange/USD" \
  -H "x-api-key: <API_KEY>" \
  -H "User-Agent: DivisandoApp/1.0" \
  -H "Authorization: Bearer <JWT>"
```
```json
{
  "base_currency": "USD",
  "rates": [
    { "currency": "MXN", "value": 17.10 },
    { "currency": "EUR", "value": 0.92 }
  ],
  "last_updated": "2026-02-10T02:10:00.000Z"
}
```

Health:
```bash
curl -X GET "http://localhost:5000/api/health" \
  -H "x-api-key: <API_KEY>" \
  -H "User-Agent: DivisandoApp/1.0"
```
```json
{ "status": "ok", "message": "API en funcionamiento" }
```

Health (database):
```bash
curl -X GET "http://localhost:5000/api/health/database" \
  -H "x-api-key: <API_KEY>" \
  -H "User-Agent: DivisandoApp/1.0"
```
```json
{
  "status": "healthy",
  "database": {
    "connected": true,
    "host": "<host>",
    "latency": "5ms",
    "circuitBreaker": "CLOSED",
    "consecutiveFailures": 0
  },
  "timestamp": "2026-02-10T02:10:00.000Z"
}
```

---

## 6. Configuracion de pruebas (sugerida)
- Cron: cada 6 horas
- Monedas: USD, MXN, EUR, CAD
- Ventana reciente: 6 horas

Uso de `EXCHANGE_RATE_CURRENCIES`:
- Lista explicita (ej. `USD,MXN,EUR,CAD`) => usa esos valores.
- Valor `ALL` => toma la lista desde MongoDB. Si no hay datos, usa fallback seguro.

---

## 7. Notas
- Si el endpoint responde 401/403, revisar API Key, User-Agent o JWT.
- Para pruebas con limites bajos, la actualizacion puede ser cada 1h o mas.

## 8. Errores comunes (ejemplos)

401 - Falta API Key:
```json
{ "error": "Clave API faltante. Acceso denegado." }
```

403 - API Key invalida o token expirado:
```json
{ "error": "Clave API inválida. Acceso denegado." }
```
```json
{ "error": "Token expirado." }
```

404 - Recurso no encontrado:
```json
{ "error": "No se encontraron datos para la moneda base: USD" }
```

429 - Rate limit:
```json
{
  "error": "Demasiadas solicitudes desde esta IP, inténtalo de nuevo después de 1 minuto."
}
```

---

## 9. Licencia
MIT

---

## 10. Equipo
🍍LU Devs Team
