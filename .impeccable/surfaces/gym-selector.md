# Selector de ejercicios de AppFit

Target: `src/features/gym/components/SelectorEjercicios.tsx`; related: Rutinas, EntrenoActivo, FilterChips, ModalPage.
Visitor mode: Operate. Extensión del sistema existente, sin reemplazar identidad.

## Direction contract

THESIS: Elegir un ejercicio conocido con pocas pulsaciones y continuar la rutina o sesión sin escribir su nombre.
OWN-WORLD: Grafito/claro, Manrope para lista y controles, Barlow para título de tarea, naranja reservado a selección/acción. Reutiliza tokens y capas.
STORY: Buscador → dos filtros combinables → recientes o resultados planos → selección directa. Personalizado se crea con nombre/músculo/equipo en la misma tarea y permanece disponible.
FIRST VIEWPORT: Título/Volver, buscador, chips de músculo/equipo y recientes; no abrir teclado automáticamente. Solo buscador fijo al desplazar; filtros/lista tienen scroll natural. Al crear, foco en nombre y acción persistente.
FORM: Targets completos y chips en filas desplazables; nombres y metadatos envuelven. Cabecera puede colocar título debajo de Volver con texto ampliado. Datos antiguos visibles sin filtros si no hay clasificación fiable.
FINISH: Revisión/documentación manual en sesión principal según CLAUDE.md; no agentes ni nuevos rasters.

## Constraints

PWA, sin dependencias ni red nuevas. 116 definiciones locales con ids estables; ids numéricos de rutinas/series preservados. Recientes derivados de series. Metadatos opcionales, Dexie v6/backup v2. Error/ocupado/deshacer de la sesión conservados. Reduce Motion y aislamiento/foco compartidos.

## Motion

Motion existente de ModalPage/controles; sin animar conteo, reordenar resultados o decorar el entrenamiento. Selección inmediata; escritura pendiente bloquea cierre y permite reintentar si falla.

## Finish record

Revisión/documentación manual en sesión principal. La inspección inicial detecta título desbordado al 200%; una tanda ajusta wrapping de cabecera, buscador fijo sin fijar filtros y foco del formulario. Confirmación móvil/escritorio/temas correcta. Detector sin hallazgos. 1.236 tests / 68 archivos, build TypeScript/Vite/PWA y producción offline correctos; 32 estados de selector y caso adicional de viewport reducido/escritura bloqueada, doce contextos de motion. Veredicto: listo dentro del alcance emulado. Evidencia y límites: `docs/historico/catalogo-ejercicios-2026-10-06.md`. Hardware Safari/iOS/Android y lectores de pantalla pendientes. Sin commit ni push.
