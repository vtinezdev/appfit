# 015 — Trabajo muscular estimado y clasificación histórica

Fecha: 2026-10-06. Estado: vigente, ampliado por [025](025-carga-corporal-y-notas-de-sesion.md) (modos de carga) y [026](026-ejecucion-tecnicas-y-progresion-confirmada.md) (lados, dropsets y series pendientes).

## Contexto

Víctor solicita un mapa frontal/trasero del entrenamiento terminado que use el catálogo y pueda recuperarse desde el historial. AppFit guarda series, reps y kg, pero no RPE, RIR, proximidad al fallo ni masa corporal. El 1RM estimado de Progreso no constituye una medida fiable de esfuerzo de cada serie.

## Decisión

`lib/cargaMuscular` separa carga por ejercicio, participación/agregación y normalización. Todas las series registradas con reps positivas finitas cuentan, ~~marcadas o no (las marcas siguen siendo presentación)~~ salvo calentamientos y, desde [026](026-ejecucion-tecnicas-y-progresion-confirmada.md), las pendientes (`realizada: false`); las antiguas sin dato siguen contando. Por serie:

`min(reps, 30) / 8 × factorPeso`

Sin peso externo válido, `factorPeso = 1`; con peso, `0,75 + 0,25 × peso / máximoDelMismoEjercicioEnEstaSesión`. No se comparan kg entre máquinas, ejercicios o trabajo corporal. Es una heurística conservadora de trabajo, sin precisión fisiológica. Reps y tonelaje externo reales se mantienen separados; valores no finitos/negativos no aportan datos positivos y los extremos no contaminan la agregación.

Cada principal recibe 1,0 del estímulo del ejercicio; cada secundario 0,5, sin duplicar una zona presente en ambos. Son aportes, no porcentajes que deban sumar 100%. La categoría de búsqueda «Cuerpo completo» se separa del reparto anatómico: sus ocho ejercicios oficiales tienen músculos concretos. Un personalizado sin reparto específico queda sin clasificación, con cobertura explícita.

La proporción frente al músculo más trabajado de la sesión genera seis niveles: cero = sin trabajo; >0–10% = muy bajo; >10–25% = bajo; >25–50% = moderado; >50–80% = alto; >80–100% = muy alto. La escala es relativa a esa sesión, no compara intensidad absoluta entre días ni representa fatiga, recuperación o riesgo. Repetir una sesión completa no satura su reparto visual.

`workoutsRepo.terminar` guarda `fin` y `muscleSnapshot` opcional v1 en una transacción de workouts/exercises/sets. El snapshot contiene id, nombre y músculos por ejercicio registrado; las series originales conservan reps/kg. No se almacenan colores ni niveles. Un segundo cierre es idempotente. Los campos opcionales no indexados conservan Dexie v6 y backup v2, que serializa filas completas. Leer no escribe. Sesiones antiguas se reconstruyen con las asociaciones disponibles actualmente y muestran esa limitación; no se migran ni inventan sus clasificaciones originales.

`MapaMuscular` recibe datos ya calculados. SVG original esquemático bilateral, doce grupos (aductores desde el 2026-10-09), vistas frontal/trasera y rampa por tema (naranja hasta el 2026-10-09; desde entonces roja, de rojo claro con poco trabajo a rojo intenso con mucho, a petición de Víctor); desde el 2026-10-09, muñeco de hombre o de mujer según Perfil, trazado a partir de una imagen de referencia propia (`scripts/ejercicios/mapa-muscular.ts`). No deduce lateralidad ni separa porciones del hombro: ambos dibujos reflejan el mismo grupo. Detalle en filas táctiles ≥44 px y alternativa textual para no depender del color o de tocar una región pequeña. Sin dependencias/red nuevas ni animación permanente.

## Evolución

Los snapshots y las series permiten recalcular con otra fórmula/escala sin perder el registro. La agregación expone score, aportes, reps y volumen externo por grupo. Otra normalización sería necesaria para comparaciones temporales; RPE/RIR/1RM/esfuerzo se incorporarán a la función de carga cuando haya datos fiables. No se implementan mapas semanales/mensuales, equilibrio ni recuperación ahora.

Flujo: [Gym](../features/gym.md). Datos: [Datos](../datos.md). UI: [DESIGN-SYSTEM](../DESIGN-SYSTEM.md).
