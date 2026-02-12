# FASE 5: Security (Validaciones de Seguridad)

**Estado:** 🔄 In Progress (0/4 endpoints)  
**Fecha Estimada:** 12 de Febrero, 2026  
**Duración Estimada:** ~2 minutos  
**Resultado Esperado:** Validar que endpoints protegidos rechacen requests sin autenticación

---

## 🎯 Objetivo

Validar que la seguridad está correctamente implementada: verificar que endpoints requieren autenticación (JWT), API key y User-Agent. Validar respuestas de error apropiadas.

---

## 📋 Endpoints a Probar

### 5.1 GET `/exchange/*` - Sin JWT

**Objetivo:** Verificar que requests sin Authorization header son rechazados

**Setup:**
```powershell
$baseUrl = "https://divisando-serv-production.up.railway.app"

# Headers sin Authorization
$headersNoJWT = @{
  "Content-Type" = "application/json"
  "x-api-key" = "YOUR_API_KEY_HERE"
  "User-Agent" = "DivisandoApp/1.0"
  # NO Authorization header
}
```

**Request:**
```json
GET /exchange/currencies
```

**Resultado Esperado:**
- Status: 401 Unauthorized
- Error: "Autenticación requerida"
- No debe retornar datos

**Status:** ⏳ Por ejecutar

---

### 5.2 GET `/exchange/*` - Sin x-api-key

**Objetivo:** Verificar que requests sin API key son rechazados

**Setup:**
```powershell
# Headers sin x-api-key
$headersNoKey = @{
  "Content-Type" = "application/json"
  # NO x-api-key
  "User-Agent" = "DivisandoApp/1.0"
  "Authorization" = "Bearer $accessToken"
}
```

**Request:**
```json
GET /exchange/currencies
```

**Resultado Esperado:**
- Status: 403 Forbidden
- Error: "API key inválida o no proporcionada"
- No debe retornar datos

**Status:** ⏳ Por ejecutar

---

### 5.3 GET `/exchange/*` - Sin User-Agent

**Objetivo:** Verificar que requests sin User-Agent son rechazados

**Setup:**
```powershell
# Headers sin User-Agent
$headersNoUA = @{
  "Content-Type" = "application/json"
  "x-api-key" = "YOUR_API_KEY_HERE"
  # NO User-Agent
  "Authorization" = "Bearer $accessToken"
}
```

**Request:**
```json
GET /exchange/currencies
```

**Resultado Esperado:**
- Status: 403 Forbidden
- Error: "User-Agent requerido"
- No debe retornar datos

**Status:** ⏳ Por ejecutar

---

### 5.4 POST `/auth/login` - Credenciales Inválidas

**Objetivo:** Verificar que login con contraseña incorrecta es rechazado

**Request:**
```json
POST /auth/login
Content-Type: application/json
x-api-key: YOUR_API_KEY_HERE
User-Agent: DivisandoApp/1.0

{
  "email": "test@example.com",
  "password": "PasswordIncorrect123!"
}
```

**Resultado Esperado:**
- Status: 401 Unauthorized
- Error: "Email o contraseña incorrectos"
- No debe retornar tokens

**Status:** ⏳ Por ejecutar

---

## 📊 Matriz de Validación Esperada

| Test | Endpoint | Missing | Status Esperado | Error Esperado |
|------|----------|---------|-----------------|----------------|
| 5.1 | `/exchange/*` | JWT | 401 | Autenticación requerida |
| 5.2 | `/exchange/*` | API Key | 403 | API key inválida |
| 5.3 | `/exchange/*` | User-Agent | 403 | User-Agent requerido |
| 5.4 | `/auth/login` | Credenciales | 401 | Credenciales incorrectas |

---

## 🧪 Script de Testing

```powershell
$baseUrl = "https://divisando-serv-production.up.railway.app"

# Headers con autenticación completa (referencia)
$headersComplete = @{
  "Content-Type" = "application/json"
  "x-api-key" = "YOUR_API_KEY_HERE"
  "User-Agent" = "DivisandoApp/1.0"
  "Authorization" = "Bearer $accessToken"
}

# Test 5.1: Sin JWT
Write-Output "=== Test 5.1: Sin JWT ==="
try {
  $headersNoJWT = $headersComplete.Clone()
  $headersNoJWT.Remove("Authorization")
  
  $response = Invoke-RestMethod -Uri "$baseUrl/exchange/currencies" -Method GET -Headers $headersNoJWT
  Write-Output "❌ FAILED: Request fue exitoso (esperado 401)"
} catch {
  $status = $_.Exception.Response.StatusCode.Value__
  if ($status -eq 401) {
    Write-Output "✅ PASSED: Status 401 Unauthorized"
  } else {
    Write-Output "⚠️ ISSUE: Status $status (esperado 401)"
  }
}

# Test 5.2: Sin x-api-key
Write-Output "=== Test 5.2: Sin x-api-key ==="
try {
  $headersNoKey = $headersComplete.Clone()
  $headersNoKey.Remove("x-api-key")
  
  $response = Invoke-RestMethod -Uri "$baseUrl/exchange/currencies" -Method GET -Headers $headersNoKey
  Write-Output "❌ FAILED: Request fue exitoso (esperado 403)"
} catch {
  $status = $_.Exception.Response.StatusCode.Value__
  if ($status -eq 403) {
    Write-Output "✅ PASSED: Status 403 Forbidden"
  } else {
    Write-Output "⚠️ ISSUE: Status $status (esperado 403)"
  }
}

# Test 5.3: Sin User-Agent
Write-Output "=== Test 5.3: Sin User-Agent ==="
try {
  $headersNoUA = $headersComplete.Clone()
  $headersNoUA.Remove("User-Agent")
  
  $response = Invoke-RestMethod -Uri "$baseUrl/exchange/currencies" -Method GET -Headers $headersNoUA
  Write-Output "❌ FAILED: Request fue exitoso (esperado 403)"
} catch {
  $status = $_.Exception.Response.StatusCode.Value__
  if ($status -eq 403) {
    Write-Output "✅ PASSED: Status 403 Forbidden"
  } else {
    Write-Output "⚠️ ISSUE: Status $status (esperado 403)"
  }
}

# Test 5.4: Credenciales inválidas
Write-Output "=== Test 5.4: Login con contraseña incorrecta ==="
try {
  $loginBody = '{"email":"test@example.com","password":"WrongPassword123!"}'
  
  $response = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -Headers $headersComplete -Body $loginBody
  Write-Output "❌ FAILED: Login fue exitoso (esperado 401)"
} catch {
  $status = $_.Exception.Response.StatusCode.Value__
  if ($status -eq 401) {
    Write-Output "✅ PASSED: Status 401 Unauthorized"
  } else {
    Write-Output "⚠️ ISSUE: Status $status (esperado 401)"
  }
}
```

---

## 📝 Campos para Rellenar Después de Testing

### Resultados Reales

**Test 5.1 - Sin JWT**
```
Status Recibido: ___________
Error Message: ___________
Resultado: ___________
```

**Test 5.2 - Sin x-api-key**
```
Status Recibido: ___________
Error Message: ___________
Resultado: ___________
```

**Test 5.3 - Sin User-Agent**
```
Status Recibido: ___________
Error Message: ___________
Resultado: ___________
```

**Test 5.4 - Credenciales Inválidas**
```
Status Recibido: ___________
Error Message: ___________
Resultado: ___________
```

---

## 🔒 Validaciones de Seguridad Esperadas

| Mecanismo | Implementado | Esperado |
|-----------|-------------|----------|
| JWT en Authorization | ✅ | Sí |
| API Key en headers | ✅ | Sí |
| User-Agent validation | ✅ | Sí |
| Rate limiting | ✅ | Sí |
| CORS | ⏳ | Por verificar |
| HTTPS | ✅ | Sí |
| Password hashing | ✅ | Sí |

---

## 📋 Checklist de Próxima Ejecución

- [ ] Ejecutar Test 5.1 (sin JWT)
- [ ] Ejecutar Test 5.2 (sin API key)
- [ ] Ejecutar Test 5.3 (sin User-Agent)
- [ ] Ejecutar Test 5.4 (credenciales inválidas)
- [ ] Documentar resultados exactos
- [ ] Validar que todos devuelven status esperado
- [ ] Verificar mensajes de error son claros

---

## 📝 Estado

**FASE 5: 🔄 IN PROGRESS**

Estructura y tests preparados. Próximo paso: ejecutar suite de tests y documentar resultados reales.

**Próxima fase:** [FASE 6 - Resilience](FASE-6-Resilience)

