---
name: security-by-design
description: "Usar para integrar seguridad desde el inicio en la API, cubriendo auth, autorización, secretos y protección de endpoints."
---

# Seguridad por Diseño

## Objetivo
Asegurar que la API aplique buenas prácticas de seguridad desde el diseño inicial.

## Cuándo usar esta skill
- Al implementar autenticación, JWT, refresh tokens o APIs keys.
- Al proteger rutas sensibles o agregar middleware de seguridad.
- Antes de desplegar cambios críticos.

## Reglas principales
- Validar entradas y parámetros de forma estricta.
- Restringir accesos por rol y contexto.
- Manejar secretos y credenciales sin exponerlos.
- Proteger endpoints críticos con rate limiting y validaciones adecuadas.

## Checklist rápido
- Los endpoints sensibles están protegidos.
- No hay secretos expuestos en logs o respuestas.
- Hay control de autenticación y autorización claro.
- La API sigue prácticas recomendadas de OWASP.
