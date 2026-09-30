# Claude Code en AppFit

AppFit se trabaja con Claude Code. La sesión principal (MAIN) hace el trabajo ella misma; los tres subagentes especialistas existen, pero solo se usan cuando Víctor los pide.

## Archivos

| Archivo | Qué es |
|---|---|
| `CLAUDE.md` | Contexto del proyecto, reglas y forma de trabajar de MAIN. Claude Code lo carga en cada sesión. |
| `.claude/settings.json` | Modelo de la sesión principal (`opus`). |
| `.claude/launch.json` | Arranque del servidor de desarrollo (`npm run dev`, puerto 5173) para las pruebas en navegador. |
| `.claude/agents/architecture-auditor.md` | Subagente de auditoría técnica. |
| `.claude/agents/product-ux-auditor.md` | Subagente de producto/UX/UI. |
| `.claude/agents/documentation-agent.md` | Subagente de cierre documental. |
| `docs/AGENTES.md` | Esta guía. |

## Agentes y modelos

| Agente | Qué es técnicamente | Modelo | Rol |
|---|---|---|---|
| **MAIN** | La sesión principal de Claude Code | `opus` → Claude Opus 5.5 (`claude-opus-5-5`) | Entiende la petición, implementa, valida y documenta |
| **architecture-auditor** | Subagente | `sonnet` → Claude Sonnet 5.5 (`claude-sonnet-5-5`) | Calidad técnica: estructura, datos/Dexie, backup, TS/React, rendimiento, tests, build |
| **product-ux-auditor** | Subagente | `sonnet` | Flujos, pantallas, estados, accesibilidad, coherencia con el design system |
| **documentation-agent** | Subagente | `sonnet` | Solo al cierre: sincroniza la documentación con el código final |

Se usan los alias `opus` y `sonnet`, que Claude Code resuelve al modelo más reciente de cada familia. Así no hay que tocar nada cuando salga una versión nueva.

MAIN no es un archivo de `.claude/agents/`: es la conversación normal. Su comportamiento lo define `CLAUDE.md` y su modelo lo fija `.claude/settings.json`. Si en una sesión cambias el modelo con `/model`, ese cambio manda sobre el ajuste del proyecto.

## Flujo de trabajo

```
Petición de Víctor
   │
   ▼
MAIN: entiende → inspecciona → plan mínimo → implementa
   │
   ▼
npm run test + npm run build en verde
   │
   ▼
¿afecta a la documentación? ── sí ──► MAIN actualiza PROCESO.md / CLAUDE.md / DESIGN-SYSTEM.md…
   │ no
   ▼
resumen a Víctor
```

- **Sin subagentes por defecto** y sin bucles de revisión/corrección. Cada subagente arranca sin contexto y tiene que volver a leer el código; en este proyecto no ha compensado.
- **Excepciones, solo si Víctor lo pide:**
  - Nombra un agente («revisa esto con el product-ux-auditor») → MAIN lo lanza con un encargo mínimo (objetivo, alcance o `git diff`, pregunta concreta) y traslada su informe.
  - Pide ejecutar un plan con otro modelo («hazlo con sonnet») → MAIN lanza **un único** agente con ese modelo y el plan completo, sin bucles de revisión después. Si la sesión está en modo plan, hay que salir antes (Shift+Tab): el agente hereda el modo plan y no podría editar.
- Si una decisión no se puede resolver con evidencia del repositorio (prioridades, preferencias, datos reales), MAIN pregunta en vez de inventar.
- `CLAUDE.md` se mantiene breve porque se carga en cada sesión. El detalle histórico sigue en `PROCESO.md` y se consulta por secciones.

## Documentación al cerrar

- MAIN documenta solo lo que ya existe en el código, cuando la implementación está terminada y validada, y solo si el cambio afecta a algo documentado.
- Qué tocar: `PROCESO.md` (nueva sección numerada), `README.md`, `DESIGN-SYSTEM.md`, `herramientas.md`, el mapa y las reglas de `CLAUDE.md`, y `progreso/sesion-NN/` cuando Víctor pide cerrar la sesión.
- Los planes (`PLAN.md`, `roadmap/`) y la configuración de agentes no se tocan salvo que Víctor lo pida.

## Cómo usarlo en el día a día

1. Abre Claude Code en la carpeta `appfit` (`claude`). Ya estás hablando con MAIN (Opus).
2. Pide las cosas con normalidad: «añade X», «arregla Y», «audita la pantalla Z».
3. Si quieres un especialista o otro modelo, dilo explícitamente: «usa el architecture-auditor para…», «ejecuta el plan con sonnet».
4. Al terminar una sesión larga, pide «cierra la sesión» para generar `docs/progreso/sesion-NN/`.
5. `/agents` en Claude Code muestra y permite editar los subagentes.
6. MAIN no hace commits ni push si no se los pides.
