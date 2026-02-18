# 📚 Documentación de Testing - Divisando Serv

Bienvenido a la wiki oficial de testing y documentación del backend **Divisando Serv**. Esta wiki documenta todos los procesos de calidad, pruebas sistemáticas y validaciones del API en entorno de producción (Railway).

---

## 🎯 Objetivos de esta Wiki

- 📋 Documentar todas las fases de testing sistemático
- ✅ Registrar resultados y hallazgos de pruebas
- 🐛 Rastrear bugs identificados y soluciones aplicadas
- 🔒 Validar estándares de seguridad y tasa de límites
- 📊 Mantener histórico de cambios y deployments
- 🚀 Servir como referencia para futuros sprints de QA

---

## 📖 Contenido Principal

### 🧪 Testing & QA
- **[Testing Overview](Testing-Overview)** - Entorno, convenciones y configuración
- **[Testing Roadmap](Testing-Roadmap)** - 6 fases de pruebas documentadas

### 🔄 Fases de Testing
- **[FASE 1: Authentication](FASE-1-Authentication)** - Registro, login, refresh, logout
- **[FASE 2: Exchange Data](FASE-2-Exchange-Data)** - Consulta de divisas y tasas
- **[FASE 3: Comparisons](FASE-3-Comparisons)** - Comparativas entre divisas
- **[FASE 4: Management](FASE-4-Management)** - Refresh manual y salud del sistema
- **[FASE 5: Security](FASE-5-Security)** - Validaciones de seguridad y autenticación
- **[FASE 6: Resilience](FASE-6-Resilience)** - Rate limiting y tolerancia a fallos

### 📝 Referencia
- **[Known Issues & Findings](Known-Issues)** - Bugs, soluciones y observaciones
- **[API Configuration](API-Configuration)** - Headers, URLs base, ejemplos

---

## 📊 Estado General de Testing

| Fase | Descripción | Estado | Endpoints | Completitud |
|------|-------------|--------|-----------|------------|
| 1 | Authentication | ✅ Completada | 5/5 | 100% |
| 2 | Exchange Data | ✅ Completada | 5/5 | 100% |
| 3 | Comparisons | ✅ Completada | 4/4 | 100% |
| 4 | Management | ⚠️ Parcial | 3/3 | 100% |
| 5 | Security | 🔄 In Progress | 4/4 | 0% |
| 6 | Resilience | ⏳ Pendiente | 3/3 | 0% |

**Total: 17/24 endpoints probados (70.8%)**

---

## 🔧 Información Técnica

**Entorno de Validación:**
- 🌐 **URL Base:** `https://divisando-serv-production.up.railway.app`
- 📦 **Plataforma:** Railway (Node.js, Express, MongoDB Atlas)
- 🗄️ **Base de datos:** MongoDB Atlas
- 🔐 **Autenticación:** JWT + Refresh Tokens
- ⏱️ **Rate Limiting:** Activo (50 req/min general, 5/min verificación)

**Última Actualización:**
- 📅 **Fecha:** 12 de Febrero, 2026
- 🔍 **Status:** Todos los endpoints funcionando correctamente
- ✨ **Fix Reciente:** LimitedMemoryStore (resetTime type issue)

---

## 📚 Convenciones y Estándares

### Headers Requeridos
```
Content-Type: application/json
x-api-key: ***REMOVED***
User-Agent: DivisandoApp/1.0
Authorization: Bearer {accessToken} (si aplica)

⚠️ IMPORTANTE: Nunca expongas x-api-key en código público
```

### Respuestas Estándar
- ✅ **200 OK** - Exitoso
- ✅ **202 Accepted** - Aceptado (procesamiento asincrónico)
- ❌ **400 Bad Request** - Datos inválidos
- ❌ **401 Unauthorized** - Falta autenticación
- ❌ **403 Forbidden** - Acceso denegado
- ❌ **429 Too Many Requests** - Rate limit excedido
- ❌ **500 Internal Server Error** - Error del servidor

### Credenciales de Testing
```
Email: test@example.com
Password: TestPassword123! (EN REALIDAD: Consultar .env local)
UserId: (Generado durante testing)

⚠️ NUNCA compartas credenciales reales en documentación pública
```

---

## 🚀 Quick Links

- 🌍 [Versión en Inglés](Home-EN)
- 📖 [API Specification (Pendiente - Swagger/OpenAPI)](https://example.com)
- 🔗 [Postman Collection (Pendiente)](https://example.com)
- 📊 [Railway Dashboard](https://railway.app)
- 🐛 [GitHub Issues](https://github.com/LuisFabianHP/divisando_serv/issues)

---

## 📝 Notas

Esta wiki está bajo control de versiones y se actualiza regularmente con resultados de testing. Para contribuir, consulta el repositorio principal: [divisando_serv](https://github.com/LuisFabianHP/divisando_serv)

**Última actualización:** 2026-02-12

