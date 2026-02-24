# Divisando API | Secure Currency Exchange Backend

REST API built with Node.js that powers the Divisando mobile app. Provides real-time currency exchange data with security and background tasks for updates.

## ✨ Key Features

• **Multi-provider authentication system:**
  - Email/password with bcrypt hashing
  - Google Sign-In for mobile (idToken)
  - Apple Sign-In for mobile
• **Advanced security mechanisms:**
  - JWT refresh tokens (7-day expiry)
  - HTTPS encryption with SSL/TLS
  - API key validation middleware
  - Rate limiting per IP and critical endpoints
  - User-Agent validation
  - CORS with strict origin policies
• **Email verification system:**
  - 6-digit verification codes with 5-minute expiry
  - Mailgun integration for transactional emails
  - Automatic code blocking after failed attempts
  - Password recovery with secure code delivery
• **Exchange rate management:**
  - Real-time currency comparison endpoint
  - Historical rate tracking with up/down indicators
  - Automated background tasks for data updates
  - Optimized MongoDB queries for fast retrieval
• **Comprehensive logging & monitoring:**
  - Winston logger with structured logging
  - Request/response audit trails
  - Error tracking with stack traces
  - Security event logging (failed auth, rate limits)

## 🎯 Real-World Capabilities

• Handles concurrent authentication requests with refresh tokens  
• Validates and refreshes tokens automatically  
• Delivers exchange rates with historical comparison in <100ms  
• Blocks brute-force attacks with intelligent rate limiting  
• Supports Google and Apple sign-in for mobile  
• Sends verification codes via Mailgun with retry logic  
• Professional error responses with detailed logging  

## 🛠️ Tech Stack

**Runtime & Framework:**
- Node.js with Express 4.21+
- MongoDB with Mongoose ODM

**Security:**
- bcryptjs for password hashing
- jsonwebtoken (JWT) with refresh tokens
- google-auth-library for idToken validation
- express-rate-limit for DDoS protection

**Communication:**
- Mailgun API for transactional emails
- Axios for external API calls
- CORS with configurable origins

**Development & Testing:**
- Jest testing framework
- Winston for structured logging
- dotenv for environment management

**Deployment:**
- HTTPS with SSL certificates
- Environment-based configuration
- Module aliasing for clean imports

**Production-ready API architecture with token-based authentication, automated tasks, and security patterns.**

---

# Documentación del Proyecto - Divisando API

## 📖 Introducción
Divisando API es un servicio backend diseñado para obtener y comparar tasas de cambio entre diferentes monedas. Provee endpoints seguros para recuperar tasas de cambio, realizar comparaciones y manejar autenticación mediante tokens JWT y Refresh Tokens.

## 🛠️ Configuración y Tecnologías
- **Backend:** Node.js con Express.
- **Base de datos:** MongoDB (Atlas).
- **Autenticación:** JSON Web Tokens (JWT) con Refresh Tokens.
- **Seguridad:** HTTPS, API Keys, Rate-Limiting, Validación de User-Agent y CORS.
- **Logs y Monitoreo:** Winston para manejo de logs.
- **Pruebas:** Jest.

---

## 🔐 Seguridad Implementada

### 1️⃣ HTTPS con Certificados SSL
Toda la comunicación con la API está cifrada mediante HTTPS. Se configuraron certificados SSL autofirmados para desarrollo y se recomienda Let's Encrypt para producción.

### 2️⃣ Autenticación y Autorización
- **JWT Access Tokens** para autenticar usuarios.
- **Refresh Tokens** con rotación para mantener sesiones activas de forma segura.
- **Validación de API Keys** para restringir el acceso.

### 3️⃣ Protección contra ataques
- **Rate-Limiting:** Límite de solicitudes por IP y por endpoint crítico.
- **CORS restringido:** Solo acepta peticiones desde la aplicación móvil autorizada.
- **Validación de User-Agent:** Bloquea accesos no autorizados.

---

## 📊 Endpoints Disponibles

### **Autenticación**
#### `POST /auth/register`
Registra un nuevo usuario con email y contraseña.
- Body: `{ email, password, phone }`
- Response: `{ success: true, message }`

#### `POST /auth/login`
Autentica un usuario con email y contraseña.
- Body: `{ email, password }`
- Response: `{ success: true, refreshToken, expiresAt }`

#### `POST /auth/google`
Autentica con Google Sign-In (mobile). Valida y verifica idToken.
- Body: `{ idToken, email, name, picture }`
- Response: `{ success: true, refreshToken, expiresAt }`

#### `POST /auth/apple`
Autentica con Apple Sign-In (mobile). Valida identityToken localmente.
- Body: `{ identityToken, email, name }`
- Response: `{ success: true, refreshToken, expiresAt }`

#### `POST /auth/refresh`
Renueva el Access Token usando un Refresh Token válido.
- Body: `{ refreshToken }`
- Response: `{ success: true, accessToken, expiresIn }`

#### `POST /auth/logout`
Cierra la sesión del usuario invalidando el Refresh Token.
- Body: `{ userId }`
- Response: `{ success: true, message }`

#### `POST /auth/code/verification`
Verifica un código de 6 dígitos (para registro o recuperación de contraseña).
- Body: `{ email (o userId), code, codeType: 'account_verification' | 'password_reset' }`
- Response: 
  - Registro: `{ success: true, refreshToken, expiresAt }`
  - Recuperación: `{ success: true, userId, email }`

#### `POST /auth/code/resend`
Reenvía el código de verificación (con rate limiter: 10min de espera).
- Body: `{ email }`
- Response: `{ success: true, message }`

#### `POST /auth/password/forgot`
Inicia proceso de recuperación de contraseña. Envía código por email.
- Body: `{ email }`
- Response: `{ success: true, message, userId }`

#### `POST /auth/password/reset`
Restablece la contraseña con el código verificado.
- Body: `{ email, code, newPassword }`
- Response: `{ success: true, message }`

### **Monedas y Tasas de Cambio**
#### `GET /exchange/currencies`
Devuelve la lista de monedas disponibles.

#### `GET /exchange/compare?baseCurrency=USD&targetCurrency=MXN`
Devuelve el valor actual y el anterior de una moneda, con estado `up` o `dw`.

#### `GET /exchange/:currency`
Devuelve tasas para una moneda base.

### **Salud del servicio**
#### `GET /health`
Verifica que la API esté activa. **Público** (sin autenticación).

#### `GET /health/database`
Verifica el estado de MongoDB (conectividad, latencia y circuit breaker).
**Protegido con API key** en `x-api-key`.

**Ejemplo:**
```bash
curl -H "x-api-key: <TU_API_KEY>" https://tu-dominio.com/health/database
```

**Nota:** Asegura que `API_KEY` este configurada en el entorno (local y produccion).

Compatibilidad:
- `/api/health` y `/api/health/database` se mantienen disponibles.

---

## 🚀 Installation & Setup

### Prerequisites
- Node.js v16+ 
- MongoDB Atlas account
- API keys for external services (Google OAuth, Exchange Rate API, Mailgun)

### Local Development
```bash
# Clone the repository
git clone https://github.com/LuisFabianHP/divisando_serv.git
cd divisando_serv

# Install dependencies
npm install

# Create .env file with local variables
cp .env.example .env  # (Edit with your local values)

# Start development server
npm run dev

# API will be available at http://localhost:5000
```

### Environment Variables Required
Variables esenciales:
- `PORT` - Puerto del servidor (default: 5000)
- `NODE_ENV` - Entorno (development, production)
- `API_NAME` - Nombre de la aplicación
- `API_KEY` - Clave para validación de requests
- `API_ALLOWED_USER_AGENTS` - User-Agent permitidos (ej. DivisandoApp/1.0)
- `API_CROS_DOMAINS` - Dominios CORS autorizados
- `MONGO_URI` - Conexión a MongoDB (mongodb+srv://...)
- `JWT_SECRET` - Secreto para firmar JWT tokens
- `GOOGLE_CLIENT_ID` - ID de cliente de Google OAuth (para mobile)

Exchange Rate API:
- `EXCHANGE_RATE_API_KEY` - API key de exchangerate-api.com
- `EXCHANGE_RATE_API_URL` - URL base (https://v6.exchangerate-api.com/v6/)
- `EXCHANGE_RATE_CURRENCIES` - Monedas a actualizar (ej. USD,MXN,EUR,CAD)
- `EXCHANGE_RATE_CRON` - Cron para tarea (ej. 0 * * * * = cada hora)
- `EXCHANGE_RATE_RECENT_HOURS` - Horas antes de actualizar (evita sobreconsultas)

Email (opcional):
- `MAILGUN_DOMAIN` - Dominio de Mailgun sandbox
- `MAILGUN_API_KEY` - API key de Mailgun

Optimización de memoria y MongoDB:
- `RATE_LIMIT_STORE_MAX_ENTRIES` - Entradas máx en store en memoria (default: 5000)
- `MONGO_MAX_POOL_SIZE` - Máximo de conexiones simultáneas al pool de MongoDB (default: 10)
- `MONGO_MIN_POOL_SIZE` - Conexiones mínimas siempre activas en el pool (default: 2)
- `MONGO_MAX_IDLE_MS` - Tiempo máximo en ms antes de cerrar una conexión inactiva (default: 60000)
- `MONGO_TTL_SECONDS` - Tiempo de retención automática (en segundos) de los registros de tasas de cambio en la colección `exchangeRates` (default: 7776000, tres meses)

### Estrategia de retención e histórico
- Los registros de ExchangeRate se eliminan automáticamente después de 90 días (TTL).
- El índice compuesto base_currency + createdAt permite consultas eficientes por moneda y fecha.
- Puedes ajustar el TTL cambiando la variable de entorno MONGO_TTL_SECONDS.
- Esta estrategia mantiene la base limpia, optimiza el rendimiento y permite conservar un histórico útil sin exceder límites del plan free.
- `MEMORY_MONITOR_CRON` - Monitoreo de memoria (default: */5 * * * *)
- `GC_CRON` - Garbage collection forzado (default: */30 * * * *)

---

## 🧪 Testing

### Running Tests
```bash
# Unit and integration tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

### Manual Testing
Use tools like Postman or curl to test endpoints:
```bash
# Health check (public endpoint)
curl http://localhost:5000/health

# Health check with database status (requires API_KEY)
curl -H "x-api-key: YOUR_API_KEY" http://localhost:5000/health/database
```

---

## 📚 Documentation

For technical and user documentation, see:
- **[MANUAL_TECNICO.md](./MANUAL_TECNICO.md)** - Technical documentation
- **[MANUAL_USUARIO.md](./MANUAL_USUARIO.md)** - User guide

---

## Licencia
MIT

---

## Equipo
🍍LU Devs Team