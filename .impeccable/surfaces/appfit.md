# APPFIT completa

Target: `src/app/App.tsx`; related: `src/features/inicio/InicioTab.tsx`, `src/features/nutricion/NutricionTab.tsx`, `src/features/gym/GymTab.tsx`, `src/app/Ajustes.tsx`.
Visitor mode: Operate. Rediseño delegado por el usuario; implementación directa en código para comprobar estados y movimiento. Esta elección se limita a la sesión, sin establecer un default de generación de imágenes.

## Direction contract

THESIS: Precisión deportiva de una pista indoor: un registro de entrenamiento legible, táctil y compacto, con nutrición y peso en la misma gramática. Evitar una sucesión indiferenciada de paneles.

OWN-WORLD: Azul tinta, blanco mineral y naranja señal; Manrope local con títulos contundentes y cifras tabulares. Radios contenidos, superficies limpias, selección con forma y texto además del color. Feedback breve y desaceleración sin rebote.

STORY: Inicio orienta el día. Nutrición permite registrar y revisar consumo; Referencias explica criterios y procedencia mediante contenido común y consulta contextual. Gym presenta el trabajo como una secuencia de series, distingue su confirmación visual y propone descanso opcional. Datos y acciones conservan significado en ambas apariencias.

FIRST VIEWPORT: Cabecera con APPFIT y fecha, saludo; resumen nutricional compacto con registro junto al contexto; sesión y peso como unidades de información. En entreno activo: estado, rutina, tiempo real, series y volumen; primera tabla de series editable al alcance. Botón Menú persistente centrado, destinos emergiendo hacia arriba en abanico.

FORM: Candidato 5, pista indoor y señalética deportiva, seed `8fb039d8`. Alternativas exploradas: programa de entrenamiento impreso, club deportivo, fotografía de producto deportivo, clasificación de competición, pista indoor, fichas de material, acreditación de evento. El seed se consultó una vez sin red y se repitió con red para obtener challengers. Ningún challenger mejora conjuntamente identificación deportiva y claridad de uso frente al encargo: split-flap (declined, conservar estabilidad de columnas), folio botánico (declined, comparación alineada), orientación (competitive en identificación, conservar código de estados), catálogo de personajes (declined, controles inequívocos), Metro (competitive en claridad, conservar jerarquía de tipos), mapa de transporte (declined, continuidad de origen/destino). El brief manda sobre topologías ajenas al producto. Riesgo: el abanico necesita targets/colisiones probados en 320 px.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

## Motion thesis

Focal: cinco destinos salen del mismo origen y vuelven a él; confirmar una serie sella su check; el cierre de sesión fija el resultado real.
Continuity: indicador de tabs/segmentos, altas/bajas de series, sheets interruptibles y navegación breve.
Feedback: presión 120 ms, estados 200 ms, overlays/abanico 280 ms, cierre 180 ms y éxito 420 ms. Curvas desaceleradas sin overshoot; no se introduce un motor spring.
Budget: CSS + Web Animations, sin dependencia nueva, temporizador absoluto y render aislado por segundo. Reduce Motion mantiene color/texto/check con 80 ms de fundido y suprime desplazamientos. Vibración solo tras acciones del usuario y si está soportada.

## Constraints

No cambios de esquema, backend ni cálculos. Completar series y descanso son estado de presentación por sesión, separado de IndexedDB y backups. Toda serie sigue guardándose con el mecanismo existente. Pruebas solo en `appfit-test.localhost:5173`, contextos nuevos, datos sintéticos.
