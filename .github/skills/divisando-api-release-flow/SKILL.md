---
name: divisando-api-release-flow
description: "Usar cuando se pida: subir cambios de API, validar cron, ejecutar pruebas backend, preparar release para Railway, o gestionar PR/merge entre dev-api-task, pruebas y main. Keywords: dev-api-task, pruebas, main, Railway, cron, exchange rates, push, merge, release, test."
---

# Divisando API Release Flow

## Objetivo
Aplicar el modelo de ramas de Divisando API sin promover cambios de testing a desarrollo.

## Cuando usar este skill
- Cuando se pida push/release de backend.
- Cuando se investiguen cron jobs o estado de exchange rates.
- Cuando se pida correr pruebas en rama `pruebas`.
- Cuando se pida promoción a `main` para Railway.

## Flujo operativo
1. Implementar cambios funcionales en dev-api-task.
2. Commit y push en dev-api-task.
3. Evaluar si requiere pruebas en pruebas.
4. Si requiere, pedir confirmacion del usuario (si/no).
5. Si usuario confirma, pasar a pruebas, traer cambios de dev-api-task y ejecutar pruebas.
6. Si falla por logica funcional, corregir en dev-api-task.
7. Si falla por infraestructura de testing, corregir en pruebas.
8. Si pasa, push de evidencia en pruebas.
9. Promover a main desde trabajo validado en dev-api-task.

## Guardrails de ramas
- Nunca promover cambios desde `pruebas` hacia `dev-api-task`.
- `dev-api-task` no debe contener carpeta `tests/` ni configuración de testing.
- Excepcion: ajustes exclusivamente de testing se corrigen en `pruebas` y no se promueven.
- Antes de pasar a `pruebas`, pedir confirmacion explicita del usuario cuando aplique.

## Guardrails
- Nunca promover pruebas -> dev-api-task.
- Evitar temporales en commits.
- Verificar rama activa antes de commit/push.
- Confirmar commit en main cuando sea release para Railway.

## Comandos utiles
- npm test
- git rev-list --left-right --count origin/main...origin/dev-api-task
- git log --oneline --decorate origin/main -n 5
