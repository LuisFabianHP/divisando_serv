# 🔌 API Configuration

Configuración técnica y detalles del API para integración y testing.

---

## 📍 Base URL

```
Production: https://divisando-serv-production.up.railway.app
```

---

## 📋 Headers Requeridos

### Obligatorios (Todos los requests)

```http
Content-Type: application/json
x-api-key: @S3gUr@L0kP@sSw0rD!2o25
User-Agent: DivisandoApp/1.0
```

### Condicionales

```http
Authorization: Bearer {accessToken}
```

- **Requerido para:** Endpoints protegidos (`/exchange/*`, `/auth/refresh`, `/auth/logout`)
- **Omitir para:** Public endpoints (`/auth/register`, `/auth/login`, `/auth/verify-code`)

---

## 🔐 Autenticación

### Tipos de Tokens

| Token | Propósito | Duración | Ubicación |
|-------|-----------|----------|-----------|
| **Access Token** | Autorizar requests | ~15 min | Header Authorization |
| **Refresh Token** | Renovar token / Logout | 7 días | Body JSON |
| **Verification Code** | Verificar email | 15 min | Email recibido |

### Flujo de Tokens

```
1. POST /auth/register
   ↓ (Email con código)

2. POST /auth/verify-code
   ↓ (Verifica ownership)

3. POST /auth/login
   ↓ (Generador: accessToken + refreshToken)

4. GET /exchange/* (usar accessToken)
   ↓ (Si expira)

5. POST /auth/refresh (usar refreshToken)
   ↓ (Nuevo accessToken)

6. POST /auth/logout (usar refreshToken)
   ↓ (Cierra sesión)
```

---

## 🔄 Rate Limiting

### Límites Activos

| Endpoint | Limite | Ventana | Status |
|----------|--------|---------|--------|
| General (todos) | 50 | 1 minuto | 🟢 Activo |
| `/auth/verify-code` | 5 | 1 minuto | 🟢 Activo |
| `/auth/forgot-password` | 3 | 5 minutos | 🟢 Activo |
| `/auth/resend-code` | 3 | 10 minutos | 🟢 Activo |

### Response en Rate Limit

```json
HTTP/1.1 429 Too Many Requests

{
  "error": "Demasiadas solicitudes. Intenta nuevamente.",
  "retryAfter": 60
}

Headers:
  Retry-After: 60
```

---

## 💱 Divisas Soportadas

```json
[
  {
    "code": "USD",
    "name": "United States Dollar",
    "symbol": "$"
  },
  {
    "code": "EUR",
    "name": "Euro",
    "symbol": "€"
  },
  {
    "code": "MXN",
    "name": "Mexican Peso",
    "symbol": "$"
  },
  {
    "code": "CAD",
    "name": "Canadian Dollar",
    "symbol": "$"
  }
]
```

### Tasas de Cambio

- **Total de divisa base:** 4 (USD, EUR, MXN, CAD)
- **Tasas por divisa:** 166 cada una
- **Total de pares:** 664
- **Actualización:** Cada hora automáticamente
- **Manual:** POST `/exchange/refresh`

---

## 📊 Response Formats

### Success Response (2xx)

```json
{
  "data": { /* varies by endpoint */ },
  "timestamp": "2026-02-12T07:48:49.342Z"
}
```

### Error Response (4xx/5xx)

```json
{
  "error": "Descripción del error visible para usuario"
}
```

### Common Status Codes

| Code | Meaning | Use Case |
|------|---------|----------|
| 200 | OK | Solicitud exitosa |
| 201 | Created | Recurso creado |
| 202 | Accepted | Procesamiento asincrónico |
| 400 | Bad Request | Datos inválidos |
| 401 | Unauthorized | Sin autenticación |
| 403 | Forbidden | Sin autorización |
| 429 | Too Many Requests | Rate limit excedido |
| 500 | Server Error | Error interno |

---

## 🧪 Testing Credentials

```
Email:    test.feb12.api@gmail.com
Password: D1v1$and0
UserId:   698d75c7f10675a1a0b22a47
```

### Test Account Details

- ✅ Email verificado
- ✅ Contraseña configurada
- ✅ Tokens disponibles
- ⚠️ Usar solo para testing

---

## 📦 Endpoints Reference

### Authentication

```
POST   /auth/register           - Crear cuenta
POST   /auth/verify-code        - Verificar email
POST   /auth/login              - Login
POST   /auth/refresh            - Renovar token
POST   /auth/logout             - Cerrar sesión
POST   /auth/forgot-password    - Recuperar contraseña
```

### Exchange Data

```
GET    /exchange/currencies     - Listar divisas
GET    /exchange/{currency}     - Tasas para divisa
GET    /exchange/compare        - Comparar dos divisas
POST   /exchange/refresh        - Refresh manual
```

### Health & Monitoring

```
GET    /health/database         - Estado de DB
GET    /health/api              - Estado de API
```

---

## 🔒 Security Features

- ✅ HTTPS/TLS (HTTPS obligatorio)
- ✅ JWT with HS256 signature
- ✅ API Key validation
- ✅ User-Agent verification
- ✅ Rate limiting (token bucket)
- ✅ Password hashing (bcrypt)
- ✅ Circuit breaker pattern
- ✅ Graceful shutdown

---

## 🌐 CORS Configuration

```
Access-Control-Allow-Origin: * (o específico por entorno)
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: Content-Type, Authorization, x-api-key, User-Agent
```

---

## 📊 Database

**Provider:** MongoDB Atlas

```
Connection: ac-czkckm8-shard-00-02.hpj4zub.mongodb.net
Database: divisando_db
Collections:
  - users
  - exchangeRates
  - verificationCodes
```

### Collections

#### users
```javascript
{
  _id: ObjectId,
  username: String,
  email: String,
  password: String (hashed),
  provider: String ('local', 'google', 'facebook'),
  refreshToken: String,
  createdAt: Date,
  updatedAt: Date
}
```

#### exchangeRates
```javascript
{
  _id: ObjectId,
  base_currency: String,
  target_currency: String,
  current_rate: Number,
  previous_rate: Number,
  last_updated: Date
}
```

#### verificationCodes
```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  code: String,
  type: String ('account_verification', 'password_reset'),
  expiresAt: Date,
  attempts: Number,
  maxAttempts: Number,
  isBlocked: Boolean
}
```

---

## 🚀 Platform

**Hosting:** Railway

```
Memory: 512MB
CPU: Shared
Région: US (default)
Auto-scaling: Disabled
Graceful shutdown: Enabled
```

---

## 📝 Examples

### Register New User

```bash
curl -X POST https://divisando-serv-production.up.railway.app/auth/register \
  -H "Content-Type: application/json" \
  -H "x-api-key: @S3gUr@L0kP@sSw0rD!2o25" \
  -H "User-Agent: DivisandoApp/1.0" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "SecurePass123!"
  }'
```

### Get Exchange Rates

```bash
curl -X GET "https://divisando-serv-production.up.railway.app/exchange/USD" \
  -H "Content-Type: application/json" \
  -H "x-api-key: @S3gUr@L0kP@sSw0rD!2o25" \
  -H "User-Agent: DivisandoApp/1.0" \
  -H "Authorization: Bearer {accessToken}"
```

### Compare Currencies

```bash
curl -X GET "https://divisando-serv-production.up.railway.app/exchange/compare?baseCurrency=USD&targetCurrency=MXN" \
  -H "Content-Type: application/json" \
  -H "x-api-key: @S3gUr@L0kP@sSw0rD!2o25" \
  -H "User-Agent: DivisandoApp/1.0" \
  -H "Authorization: Bearer {accessToken}"
```

---

## 🔧 Debugging

### Enable Verbose Logging

Set in environment:
```
NODE_ENV=development
LOG_LEVEL=debug
```

### Common Issues

#### 401 Unauthorized
- ❌ Token expirado
- ❌ Token inválido
- **Solución:** Usar /auth/refresh para renovar

#### 403 Forbidden
- ❌ x-api-key inválido
- ❌ User-Agent faltante
- **Solución:** Validar headers requeridos

#### 429 Too Many Requests
- ❌ Rate limit excedido
- **Solución:** Esperar Retry-After segundos

---

## 📞 Support & Documentation

- **Repository:** https://github.com/LuisFabianHP/divisando_serv
- **Issues:** https://github.com/LuisFabianHP/divisando_serv/issues
- **Wiki:** https://github.com/LuisFabianHP/divisando_serv/wiki

**Last Updated:** 2026-02-12
