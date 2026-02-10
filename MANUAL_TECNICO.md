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
- 7. Optimizacion de memoria (Railway)
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

### Variables criticas
- `MONGO_URI`
- `API_KEY`
- `API_ALLOWED_USER_AGENTS`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `EXCHANGE_RATE_API_KEY`
- `EXCHANGE_RATE_API_URL`

### ExchangeRate (tarea de tasas)
- `EXCHANGE_RATE_CURRENCIES`
- `EXCHANGE_RATE_CRON`
- `EXCHANGE_RATE_RECENT_HOURS`

Uso de `EXCHANGE_RATE_CURRENCIES`:
- Lista explicita (ej. `USD,MXN,EUR,CAD`) => usa esos valores.
- Valor `ALL` => toma la lista desde MongoDB (coleccion `AvailableCurrencies`).
- Si no hay datos en DB, usa fallback seguro (USD, MXN, EUR, CAD).
- Si la variable esta vacia, usa fallback seguro.

Valores recomendados:
- Pruebas: `EXCHANGE_RATE_CRON=0 */6 * * *`, `EXCHANGE_RATE_RECENT_HOURS=6`.
- Produccion: `EXCHANGE_RATE_CRON=0 * * * *`, `EXCHANGE_RATE_RECENT_HOURS=1`.

### Optimizacion de memoria (Railway)
- `RATE_LIMIT_STORE_MAX_ENTRIES` (default: 5000)
- `MONGO_MAX_POOL_SIZE` (default: 10)
- `MONGO_MIN_POOL_SIZE` (default: 2)
- `MONGO_MAX_IDLE_MS` (default: 60000)
- `MEMORY_MONITOR_CRON` (default: */5 * * * *)
- `GC_CRON` (default: */30 * * * *)

Valores por defecto configurados para plan gratuito/limitado.
Para escalamiento ver archivo `.env.memory-optimization`.

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

## 7. Optimizacion de memoria (Railway)

### Rate Limiter optimizado
Archivo: `middlewares/rateLimiter.js`
- Store en memoria limitado a 5000 entradas (configurable).
- Limpieza automatica cada 5 minutos.
- Previene crecimiento ilimitado de memoria.
- Variable: `RATE_LIMIT_STORE_MAX_ENTRIES`

### Connection Pool MongoDB
Archivo: `config/database.js`
- `maxPoolSize`: 10 conexiones simultaneas.
- `minPoolSize`: 2 conexiones siempre activas.
- `maxIdleTimeMS`: 60000ms (1min) antes de cerrar inactivas.
- Variables: `MONGO_MAX_POOL_SIZE`, `MONGO_MIN_POOL_SIZE`, `MONGO_MAX_IDLE_MS`

### Memory Monitor
Archivo: `tasks/memoryMonitor.js`
- Monitoreo cada 5 minutos via cron.
- Logs: heap usado/total, RSS, external memory.
- Alertas automaticas:
  - Warning si heap > 80%
  - Critico si heap > 90%
- Variable: `MEMORY_MONITOR_CRON`

### Garbage Collector
Archivo: `tasks/garbageCollector.js`
- Fuerza recoleccion de basura cada 30 minutos.
- Requiere flag `--expose-gc` en comando start de Railway.
- Logs: memoria liberada en MB.
- Variable: `GC_CRON`

### Escalamiento
Ver archivo `.env.memory-optimization` para:
- Valores recomendados plan gratuito vs plan pro.
- Instrucciones de configuracion en Railway.
- Ajustes para mayor escala.

---

## 8. Tarea de tasas de cambio
Archivo: `tasks/fetchExchangeRates.js`.
- Cron configurable via `EXCHANGE_RATE_CRON`.
- Evita re-consulta dentro de `EXCHANGE_RATE_RECENT_HOURS`.
- Monedas desde `EXCHANGE_RATE_CURRENCIES` o `AvailableCurrencies`.

Referencia oficial de ExchangeRate-API:
- https://www.exchangerate-api.com/docs/overview

Endpoints usados:
- `GET /v6/<API_KEY>/latest/<BASE>`: obtiene tasas completas para una moneda base.

---

## 9. Autenticacion
Flujo principal:
- `POST /auth/register` => crea usuario y genera codigo.
- `POST /auth/code/verification` => valida codigo.
- `POST /auth/login` => emite refresh token.
- `POST /auth/refresh` => renueva refresh token.
- `POST /auth/logout` => revoca refresh token.

OAuth:
- Google: `/auth/google` y `/auth/google/callback`
- Facebook: `/auth/facebook` y `/auth/facebook/callback`
- Apple: `/auth/apple` (token en body)

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
- `GET /api/health` (publico)
- `GET /api/health/database` (x-api-key requerido)

Ejemplos de uso y respuestas: ver Manual de Usuario.

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
- Optimizacion de memoria: ver seccion 7 y `.env.memory-optimization`.
- Evaluar hosting alterno si Railway limita recursos.

---

## 15. Licencia
MIT

---

## 16. Equipo
🍍LU Devs Team
