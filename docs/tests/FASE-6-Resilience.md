# FASE 6: Resilience & Rate Limiting

**Estado:** ⏳ Pendiente (0/3 endpoints)  
**Fecha Estimada:** 12 de Febrero, 2026  
**Duración Estimada:** ~3 minutos  
**Resultado Esperado:** Validar que rate limiting funciona correctamente

---

## 🎯 Objetivo

Validar que los límites de tasa están correctamente implementados y que el servidor retorna respuestas 429 (Too Many Requests) con header Retry-After cuando se excelen los límites.

---

## 📋 Endpoints a Probar

### 6.1 Rate Limiting General

**Objetivo:** Enviar > 50 requests en 1 minuto a endpoint general

**Límite Configurado:**
- 50 requests por minuto
- Ventana deslizante

**Setup:**
```powershell
$baseUrl = "https://divisando-serv-production.up.railway.app"
$headers = @{
  "Content-Type" = "application/json"
  "x-api-key" = "***REMOVED***"
  "User-Agent" = "DivisandoApp/1.0"
  "Authorization" = "Bearer $accessToken"
}

# Enviar 60 requests rápidamente
for ($i = 1; $i -le 60; $i++) {
  try {
    $response = Invoke-RestMethod `
      -Uri "$baseUrl/exchange/currencies" `
      -Method GET `
      -Headers $headers `
      -TimeoutSec 5
    
    if ($i -le 50) {
      Write-Output "Request $i: ✅ 200 OK"
    }
  } catch {
    $status = $_.Exception.Response.StatusCode.Value__
    $retryAfter = $_.Exception.Response.Headers["Retry-After"]
    
    Write-Output "Request $i: ❌ Status $status"
    if ($retryAfter) {
      Write-Output "  → Retry-After: $retryAfter segundos"
    }
  }
}
```

**Resultado Esperado:**
- Requests 1-50: ✅ 200 OK
- Requests 51+: ❌ 429 Too Many Requests
- Header Retry-After presente

**Status:** ⏳ Por ejecutar

---

### 6.2 Rate Limiting de Verificación

**Objetivo:** Intentar verificar código > 5 veces en 1 minuto

**Límite Configurado:**
- 5 requests por minuto
- Endpoint: `/auth/verify-code`

**Setup:**
```powershell
# Intentar verificación 7 veces con código inválido
for ($i = 1; $i -le 7; $i++) {
  try {
    $body = @{
      userId = "698d75c7f10675a1a0b22a47"
      code = "000000"  # Código inválido
      email = "test@example.com"
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod `
      -Uri "$baseUrl/auth/verify-code" `
      -Method POST `
      -Headers $headers `
      -Body $body
    
    Write-Output "Attempt $i: Respuesta recibida"
  } catch {
    $status = $_.Exception.Response.StatusCode.Value__
    Write-Output "Attempt $i: Status $status"
    
    if ($status -eq 429) {
      Write-Output "  → Rate limit alcanzado"
    }
  }
}
```

**Resultado Esperado:**
- Attempts 1-5: 400 Bad Request (código inválido)
- Attempt 6+: 429 Too Many Requests
- Retry-After header presente

**Status:** ⏳ Por ejecutar

---

### 6.3 Bloqueo por Intentos Excesivos

**Objetivo:** Validar que códigos se bloquean después de múltiples intentos fallidos

**Límite Configurado:**
- Max intentos: configurado en modelo
- Bloqueo automático después de exceder

**Setup:**
```powershell
# Intentar verificación 10+ veces
for ($i = 1; $i -le 10; $i++) {
  try {
    $body = @{
      userId = "testuser123"
      code = "invalidcode"
      email = "test@example.com"
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod `
      -Uri "$baseUrl/auth/verify-code" `
      -Method POST `
      -Headers $headers `
      -Body $body
  } catch {
    $status = $_.Exception.Response.StatusCode.Value__
    $errorMsg = $_.ErrorDetails.Message
    
    Write-Output "Attempt $i: Status $status"
    
    if ($status -eq 403) {
      Write-Output "  → Código BLOQUEADO por exceso de intentos"
      Write-Output "  → Message: $errorMsg"
      break
    }
  }
}
```

**Resultado Esperado:**
- Intentos iniciales: 400 Bad Request
- Después de 5-10 intentos: 403 Forbidden (bloqueado)
- Mensaje: "Código bloqueado por exceso de intentos"

**Status:** ⏳ Por ejecutar

---

## 📊 Matriz de Validación Esperada

| Test | Endpoint | Límite | Esperado después de | Status | Retry-After |
|------|----------|--------|---------------------|--------|-------------|
| 6.1 | General | 50/min | >50 requests | 429 | Sí (60s) |
| 6.2 | Verify | 5/min | >5 requests | 429 | Sí (60s) |
| 6.3 | Verify | 10 intentos | 11º intento | 403 | No |

---

## 🧪 Script Completo de Testing

```powershell
$baseUrl = "https://divisando-serv-production.up.railway.app"
$headers = @{
  "Content-Type" = "application/json"
  "x-api-key" = "***REMOVED***"
  "User-Agent" = "DivisandoApp/1.0"
  "Authorization" = "Bearer $accessToken"
}

Write-Output "=== FASE 6: Rate Limiting & Resilience ==="
Write-Output ""

# Test 6.1: Rate Limiting General
Write-Output "Test 6.1: Enviando 60 requests en simultaneo (límite: 50/min)"
$successCount = 0
$rateLimitedCount = 0

foreach ($i in (1..60)) {
  try {
    $response = Invoke-RestMethod `
      -Uri "$baseUrl/exchange/currencies" `
      -Method GET `
      -Headers $headers `
      -TimeoutSec 3
    $successCount++
  } catch {
    $status = $_.Exception.Response.StatusCode.Value__
    if ($status -eq 429) {
      $rateLimitedCount++
      if ($rateLimitedCount -eq 1) {
        Write-Output "✅ Rate limit alcanzado en request $i"
        $retryAfter = $_.Exception.Response.Headers["Retry-After"]
        Write-Output "   Retry-After: $retryAfter segundos"
      }
    }
  }
}

Write-Output "Resultados: $successCount exitosos, $rateLimitedCount rate limited"
Write-Output ""

# Test 6.2: Rate Limiting de Verificación
Write-Output "Test 6.2: Enviando 7 requests a /auth/verify-code (límite: 5/min)"
# ... (código similar)

Write-Output ""
Write-Output "=== Resultados finales ==="
```

---

## 📋 Validaciones que Esperar

### Header Retry-After
```
GET /exchange/currencies (request 51)
Response: 429 Too Many Requests

Headers:
  Retry-After: 60

Significado: Reintentar después de 60 segundos
```

### Error Response
```json
{
  "error": "Demasiadas solicitudes. Intenta nuevamente.",
  "retryAfter": 60
}
```

---

## 🔄 Comportamiento Esperado

1. **Primeros 50 requests:** Exitosos (200 OK)
2. **Request 51:** Rechazado (429 Too Many Requests)
3. **Siguiente ventana (>1 min):** Vuelve a permitir requests

4. **Verificación (5/min):** 
   - Requests 1-5: Procesados
   - Request 6: Rechazado (429)

5. **Bloqueo por intentos:**
   - Intentos fallidos se cuentan
   - Después de 10 intentos: 403 Forbidden (bloqueado)
   - Requiere nuevo código

---

## 🧪 Validación de Circuit Breaker

También verificar que el Circuit Breaker funciona:

```powershell
# Simular falla en BD (si es posible)
# Verificar que detiene requests rápidamente
# Verificar que se recupera automáticamente
```

---

## 📝 Campos para Rellenar Después de Testing

### Test 6.1 Results
```
Requests exitosos: ___
Rate limited: ___
Response status: ___
Retry-After header: ___
Resultado: ___________
```

### Test 6.2 Results
```
Requests antes de límite: ___
Status en límite: ___
Resultado: ___________
```

### Test 6.3 Results
```
Intentos antes de bloqueo: ___
Status cuando bloqueado: ___
Error message: ___________
Resultado: ___________
```

---

## 🔒 Mecanismos de Protección Validados

- [ ] Rate limiting está activo
- [ ] Retry-After header presente
- [ ] HTTP 429 retornado apropiadamente
- [ ] Bloqueo por intentos fallidos
- [ ] Circuit breaker respondiendo

---

## 📋 Checklist de Próxima Ejecución

- [ ] Preparar ambiente de testing
- [ ] Obtener access token válido
- [ ] Ejecutar Test 6.1 (general rate limiting)
- [ ] Ejecutar Test 6.2 (verify rate limiting)
- [ ] Ejecutar Test 6.3 (attempt blocking)
- [ ] Documentar resultados completos
- [ ] Validar Retry-After headers
- [ ] Generar reporte final

---

## 📝 Estado

**FASE 6: ⏳ PENDING**

Tests preparados y scripts listos. Próximo paso: ejecutar suite de stressing y documentar resiliencia del sistema.

**Conclusión de ciclo:** Después de esta fase, todas las 24 endpoints estarán validadas.

---

## 🚀 Próximo Ciclo

Una vez completada FASE 6:
1. Generar reporte ejecutivo
2. Crear Swagger/OpenAPI spec
3. Exportar Postman Collection
4. Definir SLA de monitoreo
5. Planificar testing periódico
