# 🚂 Railway Deployment Guide - Divisando API

**Guía completa para deploy, configuración y monitoreo en Railway.com**

> 📝 **Nota**: Este archivo es específico para **Railway.com**. Para documentación general del proyecto, ver [README.md](./README.md) y [MANUAL_TECNICO.md](./MANUAL_TECNICO.md).

---

## Tabla de Contenidos
1. [Información General](#información-general)
2. [Requisitos y Plans](#requisitos-y-plans)
3. [Cómo Empezar (Quick Start)](#cómo-empezar-quick-start)
4. [Variables de Entorno](#variables-de-entorno)
5. [Deploy Automático](#deploy-automático)
6. [Monitoreo y Logs](#monitoreo-y-logs)
7. [Health Checks](#health-checks)
8. [Email Service (Mailgun)](#email-service-mailgun)
9. [Optimización de Memoria](#optimización-de-memoria)
10. [Troubleshooting](#troubleshooting)
11. [Escalamiento](#escalamiento)
12. [Consideraciones de Seguridad](#consideraciones-de-seguridad)

---

## Información General

| Concepto | Valor |
|----------|-------|
| **URL del Servicio** | `https://divisando-serv-production.up.railway.app` |
| **Ambiente** | Producción (Testing) |
| **Última Actualización** | Febrero 10, 2026 |
| **Responsable** | LU Devs Team |
| **Documentación** | Este archivo |

---

## Cómo Empezar (Quick Start)

### Paso 1: Crear Proyecto en Railway

1. Ve a https://railway.app/dashboard
2. Click en "New Project" → "Deploy from GitHub"
3. Conecta tu repo: `LuisFabianHP/divisando_serv`
4. Selecciona rama: `dev-api-task` (o `main` para producción)
5. Click "Deploy Now"

Railway detecta Node.js automáticamente y ejecutará:
```bash
npm install  # Instala dependencias
npm start    # Inicia con flag --expose-gc
```

### Paso 2: Configurar Variables de Entorno

Railway → Tu Proyecto → Variables → Agregar todas las variables de [Variables de Entorno](#variables-de-entorno)

**Orden recomendado:**
1. Variables críticas: `API_KEY`, `JWT_SECRET`, `JWT_REFRESH_SECRET`
2. MongoDB: `MONGO_URI`
3. APIs externas: `GOOGLE_CLIENT_ID`, `EXCHANGE_RATE_API_KEY`
4. Email: `MAILGUN_DOMAIN`, `MAILGUN_API_KEY` (opcional)
5. Optimización: `RATE_LIMIT_STORE_MAX_ENTRIES`, memory variables

### Paso 3: Generar Secretos Seguros

**Ejecuta estos comandos localmente antes de agregar a Railway:**

```bash
# JWT_SECRET (32+ caracteres)
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"

# JWT_REFRESH_SECRET (32+ caracteres)
node -e "console.log('JWT_REFRESH_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"

# API_KEY (16+ caracteres)
node -e "console.log('API_KEY=' + require('crypto').randomBytes(16).toString('hex'))"
```

Copia los valores generados a Railway Dashboard

### Paso 4: Verificar Deployment

1. Railway Dashboard → Deployments
2. Espera a que el build termine (2-3 minutos)
3. Verifica logs para errores
4. Test health check:
   ```bash
   curl https://divisando-serv-production.up.railway.app/health
   ```

---

## Requisitos y Plans

## Requisitos y Plans

### Free Plan (Actual)
**Recursos Asignados:**
- **RAM**: 512 MB
- **vCPU**: 1 (compartido)
- **Disco**: 1 GB
- **Límite Mensual**: $1.00 USD en créditos
- **Uso Actual**: $0.00 USD

**Limitaciones:**
- ⚠️ Memoria limitada: requiere optimización
- ⚠️ CPU compartida: rendimiento variable
- ⚠️ Sin garantía de uptime: puede pausarse por inactividad
- ⚠️ 1 servicio por workspace: sin escalamiento horizontal

### Hobby Plan ($5/mes)
**Para pre-release testing:**
- **RAM**: 2.5 GB
- **vCPU**: 2 (dedicados)
- **Mejor estabilidad**: uptime superior
- **Recomendado**: Cuando tengas usuario inicial

### Pro Plan ($20/mes+)
**Para production:**
- **Escalabilidad automática**
- **Analytics y monitoring**
- **SLA garantizado**
- **Recomendado**: Lanzamiento público

### Cambiar Plan
1. https://railway.app/account/billing
2. Seleccionar proyecto → Upgrade
3. Elegir plan → Confirmar
4. Aplica en siguiente deploy

---

## ⚙️ Variables de Entorno

### Críticas (API Core)
```env
# Servidor
API_NAME="Divisando API Server"
PORT=5000
NODE_ENV="production"

# Seguridad
API_KEY="tu-api-key-secreto-aqui"  # Generar una clave segura de 32+ caracteres
API_ALLOWED_USER_AGENTS="DivisandoApp/1.0"
API_CROS_DOMAINS="https://divisando-serv-production.up.railway.app"

# JWT
JWT_SECRET="tu-jwt-secret-super-seguro-minimo-32-caracteres"  # Generar con: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_EXPIRES_IN="7d"
JWT_REFRESH_SECRET="tu-jwt-refresh-secret-super-seguro-minimo-32-caracteres"  # Generar con: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_REFRESH_EXPIRES_IN="7d"
```

### Base de Datos (MongoDB Atlas)
```env
MONGO_URI="mongodb+srv://divUsDev:TU_PASSWORD_AQUI@cluster0.hpj4zub.mongodb.net/divisandoDB?retryWrites=true&w=majority&appName=Cluster0"  # Reemplaza TU_PASSWORD_AQUI con credenciales reales
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
EXCHANGE_RATE_API_KEY="tu-api-key-de-exchangerate-api"  # Obtener en https://www.exchangerate-api.com/
```

#### Google OAuth (Mobile/Flutter - Sin Passport)
```env
GOOGLE_CLIENT_ID="tu-google-client-id.apps.googleusercontent.com"  # Obtener de https://console.cloud.google.com/
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
---

## 🚀 Deploy Automático

### Cómo Funciona

1. **Conexión automática con GitHub**: Railway se conecta via webhook
2. **Triggers en cada push**: A la rama configurada (`dev-api-task` o `main`)
3. **Build automático**: Railway detecta Node.js e instala dependencias
4. **Startup automático**: Ejecuta `npm start`

### Comando de Arranque

**En `package.json`:**
```json
{
  "scripts": {
    "start": "node --expose-gc server.js"
  }
}
```

⚠️ **Flag `--expose-gc` es obligatorio** para que Garbage Collector funcione

### Rama Deployada
- **Principal**: `dev-api-task` (desarrollo)
- **Alternativa**: `main` (producción)
- **Ver status**: Railway Dashboard → Deployments

### Build Automático
Railway ejecuta automáticamente:
```bash
npm install   # Instala dependencias
npm start     # Inicia con --expose-gc flag
```

---

## 📊 Monitoreo y Logs

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
   # Con Railway CLI (si está instalado)
   railway logs --follow
   ```

### Logs Generados (Winston)

**En Railway** (sistema de archivos temporal, se pierden en redeploy):
- Accesibles via Railway Dashboard → Logs

**Localmente** (para testing):
- `logs/api.log` → Info general
- `logs/api-errors.log` → Errores de API
- `logs/tasks.log` → Info de cron tasks
- `logs/task-errors.log` → Errores de tasks

**Formato:**
```
[TIMESTAMP] [LEVEL]: [MESSAGE] [METADATA]

Ejemplo:
2026-02-11T20:15:57.673Z [INFO]: Server running on port 5000
2026-02-11T20:16:02.891Z [WARN]: Memory usage high {"heap":"450MB/512MB"}
2026-02-11T20:17:30.445Z [ERROR]: MongoDB connection failed {"error":"ECONNREFUSED"}
```

### Memory Monitor Task

Ejecuta cada 5 minutos (configurable via `MEMORY_MONITOR_CRON`)

**Registra:**
- Heap usado/máx
- RSS (Resident Set Size)
- External memory

**Alertas:**
- ⚠️ Warning si heap > 80%
- 🔴 Crítico si heap > 90%

### Garbage Collector Task

Ejecuta cada 30 minutos (configurable via `GC_CRON`)

**Realiza:**
- Fuerza recolección de basura
- Reporta memoria liberada en MB
- Requiere flag `--expose-gc` (ya incluido)

---

## 🔍 Health Checks

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
  -H "x-api-key: TU_API_KEY_AQUI"  # Reemplaza con tu API_KEY real

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

## � Email Service (Mailgun)

### Modo DEMO (Sin Mailgun)

Si `MAILGUN_API_KEY` y `MAILGUN_DOMAIN` no están configurados en Railway:

```
⚠️  MAILGUN_API_KEY o MAILGUN_DOMAIN no configurados. 
Emails se loguearán en consola.
```

**En este modo:**
- Los códigos de verificación aparecen en logs
- No se envían realmente por email
- El API funciona normalmente
- Ideal para testing

**Ejemplo en logs:**
```
📋 [DEMO] Código de verificación para user@example.com: 123456 (Expira en 5 minutos)
```

### Configurar Mailgun Real

**1. Registrate en Mailgun**:
- Ve a https://www.mailgun.com/
- Plan gratuito disponible
- Crea un dominio sandbox: `sandboxXXXXXXXX.mailgun.org`

**2. Obtener credenciales**:
- Dashboard → API Keys
- Copia `MAILGUN_API_KEY` (formato: `key-XXXXXXXXXX`)
- Copia `MAILGUN_DOMAIN` (ej: `sandbox123abc.mailgun.org`)

**3. Agregar a Railway**:
- Railway Dashboard → Tu Proyecto → Variables
- Agrega:
  ```env
  MAILGUN_DOMAIN=sandboxXXXXX.mailgun.org
  MAILGUN_API_KEY=key-XXXXXXXXXX
  ```
- Guardar (auto-redeploy)

**4. Verificar configuración**:
- Revisa logs en Railway
- Debe mostrar: `✅ Mailgun configurado correctamente`
- Registra un usuario de prueba y verifica que reciba email

### Troubleshooting Mailgun

| Problema | Solución |
|----------|----------|
| "No configurados" en logs | Agregar variables en Railway Dashboard |
| "Invalid API Key" | Verificar formato: `key-XXXXX` |
| Email no llega | En sandbox, agregar email a "Authorized Recipients" en Mailgun |
| Funcionando local pero no en Railway | Las variables no se sincronizaron, haz redeploy manual |
| API key expirada | Regenerar en https://www.mailgun.com/ y actualizar Railway |

---

## ⚙️ Optimización de Memoria

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
  -H "x-api-key: ***REMOVED***"
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
- `API_KEY` - Validación de requests (guardar en Railway Dashboard, NUNCA en Git)
- `JWT_SECRET` y `JWT_REFRESH_SECRET` - Firmas de tokens (guardar en Railway Dashboard, NUNCA en Git)
- `MONGO_URI` con credenciales - Acceso a base de datos (guardar en Railway Dashboard, NUNCA en Git)
- `GOOGLE_CLIENT_ID` - Usado en validación de idToken (puede ser público pero mantener en Railway)
- `EXCHANGE_RATE_API_KEY` - Acceso a API externa (guardar en Railway Dashboard, NUNCA en Git)
- `MAILGUN_API_KEY` - Acceso a servicio de email (guardar en Railway Dashboard, NUNCA en Git)

### Generación de Secretos Seguros

**Generar JWT_SECRET y JWT_REFRESH_SECRET** (32+ caracteres aleatorios):
```bash
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('JWT_REFRESH_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
```

**Generar API_KEY** (16+ caracteres aleatorios):
```bash
node -e "console.log('API_KEY=' + require('crypto').randomBytes(16).toString('hex'))"
```

**Mejores prácticas**:
1. Generar nuevos secretos para cada ambiente (dev, test, prod)
2. Rotar secretos cada 90 días
3. Usar gestores de secretos (Vault, 1Password, etc)
4. NUNCA loguear secretos en console.log()
5. NUNCA commitear secretos en Git

⚠️ **YA NO UTILIZADOS** (removidos con Passport):
- `GOOGLE_CLIENT_SECRET` - Solo para Passport web (deprecated)
- `GOOGLE_CALLBACK_URL` - Solo para Passport web (deprecated)
- `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET` - OAuth web completo (deprecated)

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
