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

## 🚂 Testing Environment - Railway.com

The API is deployed on **Railway.com** (Free Plan) for testing and validation.

### Quick Links
- **API URL**: https://divisando-serv-production.up.railway.app
- **Health Check**: GET `/health` (public)
- **Database Health**: GET `/health/database` (requires API key)
- **Full Documentation**: [RAILWAY_ENV.md](./RAILWAY_ENV.md)

### Current Resources
- **Plan**: Free (0.5 GB RAM, 1 vCPU, $1/mo credit)
- **Database**: MongoDB Atlas - Cluster0 (divisandoDB)
- **Status**: Testing phase with optimization for memory constraints

### Getting Started with Testing
1. Check [RAILWAY_ENV.md](./RAILWAY_ENV.md) for complete configuration
2. Review memory optimization settings (Section 7 in [MANUAL_TECNICO.md](./MANUAL_TECNICO.md))
3. Use `/health` endpoint to verify API availability
4. See "Troubleshooting" section in [RAILWAY_ENV.md](./RAILWAY_ENV.md) for common issues

### Environment Variables
All critical variables are managed in Railway Dashboard. Local development uses `.env` file.
See [RAILWAY_ENV.md](./RAILWAY_ENV.md#-variables-de-entorno) for variable reference.

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

## 🚀 Mejoras Implementadas (v2.0+)

### Autenticación Moderna
- ✅ **Google Sign-In para Mobile** - Validación de idToken sin Passport web
- ✅ **Apple Sign-In para Mobile** - Validación local de identityToken
- ✅ **Sistema de Verificación por Código** - Separado de autenticación (reutilizable para registro y recuperación)
- ✅ **Rate Limiting por Endpoint** - Protección específica para verificación, recuperación de contraseña y reenvío de códigos

### Optimización de Memoria (Railway Free Plan)
- ✅ **LimitedMemoryStore** - Rate limiter en memoria con límite configurable (5000 entries)
- ✅ **Connection Pooling Optimizado** - MongoDB con 10/2 (max/min) conexiones
- ✅ **Memory Monitor** - Cron cada 5 minutos para alertas de heap alto
- ✅ **Garbage Collection Automático** - Cron cada 30 minutos (requiere --expose-gc)

### Seguridad Avanzada
- ✅ **Email Verification** - Códigos de 6 dígitos con expiración (5 min)
- ✅ **Circuit Breaker Pattern** - Para MongoDB con reintentos inteligentes
- ✅ **Mailgun Integration** - Con fallback a modo demo si no está configurado

---

## 📌 Proximos Pasos y Escalamiento

### Cambios Necesarios al Escalar
1. **Aumentar recursos en Railway** → Plan mejorado (2GB RAM, 2 vCPU)
2. **Migrar Rate Limiter** → Redis en lugar de memoria
3. **Optimización de Consultas** → Índices en MongoDB, caché de tasas de cambio
4. **Monitoreo en Tiempo Real** → New Relic o similar para observabilidad

### Roadmap Futuro
- [ ] Autenticación biométrica en mobile
- [ ] Historial de transacciones persistente
- [ ] Alertas de cambios significativos en tasas
- [ ] Webhooks para actualizaciones en tiempo real
- [ ] Dashboard administrativo

---

---

## Licencia
MIT

---

## Equipo
🍍LU Devs Team