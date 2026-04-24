DOCUMENTO DE ALCANCE DEL PROYECTO

Nombre del proyecto: Dashboard Nosvamoos

Cliente: Nosvamoos

Versión: 1.0

Dashboard de Analytics para Visualización de Conversaciones

1. Introducción

El presente documento establece el alcance funcional para el desarrollo del dashboard de analytics denominado "Dashboard Nosvamoos", desarrollado a medida con código propio (no plantilla genérica) para la visualización de datos de conversaciones.

El dashboard consume datos en tiempo cuasi-real de la plataforma Botmaker mediante su API v2.0, permitiendo el análisis de conversaciones, ventas, agentes y destinos. El desarrollo se realiza con Next.js (App Router), shadcn/ui, Recharts y Tailwind CSS.

2. Objetivo del Proyecto

El objetivo principal del dashboard es:

Centralizar la visualización de métricas de conversaciones y ventas en una única interfaz web.

Permitir el análisis de datos por fechas, agentes, tipificaciones y etiquetas mediante filtros configurables.

Facilitar el seguimiento del rendimiento comercial y de los agentes de atención.

Ofrecer vistas detalladas de destinos consultados, tipos de paquete y composición de viajeros.

Proporcionar acceso directo a las conversaciones individuales para su consulta y auditoría.

3. Alcance Funcional

3.1 Secciones del Dashboard

El dashboard está organizado en cinco secciones principales, accesibles desde el menú lateral:

| Sección | Ruta | Descripción |
|---------|------|-------------|
| Vista General | /dashboard | Resumen consolidado de conversaciones, ventas y métricas de agentes |
| Ventas | /ventas | Análisis de ventas, conversión y rendimiento comercial |
| Agentes | /agentes | Métricas y rendimiento por agente |
| Destinos | /destinos | Análisis de destinos, paquetes y composición de viajeros |
| Conversaciones | /conversaciones | Listado y búsqueda de conversaciones individuales |

3.2 Vista General – Visualizaciones

3.2.1 Indicadores clave (KPIs)

Total conversaciones.

Monto total ventas.

Conversaciones cerradas.

Tiempo promedio de primera respuesta.

3.2.2 Gráficos y visualizaciones

Gráfico de área: evolución de conversaciones en el tiempo (granularidad por hora o por día según el rango de fechas seleccionado).

Gráfico de barras: top 8 destinos más consultados.

Gráfico circular: distribución por canal (WhatsApp, etc.).

Gráfico de barras: sesiones por agente (top 8).

Heatmap: horarios de contacto (hora del día x día de la semana).

Calendario mensual: conversaciones por día del mes.

Mapa: distribución geográfica por país de origen.

3.3 Ventas – Visualizaciones

3.3.1 Indicadores clave (KPIs)

Tasa de conversión (ventas / chats totales).

Monto total.

Ticket promedio.

Ventas cerradas.

Promedio de pasajeros por venta.

Promedio de días de viaje.

3.3.2 Tablas de distribución

Tipificaciones de cierre: distribución de tipificaciones de cierre de conversación.

Etiquetas: etiquetas más frecuentes en conversaciones.

Tipo de paquete: participación por tipo de paquete.

3.3.3 Gráficos

Gráfico de barras: top agentes por ventas (8).

Gráfico de barras: top destinos vendidos (8).

Gráfico de área: evolución de ventas en el tiempo.

3.3.4 Tabla detallada

Tabla de ventas con columnas: cliente, destino, monto, agente, tipo de paquete, fecha de viaje, número de proforma, link a conversación en Botmaker, entre otras. Incluye búsqueda por texto y paginación.

3.4 Agentes – Visualizaciones

3.4.1 Indicadores clave (KPIs)

Conversaciones cerradas (total).

Tiempo promedio de primera respuesta.

Tiempo promedio de atención.

Conversaciones en espera.

3.4.2 Tabla de agentes

Métricas por agente: nombre, cola, conversaciones cerradas, abiertas, en espera, tiempo de primera respuesta, tiempo de atención, transferencias entrantes/salientes, tipificaciones más frecuentes, estado online.

3.5 Destinos – Visualizaciones

3.5.1 Indicadores clave (KPIs)

Destinos consultados (cantidad única).

Promedio de días de viaje.

Promedio de pasajeros.

Total de consultas.

3.5.2 Gráficos

Gráfico de barras: top destinos consultados (10).

Gráfico circular: tipos de paquete.

Gráfico de barras: origen de viajeros (8 países).

Composición familiar: distribución adultos / niños.

Duración del viaje: distribución de días de viaje.

3.5.3 Tabla de destinos

Tabla con detalle de destinos consultados y métricas asociadas.

3.6 Conversaciones – Funcionalidad

Tabla paginada con carga incremental ("Cargar más").

Búsqueda por texto: cliente, destino, agente, tipificación, etiquetas, identificador externo, entre otros.

Columnas: fecha, canal, cliente, agente, tipificación, mensajes de agente, mensajes de bot, tiempo de primera respuesta, link a conversación en Botmaker.

Filtros adicionales: agente, tipificación, etiqueta.

3.7 Sistema de Filtros (común a todas las secciones)

3.7.1 Filtro de fechas

Presets disponibles: Hoy, Ayer, Semana (últimos 7 días), Mes, Personalizado.

Personalizado: selector de rango de fechas con hora desde y hora hasta.

Zona horaria: America/Asuncion.

3.7.2 Filtros adicionales (donde aplique)

Agente: selector desplegable con lista de agentes presentes en los datos.

Tipificación: selector desplegable con tipificaciones de cierre.

Etiqueta: selector desplegable con etiquetas de conversación.

3.7.3 Exclusiones automáticas

Chats de prueba: contactos y tipificaciones identificados como de prueba son excluidos automáticamente de todas las visualizaciones.

3.8 Funcionalidad Técnica

Botón de refresco global en la barra superior para recargar datos en todas las secciones visibles.

Rutas API proxy internas: /api/chats, /api/agents, /api/agent-metrics, /api/messages (el token de acceso a Botmaker permanece en el servidor).

Paginación cursor-based para consumo de APIs Botmaker.

4. Fuente de Datos

El dashboard obtiene sus datos exclusivamente de:

Botmaker API v2.0: endpoints de chats, agent-metrics, agents y messages.

Token de acceso configurado en variable de entorno BOTMAKER_ACCESS_TOKEN.

Datos extraídos de variables de chat configuradas en Botmaker: nombre_cliente, destino_viaje, monto_venta, tipo_paquete, fecha_viaje, cantidad_dias, cantidad_pasajeros, cantidad_adultos, cantidad_ninos, numero_proforma, origen, entre otras.

5. Limitaciones

El dashboard no incluye:

Autenticación de usuarios ni control de acceso por roles (el acceso depende de la configuración del despliegue).

Exportación de datos a Excel, CSV u otros formatos.

Reportes programados ni notificaciones automáticas.

Los datos se presentan en tiempo cuasi-real, dependiendo de la disponibilidad y latencia de la API Botmaker.

Límite interno de paginación: máximo 200 páginas por solicitud de datos.

6. Alcance Fuera del Proyecto

Se considera fuera de alcance:

Desarrollo de bots o flujos conversacionales en la plataforma Botmaker.

Integración con CRMs (Zoho, Salesforce, etc.) u otros sistemas externos.

Módulo de usuarios, permisos o roles dentro del dashboard.

Aplicación móvil nativa.

Webhooks o automatizaciones en tiempo real basadas en eventos de Botmaker.

7. Entregables

Código fuente del dashboard (proyecto Next.js).

Documentación de despliegue y configuración.

Especificación de variables de entorno requeridas.

Dashboard operativo en el entorno acordado (ej. Vercel, servidor propio).

8. Aceptación

Las partes declaran haber leído, comprendido y aceptado el alcance funcional detallado en el presente documento correspondiente al desarrollo del Dashboard Nosvamoos.

Cualquier modificación o ampliación del presente alcance deberá formalizarse por escrito y contar con la aprobación expresa de ambas partes.

Firmado en _______________, ___ / ___ / _____.

_________________________                    _________________________
EL CLIENTE                                    EL PROVEEDOR
