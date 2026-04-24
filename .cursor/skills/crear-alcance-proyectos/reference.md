# Referencia: Plantilla de Alcance de Proyectos

## Plantilla mínima

```markdown
DOCUMENTO DE ALCANCE DEL PROYECTO

Nombre del proyecto: [Nombre]

Cliente: [Cliente]

[Solicitante: nombre] Versión: 1.0

[Subtítulo o descripción breve]

1. Introducción

El presente documento establece el alcance funcional para [descripción del proyecto y contexto].

2. Objetivo del Proyecto

El objetivo principal es:

- Objetivo 1
- Objetivo 2
- Objetivo 3

3. Alcance Funcional

3.1 [Primera área funcional]

[Detalle]

3.2 [Segunda área funcional]

[Detalle]

4. Limitaciones

[El proyecto no incluye / No hace]

5. Alcance Fuera del Proyecto

Se considera fuera de alcance:

- Item 1
- Item 2

6. Entregables

- Entregable 1
- Entregable 2

7. Aceptación

Las partes declaran haber leído, comprendido y aceptado el alcance funcional detallado en el presente documento.

Cualquier modificación o ampliación del presente alcance deberá formalizarse por escrito y contar con la aprobación expresa de ambas partes.

Firmado en _______________, ___ / ___ / _____.

_________________________                    _________________________
EL CLIENTE                                    EL PROVEEDOR
```

## Variante: Bot conversacional

**Alcance funcional típico:**
- 3.1 Identificación de intención
- 3.2 Clasificación (niveles, criterios)
- 3.3 Recolección de datos (formularios, campos)
- 3.4 Derivación (colas, asignación)
- 3.5 Registro de información (CRM, campos almacenados)
- 3.6 Medición de satisfacción (NPS, reglas)

**Secciones adicionales:**
- 4. Reglas Generales de Comportamiento
- 5. Limitaciones del Bot
- 6. Fases del Proyecto (Relevamiento, Diseño, Desarrollo, Pruebas, Producción)

## Variante: Dashboard / Analytics

**Alcance funcional típico:**
- 3.1 Secciones del dashboard (tabla: Sección | Ruta | Descripción)
- 3.2 [Sección A] – KPIs, gráficos, tablas
- 3.3 [Sección B] – KPIs, gráficos, tablas
- 3.N Sistema de filtros (fechas, agentes, etc.)
- 3.N+1 Funcionalidad técnica (APIs, refresco)

**Secciones adicionales:**
- 4. Fuente de Datos (APIs, variables de entorno, campos)
- 5. Limitaciones (sin auth, sin exportación, etc.)

**Formato para visualizaciones:**
```markdown
3.X [Nombre sección] – Visualizaciones

3.X.1 Indicadores clave (KPIs)
- KPI 1
- KPI 2

3.X.2 Gráficos
- Tipo de gráfico: descripción
- Tipo de gráfico: descripción

3.X.3 Tablas
- Columnas: col1, col2, col3. Incluye búsqueda, paginación.
```

## Variante: Integración

**Alcance funcional típico:**
- 3.1 Endpoints consumidos/proveídos
- 3.2 Mapeo de datos
- 3.3 Frecuencia de sincronización
- 3.4 Manejo de errores

**Secciones adicionales:**
- 4. Fuente de Datos
- 5. Limitaciones técnicas

## Frases estándar

**Introducción:**
- "El presente documento establece el alcance funcional para el desarrollo de..."
- "El desarrollo se realizará sobre la plataforma [X], en una cuenta ya existente del CLIENTE."

**Objetivos:**
- "El objetivo principal del [bot/dashboard] es:"
- Lista con viñetas o numeración

**Limitaciones:**
- "El [BOT/Dashboard] no:"
- "No se incluye..."
- "Se considera fuera de alcance:"

**Aceptación:**
- "Las partes declaran haber leído, comprendido y aceptado el alcance funcional detallado en el presente documento correspondiente al desarrollo de [nombre del proyecto]."
- "Cualquier modificación o ampliación del presente alcance deberá formalizarse por escrito y contar con la aprobación expresa de ambas partes."
