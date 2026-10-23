# Carril A · Entreno, Social y actividades

Estado y orden de los pasos del carril A. Reglas comunes, reparto de carpetas, cruces y decisiones: [README](README.md). **Este archivo solo lo edita la sesión del carril A.**

Dueño de: `src/features/gym/`, `liga/`, `actividades/`, `social/`, `supabase/`, `scripts/ejercicios/`, `public/ejercicios/` y sus documentos (`docs/features/gym.md`, `liga.md`, `actividades.md`, `social.md`, `docs/social-mejoras.md`). **No toca `src/shared/` ni `src/app/`**: lo que necesite de ahí lo usa tal cual; si hiciera falta cambiarlo, es un cruce con B.

Orden: de lo más pequeño y seguro a lo más grande. Tamaños: **S** (media sesión), **M** (una sesión), **L** (una o dos sesiones), **XL** (varias sesiones, con decisiones y piloto).

## Resumen

| Paso | ID | Mejora | Tamaño | Depende de | Estado |
|---|---|---|---|---|---|
| A1 | REN-02 | Recortar el resumen social a 8 KB | S | — | Hecho (2026-10-22) |
| A2 | ENT-15 | Avance automático al siguiente ejercicio | S | — | Hecho (2026-10-22) |
| A3 | ENT-14 | Descanso sugerido según el tipo de ejercicio | S | — | Hecho (2026-10-22) |
| A4 | GAM-07 | «Hace N días» tras un parón | S | — | Descartado (2026-10-23) |
| A5 | ENT-04 | Historial del ejercicio sin salir de la sesión | M | — | Hecho (2026-10-23) |
| A6 | ENT-01 | Sustituir un ejercicio durante la sesión | M | — | Hecho (2026-10-23) |
| A7 | ENT-05 | Calentamiento en rampa | M | — | Descartado (2026-10-23) |
| A8 | PRO-03 | Tendencia de series por músculo | M | — | Hecho (2026-10-23) |
| A9 | ENT-10 | Fin de sesión ordenado por momentos | L | (B8, opcional) | Hecho (2026-10-23) |
| A10 | ENT-11 | Póster del entreno como imagen | L | A9 | Hecho (2026-10-23) |
| A11 | REN-04 | Importar TCX (y FIT después) | M | — | Hecho (2026-10-23) |
| A12 | ENT-09 | Fichas de técnica de los ejercicios | L | A6 | Hecho (2026-10-23) |
| A13 | SOC-02 | Compartir una rutina para guardarla | L | — | Hecho (2026-10-23) |
| A14 | SOC-01 | Semana en compañía | XL | — | Hecho (piloto pendiente) |
| A15 | SOC-03 | Expediciones de comunidad | XL | A14 | Pendiente |
| A-X1 | NAV-02 | «Volver» en Amigos (cruce) | S | B4 | Hecho (2026-10-23) |
| A-X2 | GAM-04 | Línea de la meta en la gráfica (cruce) | S | B13 | Pendiente |
| A16 | ENT-16 | Gemelos en el asistente de rutinas | S | — | Hecho (2026-10-23) |
| A17 | REN-04 | Importar FIT | M | A11 | Hecho (2026-10-23) |
| A18 | SOC-04 | Compartir tu semana de Ritmo | M | A13 | Hecho (2026-10-23) |
| A19 | SOC-05 | Avisos de la semana en compañía | M | A14 | Hecho (2026-10-23) |
| A20 | SOC-06 | Invitación por enlace o QR | L | — | Descartado (2026-10-23) |
| A21 | ENT-17 | Superseries | L | — | Hecho (2026-10-23) |
| A22 | SOC-07 | Moderar comunidades desde la app | M | — | Hecho (2026-10-23) |
| A23 | ENT-18 | Hito redondo en el póster | M | A10 | Hecho (2026-10-23) |
| A24 | ACT-01 | Tus mejores marcas en Actividades | M | — | Pendiente |
| A25 | ENT-19 | Nota fija por ejercicio y gimnasio | M | — | Descartado (2026-10-23) |
| A26 | ENT-20 | Rest-pause | M | — | Descartado (2026-10-23) |
| A27 | ENT-21 | «Depende de la máquina», a mano | S | — | Descartado (2026-10-23) |
| A28 | ACT-02 | Parciales por km | M-L | — | Pendiente |

---

### [x] A1 · REN-02 · Recortar el resumen social a 8 KB

> **Hecho (2026-10-22, PROCESO §195, PR #118).** El recorte ya existía desde §181 (los detalles entran mientras caben) y el peor caso medido cabe: 8.156 bytes. Víctor elige la versión reducida: sin `recortarResumen` (nunca se activaría), con un test del peor caso en las tres variantes (completo, sin imágenes, sin detalles) y la limitación fuera del roadmap.

- **Tamaño:** S · **Rama:** `feat/a-resumen-8kb`
- **Para la persona:** cualquier entreno se puede publicar; hoy uno muy largo falla con «publicación no válida» (`docs/roadmap.md`, Limitaciones).
- **Cómo:**
  1. En `social/lib/publicacion.ts` ya existen `bytesResumen` y `MAX_BYTES_RESUMEN` (8.192). Añadir una función pura `recortarResumen(r)` que, mientras `bytesResumen(r) > MAX_BYTES_RESUMEN`, quite por este orden: `detalles` de series de los últimos ejercicios, `insignias` y `logros` sobrantes, récords secundarios (conservando uno por ejercicio), `catalogIds` de los ejercicios que se recortan y, como último recurso, ejercicios del final con su total («y N más»). Las listas paralelas (`ejercicios`/`catalogIds`/`detalles`, `logros`/`insignias`) se recortan siempre juntas: los lectores descartan una lista entera si no tiene el largo de la suya.
  2. Llamarla al final de `resumenEntreno` y también después de `conNota` (la nota cuenta).
  3. Si ni así cabe (no debería), el compositor ya muestra el error del servidor; no se envía nada roto.
- **Datos:** sin cambios de esquema, backup ni SQL.
- **Tests:** en `publicacion.test.ts`, el caso máximo del roadmap (15 ejercicios con nombres de 60 caracteres con tildes, 6 récords con variante, 6 ligas, 6 logros, nota de 280 y mapa) queda ≤ 8.192 bytes, conserva el orden y las listas paralelas tienen el mismo largo; un entreno normal no cambia.
- **Navegador:** publicar el entreno máximo contra el Supabase falso (`scripts/ui/supabase-falso.mjs`) y ver la vista previa.
- **Documentos:** `docs/features/social.md` (límite y recorte) y quitar la limitación de `docs/roadmap.md`. De paso (DOC-01), en `docs/features/gym.md` corregir el enlace roto a `atributos.md` (la experiencia está en `experiencia.md`).

### [x] A2 · ENT-15 · Avance automático al siguiente ejercicio

> **Hecho (2026-10-22, PROCESO §197, PR #120).** Decisiones de Víctor: un ejercicio sin series cuenta como pendiente (si está en la sesión es para hacerlo); con la hoja del RIR, baja por detrás; sin interruptor en Ajustes.

- **Tamaño:** S · **Rama:** `feat/a-avance-automatico`
- **Para la persona:** al marcar la última serie de un ejercicio, la pantalla sube sola al siguiente que tiene series pendientes.
- **Cómo:**
  1. Función pura `siguienteEjercicioPendiente(visibleIds, sets, completadas, actual)` en `gym/lib/session.ts`: el primer ejercicio después del actual (y si no, antes) con alguna serie sin marcar.
  2. En `gym/pages/EntrenoActivo.tsx`, dentro de `completar`, cuando la serie marcada completa su ejercicio: buscar el panel del siguiente (añadir `data-ejercicio={exId}` al `div` que envuelve cada `PanelEjercicio`) y `scrollIntoView({ block: 'start' })` tras el plegado. Que la cabecera fija no lo tape: `scroll-margin-top` con la altura de la cabecera (variable CSS local de la página, sin token nuevo).
  3. No mover si el foco está en un campo de texto (teclado abierto) ni si se desmarca. Con Reduce Motion, salto sin animación (`matchMedia`).
  4. Sin interruptor en Ajustes (es `src/app/`, de B). Si Víctor lo quiere desactivable, se añade después como cruce.
- **Datos:** ninguno.
- **Tests:** `session.test.ts` para la función pura (último ejercicio, todos completos, ejercicios sin series, orden manual).
- **Navegador:** sesión con 3 ejercicios a 320/375/430 px; con el teclado simulado (viewport reducido) no salta; con Reduce Motion, salto directo.
- **Documentos:** `docs/features/gym.md` § Entreno activo.

### [x] A3 · ENT-14 · Descanso sugerido según el tipo de ejercicio

> **Hecho (2026-10-22, PROCESO §198, PR #121).** D8: una sola vez en general. Al ver la preview salió que cada entreno empezaba sin temporizador, así que un «Sí» solo valía para esa sesión; Víctor elige recordar el último descanso elegido en el dispositivo (localStorage, fuera del backup), sin cruce con B. Los ejercicios propios reciben 90 s. La función vive en `lib/descansoSugerido.ts` y no en `session.ts` para no meter el catálogo en la barra del entreno minimizado.

- **Tamaño:** S · **Rama:** `feat/a-descanso-sugerido`
- **Para la persona:** quien entrena sin temporizador recibe una vez la pregunta «¿Quieres un descanso de 2 min entre series?» al marcar su primera serie.
- **Cómo:**
  1. El tiempo sale del tipo del ejercicio en el catálogo, con los mismos valores que el creador (`gym/lib/creadorRutinas.ts`, `OBJETIVOS_POR_TIPO`: 120 s compuesto, 90 s aislamiento). Función pura `descansoSugerido(ejercicio)` en `gym/lib/session.ts`.
  2. Componente `gym/components/DescansoSugerido.tsx` (banda en línea, no Sheet) que aparece en `EntrenoActivo` si `session.restSeconds === 0`, el ejercicio no tiene `descansoSeg` en la rutina y `Settings.pistasVistas` no incluye `'entreno-descanso'`. «Sí» pone `restSeconds` de la sesión; «No, gracias» lo cierra. En los dos casos se guarda `'entreno-descanso'` en `pistasVistas` con `updateSettings` (no hace falta tocar `shared/lib/pistas.ts`: el campo es una lista de cadenas y «Volver a ver las pistas» la vacía entera).
- **Decidir (D8):** una sola vez en general (propuesto) o una vez por ejercicio.
- **Datos:** ningún campo nuevo.
- **Tests:** función pura y un test de componente (aparece, «Sí» fija el descanso, no vuelve a salir).
- **Navegador:** primera serie de una sesión sin descanso; segunda sesión, ya no sale.
- **Documentos:** `docs/features/gym.md` § Descanso.

### [-] A4 · GAM-07 · «Hace N días» tras un parón

> **Descartado por Víctor (2026-10-23)** tras ver la preview (la línea «Hace 20 días de tu última sesión con este ejercicio» bajo el subtítulo del panel). No se implementa.

- **Tamaño:** S · **Rama:** `feat/a-tras-paron`
- **Para la persona:** si un ejercicio lleva 14 días o más sin hacerse, su panel lo dice («Hace 18 días de tu última sesión con este ejercicio») junto a la columna «Anterior», para que la persona decida la carga. Sin porcentajes de reducción (serían una recomendación sin fuente).
- **Cómo:** función pura `diasDesdeUltimaSesion(exerciseId, workouts, sets, inicioActual)` en `gym/lib/anterior.ts` (reutiliza `seriesSesionAnterior`); umbral 14 días, el mismo que el logro «Vuelta al ruedo» (`vitrina/lib/logros.ts`, `DIAS_VUELTA_AL_RUEDO`; importarlo, no copiarlo). Línea `text-caption` neutra bajo el subtítulo de `PanelEjercicio`, solo en la sesión activa.
- **Datos:** ninguno.
- **Tests:** la función con 13, 14 y 40 días, sin historial y con el entreno anterior sin terminar.
- **Navegador:** fixture con un ejercicio hecho hace 20 días.
- **Documentos:** `docs/features/gym.md` § Anterior.

### [x] A5 · ENT-04 · Historial del ejercicio sin salir de la sesión

> **Hecho (2026-10-23, PROCESO §199, PR #125).** Víctor lo aprobó en la página de previews A5–A9. El grupo comparable es el de los récords (`records.claveGrupo`, exportada), así que historial y récords usan el mismo criterio de variante y gimnasio.

- **Tamaño:** M · **Rama:** `feat/a-historial-ejercicio`
- **Para la persona:** en el menú «…» del ejercicio, «Historial y récords» enseña las 5 últimas sesiones, el récord vigente de cada tipo y una minigráfica, sin minimizar el entreno.
- **Cómo:**
  1. Lógica pura en `gym/lib/progreso.ts`: `historialEjercicio(series, workouts, exerciseId, antesDe)` con las 5 últimas sesiones terminadas comparables (fecha, mejor serie con `textoMejorSerie`, RIR medio si hay) y los valores para `trazoMini` (8 sesiones). Récords vigentes con `gym/lib/records` (`acumularComparables`). Desde ADR 054 `claveComparacion` separa las máquinas por gimnasio: el historial enseña el gimnasio del entreno en curso y lo dice («En Gimnasio Centro»), con los nombres de `hooks/useNombresGimnasio`.
  2. `gym/components/HistorialEjercicioSheet.tsx` (Sheet compartida, solo lectura). La minigráfica es el SVG de `trazoMini`, **sin Recharts** (no debe entrar en la sesión).
  3. Fila nueva en el menú de `PanelEjercicio.tsx` (entre «Progresión» y «Liga»). Se abre en `onExited` del menú, como el resto de acciones.
  4. Datos: ya están en `EntrenoActivo` (`allSets`, `todosWorkouts`); pasarlos en `contexto`, sin lecturas nuevas.
- **Datos:** ninguno.
- **Tests:** la función pura (variantes y modos de carga no se mezclan, pendientes y calentamientos fuera, ejercicio sin historial).
- **Navegador:** 320/375/430 px en los dos temas; texto al 200 %.
- **Documentos:** `docs/features/gym.md` § Menú del ejercicio.

### [x] A6 · ENT-01 · Sustituir un ejercicio durante la sesión

> **Hecho (2026-10-23, PROCESO §200, PR #127).** Aprobado por Víctor en la página de previews A5–A9: «Cambiar también en la rutina» sin marcar por defecto y, con todo hecho, el nuevo entra con una serie. Las series movidas conservan sus reps (no las del objetivo) y toman los kg de la última vez del nuevo. `SelectorEjercicios` admite `titulo` y `verbo` para decir «Sustituir».

- **Tamaño:** M · **Rama:** `feat/a-sustituir-ejercicio`
- **Para la persona:** «Sustituir» en el menú del ejercicio propone 5 alternativas (mismo músculo principal, las ya hechas y del mismo material primero, con su última vez) y «Buscar otro…». Al elegir, las series sin marcar pasan al nuevo ejercicio; las marcadas se quedan. Deshacer en el aviso.
- **Cómo:**
  1. Alternativas: reutilizar `liga/lib/alternativas.ts` (`alternativas(e, locales, ligas)`), que hoy solo se calcula en Élite. Ojo: excluye los ejercicios en Élite; para sustituir conviene una variante que no los excluya (parámetro opcional `incluirElite`). Añadir «Última vez: 3 × 10 · 40 kg» con `seriesSesionAnterior`.
  2. Escritura nueva en `gym/data/workoutsRepo.ts`: `sustituirEnSesion(workoutId, de, seleccion)` en **una transacción** (`workouts`, `sets`, `exercises`): resuelve el ejercicio nuevo (como `exercisesRepo.resolverSeleccion`), cambia `exerciseId` de las series de `de` no realizadas; reps del objetivo; kg del último uso efectivo del nuevo o los de `valoresNuevaSerie` si nunca se hizo; sin RIR. Si `de` se queda sin series y viene de la rutina, lo añade a `ejerciciosOmitidos`. En `ordenEjercicios` pone el nuevo en el sitio de `de`. Devuelve una captura para deshacer (patrón de `quitarEjercicio`/`restaurarEjercicio`). Si no hay pendientes, añade el nuevo con una serie.
  3. Casilla «Cambiar también en la rutina» (sin marcar por defecto) → `routinesRepo.sustituirEjercicio` (ya existe, transaccional).
  4. UI: `gym/components/SustituirEjercicioSheet.tsx`; «Buscar otro…» abre el `SelectorEjercicios` tras cerrar la hoja (`onExited`). Bloqueo de toques duplicados y espera de escrituras pendientes, como `useQuitarEjercicio`.
  5. Las marcas de sesión (`session.completed`) de las series movidas se conservan: no cambian sus ids.
  6. Historial por gimnasio (ADR 054, `gym/lib/gimnasios`): las series movidas recalculan su `gimnasioId` según si el ejercicio nuevo depende de la máquina, y los kg salen de `setsRepo.previaEnGimnasio`, como en `agregar`.
- **Datos:** sin campos nuevos. Récords, liga y mapa siguen saliendo de `exerciseId` de cada serie.
- **Tests:** `workoutsRepo` con fake-indexeddb: mueve solo las pendientes, deshacer restaura ids/orden/omitidos, fallo a mitad no deja nada a medias; alternativas con y sin Élite.
- **Navegador:** sustituir con 2 de 3 series hechas, deshacer, recargar; con rutina marcada, comprobar la rutina.
- **Documentos:** `docs/features/gym.md` (menú del ejercicio y repositorio) y `docs/features/liga.md` (la función de alternativas se usa también fuera de Élite).

### [-] A7 · ENT-05 · Calentamiento en rampa

> **Descartado por Víctor (2026-10-23)** en la página de previews A5–A9 (hoy 20 y 20 kg; propuesta 40 y 62,5 kg antes de 82,5). No se implementa.

- **Tamaño:** M · **Rama:** `feat/a-calentamiento-rampa`
- **Para la persona:** al empezar una rutina con calentamientos, sus cargas suben hacia la primera serie efectiva, redondeadas a discos reales.
- **Cómo:**
  1. Función pura `rampaCalentamiento(cargaEfectiva, n, barraKg)` en `gym/lib/discos.ts` (o un `lib/calentamiento.ts` nuevo) que reparte porcentajes crecientes y redondea con la calculadora de discos existente. Solo carga externa bilateral; en corporal, lastre o asistencia se queda como hoy.
  2. En `workoutsRepo.empezar`, donde se crean las series de calentamiento, usar la rampa en lugar de copiar el último calentamiento cuando la carga efectiva propuesta haya cambiado. Reps: las del último calentamiento o, si no hay, las del objetivo.
  3. Explicación en la ayuda del propio ejercicio (`gym/lib/ayudaCifras.ts` o la hoja de la serie): «Criterio de AppFit, no un método publicado». Llevarlo a Referencias sería un cruce con B; solo si Víctor lo pide.
- **Decidir (D7):** los porcentajes (propuesta: 1 calentamiento 60 %; 2 → 50 y 75 %; 3 → barra vacía, 55 y 80 %).
- **Datos:** ninguno nuevo.
- **Tests:** la función (redondeo, mínimos, barra de 15/10 kg) y `empezar` con y sin historial.
- **Navegador:** rutina con 2 calentamientos en press banca.
- **Documentos:** `docs/features/gym.md` § Objetivos de rutina.

### [x] A8 · PRO-03 · Tendencia de series por músculo

> **Hecho (2026-10-23, PROCESO §202, PR #128).** Aprobado por Víctor en la página de previews A5–A9. Las semanas salen de `calcularMusculo` (campo `ultimasSemanas`), el mismo cálculo que «Esta semana», en lugar de una función aparte. Bajo cada barra, solo el día del lunes (con letra al 200 % las fechas completas se partían).

- **Tamaño:** M · **Rama:** `feat/a-tendencia-musculo`
- **Para la persona:** en el detalle de un músculo del mapa de progreso, barras de las últimas 8 semanas con la dosis de AppFit marcada y la semana actual distinguida.
- **Cómo:** `gym/lib/progresoMuscular.ts` ya calcula crédito por semana y músculo; exponer `seriesPorSemana(aportes, musculo, semanas = 8)` (directas e indirectas × 0,5). Componente SVG propio en la hoja de detalle de `MapaProgreso` (sin Recharts), línea de dosis (10 o 6), etiquetas de semana («6 oct») y tabla accesible alternativa.
- **Datos:** ninguno.
- **Tests:** la función (semanas vacías, semana en curso, pausas).
- **Navegador:** detalle de pecho y de gemelos; 320 px y texto al 200 %.
- **Documentos:** `docs/features/gym.md` § Mapa de progreso.

### [x] A9 · ENT-10 · Fin de sesión ordenado por momentos

> **Hecho (2026-10-23, PROCESO §203, PR #129).** Aprobado por Víctor en la página de previews A5–A9. D9: hitos en el orden récords, subida muscular, cumbre, liga y logros (primero uno de cada tipo y, si sobra sitio, más); sale abierto el primer bloque con contenido. **Cruce X4 no hecho:** B8 (cálculo derivado único) aún no está en `master`; la página lee Cumbres/Vitrina y Ligas una vez para hitos y resúmenes, y los bloques de B (que calculan lo suyo) solo se montan al abrirlos. `scripts/ui/validar-mapa-muscular.cjs` ya fallaba en `master` antes de este paso (no conoce el entreno minimizado ni el póster): queda como tarea aparte.

- **Tamaño:** L · **Rama:** `feat/a-fin-sesion`
- **Para la persona:** al terminar, arriba el póster con una franja «Hoy» de hasta tres hitos; debajo, bloques plegables con su resumen en una línea (Récords · Cuerpo · Cumbres y ligas · Vitrina); «Compartir» y «Volver a Entreno» siempre al final de la vista.
- **Cómo:**
  1. Lógica pura `hitosDeSesion(...)` en `gym/lib/fichaEntreno.ts`: récords (`summary.records`), subidas de nivel muscular (de `ProgresoSesion`/`progresoMuscular`), cumbre o metros (`cumbres/lib/cumbres.cumbreDeSesion`), cambios de liga (`liga/lib/liga.ascensosDeEntreno`) y piezas nuevas (`vitrina/lib/logros.logrosDeEntreno`). Todas son funciones puras: se importan, no se modifican.
  2. `gym/components/WorkoutFinished.tsx`: reordenar. El póster lleva la franja «Hoy» (componente nuevo `HitosSesion` en `gym/components`). Los bloques se envuelven en `Disclosure` (primitive existente) con su resumen en el título; solo uno abierto. Un solo muñeco: `ProgresoSesion` (con su antes → después de 600 ms) sustituye a las figuras del póster cuando aporta; la lista y metodología de `MapaMuscular` pasan al bloque «Cuerpo».
  3. `CumbreSesion`, `NuevosLogros` (de B) se usan tal cual dentro de los bloques; no se editan. `AscensosLiga` es de A y sí se puede ajustar.
  4. **Cruce X4 (opcional):** si B8 (almacén derivado) ya está en `master`, que los tres bloques lean de él en lugar de recalcular cada uno; si no, se queda como hoy y se anota aquí.
  5. Nada de confeti ni contadores animados (`DESIGN.md`).
- **Decidir (D9):** qué hitos entran en la franja y en qué orden (propuesta: récords, subida muscular, cumbre, liga, logros; máximo tres).
- **Datos:** ninguno.
- **Tests:** `hitosDeSesion` (sin hitos, más de tres, gamificación oculta) y test de componente de los plegables.
- **Navegador:** terminar un entreno con récord y subida de nivel; con la gamificación oculta; 320 px y Reduce Motion. `scripts/ui/validar-mapa-muscular.cjs` sigue en verde.
- **Documentos:** `docs/features/gym.md` § Récords y fin de sesión; `docs/DESIGN-SYSTEM.md` solo en su apartado de Entreno.

### [x] A10 · ENT-11 · Póster del entreno como imagen

> **Hecho (2026-10-23, PROCESO §206, PR #135).** Víctor lo aprobó en la página de previews A10–A14: la imagen lleva cifras, muñeco y la franja «Hoy», con «Hecho con AppFit» al pie (sin dominio). `svgPoster` recibe la geometría del muñeco (`CUERPOS[figura]`) en lugar de importarla, para que `lib/` no dependa de `components/`. En el historial, «Hoy» son los récords del entreno. Falta probar en iPhone la hoja de compartir (anotado en el roadmap).

- **Tamaño:** L · **Rama:** `feat/a-poster-imagen`
- **Para la persona:** «Guardar imagen» y «Compartir…» en el póster del fin de sesión y del detalle del historial; sin cuenta, por WhatsApp o Instagram.
- **Cómo:**
  1. Utilidad `gym/lib/exportarImagen.ts`: recibe un SVG en texto, lo pinta en un `canvas` de 1080 × 1350 y devuelve un `Blob` PNG. Saira se incrusta como `@font-face` con data URI leída de `/fonts/` (mismo origen, sin red externa). Pensada para reutilizarse (cruce X3 con B).
  2. `gym/components/PosterImagen.tsx`: compone el póster en SVG con los colores resueltos del tema (no variables CSS: el canvas no las entiende) y el mapa.
  3. Compartir: `navigator.share({ files })` si `navigator.canShare` lo admite; si no, descarga con `<a download>` (ya se usa para el backup).
  4. Solo datos del entreno (título, fecha, duración, volumen, series, mapa, récords). Nada del perfil.
- **Datos:** ninguno.
- **Tests:** la composición del SVG es pura y testeable (textos, escapes, colores por tema); la conversión a PNG se prueba en navegador.
- **Navegador:** Chromium (descarga) y, en móvil real, la hoja de compartir. Dejar anotado en el roadmap que falta iPhone.
- **Documentos:** `docs/features/gym.md`; avisar en `docs/arquitectura.md` (párrafo de Entreno) de que la utilidad existe para otros carriles.

### [x] A11 · REN-04 · Importar TCX (y FIT después)

> **Hecho (2026-10-23, PROCESO §204, PR #133).** Víctor lo aprobó en la página de previews A10–A14: se guarda como importada (`origen: 'gpx'`, sin cambiar datos) y se prueba con archivos sintéticos (Garmin con vueltas y GPS, y cinta sin posiciones) en `tcx.test.ts`. Distancia y tiempo salen de las vueltas del dispositivo. FIT queda en el roadmap.

- **Tamaño:** M · **Rama:** `feat/a-importar-tcx`
- **Para la persona:** en Actividades, «Importar» acepta archivos `.tcx` además de `.gpx`.
- **Cómo:** `actividades/lib/tcx.ts`, parser sin DOM ni librerías como `gpx.ts` (Trackpoints con tiempo, posición y altitud; `DistanceMeters` si viene). Reutiliza `geo.ts` y `resumirGpx` adaptado. El input de archivo acepta las dos extensiones. **FIT** es binario: va en otro paso solo si Víctor lo pide (necesitaría un parser propio o una dependencia aprobada).
- **Datos:** ninguno (`origen` sigue siendo `'gpx'`, o `'tcx'` si se amplía `OrigenActividad`: eso es `shared/db/types.ts`, de B; mejor mantener `'gpx'` con el nombre de la fuente en `nombre` y decidirlo con Víctor).
- **Tests:** archivos TCX reales anonimizados de Garmin y Strava en `src/test/fixtures/`.
- **Documentos:** `docs/features/actividades.md`; quitar la línea de `docs/roadmap.md`.

### [x] A12 · ENT-09 · Fichas de técnica de los ejercicios

> **Hecho (2026-10-23, PROCESO §207, PR #136).** Víctor lo aprobó con cambios en la página de previews A10–A14 (D10): textos redactados por mí («claves de AppFit», él los revisa) y un solo lote con **todos** los ejercicios (268), no los 40 más usados. Los textos van por grupo muscular en `gym/lib/fichas/` y `fichasEjercicios.ts` los junta. **Pendiente:** la ilustración a 384 px (los originales de `scripts/ejercicios/ia/` no están en el repositorio); la ficha usa la miniatura de 192 px. El botón del buscador pasa debajo de la fila con letra muy grande para no estrecharla.

- **Tamaño:** L, por lotes · **Rama:** `feat/a-fichas-ejercicio` (y `-lote-2`, `-lote-3`…)
- **Para la persona:** botón «i» en el selector y en la cabecera del panel que abre la ficha: ilustración grande, muñeco con músculos principales y secundarios, 3 claves de ejecución, 2 errores comunes, material, alternativas y, si hay datos, la última vez y el récord.
- **Cómo:**
  1. Datos editoriales aparte del catálogo para no engordar el arranque: `gym/lib/fichasEjercicios.ts` (`Record<catalogId, { claves: string[]; errores: string[] }>`), cargado con `import()` al abrir la ficha.
  2. `gym/components/FichaEjercicio.tsx` (ModalPage). Muñeco con `MapaMuscular` en modo «ejercicio» (principal = nivel alto, secundario = medio). Alternativas con la función de A6.
  3. Ilustración a 384 px: ampliar la tubería `scripts/ejercicios/` para generar una segunda resolución (precache no; `CacheFirst` como las miniaturas).
  4. Primer lote: los 40 ejercicios más usados (los básicos de `liga/lib/basicos.ts` y los de los patrones principales del creador). Ejercicios sin ficha: la ficha sale igual, sin claves.
  5. Test que vigile que cada `catalogId` de las fichas existe en el catálogo.
- **Decidir (D10):** quién revisa los textos y con qué fuentes (sin fuente, se presentan como «claves de AppFit», como el resto de criterios).
- **Documentos:** `docs/features/gym.md` y `scripts/ejercicios/README.md`.

### [x] A13 · SOC-02 · Compartir una rutina para guardarla

> **Hecho (2026-10-23, PROCESO §205, PR #134, [ADR 055](../decisiones/055-rutina-compartida.md), migración 0022).** Víctor lo aprobó en la página de previews A10–A14 («ahora, con su ADR y la migración 0022»). Cada ejercicio lleva su `catalogId` (`null` si es propio); al guardar, los propios se eligen del buscador o se quitan. «Compartir rutina» solo aparece cuando el servidor anuncia `rutinaCompartida`: Víctor ejecutó 0022 en el SQL Editor el 2026-10-23 («Success»).

- **Tamaño:** L · **Rama:** `feat/a-rutina-compartida` (+ migración `0022_…`)
- **Para la persona:** publicar la estructura de una rutina (ejercicios, series, rangos, descansos, calentamientos); quien la ve pulsa «Guardar en mis rutinas», revisa y la guarda con sus propias cargas.
- **Cómo:** plan F3-2 de `docs/social-mejoras.md`. Tipo de resumen nuevo `rutina` en `social/lib/publicacion.ts` con `catalogIds` (ya existen desde 0020). Orden de despliegue de siempre: primero el **lector** (los clientes viejos descartan el tipo sin romper la paginación) y después la migración del validador del servidor. «Guardar en mis rutinas» escribe con `routinesRepo.guardar`; los ejercicios propios sin `catalogId` piden elegir uno del catálogo (`SelectorEjercicios`).
- **Decidir (D11):** ADR para lo que sale del móvil (la estructura de la rutina; nunca cargas) y si va antes o después de la fase 6 legal.
- **Tests:** construir, validar y leer el resumen; guardar en rutinas con fake-indexeddb; SQL en `supabase/pruebas/`.
- **Documentos:** `docs/features/social.md`, `docs/social-mejoras.md` (F3-2 hecho), ADR nuevo.

### [x] A14 · SOC-01 · Semana en compañía

> **Hecho (2026-10-23, PROCESO §216, [ADR 057](../decisiones/057-semana-en-compania.md), migración 0024).** Con las decisiones D11 de Víctor (su plan de Ritmo, lunes–domingo local, mutuos en grupos de 2 o 3, continua hasta pausa o salida). Una sola PR en lugar de tres: lector, SQL e interfaz van juntos porque la tarjeta solo aparece cuando el servidor anuncia `semanaCompania`. Sin avisos al principio; los añade A19. Víctor ejecutó 0024 en el SQL Editor el 2026-10-23. **Pendiente de Víctor:** organizar el piloto de 3–4 semanas con parejas.

- **Tamaño:** XL, con piloto · **Rama:** varias (`feat/a-companeros-lector`, `feat/a-companeros-sql`, `feat/a-companeros-ui`)
- **Para la persona:** dos o tres personas aceptan acompañarse una semana; cada una cuenta contra su plan de Ritmo y ve a las demás («Laura · 2 de 3») con un «Ánimo» desde la fila. Sin ranking ni castigos.
- **Cómo:** plan F3-1 de `docs/social-mejoras.md`. El agregado se calcula en el móvil con `ritmo/lib/ritmo` (lectura, sin modificarlo): sesiones que cuentan / objetivo de la semana, compartido a propósito. Tablas y RPC nuevas con RLS en una migración; invitación, aceptación, pausa y salida sin reproche.
- **Decidir (D11):** ADR (cambia lo que sale del móvil), qué cuenta como sesión, zona horaria, y piloto de 3–4 semanas con parejas.
- **Documentos:** ADR nuevo, `docs/features/social.md`, `docs/social-mejoras.md`.

### [ ] A15 · SOC-03 · Expediciones de comunidad

- **Tamaño:** XL · **Depende de:** A14 validado en piloto
- **Para la persona:** una comunidad recorre junta una ruta de Caminos («Camino Francés · 412 de 764 km») con lo que cada miembro aporta a propósito, con tope por persona y semana y sin ranking interno.
- **Cómo:** plan F3-5. Rutas y etapas de `caminos/lib/rutas.ts` (lectura). Agregado autodeclarado como en A14.
- **Decidir (D11).**

---

## Cruces

### [x] A-X1 · NAV-02 · «Volver» en Amigos

> **Hecho (2026-10-23, PROCESO §212).** Víctor lo aprobó en la página de previews de los cinco siguientes. «‹ Social» sale también en Amigos sin sesión y con error; la línea de `App.tsx` es la única del cruce.

- **Tamaño:** S · **Depende de:** B4 en `master` (prop `volver` de `PageHeader`).
- **Cómo:** `social/AmigosTab.tsx` recibe una prop `onVolver` y pasa `volver={{ etiqueta: 'Social', onVolver }}` a su `PageHeader`. Excepción pactada a la regla de carpetas: este paso puede cambiar **solo** la línea de `src/app/App.tsx` que monta `AmigosTab` para pasarle `onVolver={() => navegar('social')}`.
- **Documentos:** `docs/features/social.md`.

### [ ] A-X2 · GAM-04 · Línea de la meta en la gráfica del ejercicio

- **Tamaño:** S · **Depende de:** B13 en `master` (metas en `Settings` y su lógica pura).
- **Cómo:** en `gym/pages/Progreso.tsx` (desde §187 con tarjetas de variante y selector de gimnasio), si hay una meta de récord para el ejercicio elegido y la métrica coincide, `ReferenceLine` discontinua con su cifra y fecha, y una fila «Meta: 100 kg antes del 31 dic» bajo la cifra principal. Solo lectura de la meta (la escribe B).
- **Documentos:** `docs/features/gym.md` § Progreso.

## Pasos añadidos (2026-10-23)

Víctor aprueba en la página de previews de los cinco siguientes tres mejoras del roadmap de este carril que no estaban en el plan, además de A14 (sus decisiones D11: objetivo = su propio plan de Ritmo de esa semana; semana de lunes a domingo en la hora local de cada uno; solo personas que os seguís mutuamente, grupos de 2 o 3; continua semana tras semana hasta que alguien pausa o sale) y A-X1. Orden: A16, A17, A18 y después A14.

### [x] A16 · ENT-16 · Gemelos en el asistente de rutinas

> **Hecho (2026-10-23, PROCESO §213).** `conGemelos` en `generarPlan`; el test recorre todas las combinaciones de días, material, objetivo y tiempo.

- **Tamaño:** S · **Rama:** `feat/a-creador-gemelos`
- **Problema:** con sesiones de 45 min el asistente nunca propone gemelos, y con 2–3 días solo a 75 min (simulado con todas las combinaciones de `generarPlan`).
- **Decisión de Víctor:** siempre un ejercicio de gemelos a la semana (3 series), aunque alargue un poco la sesión.
- **Cómo:** en `gym/lib/creadorRutinas`, tras repartir, si ningún día trae gemelos se añade uno en el día de pierna (o de cuerpo completo) con menos series. Test de todas las combinaciones.

### [x] A17 · REN-04 · Importar FIT

> **Hecho (2026-10-23, PROCESO §214).** Lector propio en `actividades/lib/fit.ts`; `lib/importar.ts` elige el formato. Sin probar con un .fit real de un reloj: los tests y el recorrido usan archivos sintéticos.

- **Tamaño:** M · **Rama:** `feat/a-importar-fit`
- **Decisión de Víctor:** lector propio, sin dependencias.
- **Cómo:** `actividades/lib/fit.ts` lee el binario (cabecera, mensajes de definición y de datos; `record`, `lap`, `session` y `sport`) y devuelve el mismo `ResumenGpx` que GPX y TCX; `resumirArchivoActividad` lo elige por la cabecera `.FIT`. Tests con archivos sintéticos construidos en el test.

### [x] A18 · SOC-04 · Compartir tu semana de Ritmo

> **Hecho (2026-10-23, PROCESO §215, [ADR 056](../decisiones/056-compartir-la-semana-de-ritmo.md), migración 0023).** El punto de entrada es el compositor de Social («Tu semana»), no Ritmo, que es del carril B. Con la gamificación oculta solo se ofrecen «Estoy retomando» (sin cifras) y «En pausa». **Víctor ejecutó 0023 en el SQL Editor el 2026-10-23, después de desplegar la app.**

- **Tamaño:** M · **Rama:** `feat/a-semana-ritmo` (+ migración `0023_…`)
- **Decisión de Víctor:** con la opción «Estoy retomando» / «En pausa»; antes de A14, para probar el formato.
- **Cómo:** plan F3-3 de `docs/social-mejoras.md`. Tipo de resumen nuevo `semana` (días hechos frente al plan, hilo de semanas o el estado), calculado con `ritmo/lib/ritmo` (lectura); lector primero y migración del validador después, como A13. ADR corto.

## Tanda 5 (2026-10-23)

Víctor decide en la página de previews de los cinco siguientes (A19–A23): implementar A19, A21, A22 y A23, y descartar A20. Orden: A23, A19, A22 y A21.

### [x] A19 · SOC-05 · Avisos de la semana en compañía

> **Hecho (2026-10-23, PROCESO §219, migración 0025).** Las invitaciones no son eventos sino un recuento aparte (`avisos().companias`), como las solicitudes: cuentan hasta responderlas y salen arriba de Avisos con «Aceptar»/«Rechazar». El ánimo sí es un evento (`animo_compania`), agrupado por grupo. **Pendiente de Víctor:** ejecutar 0025.

- **Tamaño:** M · **Rama:** `feat/a-avisos-compania` (+ migración `0025_…`)
- **Decisión de Víctor:** avisan la invitación y el ánimo.
- **Cómo:** `social_eventos` y `avisos` con dos tipos nuevos; la invitación arriba de Avisos con «Aceptar»/«Rechazar» y en el contador; el ánimo entre los avisos del día. Pausar o salir nunca avisa.

### [-] A20 · SOC-06 · Invitación por enlace o QR

> **Descartado (2026-10-23).** Víctor lo descarta en las previews (F3-4 de `social-mejoras.md`). Se sigue invitando con el código.

### [x] A21 · ENT-17 · Superseries

> **Hecho (2026-10-23, PROCESO §221).** El campo `superseries` no se añade a `shared/db/types.ts`: lo declara `gym/lib/superseries` y lo escriben solo los repos de gym (regla del carril). Los calentamientos quedan fuera de la ronda. El filete de la sección es superior para no estrechar los paneles. **Aparte:** con el texto al 200 % a 375 px, el título y el grupo del panel de un ejercicio ya se partían letra a letra antes de A21; queda anotado en el roadmap.

- **Tamaño:** L · **Rama:** `feat/a-superseries`
- **Decisiones de Víctor:** en la sesión y en la rutina; de dos ejercicios; descanso al terminar la ronda.
- **Cómo:** campo opcional en el entreno y la rutina (sin índice ni versión nueva de Dexie); orden de la ronda en `gym/lib/session`; récords, liga y mapa no cambian.

### [x] A22 · SOC-07 · Moderar comunidades desde la app

> **Hecho (2026-10-23, PROCESO §220, migración 0026).** Sin casilla «Avisar»: se avisa siempre que se actúa (borrar, suspender o cerrar) y nunca al descartar. Las comunidades suspendidas se reactivan desde Suspendidos. **Pendiente de Víctor:** ejecutar 0026.

- **Tamaño:** M · **Rama:** `feat/a-moderar-comunidades` (+ migración `0026_…`)
- **Decisión de Víctor:** avisar a quien denunció, sin detalles.
- **Cómo:** en el panel Moderación, suspender (reversible) o cerrar una comunidad denunciada; aviso «Revisamos tu denuncia y hemos actuado».

### [x] A23 · ENT-18 · Hito redondo en el póster

> **Hecho (2026-10-23, PROCESO §218).** Víctor elige los números de entrenos: 10, 25, 50, 100, 250, 500 y 1.000. Cuentan todos los entrenos terminados por su inicio (no los del logro «Entrenos» de la Vitrina, que pide un mínimo de series). Solo al terminar, no en el historial: allí el número cambiaría si se registra después un entreno anterior.

- **Tamaño:** M · **Rama:** `feat/a-hito-poster`
- **Cómo:** `gym/lib/fichaEntreno.hitoDeEntrenos` y `textoDesde`, `hooks/useHitoEntrenos`; la cifra encima del título en `PosterSesion` y en `posterImagen.svgPoster`.

## Tanda 6 (2026-10-23)

Víctor decide en la página de previews A24–A28: implementar A24 (mejor ritmo en salidas de 5 km o más; todas las actividades juntas) y A28 (guardar la hora de cada punto desde ahora), y descartar A25 (nota fija), A26 (rest-pause) y A27 («depende de la máquina» a mano).

### [ ] A24 · ACT-01 · Tus mejores marcas en Actividades

- **Tamaño:** M · **Rama:** `feat/a-mejores-marcas`
- **Decisiones de Víctor:** el mejor ritmo cuenta salidas de 5 km o más; todas las actividades juntas, sin separar por tipo.
- **Cómo:** puro en `actividades/lib` a partir de las actividades guardadas (solo lectura); bloque arriba de Actividades y aviso al guardar una que bate una marca.

### [-] A25 · ENT-19 · Nota fija por ejercicio y gimnasio

> **Descartado (2026-10-23).** Víctor lo descarta en las previews A24–A28.

### [-] A26 · ENT-20 · Rest-pause

> **Descartado (2026-10-23).** Víctor lo descarta en las previews A24–A28.

### [-] A27 · ENT-21 · «Depende de la máquina», a mano

> **Descartado (2026-10-23).** Víctor lo descarta en las previews A24–A28; sigue deduciéndose del material.

### [ ] A28 · ACT-02 · Parciales por km

- **Tamaño:** M-L · **Rama:** `feat/a-parciales-km`
- **Decisión de Víctor:** guardar la hora de cada punto desde ahora (las actividades anteriores no tienen parciales).
- **Cómo:** la hora de cada punto en el recorrido de las grabaciones e importaciones nuevas (campo opcional del punto, declarado en `actividades/lib`, sin tocar `shared`); parciales puros en `actividades/lib` y la tabla en el detalle.
