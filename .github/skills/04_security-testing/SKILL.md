---
name: security-testing
description: "Usar para validar la API frente a riesgos de seguridad y orientar la corrección de vulnerabilidades reales."
---

# Pruebas de Seguridad

## Objetivo
Detectar fallas de seguridad reales y convertir los hallazgos en acciones verificables.

## Cuándo usar esta skill
- Antes de release o aprobación de cambios críticos.
- Al añadir nuevas rutas, middleware o integración externa.
- Cuando se quiera validar protección frente a abuso o exposición de datos.

## Reglas principales
- Revisar autenticación, autorización, validación de entradas y manejo de errores.
- Evaluar protección contra abuso, rate limiting y exposición de información.
- Priorizar hallazgos críticos y altos con planes de mitigación claros.
- No cerrar un hallazgo sin evidencia o seguimiento.

## Checklist rápido
- Se revisaron flujos de auth y tokens.
- Se evaluó la exposición de datos sensibles.
- Se revisaron límites de abuso y configuración insegura.
- Los hallazgos se documentan con impacto y remedio.

## Cierre de auditoría y registro en Trello

Al terminar la auditoría, antes de crear o modificar tareas:

- Presentar el resumen de hallazgos con severidad, evidencia, impacto y recomendación.
- Preguntar: **"¿Deseas que registre estas observaciones como tareas en Trello?"**
- Esperar una confirmación explícita. No crear tareas automáticamente.
- Si se confirma, registrar cada observación exclusivamente en el board `Divisando API`, con problema, contexto, solución propuesta y criterios de aceptación. No usar otros boards.
- No incluir secretos, tokens, credenciales ni datos sensibles en tarjetas o comentarios.
