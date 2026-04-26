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

## Skill asociado

- Skill de flujo operativo/release: `.github/skills/divisando-api-release-flow/SKILL.md`
- Usar ese skill para: validación de cron, secuencia de pruebas, push, promoción a `main` y release de Railway.
- Este archivo (`copilot-instructions.md`) conserva solo reglas obligatorias siempre activas.

## Reglas obligatorias

1. Todo desarrollo funcional se hace en `dev-api-task`.
2. La rama `pruebas` **nunca** es fuente para actualizar `dev-api-task`.
3. Antes de pasar a `pruebas`, el asistente debe evaluar si, bajo criterios prácticos, el cambio requiere pruebas en rama de testing (modificación, mejora o fix).
4. Si el asistente considera que **no** se requieren pruebas, se puede omitir el paso de `pruebas` y los pasos consecuentes del ciclo de testing.
5. Si el asistente considera que **sí** se requieren pruebas, debe informarlo explícitamente y pedir confirmación del usuario (`sí` o `no`) antes de pasar a `pruebas`.
6. Si se confirma ejecutar pruebas, se debe pasar de `dev-api-task` hacia `pruebas`.
7. Si una prueba falla, la corrección vuelve a hacerse en `dev-api-task` y se repite el ciclo de pruebas.
8. Solo `pruebas` puede contener librerías, configuración y referencias adicionales de testing.
9. `dev-api-task` no debe contener carpeta `tests/`, scripts `test`, configuración de Jest ni aliases/referencias a testing.
10. Excepción permitida y obligatoria: si la corrección necesaria está dentro de `tests/` o implica instalar/ajustar librerías/configuración de testing, ese ajuste se realiza directamente en `pruebas`.
11. Los cambios de `tests/` y librerías/configuración de testing hechos en `pruebas` no se promueven hacia `dev-api-task`.
12. Si las pruebas pasan, se permite hacer push en `pruebas` (evidencia de pruebas). Después, se debe volver a `dev-api-task`, revisar los criterios de la tarea actual en Trello y, si están cubiertos, completar la tarea. Tras eso, se crean los commits finales y se envían los cambios a `dev-api-task` en remoto.

## Política de scripts temporales (aplica siempre)

- El asistente no debe crear scripts o archivos temporales de forma innecesaria.
- Si un temporal es estrictamente necesario para depurar o probar, su uso debe ser mínimo y acotado a la tarea.
- Al terminar la prueba o requerimiento, el temporal debe eliminarse inmediatamente.
- Antes de cerrar una tarea, validar que no queden temporales en `git status`.
- No se permite promover scripts temporales a ramas de desarrollo o publicación.

## Restricciones de promoción

- Prohibido promover cambios desde `pruebas` hacia `dev-api-task`.
- La promoción a `main` se hace desde trabajo validado en `dev-api-task`.
