# Mapa muscular de sesión

Target: `src/features/gym/components/MapaMuscular.tsx`; related: WorkoutFinished, Historial, cargaMuscular, mapaMuscularGeometria.
Visitor mode: Operate. Extensión del sistema, sin rediseñar la sesión ni añadir dependencias.

THESIS: Entender qué grupos recibieron más trabajo en una sesión real y poder recuperar ese reparto.
OWN-WORLD: Tokens y tipografía Saira de AppFit; rojo semántico para datos y naranja para acciones. Dos figuras sobre una superficie sobria, sin fotografía/animación adicional.
STORY: Resultado guardado → frontal/trasera → escala/cobertura → grupos ordenados con detalle de ejercicios → metodología secundaria. Mismo componente en historial.
FIRST VIEWPORT: Métricas finales antes del mapa; el cuerpo domina su sección. Dos vistas siempre visibles juntas, sin carrusel.
FORM: Once grupos bilaterales, sin precisión anatómica inexistente. SVG decorativo accesible por lista textual; controles ≥44 px. Nombres/cifras/texto ampliado pueden envolver, sin altura rígida. Claro/oscuro y Forced Colors mantienen texto y estados.
FINISH: Revisión manual en la sesión principal según CLAUDE.md. No agentes ni bucles.

## Truth and persistence

Series registradas con reps positivas cuentan, marcadas o no. Heurística de reps y peso relativo por ejercicio, principales 1,0/secundarios 0,5 y niveles relativos al máximo de la sesión. No mide esfuerzo/fatiga/recuperación/riesgo ni compara intensidad entre sesiones. Cobertura explica desconocidos; personalizado «Cuerpo completo» sin reparto no pinta todo. Snapshot guarda clasificación/nombre por ejercicio, no colores. Sesiones antiguas usan asociaciones actuales con aviso y sin escribir.

## Verification

Inspección inicial conjunta encuentra palabras partidas al 200%; una tanda cambia las filas a rejilla adaptable (16rem) y confirma niveles completos, sin overflow/targets pequeños. SVG y temas se conservan. 1.264 tests / 71 archivos, TypeScript/Vite/PWA correctos; 32 estados del mapa, 32 de catálogo, doce contextos de motion y producción offline con export íntegro. Detector sin hallazgos. Veredicto: listo en el alcance emulado; Safari/hardware/lectores de pantalla pendientes. Evidencia y límites en `docs/historico/mapa-muscular-2026-10-06.md`. Sin commit ni push; sigue en `feat/catalogo-ejercicios`.
