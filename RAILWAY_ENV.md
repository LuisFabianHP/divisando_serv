# 🚂 Ambiente de Pruebas - Railway.com

**Documentación de configuración y monitoreo del API de Divisando en Railway**

> 📝 **Nota**: Este archivo es específico para **Railway.com**. Para documentación general del proyecto, ver [README.md](./README.md).

---

## 📌 Información General

| Concepto | Valor |
|----------|-------|
| **URL del Servicio** | `https://divisando-serv-production.up.railway.app` |
| **Ambiente** | Producción (Testing) |
| **Última Actualización** | Febrero 10, 2026 |
| **Responsable** | LU Devs Team |
| **Documentación** | Este archivo |

---

## 📦 Plan y Recursos (Free Plan)

### Recursos Asignados
- **RAM**: 0.5 GB (512 MB)
- **vCPU**: 1 (compartido)
- **Disco**: 1 GB
- **Límite Mensual**: $1.00 USD en créditos gratuitos
- **Uso Actual**: $0.00 USD

### Limitaciones del Free Plan
⚠️ **Crítico para desarrollo/testing:**
- **Memoria limitada**: 512 MB total obliga optimización
- **CPU compartida**: Rendimiento variable según carga general
- **Sin garantía de uptime**: Puede pausarse por inactividad
- **1 servicio por workspace**: No puede escalar horizontalmente

### Escalamiento
Para pasar a **Hobby Plan** o superior:
- Hobby Plan: $5/mes + pago por uso
- Incluiría: 2.5 GB RAM, 2 vCPU dedicados
- Mejor estabilidad y performance para testing
- Dashboard: https://railway.app/dashboard

---

## ⚙️ Variables de Entorno

### Críticas (API Core)
```env
# Servidor
API_NAME="Divisando API Server"
PORT=5000
NODE_ENV="production"

# Seguridad
API_KEY="@S3gUr@L0kP@sSw0rD!2o25"
API_ALLOWED_USER_AGENTS="DivisandoApp/1.0"
API_CROS_DOMAINS="http://divisando-serv-production.up.railway.app"

# JWT
JWT_SECRET="&C1%n$8w!tTz%qPfD2^rB4g*UjE5m&9K7v^1$WfM3!@NcR6"
JWT_EXPIRES_IN="7d"
JWT_REFRESH_SECRET="!pN6tWz6jD^hY*Dk2fJ3r@dA7lQ"
JWT_REFRESH_EXPIRES_IN="7d"
```

### Base de Datos (MongoDB Atlas)
```env
MONGO_URI="mongodb+srv://divUsDev:<PASSWORD>@cluster0.hpj4zub.mongodb.net/divisandoDB?retryWrites=true&w=majority&appName=Cluster0"
```

**Detalles de conexión:**
- **Cluster**: Cluster0 (MongoDB Atlas)
- **Database**: divisandoDB
- **User**: divUsDev (read/write)
- **URL conectar**: cluster0.hpj4zub.mongodb.net
- **Connection String Format**: `mongodb+srv://divUsDev:<PASSWORD>@cluster0.hpj4zub.mongodb.net/divisandoDB`

### APIs Externas

#### Exchange Rate API
```env
EXCHANGE_RATE_API_URL="https://v6.exchangerate-api.com/v6/"
EXCHANGE_RATE_API_KEY="fb5d1071f5acb7da936cbe5a"
```

#### Google OAuth (Mobile/Flutter - Sin Passport)
```env
GOOGLE_CLIENT_ID="530315387189-gpqqu8ovq9o408ofmt8jm6p83mssvm6u.apps.googleusercontent.com"
```

**Detalles de Google Auth:**
- ✅ **En uso**: Validación de `idToken` desde Flutter app (mobile)
- ✅ **Librería**: `google-auth-library` v10.5.0 (NO Passport)
- ✅ **Flujo**: 
  1. App Flutter llama a Google Sign-In
  2. Recibe `idToken`
  3. POST a `/auth/google` con idToken
  4. Backend valida con Google usando OAuth2Client
  5. Extrae googleId, email, name
  6. Crea/busca usuario en DB
  7. Devuelve refreshToken
- ❌ **GOOGLE_CLIENT_SECRET**: YA NO NECESARIO (removido con Passport web)
- ❌ **GOOGLE_CALLBACK_URL**: YA NO NECESARIO (removido con Passport web)

#### Apple OAuth (Mobile/Flutter)
- ✅ **En uso**: Validación de `identityToken` desde Flutter app (iOS/macOS)
- ✅ **Flujo**: Similar a Google, pero valida JWT localmente
- ❌ No requiere variables de entorno

#### Email Service (Mailgun - Opcional)
```env
MAILGUN_DOMAIN="sandbox[ID].mailgun.org"
MAILGUN_API_KEY="tu-api-key-aqui"  # Generar en https://www.mailgun.com/
```

**Detalles de Email Service:**
- ✅ **Función**: Enviar códigos de verificación y notificaciones
- ✅ **Proveedor**: Mailgun (sandbox gratuito)
- ⚠️ **Modo fallback**: Si no se configura, los códigos se loguean en consola (DEMO mode)
- 📝 **Cómo obtener**: Registrarse en https://www.mailgun.com/
- ⏰ **Nota**: Las API keys de Mailgun expiran, revisar y regenerar periódicamente

### Optimización de Memoria (Railway Free Plan)
```env
# Rate Limiter
RATE_LIMIT_STORE_MAX_ENTRIES=5000    # Entradas max en store (memory-bounded)

# MongoDB Connection Pool
MONGO_MAX_POOL_SIZE=10               # Conexiones simultáneas
MONGO_MIN_POOL_SIZE=2                # Conexiones base activas
MONGO_MAX_IDLE_MS=60000              # 60s antes de cerrar inactiva

# Memory Monitor (detecta saturación)
MEMORY_MONITOR_CRON="*/5 * * * *"    # Cada 5 minutos (warning 80%, crítico 90%)

# Garbage Collector (libera memoria)
GC_CRON="*/30 * * * *"               # Cada 30 minutos (requiere --expose-gc)
```

⚠️ **Nota importante**: Con libre plan (512 MB RAM), estas variables son críticas. Cualquier cambio requiere testing riguroso.

### Exchange Rate (Consumo controlado)
```env
# Pruebas: cada 6 horas
EXCHANGE_RATE_CRON="0 */6 * * *"
EXCHANGE_RATE_CURRENCIES="USD,MXN,EUR,CAD"
EXCHANGE_RATE_RECENT_HOURS=6

# Producción: cada 1 hora (requeriría plan pago)
# EXCHANGE_RATE_CRON="0 * * * *"
# EXCHANGE_RATE_RECENT_HOURS=1
```

---

## 🚀 Deployment

### Build y Startup
**Railway detecta automáticamente** Node.js y ejecuta:
```bash
# Build (opcional en Railway)
npm install

# Start
npm start
```

**Comando start en package.json:**
```json
"start": "node --expose-gc server.js"
```

⚠️ **Flag --expose-gc es obligatorio** para que el Garbage Collector funcione.

### Rama Deployada
- **Rama**: `dev-api-task` (rama principal de desarrollo)
- **Alternativa testing**: `pruebas` (rama para pruebas locales)
- **Actual en Railway**: Verifica en Railway Dashboard → Deployments

### Health Checks
Railway configura automáticamente checks en `/health`:
- **Intervalo**: 30 segundos
- **Timeout**: 60 segundos
- **Retries**: 3 intentos antes de marcar como down

---

## 🔍 Health Checks y Endpoints

### Verificar estado del API

**Público (sin autenticación):**
```bash
GET https://divisando-serv-production.up.railway.app/health

# Respuesta esperada:
{
  "status": "ok",
  "timestamp": "2026-02-10T20:15:57.673Z",
  "uptime": 3600,
  "environment": "production"
}
```

**Con API Key (requiere header `x-api-key`):**
```bash
GET https://divisando-serv-production.up.railway.app/health/database \
  -H "x-api-key: @S3gUr@L0kP@sSw0rD!2o25"

# Respuesta esperada:
{
  "status": "ok",
  "database": "connected",
  "mongodb": true,
  "timestamp": "2026-02-10T20:15:57.673Z"
}
```

### Endpoints de Autenticación

| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| POST | `/auth/register` | — | Registrar usuario con email/password |
| POST | `/auth/login` | — | Iniciar sesión con email/password |
| POST | `/auth/google` | — | Login con Google idToken (mobile) |
| POST | `/auth/apple` | — | Login con Apple identityToken (mobile) |
| POST | `/auth/code/verification` | — | Verificar código de cuenta |
| POST | `/auth/code/resend` | — | Reenviar código de verificación |
| POST | `/auth/password/forgot` | — | Solicitar reset de contraseña |
| POST | `/auth/password/reset` | — | Restablecer contraseña |
| POST | `/auth/refresh` | — | Renovar token JWT |
| POST | `/auth/logout` | — | Cerrar sesión |

### Endpoints de Exchange

| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| GET | `/exchange/currencies` | API Key + JWT | Lista de monedas soportadas |
| GET | `/exchange/:currency` | API Key + JWT | Tasa para una moneda |
| GET | `/exchange/compare?base=USD&target=MXN` | API Key + JWT | Comparar dos monedas |

### Endpoints de Sistema

| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| GET | `/health` | — | Status del API (público) |
| GET | `/health/database` | API Key | Status de MongoDB |

**URL base**: `https://divisando-serv-production.up.railway.app`

---

## 📊 Logs y Monitoreo

### Acceso a Logs en Railway

1. **Railway Dashboard**:
   - Ir a: https://railway.app/dashboard
   - Seleccionar proyecto → Divisando
   - Pestaña: "Logs"
   - Filtrar por:
     - Rango de fecha
     - Nivel (error, warn, info)

2. **Streaming en vivo**:
```bash
# Railway CLI (si está instalado)
railway logs --follow
```

### Logs Generados (Winston)

**Ubicación en Railway**: Sistema de archivos temporal (se pierden en redeploy)

**Locales (para testing)**:
- `logs/api.log` → Info general del API
- `logs/api-errors.log` → Errores de API
- `logs/tasks.log` → Info de cron tasks
- `logs/task-errors.log` → Errores de tasks

**Formatos de log**:
```
[TIMESTAMP] [LEVEL]: [MESSAGE] [METADATA]

Ejemplo:
2026-02-10T20:15:57.673Z [INFO]: Server running on port 5000 {"service":"API"}
2026-02-10T20:16:02.891Z [WARN]: Memory usage high {"heap":"450MB/512MB"}
2026-02-10T20:17:30.445Z [ERROR]: MongoDB connection failed {"error":"ECONNREFUSED"}
```

### Monitoreo de Memoria

**Memory Monitor Task** (Cron cada 5 minutos):
- Registra: Heap usado/máx, RSS, External memory
- ⚠️ **Warning** si heap > 80%
- 🔴 **Crítico** si heap > 90%
- Logs en: `logs/tasks.log`

**Garbage Collector Task** (Cron cada 30 minutos):
- Fuerza recolección de basura
- Reporta memoria liberada en MB
- Requiere flag: `--expose-gc` (ya incluido en package.json)

### Métricas en Railway

Aunque no hay dashboard visual en Free Plan, puedes monitorear:
- CPU usage → Railway Dashboard
- Memory usage → Railway Dashboard
- Requests/response times → Logs
- Error rate → Logs

---

## 🔧 Troubleshooting Rápido

### Problema: API no responde

**1. Verificar status en Railway**:
- Dashboard → Deployments → Ver últimas ejecuciones
- ¿Mostró error en build o start?

**2. Revisar logs**:
```bash
# Últimas 50 líneas
railway logs --lines 50

# Buscar errores
railway logs | grep ERROR
```

**3. Verificar conectividad a MongoDB**:
```bash
# Hacer request al health check
curl https://divisando-serv-production.up.railway.app/health/database \
  -H "x-api-key: @S3gUr@L0kP@sSw0rD!2o25"
```

### Problema: Memoria agotada (Heap exhausted)

**Síntomas**:
- API muere sin aviso
- Logs: `FATAL ERROR: CALL_AND_RETRY_LAST Allocation failed - JavaScript heap out of memory`
- Memory Monitor reporta >90%

**Soluciones inmediatas**:
1. Revisar URL de consumo: ¿Demasiadas solicitudes simultáneas?
2. Forzar Garbage Collection: Esperar a que cron ejecute (cada 30 min)
3. Reducir `RATE_LIMIT_STORE_MAX_ENTRIES` en Railway env vars
4. Reducir `MONGO_MAX_POOL_SIZE`

**Solución definitiva**: Escalar a Hobby Plan o superior

### Problema: MongoDB conexión caída

**Síntomas**:
- GET `/health/database` retorna `"database": false`
- Logs: `MongoServerError: connection refused`

**Verificar**:
1. ¿MongoDB Atlas cluster activo?
2. ¿MONGO_URI correcta? (sin typos)
3. ¿IP de Railway en whitelist de MongoDB Atlas?
4. ¿MONGO_URI_PASSWORD expirada?

**Reconectar**: Railway auto-reinicia el servicio cada 10 min si falla

### Problema: Rate limit alcanzado

**Síntomas**:
- POST a `/exchange/*` retorna 429 Too Many Requests
- Header: `Retry-After: 60`

**Solución**:
- Esperar `Retry-After` segundos
- Si es persistente: aumentar `RATE_LIMIT_STORE_MAX_ENTRIES` (cuidado con RAM)

### Problema: Tasks (cron) no ejecutan

**Síntomas**:
- Memory Monitor no registra logs cada 5 min
- Tasas no se actualizan cada 6 horas

**Verificar**:
1. Ver logs: `logs/tasks.log` o Railway logs
2. ¿CRON expressions correctas?
3. Formato: `minute hour day month weekday`
   - Ejemplo: `0 */6 * * *` = cada 6 horas

**Reiniciar manualmente**: Hacer un pequeño cambio en .env ("dummy change") → redeploy

---

## 📈 Escalamiento

### Fases recomendadas

**FASE 1: Free Plan (actual)**
- ✅ Desenvolvimento y testing locales
- ✅ Testing manual en Railway
- ❌ Zero production traffic
- Ideal para: Validación de endpoints

**FASE 2: Hobby Plan ($5/mes)**
- ✅ Beta testing con usuarios limitados
- Recursos: 2.5 GB RAM, 2 vCPU
- Monitoreo básico en dashboard
- Ideal para: Pre-release testing

**FASE 3: Standard Plan ($20/mes)**
- ✅ Production-ready
- Recursos: Escalabilidad automática
- Analytics y monitoring avanzado
- Ideal para: Lanzamiento público

### Cambiar plan en Railway

1. Ir a: https://railway.app/account/billing
2. Seleccionar proyecto → Divisando
3. Upgrade → Elegir plan deseado
4. Confirmación automática en siguientes redeploys

### Mejoras recomendadas antes de escalar

1. **Caché**: Implementar Redis para tasas (reduce consultas a ExchangeRate-API)
2. **CDN**: Servir assets desde Cloudflare (reduce bandwidth)
3. **Database**: Pasar MongoDB a plan pago con replicación
4. **Load Testing**: Validar con Artillery antes de producción
5. **Monitoring**: Integrar Sentry para error tracking

---

## 📚 Referencias

### Railway
- **Dashboard**: https://railway.app/dashboard
- **Documentación**: https://docs.railway.app
- **Pricing**: https://railway.app/pricing
- **Status Page**: https://status.railway.app

### MongoDB Atlas
- **Cluster0**: https://cloud.mongodb.com
- **Database**: `divisandoDB`
- **User**: `divUsDev`
- **Whitelist IPs**: Configurar en Security → Network Access

### APIs Externas
- **ExchangeRate-API**: https://www.exchangerate-api.com/docs/overview
- **Google OAuth (Mobile)**: https://developers.google.com/identity/protocols/oauth2
  - Librería: `google-auth-library` para Node.js
  - Documentación: https://github.com/googleapis/google-auth-library-nodejs
- **Apple Sign In (Mobile)**: https://developer.apple.com/sign-in-with-apple/get-started/

### Documentación del Proyecto
- **MANUAL_TECNICO.md**: Guía técnica general
- **MANUAL_USUARIO.md**: Endpoints y auth flows
- **README.md**: Overview del proyecto
- **Este archivo**: Configuración Railway específica

---

## 🔐 Consideraciones de Seguridad

⚠️ **Nunca compartir públicamente**:
- `API_KEY` - Validación de requests
- `JWT_SECRET` y `JWT_REFRESH_SECRET` - Firmas de tokens
- `MONGO_URI` con credenciales - Acceso a base de datos
- `GOOGLE_CLIENT_ID` - Usado en validación de idToken (debe protegerse)
- `EXCHANGE_RATE_API_KEY` - Acceso a API externa

⚠️ **YA NO UTILIZADOS** (removidos con Passport):
- `GOOGLE_CLIENT_SECRET` - Solo para Passport web (deprecated)
- `GOOGLE_CALLBACK_URL` - Solo para Passport web (deprecated)
- `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET` - OAuth web completo (deprecated)

**Almacenar secretos en**:
- Railway Environment Variables (cifradas)
- `.env` local (nunca commitear)
- Gestores de secretos (Vault, AWS Secrets Manager, etc)

---

## 📝 Historial de Cambios

| Fecha | Cambio | Responsable |
|-------|--------|------------|
| 2026-02-10 | Documentación inicial + verificación de Google Auth | LU Devs Team |
| 2026-02-10 | Removida Facebook OAuth (deprecated), clarificado Google/Apple sin Passport | LU Devs Team |
| — | Plan: Free → Hobby (próximo) | Pendiente |
| — | Integración Redis (próximo) | Pendiente |

---

**Última revisión**: Febrero 10, 2026  
**Próxima revisión recomendada**: Al escalar a Hobby Plan o cambios en configuración crítica
