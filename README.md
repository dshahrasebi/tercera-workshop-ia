<div align="center">

# AI Workshop

## September 2026

Preparar mejor. Trabajar con contexto. Usar IA con criterio.

Prepare better. Work with context. Use AI deliberately.

**7 septiembre / September · Día 1 / Day 1**  |  **9 septiembre / September · Día 2 / Day 2**

</div>

> **Estado / Status:** planificación inicial · agenda provisional · enlaces, ponentes y materiales por confirmar

Repositorio central para el guion, las demos y la documentación compartida de la workshop.

Central repository for the workshop agenda, demos and shared documentation.

## Acceso rápido / Quick access

- [Agenda del día 1 / Day 1 agenda](#día-1--lunes-7-de-septiembre--day-1--monday-7-september)
- [Propuesta de contenidos / Content proposal](#propuesta-de-contenidos--content-proposal)
- [Audiencias / Audiences](#audiencias--audiences)
- [Preparación y decisiones / Preparation and decisions](#preparación-y-decisiones--preparation-and-decisions)
- [Recursos / Resources](#recursos--resources)

## De un vistazo / At a glance

| | Español | English |
|---|---|---|
| **Fechas / Dates** | Lunes 7 y miércoles 9 de septiembre de 2026 | Monday 7 and Wednesday 9 September 2026 |
| **Horario día 1 / Day 1 hours** | 08:30–14:00 | 08:30–14:00 |
| **Formato / Format** | Por confirmar | To be confirmed |
| **Lugar / Venue** | Por confirmar | To be confirmed |
| **Audiencia / Audience** | DEV, PMO y testers | Developers, PMO and testers |
| **Materiales / Materials** | Guion, documentación, demos y actividades | Agenda, documentation, demos and activities |

## Objetivo / Purpose

La sesión debe ayudar a cada perfil a elegir mejor sus herramientas, modelos y prácticas de trabajo, con especial atención al contexto, las skills y el coste.

The workshop should help each audience choose better tools, models and working practices, with a focus on context, skills and cost.

### Qué queremos que quede claro / Takeaways

- La calidad de una respuesta depende también del contexto, las instrucciones y las skills disponibles.
- No todos los modelos ni herramientas sirven para la misma tarea.
- El consumo de créditos debe formar parte de la decisión técnica.
- DEV, PMO y testers necesitan ejemplos y recorridos distintos.
- Una demo útil debe mostrar proceso, resultado y límites, no solo el resultado final.

## Día 1 · Lunes 7 de septiembre / Day 1 · Monday 7 September

### Timeline del workshop

**Horario:** 08:30 - 14:00
**Coffee break:** 11:00 - 11:30

| Horario | Sesión | Dinámica | Objetivo |
|---|---|---|---|
| 08:30 - 08:40 | Bienvenida: por qué hemos realizado el estudio | Apertura breve | Explicar el cambio hacia AI Credits y por qué necesitamos comprender el consumo de los agentes, sin convertir la apertura en una introducción teórica sobre FinOps. |
| 08:40 - 08:50 | Las tres preguntas de la jornada | Preguntas abiertas al público | Presentar el hilo conductor: dónde se consumen los tokens, qué incorpora ya GitHub Copilot y qué palancas generan ahorro material. Las respuestas se irán construyendo durante toda la mañana. |
| 08:50 - 09:30 | Banco de pruebas de Grupo Romeu | Presentación del equipo | Explicar cómo se diseñaron la rúbrica y las pruebas, qué herramientas, modelos y tareas se evaluaron, qué métricas se recogieron y qué dificultades metodológicas aparecieron. |
| 09:30 - 10:05 | Lo que hemos observado | Resultados y conversación | Compartir cuatro mensajes principales: las herramientas de contexto no ganan siempre; el tipo de tarea condiciona el resultado; el modelo puede tener tanto impacto como la herramienta; y calidad y coste deben evaluarse conjuntamente. |
| 10:05 - 10:45 | Caso práctico: JSON vs. TOON vs. TSV | Demostración participativa | Mostrar un mismo payload en los tres formatos, comparar el número de tokens y analizar qué información se mantiene, qué cambia y en qué estructuras resulta aplicable cada formato. |
| 10:45 - 11:00 | Debate abierto | Conversación con los asistentes | Plantear la pregunta: “Si podemos reducir significativamente el payload de una herramienta, ¿debemos seguir utilizando JSON por defecto en todas las tool calls?”. Dejar la cuestión abierta para continuar la conversación durante el descanso. |
| 11:00 - 11:30 | Coffee break | Café, almuerzo y conversación informal | Descansar del bloque de resultados y favorecer el intercambio de impresiones entre los asistentes. |
| 11:30 - 12:00 | Novedades de VS Code y GitHub Copilot | Escenarios prácticos | Mostrar cómo está evolucionando el entorno de desarrollo mediante Agent Mode, búsqueda del workspace, selección de contexto, MCP, Skills, modelos y agentes. Conectar estas novedades con los resultados presentados antes del descanso. |
| 12:00 - 12:25 | El IDE como Agent Host | Demo y casos de uso | Explicar la evolución del IDE hacia un host capaz de ejecutar y coordinar agentes, herramientas y modelos especializados. Revisar ejemplos de colaboración, delegación y selección de agente según la tarea. |
| 12:25 - 12:50 | Mapa del ecosistema Microsoft AI | Mapa visual y conversación | Ordenar el papel de GitHub Copilot, GitHub Apps, Microsoft 365 Copilot Chat, Azure AI Foundry, Copilot Studio, MCP y los servicios Azure dentro de las fases de desarrollo, construcción, productividad, interoperabilidad y gobierno. |
| 12:50 - 13:15 | AI FinOps aplicado | Interpretación de los casos vistos | Explicar qué debemos medir realmente: tokens de entrada y salida, caché, modelo, tool calls, lecturas de archivos, latencia, coste por tarea, calidad y riesgo. Utilizar las métricas para interpretar los resultados, no como teoría financiera aislada. |
| 13:15 - 13:30 | Observabilidad con AI Engineering Fluency | Demostración de la herramienta | Mostrar cómo observar sesiones, modelos, contexto, MCP, tool calls y consumo. Diferenciar las tendencias y estimaciones obtenidas desde logs de la facturación real, evitando cualquier uso orientado a comparar personas. |
| 13:30 - 13:50 | Propuesta de estándares y próximos experimentos | Trabajo conjunto | Debatir criterios para reducir exploración, optimizar payloads, elegir formatos, seleccionar modelos y medir resultados. Acordar qué hipótesis deben continuar en el banco de pruebas. |
| 13:50 - 14:00 | Conclusiones y acuerdos | Cierre participativo | Responder conjuntamente a las tres preguntas iniciales, recoger conclusiones y concretar las líneas de trabajo posteriores al workshop. |

#### El workshop se apoya en evidencia interna

Durante el estudio se han realizado dos líneas principales de experimentación:

- Un banco de pruebas sobre herramientas, modelos, mecanismos de contexto y arneses de desarrollo.
- Un estudio específico sobre formatos de intercambio con 30 pruebas y 237 ejecuciones.

En el estudio de formatos:

- TOON redujo entre un 58,93 % y un 63,44 % los tokens del payload equivalente frente a JSON.
- TSV redujo un 63,03 % los tokens frente a JSON en las estructuras planas analizadas.
- TSV no se aplicó a las 11 pruebas jerárquicas.
- No se registraron errores de ejecución.

> Estos porcentajes representan reducción de tokens del payload comparado, no una reducción automática equivalente del coste total de una sesión agentic.

> La equivalencia semántica completa figura como no determinada en parte del análisis, ya que el servicio utilizado no incluye parsers TOON y TSV. Por tanto, el siguiente paso debe incorporar validaciones funcionales de interpretación y recuperación de información.

## Propuesta de contenidos / Content proposal

### 1. Contexto, modelos y coste / Context, models and cost

- Novedades de actualidad: OpenAI, Claude y otros modelos relevantes.
- Comparativa entre modelos, calidad, tiempo y consumo.
- Uso del modo AUTO y configuración de modelos disponibles.
- Resultados del estudio FinOps de agosto.
- Coste de créditos por tipo de tarea y recomendaciones de stack.
- Microsoft 365 Copilot como recurso para tareas no relacionadas con código, sujeto a validar licenciamiento y alcance.

### 2. Herramientas y contexto / Tools and context

- GitHub Copilot App.
- Extensión de IA para VS Code.
- Codebase Memory MCP.
- Cómo se construye y utiliza el contexto del codebase.
- Revisión de JSON, Markdown y TOON como formatos de intercambio.
- Qué conviene documentar en el repositorio para que el trabajo sea reutilizable.

### 3. Skills y personalización / Skills and customization

- Por qué las skills cambian el resultado de tareas complejas.
- Skills personalizadas para repositorios y procesos críticos.
- Custom instructions, prompt files y custom agents.
- Gobernanza, homogeneización y mantenimiento de skills.
- Ejemplos de aplicación a frontend, arquitectura y cambios transversales.

### 4. Testing asistido / AI-assisted testing

- Abrir una aplicación desde una instrucción.
- Iniciar sesión, completar formularios y añadir o editar información.
- Detectar validaciones fallidas y proponer correcciones.
- Posible demostración para testers, pendiente de validar y preparar.

### 5. Adopción y participación / Adoption and participation

- Buenas prácticas y recomendaciones de la empresa.
- Diferencias de enfoque entre DEV, PMO y testers.
- Kahoot y otros minijuegos.
- Testimonios, si se aprueban antes del **28/08/2026**.

## Audiencias / Audiences

| Perfil / Profile | Pregunta principal / Main question | Ejemplos / Examples |
|---|---|---|
| **DEV** | ¿Cómo obtengo mejores cambios con menos iteraciones? / How do I get better changes with fewer iterations? | Skills, contexto, modelos, MCP, coste |
| **PMO** | ¿Cómo se adopta IA con criterio? / How do we adopt AI deliberately? | Buenas prácticas, comunicación, riesgos, resultados |
| **Testers** | ¿Cómo acelero validación sin perder control? / How do I speed up validation without losing control? | Agentes de pruebas, formularios, regresión |

## Día 2 · Miércoles 9 de septiembre / Day 2 · Wednesday 9 September

Programa pendiente de confirmar.

Schedule to be confirmed.

## Recursos / Resources

| Recurso / Resource | Estado / Status | Próximo paso / Next step |
|---|---|---|
| Presentación / Presentation | Pendiente de actualizar | Incorporar datos finales de la rúbrica |
| Drive público / Public Drive | Enlace pendiente | Publicar presentación y documentación |
| Grabación / Recording | Pendiente de revisar | Validar demo de testing y ejemplos |
| Kahoot | En preparación | Crear batería de preguntas y probarla |
| Logos e imágenes / Logos and images | Por confirmar | Incorporar únicamente recursos aprobados |
| Informes y pruebas / Reports and tests | En incorporación | Subir resultados y conclusiones de apoyo |

## Preparación y decisiones / Preparation and decisions

### Pendiente antes de publicar / Before publishing

- [ ] Actualizar presentación con todos los datos de la rúbrica.
- [ ] Publicar presentación y documentación en Drive público.
- [ ] Confirmar responsables, demos y duración de cada bloque.
- [ ] Validar demo de agentes de pruebas.
- [ ] Confirmar configuración de modelos y modo AUTO.
- [ ] Revisar conclusiones sobre consumo, créditos y coste.
- [ ] Decidir inclusión de testimonios antes del **28/08/2026**.
- [ ] Confirmar formato, lugar, enlaces y recursos visuales.

### Decisiones ya tomadas / Decisions already made

- Este repositorio será el punto central de documentación y guion.
- El día 1 tendrá tres bloques principales: 100, 90 y 75 minutos.
- La agenda actual es provisional y debe poder ajustarse a los ponentes.
- Los materiales no confirmados se mostrarán como pendientes, no como contenido definitivo.

## Organización del repositorio / Repository structure

La documentación, las actividades, las presentaciones y los recursos visuales se añadirán cuando estén disponibles.

Documentation, activities, presentations and visual assets will be added as they become available.

## Nota de estado / Status note

Esta portada refleja la planificación del **21/08/2026**. Horarios, contenidos, responsables, enlaces y recursos deberán actualizarse a medida que avance la preparación.

This page reflects planning as of **21/08/2026**. Times, content, owners, links and assets must be updated as preparation progresses.

---

**Última actualización / Last updated:** 21/08/2026