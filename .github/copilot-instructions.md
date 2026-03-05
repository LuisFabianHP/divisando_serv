# Reglas de ramas para `divisando_serv`

Estas reglas son obligatorias para cualquier cambio en este repositorio.

## Rutas oficiales del proyecto

- Ruta absoluta de este repo: `D:\Proyectos\DivisandoApp\divisando_serv`
- Usar siempre esta ruta como base para comandos, scripts y navegación.
- No asumir rutas alternativas ni derivarlas por nombre similar.

## Contexto obligatorio al iniciar

- Al iniciar la lectura de estas instrucciones, también se debe hacer una lectura rápida del README del proyecto para tomar contexto funcional.
- Lectura rápida requerida: `D:\Proyectos\DivisandoApp\divisando_serv\README.md`

## Modelo de ramas

- `dev-api-task`: rama principal de desarrollo.
- `pruebas`: rama exclusiva para validar pruebas y experimentos de testing.
- `main`: rama de publicación/despliegue.

## Reglas obligatorias

1. Todo desarrollo funcional se hace en `dev-api-task`.
2. La rama `pruebas` **nunca** es fuente para actualizar `dev-api-task`.
3. Antes de pasar a `pruebas`, el asistente debe evaluar si, bajo criterios prácticos, el cambio requiere pruebas en rama de testing (modificación, mejora o fix).
4. Si el asistente considera que **no** se requieren pruebas, se puede omitir el paso de `pruebas` y los pasos consecuentes del ciclo de testing.
5. Si el asistente considera que **sí** se requieren pruebas, debe informarlo explícitamente y pedir confirmación del usuario (`sí` o `no`) antes de pasar a `pruebas`.
6. Si se confirma ejecutar pruebas, se debe pasar de `dev-api-task` hacia `pruebas`.
7. Si una prueba falla, la corrección vuelve a hacerse en `dev-api-task` y se repite el ciclo de pruebas.
8. Solo `pruebas` puede contener librerías, configuración y referencias adicionales de testing.
9. Si las pruebas pasan, se permite hacer push en `pruebas` (evidencia de pruebas). Después, se debe volver a `dev-api-task`, revisar los criterios de la tarea actual en Trello y, si están cubiertos, completar la tarea. Tras eso, se crean los commits finales y se envían los cambios a `dev-api-task` en remoto.

## Política de scripts temporales (aplica siempre)

- El asistente no debe crear scripts o archivos temporales de forma innecesaria.
- Si un temporal es estrictamente necesario para depurar o probar, su uso debe ser mínimo y acotado a la tarea.
- Al terminar la prueba o requerimiento, el temporal debe eliminarse inmediatamente.
- Antes de cerrar una tarea, validar que no queden temporales en `git status`.
- No se permite promover scripts temporales a ramas de desarrollo o publicación.

## Flujo operativo estándar

1. Cambiar a `dev-api-task` y desarrollar.
2. Commit/push de cambios de desarrollo en `dev-api-task`.
3. Evaluar si el cambio requiere pruebas en `pruebas` bajo criterios prácticos.
4. Si no requiere pruebas: documentar la decisión y continuar en `dev-api-task` con cierre de tarea.
5. Si requiere pruebas: informar al usuario y pedir confirmación (`sí` o `no`) para continuar.
6. Si el usuario confirma `sí`: cambiar a `pruebas`.
7. Traer cambios desde `dev-api-task` a `pruebas`.
8. Ejecutar pruebas en `pruebas`.
9. Si falla: volver a `dev-api-task`, corregir y regresar a `pruebas` para reintentar.
10. Si pasa: push de resultados en `pruebas` y mantener `dev-api-task` actualizado.

## Restricciones de promoción

- Prohibido promover cambios desde `pruebas` hacia `dev-api-task`.
- La promoción a `main` se hace desde trabajo validado en `dev-api-task`.

## Checklist rápido antes de cerrar una tarea

- ¿El código funcional está en `dev-api-task`?
- ¿Se evaluó explícitamente si las pruebas en `pruebas` eran necesarias?
- Si eran necesarias: ¿las pruebas se ejecutaron en `pruebas`?
- Si no eran necesarias: ¿quedó documentada la justificación práctica para omitirlas?
- ¿`pruebas` no introdujo cambios funcionales que no existan en `dev-api-task`?
- ¿La promoción a `main` viene de cambios validados?
