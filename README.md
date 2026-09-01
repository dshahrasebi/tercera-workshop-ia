<div align="center">

# AI Workshop

## September 2026

Preparar mejor. Trabajar con contexto. Usar IA con criterio.

Prepare better. Work with context. Use AI deliberately.

**7 septiembre / September · Día 1 / Day 1**  |  **9 septiembre / September · Día 2 / Day 2**

</div>

> **Estado / Status:** planificación inicial · agenda del día 1 confirmada · enlaces, ponentes y materiales por confirmar

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
| **Formato / Format** | Presencial | In-person |
| **Lugar / Venue** | Edificio Romeu | Romeu building |
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
**Almuerzo / descanso:** 10:30 - 11:00
**Coffee break:** 12:30 - 12:45

| Horario | Contenido |
|---|---|
| 08:30 - 08:45 | Entrada, bienvenida y meet and greet (mientras los asistentes toman asiento) |
| 08:45 - 10:30 | Bloque 1 (FinOps — Parte I): GitHub Copilot, de Premium Requests a AI Credits + AI FinOps, análisis y conclusiones sobre el consumo real + IA eficiente: más valor por cada crédito |
| 10:30 - 11:00 | Almuerzo / descanso |
| 11:00 - 11:30 | Bloque 1 (FinOps — Parte II): JSON vs. TOON + CSV vs. TSV |
| 11:30 - 12:30 | Bloque 2: novedades en el entorno de desarrollo (IDE: observabilidad con AI Engineering Fluency —extensión—, la novedad del Agent Host) + GitHub Copilot App |
| 12:30 - 12:45 | Bloque 3: Coffee break |
| 12:45 - 13:30 | Bloque 4: Microsoft 365 Copilot Suite (Copilot App y Copilot en las herramientas de Office) |
| 13:30 - 14:00 | Debate y cierre |

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
- [ ] Confirmar responsables y demos de cada bloque.
- [ ] Validar demo de agentes de pruebas.
- [ ] Confirmar configuración de modelos y modo AUTO.
- [ ] Revisar conclusiones sobre consumo, créditos y coste.
- [ ] Decidir inclusión de testimonios antes del **28/08/2026**.
- [ ] Confirmar enlaces y recursos visuales.

### Decisiones ya tomadas / Decisions already made

- Este repositorio será el punto central de documentación y guion.
- El workshop será presencial, en el edificio Romeu.
- El horario del día 1 es oficial; el contenido de cada bloque puede ajustarse a los ponentes.
- Los materiales no confirmados se mostrarán como pendientes, no como contenido definitivo.

## Organización del repositorio / Repository structure

La documentación, las actividades, las presentaciones y los recursos visuales se añadirán cuando estén disponibles.

Documentation, activities, presentations and visual assets will be added as they become available.

## Nota de estado / Status note

Esta portada refleja la planificación del **21/08/2026**. Horarios, contenidos, responsables, enlaces y recursos deberán actualizarse a medida que avance la preparación.

This page reflects planning as of **21/08/2026**. Times, content, owners, links and assets must be updated as preparation progresses.

---

**Última actualización / Last updated:** 21/08/2026