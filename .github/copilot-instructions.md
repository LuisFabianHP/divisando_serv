# Reglas de ramas para `divisando_serv`

Estas reglas son obligatorias para cualquier cambio en este repositorio.

## Modelo de ramas

- `dev-api-task`: rama principal de desarrollo.
- `pruebas`: rama exclusiva para validar pruebas y experimentos de testing.
- `main`: rama de publicación/despliegue.

## Reglas obligatorias

1. Todo desarrollo funcional se hace en `dev-api-task`.
2. La rama `pruebas` **nunca** es fuente para actualizar `dev-api-task`.
3. Para probar cambios, se debe pasar de `dev-api-task` hacia `pruebas`.
4. Si una prueba falla, la corrección vuelve a hacerse en `dev-api-task` y se repite el ciclo de pruebas.
5. Solo `pruebas` puede contener librerías, configuración y referencias adicionales de testing.
6. Si las pruebas pasan, se permite hacer push en `pruebas` (evidencia de pruebas) y también en `dev-api-task` (estado de desarrollo).

## Flujo operativo estándar

1. Cambiar a `dev-api-task` y desarrollar.
2. Commit/push de cambios de desarrollo en `dev-api-task`.
3. Cambiar a `pruebas`.
4. Traer cambios desde `dev-api-task` a `pruebas`.
5. Ejecutar pruebas en `pruebas`.
6. Si falla: volver a `dev-api-task`, corregir y regresar a `pruebas` para reintentar.
7. Si pasa: push de resultados en `pruebas` y mantener `dev-api-task` actualizado.

## Restricciones de promoción

- Prohibido promover cambios desde `pruebas` hacia `dev-api-task`.
- La promoción a `main` se hace desde trabajo validado en `dev-api-task`.

## Checklist rápido antes de cerrar una tarea

- ¿El código funcional está en `dev-api-task`?
- ¿Las pruebas se ejecutaron en `pruebas`?
- ¿`pruebas` no introdujo cambios funcionales que no existan en `dev-api-task`?
- ¿La promoción a `main` viene de cambios validados?
