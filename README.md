# 📌 Documentación del Proyecto - Divisando API

## 📖 Introducción
Divisando API es un servicio backend diseñado para obtener y comparar tasas de cambio entre diferentes monedas. Provee endpoints seguros para recuperar tasas de cambio, realizar comparaciones y manejar autenticación mediante tokens JWT y Refresh Tokens.

## 🛠️ Configuración y Tecnologías
- **Backend:** Node.js con Express.
- **Base de datos:** MongoDB (Atlas o Local con MongoMemoryServer para pruebas).
- **Autenticación:** JSON Web Tokens (JWT) con Refresh Tokens.
- **Seguridad:** HTTPS, API Keys, Rate-Limiting, Validación de User-Agent y CORS.
- **Logs y Monitoreo:** Winston para manejo de logs.
- **Pruebas:** Jest y MongoMemoryServer.

---

## 🔐 Seguridad Implementada

### 1️⃣ HTTPS con Certificados SSL
Toda la comunicación con la API está cifrada mediante HTTPS. Se configuraron certificados SSL autofirmados para desarrollo y se recomienda Let's Encrypt para producción.

### 2️⃣ Autenticación y Autorización
- **JWT Access Tokens** para autenticar usuarios.
- **Refresh Tokens** con rotación para mantener sesiones activas de forma segura.
- **Validación de API Keys** para restringir el acceso.

### 3️⃣ Protección contra ataques
- **Rate-Limiting:** Límite de solicitudes por IP y por endpoint crítico.
- **CORS restringido:** Solo acepta peticiones desde la aplicación móvil autorizada.
- **Validación de User-Agent:** Bloquea accesos no autorizados.

---

## 📊 Endpoints Disponibles

### **Autenticación**
#### `POST /auth/register`
Registra un nuevo usuario.

#### `POST /auth/login`
Autentica un usuario y devuelve un JWT y un Refresh Token.

#### `POST /auth/refresh`
Renueva el Access Token mediante un Refresh Token válido.

#### `POST /auth/logout`
Elimina el Refresh Token del usuario cerrando sesión.

### **Monedas y Tasas de Cambio**
#### `GET /exchange/currencies`
Devuelve la lista de monedas disponibles.

#### `GET /exchange/compare?baseCurrency=USD&targetCurrency=MXN`
Devuelve el valor actual y el anterior de una moneda, con estado `up` o `dw`.

---

## 🔍 Pruebas con Base de Datos en Memoria
Para evitar el consumo innecesario de recursos y realizar pruebas controladas, se implementó **MongoMemoryServer**, permitiendo crear una base de datos temporal con datos de prueba.

### **Generación de Datos de Prueba**
Se desarrolló un script que:
- Inserta datos históricos y actuales con valores aleatorios pero coherentes.
- Permite simular escenarios donde los valores sean iguales para verificar la búsqueda de registros anteriores.
- Funciona dentro de un entorno controlado sin afectar la base de datos real.

Para ejecutar:
```bash
node tests/database/generateTestData.js
```

Para consultar registros:
```bash
node tests/database/showRecords.Test.js
```

Para eliminar datos de prueba:
```bash
node tests/database/clearTestData.js
```

---

## 🚀 Pruebas de Carga y Validación Final
Para garantizar la estabilidad y seguridad del sistema:
1. **Simulación de alto tráfico** con Postman o Artillery.
2. **Revisión de logs** en Winston para detectar anomalías.
3. **Pruebas de endpoints críticos**, asegurando respuestas rápidas y coherentes.

---

## 📌 Conclusión y Siguientes Pasos
El sistema ha sido diseñado con seguridad y escalabilidad en mente. Próximas mejoras incluyen:
- Optimización de consultas en MongoDB.
- Implementación de caché para reducir latencias.
- Integración con proveedores de autenticación externos como Google y Facebook.

📌 **Última actualización:** Enero 2025

---

## 🛠️ Cambios recientes (API de autenticación)

- `POST /auth/password/forgot`: ahora devuelve `{ success: true, message, userId }` cuando se encuentra el usuario, para que el cliente pueda reutilizar `userId` si lo desea.
- `POST /auth/code/verification`: acepta tanto `userId` como `email` en el body; para `account_verification` devuelve `{ success: true, refreshToken, expiresAt }`, y para `password_reset` devuelve `{ success: true, userId, email }` (sin emitir token).
- `POST /auth/password/reset`: ahora devuelve `{ success: true, message }` al restablecer la contraseña correctamente.

Estos cambios están pensados para alinear la API con la UI móvil que reutiliza la pantalla de verificación tanto para registro como para recuperación de contraseña.
