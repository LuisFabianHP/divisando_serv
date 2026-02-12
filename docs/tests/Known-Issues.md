# 🐛 Known Issues & Findings

Registro de bugs encontrados, soluciones aplicadas y observaciones importantes durante testing.

---

## ✅ Issues Resueltos

### 1. resetTime.getTime is not a function

**Status:** ✅ RESUELTO  
**Fecha Reportada:** 12 de Febrero, 2026  
**Severidad:** 🔴 CRÍTICA (Production)  

**Descripción:**
```
Error: resetTime.getTime is not a function
Location: Rate limiter middleware
Frequency: Constantemente en Railway logs
Impact: Rate limiting no funciona, genera cascada de errores 500
```

**Root Cause:**
```javascript
// ❌ INCORRECTO
const record = { totalHits: 0, resetTime: Date.now() + 60000 }; // === number
// express-rate-limit espera: resetTime.getTime()

// ✅ CORRECTO
const record = { totalHits: 0, resetTime: new Date(Date.now() + 60000) }; // === Date
```

**Soluciones Intentadas:**
1. ❌ Agregar type checking en handlers (commit 214e7cd)
   - Parcial fix, pero no resolvía el root cause
   
2. ✅ Modificar LimitedMemoryStore para retornar Date objects (commit 7b2b6f6)
   - Fix correcto y permanente

**Commits:**
- `214e7cd`: "fix(rate-limit): corregir resetTime.getTime is not a function"
- `7b2b6f6`: "fix(rate-limit): corregir LimitedMemoryStore para devolver Date en resetTime"

**Cambios Aplicados:**
```javascript
// middlewares/rateLimiter.js - LimitedMemoryStore class
increment(key, options = {}) {
  const record = this.hits.get(key) || {
    totalHits: 0,
    resetTime: new Date(Date.now() + 60000)  // Changed to new Date()
  };
  record.totalHits = (record.totalHits || 0) + 1;
  this.hits.set(key, record);
  return { totalHits: record.totalHits, resetTime: record.resetTime };
}
```

**Verificación en Producción:**
- ✅ Todos los endpoints devuelven 200/202 OK
- ✅ Rate limiting funciona correctamente
- ✅ No hay errores 500 en logs
- ✅ Tasas de cambio se actualizan sin problemas

**Lecciones Aprendidas:**
- Custom store implementations deben coincidir exactamente con la interfaz esperada
- express-rate-limit espera objects con método .getTime()
- Important respetar tipos de datos esperados por librerías

---

### 2. POST /auth/logout retorna 500

**Status:** ✅ ACLARADO  
**Fecha Reportada:** 12 de Febrero, 2026  
**Severidad:** 🟡 MEDIUM  

**Descripción:**
```
POST /auth/logout
Status: 500 Internal Server Error
Error: "Algo salió mal. Por favor, intenta nuevamente."
```

**Causa Raíz:**
No era un error de código. El problema era confusión entre:
- **Access Token**: Usado para autorizar requests OAuth (Authorization header)
- **Refresh Token**: Usado para renovar tokens y para logout (body parameter)

**Detalle:**
```javascript
// Usuario estaba enviando Access Token en body
POST /auth/logout
Body: { "refreshToken": "{accessToken}" }  // ❌ INCORRECTO

// Debería enviar Refresh Token
POST /auth/logout
Body: { "refreshToken": "{refreshToken}" }  // ✅ CORRECTO
```

**Verificación:**
- ✅ Con refreshToken correcto: 200 OK
- ✅ Sesión se cierra correctamente
- ✅ Código está funcionando como se diseñó

**Impacto:**
- Bajo (confusión de cliente, no bug de servidor)
- Requiere documentación clara en API

**Recomendación:**
- Actualizar API docs con claridad respecto a tipos de tokens
- Considerar renombrar parameter o agregar validación más clara

---

## ⚠️ Observaciones y Mejoras Sugeridas

### 1. Rate Limiting - LimitedMemoryStore

**Observación:**
La implementación de LimitedMemoryStore usa memoria en RAM. En ambientes con restricciones de memoria (Railway 512MB), esto puede ser un problema con alto traffic.

**Impacto Actual:**
- ✅ Funciona correctamente en testing
- ⚠️ Escalabilidad limitada

**Sugerencias Futuras:**
1. Considerar Redis para store distribuido
2. Implementar TTL automático más agresivo
3. Monitorear uso de memoria en producción

---

### 2. Error Handling - Mensajes Genéricos

**Observación:**
Algunos errores retornan mensajes muy genéricos ("Algo salió mal"):
```json
{
  "error": "Algo salió mal. Por favor, intenta nuevamente."
}
```

**Impacto:**
- ✅ Seguridad (no expone detalles internos)
- ⚠️ UX (cliente no sabe qué pasó)

**Recomendación:**
- Mantener genéricos en producción para seguridad
- Agregar error codes específicos para debugging
- Mejorar documentación de códigos de error

---

### 3. JWT Token Expiration

**Observación:**
- Access Token: ~15 minutos (corta vida)
- Refresh Token: 7 días (larga vida)

**Estado:**
- ✅ Correcto (buena práctica de seguridad)
- ✅ Balanceado entre seguridad y UX

---

### 4. Circuit Breaker - MongoDB

**Observación:**
Circuit breaker está en estado CLOSED (conexión normal). Nunca ha necesitarse activarse.

**Estado:**
- ✅ Bien configurado
- ✅ BD muy estable (latencia 75ms)

**Recomendación:**
- Monitorear en próximas semanas
- Ajustar thresholds si es necesario

---

## 📋 Testing Environment Issues

### Ninguno Reportado

**Estado:** ✅ Todo el environment funciona correctamente

---

## 🔍 Performance Observations

### Response Times
- General: < 200ms
- Health check: < 100ms
- Exchange data: < 500ms
- All within acceptable limits ✅

### Database Latency
- Observed: 75ms
- Expected: < 100ms
- Status: ✅ Excellent

### Memory Usage
- No issues observed
- Monitor in production for LimitedMemoryStore impact

---

## 📊 Bugs por Severidad

### 🔴 CRÍTICA (Impacta Producción)
1. ~~resetTime.getTime is not a function~~ ✅ RESUELTO

### 🟡 MEDIA (Impacta Features)
1. POST /auth/logout confusión de tokens (documentación, no código)

### 🟢 BAJA (Minor Issues)
- Ninguno reportado

### 💡 MEJORAS SUGERIDAS
1. Redis para rate limiting distribuido
2. Error codes específicos para debugging
3. Documentación mejorada de tipos de tokens

---

## 🎯 Recomendaciones de Próximas Sesiones

### Testing Adicional
- [ ] Ejecutar FASE 5 - Security validation
- [ ] Ejecutar FASE 6 - Rate limiting stress test
- [ ] Validar CORS headers
- [ ] Test de concurrencia alta

### Improvements
- [ ] Documentar API con OpenAPI/Swagger
- [ ] Crear Postman Collection con tests
- [ ] Implementar better error codes
- [ ] Considerar Redis para rate limiting

### Monitoreo
- [ ] Setup alerts en Railway
- [ ] Monitorear memory usage
- [ ] Track response times
- [ ] Log analysis regularmente

---

## 📝 Histórico de Cambios

| Fecha | Issue | Status | Commit |
|-------|-------|--------|--------|
| 2026-02-12 | resetTime.getTime error | ✅ Resuelto | 7b2b6f6 |
| 2026-02-12 | logout confusion | ✅ Aclarado | - |

---

## 📞 Contacto y Referencia

Para más información:
- GitHub: [divisando_serv](https://github.com/LuisFabianHP/divisando_serv)
- Railway: [Dashboard](https://railway.app)
- Issues: [GitHub Issues](https://github.com/LuisFabianHP/divisando_serv/issues)

**Última actualización:** 2026-02-12
