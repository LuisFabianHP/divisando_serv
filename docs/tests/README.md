# 📚 Testing Documentation - Divisando Serv

Este directorio contiene la documentación completa del testing sistemático del API Divisando Serv.

## 📖 Contenido

### 🏠 Páginas Principales
- **[Home.md](Home.md)** - Portada en Español
- **[Home-EN.md](Home-EN.md)** - Portada en Inglés

### 🧪 Guías de Testing
- **[Testing-Overview.md](Testing-Overview.md)** - Entorno, convenciones y setup
- **[Testing-Roadmap.md](Testing-Roadmap.md)** - Resumen de 6 fases de testing

### 🔄 Fases Documentadas (6 fases - 24 endpoints)

| Fase | Descripción | Endpoints | Estado |
|------|-------------|-----------|--------|
| [FASE-1-Authentication.md](FASE-1-Authentication.md) | Autenticación y autorización | 5 | ✅ Completada |
| [FASE-2-Exchange-Data.md](FASE-2-Exchange-Data.md) | Consulta de tasas de cambio | 5 | ✅ Completada |
| [FASE-3-Comparisons.md](FASE-3-Comparisons.md) | Comparativas entre divisas | 4 | ✅ Completada |
| [FASE-4-Management.md](FASE-4-Management.md) | Gestión y monitoreo del sistema | 3 | ✅ Completada |
| [FASE-5-Security.md](FASE-5-Security.md) | Validaciones de seguridad | 4 | 🔄 In Progress |
| [FASE-6-Resilience.md](FASE-6-Resilience.md) | Rate limiting y resiliencia | 3 | ⏳ Pendiente |

### 📝 Referencia
- **[API-Configuration.md](API-Configuration.md)** - Headers, URLs, ejemplos de API
- **[Known-Issues.md](Known-Issues.md)** - Bugs resueltos, soluciones y observaciones

---

## 🎯 Estado General

```
✅ Endpoints Probados:    17/24 (70.8%)
✅ Fases Completadas:     4/6
🔄 En Progreso:          1/6  
⏳ Pendientes:           1/6
📅 Última actualización:  12 de Febrero, 2026
```

---

## 🚀 Quick Start

1. Lee [Testing-Overview.md](Testing-Overview.md) para entender el setup
2. Consulta [Testing-Roadmap.md](Testing-Roadmap.md) para visión general
3. Revisa cada fase según necesitet
4. Reporta bugs en [Known-Issues.md](Known-Issues.md)

---

## 🔐 Info Importante

**Base URL:** `https://divisando-serv-production.up.railway.app`

**Headers Requeridos:**
```
Content-Type: application/json
x-api-key: @S3gUr@L0kP@sSw0rD!2o25
User-Agent: DivisandoApp/1.0
Authorization: Bearer {accessToken} (si aplica)
```

---

## 📊 Próximas Sesiones

- Complete FASE 5 (Security Validations)
- Complete FASE 6 (Rate Limiting & Resilience)
- Generate Swagger/OpenAPI specification
- Export Postman Collection with tests
- Setup continuous monitoring

---

**Last Updated:** 2026-02-12  
**Repository:** [divisando_serv](https://github.com/LuisFabianHP/divisando_serv)
