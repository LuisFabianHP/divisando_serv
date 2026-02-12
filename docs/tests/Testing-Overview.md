# 🧪 Testing Overview

Descripción general del entorno, configuración y convenciones usadas en todas las pruebas sistemáticas del API Divisando Serv.

---

## 🌐 Entorno de Testing

### URL Base
```
https://divisando-serv-production.up.railway.app
```

### Plataforma y Stack
- **Runtime:** Node.js
- **Framework:** Express.js
- **Base de datos:** MongoDB Atlas
- **Hosting:** Railway (512MB memoria, auto-deploy desde rama main)
- **Autenticación:** JWT + Refresh Tokens (7 días de expiración)

### Características de Infraestructura
- ✅ Circuit Breaker Pattern para conexión a MongoDB
- ✅ Rate Limiting personalizado con LimitedMemoryStore
- ✅ Graceful Shutdown con SIGTERM/SIGINT handlers
- ✅ Cron tasks para actualización de tasas de cambio
- ✅ Email service integrado para códigos de verificación
- ✅ Comprehensive logging con Winston

---

## 🔐 Headers Requeridos

Todos los requests deben incluir estos headers:

```json
{
  "Content-Type": "application/json",
  "x-api-key": "***REMOVED***",
  "User-Agent": "DivisandoApp/1.0",
  "Authorization": "Bearer {accessToken}" // Solo para endpoints protegidos
}
```

⚠️ **IMPORTANTE:** Nunca expongas la x-api-key en código público

### Explicación

| Header | Propósito | Requerido |
|--------|-----------|----------|
| `Content-Type` | Especifica formato JSON | ✅ Sí |
| `x-api-key` | Validación de cliente API | ✅ Sí |
| `User-Agent` | Identificación del cliente | ✅ Sí |
| `Authorization` | Token JWT para autenticación | ⚠️ Condicional |

---

## 🔑 Credenciales de Testing

### Usuario de Prueba Principal
```
Email:    test@example.com
Password: TestPassword123!
UserId:   (Generated during testing)

⚠️ Usar solo para testing - NO compartir en público
```

### Tokens
- **Access Token:** JWT generado en login (autoriza requests)
- **Refresh Token:** Almacenado en base de datos (renovar o logout)
- **Verification Code:** Enviado por email (verificación de cuenta)

---

## 📊 Estado General de Servicios

### Divisas Soportadas
```
Base currencies: USD, EUR, MXN, CAD
Rates per currency: 166
```

### Rate Limiting Activo
| Tipo | Limite | Ventana |
|------|--------|---------|
| General | 50 requests | 1 minuto |
| Verification | 5 requests | 1 minuto |
| Password Recovery | 3 requests | 5 minutos |
| Resend Code | 3 requests | 10 minutos |

---

## 🛠️ Herramientas Usadas

### PowerShell + Invoke-RestMethod
```powershell
# Ejemplo de request (usar credenciales del .env)
$headers = @{
  "Content-Type" = "application/json"
  "x-api-key" = $env:API_KEY  # Cargar de .env, NO hardcoded
  "User-Agent" = "DivisandoApp/1.0"
}

$body = '{"email":"test@example.com","password":"TestPassword123"}'

$response = Invoke-RestMethod `
  -Uri "https://divisando-serv-production.up.railway.app/auth/login" `
  -Method POST `
  -Headers $headers `
  -Body $body

⚠️ NUNCA hardcodees credenciales. Usa variables de entorno.
```

### Postman (Futuro)
- Colección de requests documentada
- Tests automatizados en JavaScript
- Enviroment variables para tokens
- Colección ejecutable para CI/CD

### Swagger/OpenAPI (Futuro)
- Especificación completa de API
- Documentación interactiva
- Validación automática de requests

---

## 📋 Convenciones de Testing

### Response Codes

| Código | Significado | Ejemplo |
|--------|-------------|---------|
| 200 | OK - Solicitud exitosa | `/auth/login` exitoso |
| 201 | Created - Recurso creado | Usuario registrado |
| 202 | Accepted - Procesamiento asincrónico | Refresh manual de tasas |
| 400 | Bad Request - Datos inválidos | Falta email en registro |
| 401 | Unauthorized - Autenticación fallida | JWT inválido o expirado |
| 403 | Forbidden - Permisos insuficientes | Falta x-api-key |
| 429 | Too Many Requests - Rate limit excedido | Más de 50 req/min |
| 500 | Internal Server Error | Error no capturado |

### Formato de Respuestas

**Exitosa (2xx):**
```json
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "expiresAt": "2026-02-19T07:48:49.342Z"
}
```

**Error (4xx/5xx):**
```json
{
  "error": "Descripción del error visible para el usuario"
}
```

**Rate Limit (429):**
```json
{
  "error": "Demasiadas solicitudes. Intenta nuevamente más tarde.",
  "headers": {
    "Retry-After": "60"
  }
}
```

---

## 🔄 Flujo de Autenticación

```
1. POST /auth/register
   ↓ (Email con código)
   
2. POST /auth/verify-code
   ↓ (Genera tokens)
   
3. POST /auth/login
   ↓ (Retorna accessToken + refreshToken)
   
4. GET /exchange/... (usar accessToken en Authorization header)
   
5. POST /auth/refresh (cuando accessToken expire)
   ↓ (Retorna nuevo accessToken)
   
6. POST /auth/logout (necesita refreshToken)
   ↓ (Borra sesión)
```

---

## 📝 Notas Importantes

- 🔐 **Nunca expongas el x-api-key en código público**
- 🕐 **Refresh tokens expiran en 7 días**
- ⏱️ **Rate limiting se resetea cada minuto**
- 📧 **Códigos de verificación válidos por 15 minutos**
- 🔄 **Las tasas de cambio se actualizan cada hora**
- 💾 **Los tokens se almacenan en MongoDB**
- 🚀 **Railway deploya automáticamente desde rama main**

---

## 📞 Contacto y Referencia

Para más información consulta:
- [Repositorio Principal](https://github.com/LuisFabianHP/divisando_serv)
- [Documentación de Modelos](API-Configuration)
- [Issues y Bugs Conocidos](Known-Issues)

