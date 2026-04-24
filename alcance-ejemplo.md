DOCUMENTO DE ALCANCE DEL PROYECTO 

Nombre del proyecto: Asistente virtual Post-venta  

Cliente: Fortaleza SAE 

Solicitante: Sofía Manzoni Versión: 1.0 

Desarrollo Línea Adicional – Bot “Pos-venta” 

1. Introducción 

El presente documento establece el alcance funcional para el desarrollo de implementación del asistente virtual denominado “Post-venta”, el cual será incorporado como una nueva línea operativa dentro del ecosistema actual del CLIENTE. 

El desarrollo se realizará sobre la plataforma Botmaker, en una cuenta ya existente del CLIENTE, utilizando un nuevo número de WhatsApp Business Plataforma destinado exclusivamente a la gestión de reclamos y consultas post-venta. 

2. Objetivo del Proyecto 

El objetivo principal del bot “Pos-venta” es: 

Identificar si el usuario desea realizar un reclamo o si su consulta corresponde a otra naturaleza. 

Clasificar automáticamente el nivel de urgencia del reclamo (Nivel 1, 2 o 3), conforme a los parámetros formales y previamente definidos por el CLIENTE. 

Recopilar información estructurada del usuario mediante WhatsApp Flow. 

Derivar automáticamente la conversación a una única cola de atención para gestión por parte de un asesor. 

Medir la satisfacción del usuario una vez confirmado que el inconveniente fue solucionado. 

El bot no resolverá reclamos de manera autónoma, sino que actuará como sistema de identificación, clasificación y derivación inteligente. 

3. Alcance Funcional 

3.1 Identificación de Intención 

El bot: 

Detectará mediante IA si el mensaje del usuario corresponde a: 

a) Reclamo. 

b) Consulta general u otro motivo. 

En caso de no tratarse de reclamo, la conversación será derivada igualmente a la misma cola de atención establecida. 

3.2 Clasificación de Nivel de Urgencia 

En caso de reclamo: 

El bot clasificará automáticamente el caso en: 

Nivel 1 

Nivel 2 

Nivel 3 

La clasificación se realizará en base a criterios formales y documentados entregados por el CLIENTE. 

La clasificación: 

No modificará colas automáticamente. 

No generará notificaciones adicionales por correo ni WhatsApp interno. 

Servirá como información visible para el asesor que gestione el caso. 

3.3 Recolección de Datos – WhatsApp Flow 

El bot utilizará formularios estructurados (WhatsApp Flow) para recopilar exclusivamente los siguientes datos: 

Nombre 

Edificio 

Piso 

Numeración 

No se contempla la solicitud de datos adicionales dentro del alcance actual. 

3.4 Derivación 

Todas las conversaciones serán derivadas a una única cola de atención. 

La asignación al asesor será automática, conforme a la configuración de distribución activa en la plataforma. 

 

3.5 Registro de Información 

El bot almacenará la siguiente información en Zoho CRM: 

Nombre del usuario 

Edificio 

Piso 

Numeración 

Clasificación de urgencia (si aplica) 

Fecha y hora de ingreso 

ID de reclamo 

Estado del reclamo 

Link de conversación 

No se incluye envío automático de notificaciones por correo. 

3.6 Medición de Satisfacción – NPS 

El bot enviará una encuesta de satisfacción (NPS simplificado) únicamente cuando: 

El asesor confirme que el problema fue solucionado. 

La sesión haya sido cerrada efectivamente. 

Reglas: 

Se enviará un único NPS por sesión. 

El NPS no reabrirá la conversación. 

Las respuestas posibles serán: 

Satisfecho 

Neutral 

Insatisfecho 

La información será almacenada para análisis interno. 

4. Reglas Generales de Comportamiento 

El bot: 

Utilizará lenguaje claro, cordial y profesional. 

No emitirá juicios técnicos sobre la gravedad del reclamo. 

No prometerá plazos de resolución. 

No confirmará soluciones técnicas. 

No tomará decisiones operativas más allá de la clasificación y derivación. 

No modificará respuestas previamente registradas por el usuario. 

5. Limitaciones del Bot 

El BOT no: 

Resolverá reclamos de manera automática. 

Confirmará reparaciones o soluciones. 

Cambiará colas de atención según nivel de urgencia. 

Generará notificaciones internas automáticas. 

Operará en canales adicionales distintos a WhatsApp. 

Gestionará más de un número adicional al contemplado en este alcance. 

6. Fases del Proyecto 

Fase 1 – Relevamiento 

Recepción de criterios formales de clasificación de urgencia. 

Definición de flujos conversacionales. 

Fase 2 – Diseño Conversacional 

Diseño del flujo de identificación de intención. 

Diseño del flujo de reclamo y clasificación. 

Diseño del flujo de no reclamo. 

Fase 3 – Desarrollo y Configuración 

Configuración del nuevo número en WhatsApp Business Plataforma. 

Implementación de flujos en Botmaker. 

Configuración de Zoho CRM 

Configuración de derivación automática. 

Creación de usuarios 

Fase 4 – Pruebas 

Pruebas internas. 

Pruebas de aceptación con el CLIENTE. 

Fase 5 – Producción 

Activación en número definitivo. 

Monitoreo inicial post-lanzamiento. 

7. Alcance Fuera del Proyecto 

Se considera fuera de alcance: 

Automatizaciones avanzadas según nivel de urgencia. 

Notificaciones internas automáticas. 

Desarrollo de dashboards personalizados. 

Integración con otros canales (Webchat, redes sociales, etc.). 

Múltiples colas segmentadas por criticidad. 

8. Entregables 

Documento de flujos conversacionales. 

Configuración operativa en Botmaker. 

Registro automático en Zoho CRM. 

Número nuevo de WhatsApp configurado. 

Pruebas de aceptación confirmadas. 

Activación en producción. 

9. Aceptación 

Las partes declaran haber leído, comprendido y aceptado el alcance funcional detallado en el presente Anexo correspondiente al desarrollo del Bot “Pos-venta”, el cual pasa a formar parte integral del contrato principal suscripto entre Fortaleza Inmuebles y ONNIX S.A.. 

Cualquier modificación o ampliación del presente alcance deberá formalizarse por escrito y contar con la aprobación expresa de ambas partes. 

Firmado en Asunción, ___ / ___ / _____. 

 

_________________________   			 _________________________ 
EL CLIENTE                                            EL PROVEEDOR 

 

 