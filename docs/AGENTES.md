# Equipo de agentes de Claude Code

AppFit se trabaja con un equipo de 4 agentes dentro de Claude Code: un coordinador (MAIN) y tres especialistas que MAIN invoca solo cuando hacen falta.

## Archivos

| Archivo | Qué es |
|---|---|
| `CLAUDE.md` | Contexto del proyecto + **protocolo de MAIN**. Claude Code lo carga en cada sesión. |
| `.claude/settings.json` | Modelo de la sesión principal (`opus`). |
| `.claude/agents/architecture-auditor.md` | Subagente de auditoría técnica. |
| `.claude/agents/product-ux-auditor.md` | Subagente de producto/UX/UI. |
| `.claude/agents/documentation-agent.md` | Subagente de cierre documental. |
| `docs/AGENTES.md` | Esta guía. |

## Agentes y modelos

| Agente | Qué es técnicamente | Modelo | Rol |
|---|---|---|---|
| **MAIN** | La sesión principal de Claude Code | `opus` → Claude Opus 5.5 (`claude-opus-5-5`) | Recibe las peticiones, decide el alcance y los agentes, implementa, valida y cierra |
| **architecture-auditor** | Subagente | `sonnet` → Claude Sonnet 5.5 (`claude-sonnet-5-5`) | Calidad técnica: estructura, datos/Dexie, backup, IA, TS/React, rendimiento, tests, build |
| **product-ux-auditor** | Subagente | `sonnet` | Flujos, pantallas, estados, accesibilidad, coherencia con el design system |
| **documentation-agent** | Subagente | `sonnet` | Solo al cierre: sincroniza la documentación con el código final |

Se usan los alias `opus` y `sonnet`, que Claude Code resuelve al modelo más reciente de cada familia. Así no hay que tocar nada cuando salga una versión nueva.

MAIN no es un archivo de `.claude/agents/`: es la conversación normal. Su comportamiento lo define `CLAUDE.md` y su modelo lo fija `.claude/settings.json`. Si en una sesión cambias el modelo con `/model`, ese cambio manda sobre el ajuste del proyecto.

## Flujo de trabajo

```
Petición de Víctor
   │
   ▼
MAIN: entiende → inspecciona → clasifica la tarea → plan mínimo
   │
   ├─ trivial / pequeña ──────────────► MAIN implementa → tests → fin
   │
   ├─ con impacto técnico ──► architecture-auditor ─┐
   ├─ con impacto UX ───────► product-ux-auditor ───┤ (en paralelo si son los dos)
   │                                                ▼
   │                         MAIN integra conclusiones → implementa → valida
   │                                                │
   │                         review sobre el diff (máx. 2 ciclos)
   │                                                ▼
   └──────────────────────► ¿afecta a la documentación? ── sí ──► documentation-agent
                                                    │ no
                                                    ▼
                                    comprobación final + resumen a Víctor
```

## Cuándo invoca MAIN a cada agente

| Tarea | Agentes |
|---|---|
| Trivial (typo, texto, pregunta) | Ninguno |
| Pequeña (bug acotado, 1–3 archivos) | Ninguno. MAIN implementa y pasa los tests |
| Feature nueva | Solo los auditores de las áreas con impacto + documentation al final |
| Cambio arquitectónico | architecture-auditor (antes y review del diff) + documentation |
| Cambio grande de UX | product-ux-auditor (antes y review del diff) + documentation si cambia comportamiento |
| Auditoría general | Los auditores que MAIN decida; se aplican solo los cambios justificados |

Si una decisión no se puede resolver con evidencia del repositorio (prioridades, qué prefieres tú, datos reales), MAIN te pregunta en vez de inventar.

## Cómo se limita el consumo

- **Delegar no es la opción por defecto.** Cada subagente arranca sin contexto y tiene que leer código, así que MAIN solo delega cuando una revisión especializada compensa.
- **Encargo mínimo:** MAIN pasa solo el objetivo, el alcance (archivos o `git diff`), lo que ya se sabe y la pregunta concreta. Nunca su contexto entero.
- **Lectura acotada:** los agentes leen `CLAUDE.md`, después solo la sección de la documentación que les toca, y trabajan sobre el diff cuando basta.
- **Salida compacta:** veredicto + tabla de hallazgos (máx. ~10) + cambios aplicados. Sin explicaciones largas.
- **Herramientas justas:** los auditores no pueden crear archivos nuevos (sí editar) ni lanzar otros agentes.
- **Límites anti-bucle:** máximo 2 ciclos de revisión por tarea y 2 intentos de corrección por problema. No se repite una auditoría si el contexto no ha cambiado. Si sigue habiendo desacuerdo, MAIN para y te pide una decisión.
- `CLAUDE.md` se mantiene breve porque se carga en cada sesión. El detalle histórico sigue en `PROCESO.md` y se consulta por secciones.

## Documentation agent: agente de cierre

- No participa al principio ni documenta planes.
- MAIN lo lanza solo cuando la implementación está terminada, las validaciones pasan y no quedan problemas abiertos, **y** además el cambio afecta a algo documentado.
- Recibe el resumen de lo hecho y la lista de archivos cambiados, comprueba cada afirmación contra el código y edita solo las secciones afectadas: `PROCESO.md` (nueva sección numerada), `README.md`, `DESIGN-SYSTEM.md`, `herramientas.md`, el mapa y las reglas de `CLAUDE.md`, y `progreso/sesion-NN/` cuando se cierra una sesión.
- No toca el código, los planes (`PLAN.md`, `roadmap/`) ni la configuración de agentes, salvo que MAIN lo pida.

## Cómo usarlo en el día a día

1. Abre Claude Code en la carpeta `appfit` (`claude`). Ya estás hablando con MAIN (Opus).
2. Pide las cosas con normalidad: «añade X», «arregla Y», «audita la pantalla Z». MAIN decide si necesita especialistas.
3. Si quieres forzar un agente, nómbralo: «revisa esto con el product-ux-auditor», «usa el architecture-auditor para…».
4. Al terminar una sesión larga, pide «cierra la sesión» para que MAIN lance el documentation-agent y genere `docs/progreso/sesion-NN/`.
5. `/agents` en Claude Code muestra y permite editar los subagentes.
6. MAIN no hace commits si no se los pides.
