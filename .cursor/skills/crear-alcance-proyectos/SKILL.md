---
name: crear-alcance-proyectos
description: Crea documentos de alcance de proyectos en español siguiendo estructura formal. Genera alcances para bots, dashboards, integraciones u otros proyectos. Use when the user asks to create an alcance, scope document, documento de alcance, or define project scope.
---

# Crear Alcance de Proyectos

Guía para redactar documentos de alcance funcional en español, estilo formal y contractual.

## Cuándo aplicar

- Usuario pide crear un "alcance", "documento de alcance" o "scope"
- Usuario quiere definir el alcance de un proyecto
- Usuario menciona "alcance-ejemplo" o estructura similar como referencia

## Flujo de trabajo

1. **Obtener contexto**: Nombre del proyecto, cliente, tipo (bot, dashboard, integración, etc.)
2. **Explorar el proyecto**: Si existe código o documentación, revisar para extraer secciones, funcionalidades y visualizaciones reales
3. **Usar la plantilla**: Seguir la estructura de [reference.md](reference.md)
4. **Adaptar al tipo**: Bots → flujos, clasificaciones, derivaciones. Dashboards → secciones, KPIs, gráficos, filtros. Integraciones → endpoints, datos, sincronización
5. **Generar el archivo**: Crear `.md` con el contenido completo

## Estructura base (obligatoria)

```
DOCUMENTO DE ALCANCE DEL PROYECTO

Nombre del proyecto: [nombre]
Cliente: [cliente]
[Solicitante: nombre] Versión: 1.0
[Subtítulo descriptivo]

1. Introducción
2. Objetivo del Proyecto
3. Alcance Funcional (subsecciones 3.1, 3.2, ...)
4. [Reglas / Fuente de datos / Limitaciones según tipo]
5. Alcance Fuera del Proyecto
6. Entregables
7. Aceptación (bloque de firma)
```

## Reglas de redacción

- **Idioma**: Español formal
- **Tono**: Impersonal, declarativo ("El presente documento establece...", "Se considera fuera de alcance...")
- **Listas**: Usar viñetas o numeración según jerarquía
- **Tablas**: Para secciones, rutas, columnas, opciones
- **Subsecciones**: 3.1, 3.2.1, etc. para alcance funcional detallado

## Tipos de proyecto y secciones típicas

| Tipo | Alcance funcional típico | Sección adicional |
|------|--------------------------|-------------------|
| **Bot** | Flujos, identificación de intención, clasificación, derivación, recolección de datos, NPS | Reglas de comportamiento, Limitaciones del bot |
| **Dashboard** | Secciones/vistas, KPIs, gráficos, tablas, filtros, fuentes de datos | Fuente de datos, Limitaciones técnicas |
| **Integración** | Endpoints, mapeo de datos, sincronización, webhooks | Fuente de datos, Limitaciones |

## Checklist antes de entregar

- [ ] Encabezado con nombre, cliente, versión
- [ ] Introducción que contextualiza el proyecto
- [ ] Objetivos como lista numerada
- [ ] Alcance funcional con subsecciones detalladas
- [ ] Limitaciones explícitas
- [ ] Alcance fuera del proyecto
- [ ] Entregables concretos
- [ ] Bloque de aceptación con firmas

## Referencia completa

Para la plantilla detallada, ejemplos de secciones y variantes por tipo de proyecto, ver [reference.md](reference.md).
