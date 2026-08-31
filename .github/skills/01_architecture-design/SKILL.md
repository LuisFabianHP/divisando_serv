---
name: architecture-design
description: "Usar para estructurar APIs y servicios con claridad, modularidad y escalabilidad."
---

# Arquitectura y Diseño Modular

## Objetivo
Mantener una API organizada, mantenible y fácil de extender.

## Cuándo usar esta skill
- Al agregar endpoints, servicios o módulos nuevos.
- Al refactorizar controladores, middlewares o modelos.
- Cuando conviene separar responsabilidades por dominio.

## Reglas principales
- Mantener separación entre rutas, controladores, servicios y modelos.
- Evitar lógica compleja dentro de routers o middlewares.
- Organizar el código por dominio y responsabilidad.
- Diseñar para escalabilidad, observabilidad y pruebas.

## Checklist rápido
- La estructura del backend es clara.
- Los módulos tienen responsabilidad única.
- Se evita lógica duplicada y acoplamiento innecesario.
- El servicio puede crecer sin reescrituras grandes.
