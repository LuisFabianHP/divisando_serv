# Manual Tecnico - Divisando API

## 1. Proposito
Guia tecnica para instalar, operar, mantener y extender el backend de Divisando.

## Indice
- 1. Proposito
- 2. Requisitos del ambiente
- 3. Instalacion
- 4. Configuracion (.env)
- 5. Arquitectura y carpetas
- 6. Seguridad y middlewares
- 7. Optimizacion de memoria
- 8. Tarea de tasas de cambio
- 9. Autenticacion
- 10. Endpoints principales
- 11. Logs
- 12. Pruebas
- 13. Troubleshooting rapido
- 14. Escalamiento


---

## 2. Requisitos del ambiente
- Node.js LTS
- MongoDB Atlas (o local para pruebas)
- Variables de entorno en `.env`

---

## 3. Instalacion
```bash
cd divisando_serv
npm install
```

Ejecucion:
```bash
npm run start
```

Desarrollo:
```bash
npm run dev
```

---

## 4. Configuracion (.env)

### Variables criticas (Requeridas)
- `PORT` - Puerto del servidor (default: 5000)
- `NODE_ENV` - Entorno (development, production)
- `API_NAME` - Nombre de la aplicación
- `API_KEY` - Clave para validación de requests
- `API_ALLOWED_USER_AGENTS` - User-Agent permitidos (ej. DivisandoApp/1.0)
- `API_CROS_DOMAINS` - Dominios CORS autorizados
- `MONGO_URI` - Conexión a MongoDB (mongodb+srv://...)
- `JWT_SECRET` - Secreto para firmar JWT tokens
- `JWT_REFRESH_SECRET` - Secreto para refresh tokens
- `GOOGLE_CLIENT_ID` - ID de cliente de Google OAuth (para mobile)

### Exchange Rate API
- `EXCHANGE_RATE_API_KEY` - API key de exchangerate-api.com
- `EXCHANGE_RATE_API_URL` - URL base (https://v6.exchangerate-api.com/v6/)
- `EXCHANGE_RATE_CURRENCIES` - Monedas a actualizar (ej. USD,MXN,EUR,CAD)
- `EXCHANGE_RATE_CRON` - Cron para tarea (ej. 0 * * * * = cada hora)
- `EXCHANGE_RATE_RECENT_HOURS` - Horas antes de actualizar (evita sobreconsultas)

### Email (Opcional - Para envío de códigos por email)
- `MAILGUN_DOMAIN` - Dominio de Mailgun sandbox
- `MAILGUN_API_KEY` - API key de Mailgun
- ℹ️ Si no se configura, códigos se loguean en consola (DEMO mode)

### Optimizacion de Memoria
- `RATE_LIMIT_STORE_MAX_ENTRIES` - Entradas máx en store en memoria (default: 5000)
- `MONGO_MAX_POOL_SIZE` - Conexiones simultáneas a MongoDB (default: 10)
- `MONGO_MIN_POOL_SIZE` - Conexiones siempre activas (default: 2)
- `MONGO_MAX_IDLE_MS` - ms antes de cerrar conexión inactiva (default: 60000)
- `MEMORY_MONITOR_CRON` - Monitoreo de memoria (default: */5 * * * *)
- `GC_CRON` - Garbage collection forzado (default: */30 * * * *)

### Valores Recomendados por Entorno

**Desarrollo Local:**
```env
NODE_ENV=development
PORT=5000
EXCHANGE_RATE_CRON="0 */12 * * *"  # Cada 12 horas
EXCHANGE_RATE_RECENT_HOURS=12
```

**Testing/Staging:**
```env
NODE_ENV=production
PORT=5000
EXCHANGE_RATE_CRON="0 */6 * * *"   # Cada 6 horas
EXCHANGE_RATE_RECENT_HOURS=6
```

**Producción (con recursos limitados):**
```env
NODE_ENV=production
EXCHANGE_RATE_CRON="0 * * * *"     # Cada hora (requiere plan pago)
EXCHANGE_RATE_RECENT_HOURS=1
RATE_LIMIT_STORE_MAX_ENTRIES=3000  # Reducir si memoria es limitada
```

### Uso de EXCHANGE_RATE_CURRENCIES
- **Lista explícita** (ej. `USD,MXN,EUR,CAD`) → usa esos valores
- **Valor `ALL`** → toma lista desde MongoDB (colección `AvailableCurrencies`)
- **Vacío o sin match** → fallback a (USD, MXN, EUR, CAD)

### Ejemplo Completo de .env (Local Development)

```env
# Servidor
PORT=5000
API_NAME=Divisando API Server
NODE_ENV=development
API_DOMAINS_TEST=0.0.0.0

# Seguridad y validación
API_KEY=tu-clave-segura-aqui
API_ALLOWED_USER_AGENTS=DivisandoApp/1.0
API_CROS_DOMAINS=http://localhost:5000

# JWT
JWT_SECRET=tu-jwt-secret-super-seguro-minimo-32-caracteres
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=tu-jwt-refresh-secret-super-seguro-minimo-32-caracteres
JWT_REFRESH_EXPIRES_IN=7d

# MongoDB
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/divisandoDB?retryWrites=true&w=majority

# Exchange Rate API
EXCHANGE_RATE_API_KEY=tu-api-key-de-exchangerate-api
EXCHANGE_RATE_API_URL=https://v6.exchangerate-api.com/v6/
EXCHANGE_RATE_CURRENCIES=USD,MXN,EUR,CAD
EXCHANGE_RATE_CRON=0 */12 * * *
EXCHANGE_RATE_RECENT_HOURS=12

# Google OAuth (Mobile)
GOOGLE_CLIENT_ID=tu-google-client-id.apps.googleusercontent.com

# Email (Opcional)
MAILGUN_DOMAIN=sandboxXXXXX.mailgun.org
MAILGUN_API_KEY=key-XXXXXXXXXX

# Optimización de memoria (para ambientes con recursos limitados)
RATE_LIMIT_STORE_MAX_ENTRIES=5000
MONGO_MAX_POOL_SIZE=10
MONGO_MIN_POOL_SIZE=2
MONGO_MAX_IDLE_MS=60000
MEMORY_MONITOR_CRON=*/5 * * * *
GC_CRON=*/30 * * * *
```

---

## 5. Arquitectura y carpetas
- `app.js`: configuracion de Express y middlewares.
- `server.js`: arranque HTTP, DB y tareas.
- `routes/`: rutas REST.
- `controllers/`: logica de negocio.
- `models/`: esquemas Mongoose.
- `middlewares/`: seguridad y validaciones.
- `tasks/`: cron jobs (tasas, limpieza, monitoreo memoria, GC).
- `services/`: integraciones externas (Mailgun).
- `utils/`: logs y utilidades de JWT.

---

## 6. Seguridad y middlewares
- `validateApiKey`: valida `x-api-key`.
- `validateUserAgent`: restringe user-agent.
- `validateJWT`: protege rutas con JWT.
- `rateLimiter`: limite global para `/exchange` con store optimizado.
- `verificationRateLimiter`: limites para verificacion y reset.

---

## 7. Optimizacion de memoria

### Rate Limiter optimizado
Archivo: `middlewares/rateLimiter.js`
- Store en memoria limitado a 5000 entradas (configurable).
- Limpieza automática periódica.
- Previene crecimiento ilimitado de memoria.
- Variable: `RATE_LIMIT_STORE_MAX_ENTRIES`

### Connection Pool MongoDB
Archivo: `config/database.js`
- `maxPoolSize`: 10 conexiones simultáneas (configurable).
- `minPoolSize`: 2 conexiones siempre activas (configurable).
- `maxIdleTimeMS`: 60000ms antes de cerrar conexiones inactivas.
- Variables: `MONGO_MAX_POOL_SIZE`, `MONGO_MIN_POOL_SIZE`, `MONGO_MAX_IDLE_MS`

### Retención automática de tasas (TTL)
Archivo: `models/ExchangeRate.js`
 - La colección `exchangeRates` implementa un índice TTL para eliminar automáticamente registros antiguos.
 - El tiempo de retención se configura mediante la variable `MONGO_TTL_SECONDS` (por defecto: 604800 segundos = 7 días).
 - Permite ajustar la caducidad de los datos según el entorno (desarrollo, producción, etc).
 - Cambia el valor en `.env` para modificar la retención.
 - Ejemplo: `MONGO_TTL_SECONDS=604800` (una semana).
 - El TTL se aplica solo a los documentos de tasas de cambio, no afecta otras colecciones.

### Memory Monitor
Archivo: `tasks/memoryMonitor.js`
- Monitoreo de uso de memoria a intervalos configurables.
- Logs: heap usado/total, RSS, external memory.
- Alertas automáticas:
  - ⚠️ Warning si heap > 80%
  - 🔴 Crítico si heap > 90%
- Variable: `MEMORY_MONITOR_CRON` (default: cada 5 minutos)

### Garbage Collector
Archivo: `tasks/garbageCollector.js`
- Fuerza recolección de basura a intervalos.
- Requiere flag `--expose-gc` en comando de arranque
- Logs: memoria liberada en MB.
- Variable: `GC_CRON` (default: cada 30 minutos)
- **Nota**: El flag `--expose-gc` se incluye en `npm start`

### Recomendaciones de Escalamiento

| Scenario | Acción |
|----------|--------|
| Memoria baja (<512MB) | Reducir `RATE_LIMIT_STORE_MAX_ENTRIES` a 2000-3000, `MONGO_MAX_POOL_SIZE` a 5 |
| Memoria normal (1GB+) | Mantener defaults (5000, 10, 2) |
| Memoria alta (2GB+) | Aumentar `RATE_LIMIT_STORE_MAX_ENTRIES` a 10000, `MONGO_MAX_POOL_SIZE` a 20 |
| Muchas conexiones simultáneas | Aumentar `MONGO_MAX_POOL_SIZE` |
| Picos de memoria | Reducir `EXCHANGE_RATE_CRON` (ejecutar menos frecuentemente) |

---

## 8. Tarea de tasas de cambio
Archivo: `tasks/fetchExchangeRates.js`.
- Cron configurable via `EXCHANGE_RATE_CRON`.
- Evita re-consulta dentro de `EXCHANGE_RATE_RECENT_HOURS`.
- Monedas desde `EXCHANGE_RATE_CURRENCIES` o `AvailableCurrencies` en MongoDB.

### Ejecución manual (solo mantenimiento)
Endpoint protegido para disparar actualización bajo demanda:

```http
POST /exchange/refresh
```

**Requiere**: `x-api-key` + `Authorization: Bearer <JWT>` + `User-Agent` válido

**Respuesta esperada (202):**
```json
{
  "success": true,
  "message": "Actualización de tasas iniciada. Verifica logs para el progreso."
}
```

**Notas:**
- No se ejecuta al inicio; solo cron o ejecución manual
- Si ya hay una ejecución en curso, se ignora el trigger

**API utilizada**: [exchangerate-api.com](https://www.exchangerate-api.com/docs/overview)

- **Dashboard:** https://app.exchangerate-api.com/
- **Docs:** https://www.exchangerate-api.com/docs/overview

Endpoint consumido:
```
GET /v6/<API_KEY>/latest/<BASE>
```

---

## 9. Autenticacion
Flujo principal:
- `POST /auth/register` => crea usuario y genera codigo.
- `POST /auth/code/verification` => valida codigo.
- `POST /auth/login` => emite refresh token.
- `POST /auth/refresh` => renueva refresh token.
- `POST /auth/logout` => revoca refresh token.

OAuth:
- Google (mobile): `/auth/google`
- Apple (mobile): `/auth/apple`

### Flujo paso a paso

1) Registro
- `POST /auth/register`
- Respuesta: ver Manual de Usuario.

2) Verificacion de cuenta
- `POST /auth/code/verification` con `{ code, userId }`
- Respuesta: ver Manual de Usuario.

3) Inicio de sesion
- `POST /auth/login` con `{ email, password }`
- Respuesta: ver Manual de Usuario.

4) Renovacion de sesion
- `POST /auth/refresh` con `{ refreshToken }`
- Respuesta: ver Manual de Usuario.

5) Cierre de sesion
- `POST /auth/logout` con `{ refreshToken }`

### Recuperacion de contrasena

1) Solicitar codigo
- `POST /auth/password/forgot` con `{ email }`
- Respuesta: ver Manual de Usuario.

2) Verificar codigo
- `POST /auth/code/verification` con `{ code, userId }`
- Respuesta: ver Manual de Usuario.

3) Restablecer password
- `POST /auth/password/reset` con `{ email, code, newPassword }`
- Respuesta: ver Manual de Usuario.

---

## 10. Endpoints principales
- `GET /exchange/currencies`
- `GET /exchange/compare?baseCurrency=USD&targetCurrency=MXN`
- `GET /exchange/:currency`
- `GET /health` (publico)
- `GET /health/database` (x-api-key requerido)

Ejemplos de uso y respuestas: ver Manual de Usuario.

Compatibilidad:
- `/api/health` y `/api/health/database` se mantienen disponibles.

---

## 11. Logs
- `logs/api.log` y `logs/api-errors.log`
- `logs/tasks.log` y `logs/task-errors.log`

---

## 12. Pruebas
```bash
npm test
```

---

## 13. Troubleshooting rapido
- 401/403 en API: revisar `API_KEY` y `API_ALLOWED_USER_AGENTS`.
- 403 en rutas protegidas: token JWT expirado o invalido.
- 429: rate limit activo.
- Mongo: validar `MONGO_URI` y conectividad.

---

## 14. Escalamiento
- Ajustar `EXCHANGE_RATE_CURRENCIES` y `EXCHANGE_RATE_CRON`.
- Considerar plan pago de ExchangeRate-API.
- Optimización de memoria: ver sección 7.
- Para deployment específico (ej. Railway): ver archivo RAILWAY_DEPLOYMENT.md

---

## 15. Licencia
MIT

---

## 16. Equipo
🍍LU Devs Team
