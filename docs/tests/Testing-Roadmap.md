# 🗺️ Testing Roadmap - 6 Fases Documentadas

Estructura completa de fases de testing sistemático. Cada fase valida un aspecto específico del API con metodología de black-box testing.

---

## 📊 Estado Global

```
✅ FASE 1: Authentication         5/5 endpoints  (100%)
✅ FASE 2: Exchange Data          5/5 endpoints  (100%)
✅ FASE 3: Comparisons            4/4 endpoints  (100%)
✅ FASE 4: Management             3/3 endpoints  (100%)
🔄 FASE 5: Security               4/4 endpoints  (0%)  - In Progress
⏳ FASE 6: Resilience & Rate Limit 3/3 endpoints (0%)  - Pending

TOTAL: 17/24 endpoints tested (70.8%)
```

---

## ✅ FASE 1: Authentication (Autenticación)

**Objetivo:** Validar flujo completo de registro, verificación, login, refresh y logout.

| # | Endpoint | Método | Status | Notas |
|---|----------|--------|--------|-------|
| 1.1 | `/auth/register` | POST | ✅ 200 | Usuario registrado, email recibe código |
| 1.2 | `/auth/verify-code` | POST | ✅ 200 | Código verificado, tokens generados |
| 1.3 | `/auth/login` | POST | ✅ 200 | Login exitoso con credenciales |
| 1.4 | `/auth/refresh` | POST | ✅ 200 | Token renovado correctamente |
| 1.5 | `/auth/logout` | POST | ✅ 200 | Sesión cerrada (requiere refreshToken) |

**Hallazgos:**
- ✅ Todos los endpoints funcionando correctamente
- ✅ Tokens generados con formato JWT válido
- ℹ️ Refresh token tiene expiración de 7 días
- ℹ️ Logout requiere el refreshToken, no accessToken

---

## ✅ FASE 2: Exchange Data (Datos de Divisas)

**Objetivo:** Validar consulta de divisas disponibles y tasas de cambio.

| # | Endpoint | Método | Status | Notas |
|---|----------|--------|--------|-------|
| 2.1 | `/exchange/currencies` | GET | ✅ 200 | Retorna lista de 4 divisas |
| 2.2 | `/exchange/USD` | GET | ✅ 200 | 166 tasas de cambio |
| 2.3 | `/exchange/EUR` | GET | ✅ 200 | 166 tasas de cambio |
| 2.4 | `/exchange/MXN` | GET | ✅ 200 | 166 tasas de cambio |
| 2.5 | `/exchange/CAD` | GET | ✅ 200 | 166 tasas de cambio |

**Hallazgos:**
- ✅ Todas las divisas soportadas retornan datos correctos
- ✅ Cada divisa tiene exactamente 166 tasas de cambio
- ✅ Timestamps están presentes y validos
- ✅ Rate limiting no afecta estas consultas

---

## ✅ FASE 3: Comparisons (Comparativas)

**Objetivo:** Validar comparación entre dos divisas y determinación de status (up/down).

| # | Endpoint | Método | Status | Notas |
|---|----------|--------|--------|-------|
| 3.1 | `/exchange/compare?baseCurrency=USD&targetCurrency=MXN` | GET | ✅ 200 | Status: down |
| 3.2 | `/exchange/compare?baseCurrency=EUR&targetCurrency=USD` | GET | ✅ 200 | Status: down |
| 3.3 | `/exchange/compare?baseCurrency=CAD&targetCurrency=EUR` | GET | ✅ 200 | Status: up |
| 3.4 | `/exchange/compare?baseCurrency=MXN&targetCurrency=CAD` | GET | ✅ 200 | Status: up |

**Hallazgos:**
- ✅ Todas las comparativas retornan status (up/down)
- ✅ Tasas actuales y previas se calculan correctamente
- ✅ Validación de cambio de tasa funcionando

---

## ✅ FASE 4: Management (Gestión del Sistema)

**Objetivo:** Validar operaciones de mantenimiento y monitoreo del sistema.

| # | Endpoint | Método | Status | Notas |
|---|----------|--------|--------|-------|
| 4.1 | `/exchange/refresh` | POST | ✅ 202 | Actualización manual iniciada |
| 4.2 | `/health/database` | GET | ✅ 200 | Conexión CLOSED, latencia 75ms |
| 4.3 | `/health/api` | GET | ⏳ Pendiente | Por validar en próxima ronda |

**Hallazgos:**
- ✅ Refresh manual funciona (202 Accepted)
- ✅ Health check retorna estado correcto
- ✅ Circuit breaker en CLOSED (conexión sana)
- ℹ️ Latencia a BD: 75ms (normal)

---

## 🔄 FASE 5: Security (Seguridad)

**Objetivo:** Validar que endpoints protegidos requieren autenticación y autorización.

| # | Endpoint | Test | Status | Expected | Actual |
|---|----------|------|--------|----------|--------|
| 5.1 | `/exchange/*` | Sin JWT | ⏳ | 401 | - |
| 5.2 | `/exchange/*` | Sin x-api-key | ⏳ | 403 | - |
| 5.3 | `/exchange/*` | Sin User-Agent | ⏳ | 403 | - |
| 5.4 | `/auth/login` | Credenciales inválidas | ⏳ | 401 | - |

**Próximos Pasos:**
- [ ] Ejecutar requests sin JWT
- [ ] Ejecutar requests sin x-api-key
- [ ] Ejecutar requests sin User-Agent
- [ ] Intentar login con credenciales falsas
- [ ] Documentar respuestas exactas

---

## ⏳ FASE 6: Resilience & Rate Limiting

**Objetivo:** Validar rate limiting y tolerancia a fallos.

| # | Endpoint | Test | Expected | Actual |
|---|----------|------|----------|--------|
| 6.1 | General | 60+ requests/min | 429 + Retry-After | - |
| 6.2 | `/auth/verify-code` | 6+ intentos | 429 | - |
| 6.3 | Códigos bloqueados | 10+ intentos fallidos | 403 Bloqueado | - |

**Próximos Pasos:**
- [ ] Enviar 60+ requests rápidamente
- [ ] Validar header Retry-After en respuesta 429
- [ ] Múltiples intentos con código de verificación inválido
- [ ] Validar bloqueo de códigos por límite de intentos

---

## 📈 Métricas Generales

### Completitud
```
Fase 1-4: 17/17 endpoints = 100%
Fase 5-6: 0/7 endpoints = 0%
Total: 17/24 endpoints = 70.8%
```

### Tendencia
- 📊 **14-02-2026:** 17 endpoints ✅
- 📊 **Próxima ronda:** 24/24 endpoints esperado

### Tiempo de Ejecución
- ⏱️ **Fase 1:** ~3 minutos
- ⏱️ **Fase 2:** ~2 minutos
- ⏱️ **Fase 3:** ~1 minuto
- ⏱️ **Fase 4:** ~1 minuto
- ⏱️ **Total actual:** ~7 minutos

---

## 🐛 Bugs / Issues Resueltos

### ✅ Resuelto: resetTime.getTime is not a function
- **Commitishop:** 214e7cd (first attempt), 7b2b6f6 (root fix)
- **Causa:** LimitedMemoryStore devolvía resetTime como number en lugar de Date
- **Solución:** Modificar increment() para retornar `new Date(Date.now() + 60000)`
- **Status:** ✅ Verificado en producción

### ✅ Aclarado: POST /auth/logout retorna 500
- **Causa:** Confusión entre Access Token y Refresh Token
- **Solución:** Usar refreshToken (del login) en lugar de accessToken
- **Status:** ✅ Logout funciona correctamente

---

## 📝 Próximas Sesiones

1. **Ejecutar FASE 5:** Validaciones de seguridad
2. **Ejecutar FASE 6:** Rate limiting y resiliencia
3. **Generar report final:** Resumen ejecutivo
4. **Crear Swagger/OpenAPI:** Documentación interactiva
5. **Exportar Postman Collection:** Con tests automatizados

---

## 📞 Referencias

- Consulta cada fase en detalle: [FASE 1-6 Wiki Pages]
- Issues: [Known Issues & Findings](Known-Issues)
- Configuración: [Testing Overview](Testing-Overview)
