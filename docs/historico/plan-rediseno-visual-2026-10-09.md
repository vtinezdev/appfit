# Plan: rediseño visual v2

Aprobado por Víctor el 2026-10-09 tras comparar propuestas con capturas de la versión actual. **Ejecutado el mismo día** en la rama `feat/rediseno-visual` (PROCESO §97); histórico, no normativo: el estado vigente está en los documentos vivos.

- Propuestas originales (maquetas, paletas y referencias de otras apps): https://claude.ai/artifact/75BKyzKN8AwHYL8hadCAKg
- Comparativa con capturas reales y notas de Víctor: https://claude.ai/artifact/39m66BVY1JFMJ7mE11Mw4z

Los enlaces son privados de Víctor. Este documento es autosuficiente: recoge todo lo decidido.

## Marco

- **Paleta: sin cambios** (grafito y naranja, ADR 020). Tipografía Saira, tokens y primitives actuales. Ninguna dependencia nueva.
- Se mantienen las reglas de `CLAUDE.md` y `DESIGN.md`: datos inmediatos, sin rachas ni cifras inventadas, controles ≥44 px, campos ≥16 px, validar a 320/375/430 px en ambos temas.
- **Reduce Motion**: las animaciones nuevas existen siempre. Solo se sustituyen por un cambio directo si el iPhone tiene activado *Ajustes › Accesibilidad › Movimiento › Reducir movimiento* (regla de `DESIGN.md`, Navegación y motion).
- **Sin cambios de esquema.** Todo sale de tablas y repos existentes (`workoutsRepo`, `setsRepo`, `routinesRepo`, `entriesRepo.entreFechas`, `objetivosDiaRepo.objetivosPorFecha`, `pesosRepo`, `aguaRepo`, `muscleSnapshot`). Si alguna fase acaba necesitando un campo nuevo, seguir las reglas de `shared/db/db.ts` y `backup.ts`.
- Lógica nueva (cuantizar volumen, «Anterior» por serie, cifras clave de progreso, semana de kcal…) en funciones puras con tests al lado; los componentes solo componen.

## Cambios aprobados

### NV2 · Navegación con pestañas y «+» central

Sustituye el Menú en abanico (`app/BottomNav.tsx`, `app/RuedaNavegacion.tsx`, `app/navegacion.ts`).

- Barra de pestañas fija: **Inicio · Nutrición · [+] · Entreno · Más**, con safe area inferior.
- **«+» central** (naranja) abre una Sheet de acciones rápidas: Registrar comida, Empezar entreno (o «Volver al entreno» si hay uno activo), Registrar peso y Añadir agua. Reutiliza los flujos actuales (`AnadirComida`, `RegistrarPesoSheet`, `AguaSheet`, `workoutsRepo.empezar`).
- **Más** da acceso a Perfil, Referencias y Ajustes.
- **Se quita el botón ancho «Registrar comida»** de Inicio (`InicioTab.tsx:130`).
- Reabre [ADR 008](decisiones/008-menu-radial.md) y [ADR 018](decisiones/018-menu-de-seis-destinos.md): escribir un ADR nuevo que los sustituya. Actualizar `DESIGN.md` (Navegación y motion, The Acento Rule), `docs/DESIGN-SYSTEM.md` y `docs/arquitectura.md` (navegación). Revisar `RuedaNavegacion.test.tsx` y `scripts/ui/navegar.cjs` / `validar-menu-radial.cjs`.

### I3 · Inicio en mosaico

- **La tarjeta de energía se queda como la actual** (rueda, objetivo, «Quedan…», gramos de P/C/G): Víctor la prefiere a la de la maqueta.
- **Peso**: cifra, variación a 7 días y una minigráfica de los últimos pesajes con el último punto marcado. Es un SVG propio, porque Recharts no entra en Inicio (ver `docs/features/inicio.md`). Puede usar `mediaMovilPeso`.
- **Agua**: cifra y un vaso que se llena con la proporción respecto al objetivo, conservando el −/+. Sin objetivo, el vaso se muestra sin nivel o se omite (ver preguntas).
- **Último entreno** (tarjeta ancha): nombre de la rutina, «Ayer · 52 min · 6.420 kg», el **mapa muscular frontal y trasero en miniatura** (geometría de `mapaMuscularGeometria`, niveles de `lib/cargaMuscular` con el `muscleSnapshot`) y el músculo más trabajado en texto («Pecho y espalda, lo más trabajado»).
- Se conservan la revisión semanal, el aviso de copia y que cada tarjeta abra su sección. Actualizar [ADR 021](decisiones/021-inicio-minimalista-rueda-energia.md) (sin botón ancho; tarjetas con dato propio).

### N1 · Nutrición: semana arriba y carriles

- **Franja de semana arriba del todo** (L–D): cada día con una barrita de kcal frente a la línea de su objetivo (`objetivosPorFecha`; los días sin snapshot usan el vigente, como el Resumen). El día seleccionado va resaltado y en naranja; los días futuros, atenuados y sin acción. Tocar un día lo abre. Sustituye a la navegación ‹ Hoy ›, pero hay que poder ir a semanas anteriores y conservar «Copiar el día» (el «…»).
- **Carriles** en lugar del panel actual de kcal: Energía, Proteína, Hidratos y Grasa, cada uno con barra, marca de objetivo y «1.340 / 2.200».
- **Vista detallada**: debe seguir siendo accesible (hoy es el SegmentedControl «Vista sencilla / Vista detallada» dentro del resumen). Lo natural es dejarlo dentro de la tarjeta de carriles.
- **De Desayuno hacia abajo, todo igual que ahora**: cabeceras de comida, registros, platos, Repetir y acciones. Se descartan las comidas plegadas de la maqueta.

### E1 · Entreno activo: tabla con «Anterior»

En `pages/EntrenoActivo.tsx` y `components/PanelEjercicio.tsx`, compartido con el editor del historial:

- **Columna «Anterior»** en cada fila: reps × kg de la serie con el mismo orden en la última sesión de ese ejercicio (de `historico`, que ya se carga para «Última vez»). Rejilla: Serie · Anterior · Reps · Kg · RIR · ✓ (amplía [ADR 027](decisiones/027-registro-de-series-en-la-fila.md); anotarlo allí). A 320 px, si no cabe, «Anterior» pasa a una segunda línea bajo la fila. Hay que definir qué se muestra con filas hijas (lados o bajadas) y calentamientos.
- **Miniatura** del ejercicio en la cabecera de cada panel (`MiniaturaEjercicio`). Bajo el nombre, **músculo principal · material** («Pecho · barra»).
- **Cabecera de grafito fija** (sticky) con rutina, tiempo, volumen, series y Terminar.
- **Descanso flotante**: mientras corre el descanso, una píldora sobre la barra inferior con el tiempo restante, una barra de progreso y los botones **−15 / +15 / Saltar**. Ajustar el deadline en `lib/session.ts`, con tests. La configuración (apagado/60/90/120 s) sigue donde está.
- La etiqueta «Récord» en la fila no se marcó: no entra.

### M3 · Serie hecha que se rellena

- Al tocar ✓, el fondo de éxito recorre la fila de izquierda a derecha (~200 ms) y el check cambia a la vez. Al terminar, la **fila entera** queda tintada con `success-subtle` (hoy solo cambia el botón).
- Con Reducir movimiento: cambio directo, sin recorrido.
- Desmarcar quita el tinte. Hay que comprobar que no afecta al anuncio accesible ni a `SetEntry.realizada`.

### F1 · Póster de sesión al terminar (y en el detalle)

En `components/WorkoutFinished.tsx` y la cabecera de `pages/DetalleEntreno.tsx`:

- **Nombre de la rutina en display gigante** (o «Entreno libre»), con **fecha y hora de inicio a fin** («vie 9 oct · 18:05 – 18:57»).
- **Tres cifras separadas por filetes**: duración, volumen y series.
- **Mapa frontal y trasero juntos y grandes**, con la **leyenda de la rampa** (Menos … Más series).
- **Récords** de la sesión debajo, con los datos de `detectarRecords`.
- El mismo póster en el detalle del historial.
- Se mantienen la lista de grupos por nivel, las filas táctiles de ≥44 px y «Cómo se estima el trabajo»: el mapa no puede depender solo del color (`DESIGN.md`).

### H1 · Historial con calendario

En `pages/Historial.tsx`:

- **Calendario mensual** con flechas de mes. Cada día entrenado se rellena con la rampa `muscle-1…5` según su volumen, cuantizado respecto al mes (función pura con tests). **Hoy con contorno.** Sin contador de días seguidos.
- **Resumen de la semana** debajo (sesiones, tiempo y volumen: `lib/resumenSemanal`).
- **Lista de sesiones** debajo, con el formato actual.
- **Corregir el orden de la lista**: hoy sale de la más antigua a la más reciente. `workoutsRepo.terminados()` ya devuelve en orden descendente (`reverse().sortBy('inicio')`) y `Historial.tsx:29` lo vuelve a invertir. Confirmarlo con un test antes de tocarlo.

### P1 · Progreso con gráfica «con firma»

En `pages/Progreso.tsx`, con Recharts diferido:

- **Ejercicio con miniatura arriba** (nombre y «8 sesiones · desde el 18 ago»), manteniendo la forma de elegir otro ejercicio.
- **Selector de métrica segmentado** (1RM est. / Peso máx. / Volumen…), en lugar de las fichas de mostrar u ocultar. `ChartVisibility` también lo usa `nutricion/pages/Resumen.tsx`: no romperlo allí.
- **Área suave bajo la línea** (~12 %), **último valor rotulado en grande** y eje ceñido a los datos (como ahora).
- **Tres cifras clave**: mejor serie, 1RM estimado y cambio en el periodo.
- **Lista de sesiones** con su mejor serie y su valor.
- El selector de tipo de carga se conserva cuando aplica.

### M7 · Rutinas con miniaturas

En `pages/Rutinas.tsx`:

- Cada rutina como unidad con un **mosaico de miniaturas** (las 4 primeras, más «+N»), **series totales** (de `objetivos`) y **último día** que se hizo (último terminado con ese `routineId`).
- **Botón Empezar** en cada rutina (`workoutsRepo.empezar(routineId)`). Comprobar qué pasa si ya hay un entreno activo.
- **Miniatura en cada panel de la sesión**: la cubre E1.

## Orden sugerido

Una rama `feat/<tema>` por fase desde `master`, con `npm run test` y `npm run build` en verde, y documentos vivos y `docs/PROCESO.md` al cerrar cada una.

1. **Entreno en sesión**: E1 + M3.
2. **Cierre e historial**: F1 + H1 (con el arreglo del orden) + P1.
3. **Rutinas**: M7.
4. **Navegación**: NV2, con su ADR. Va antes que Inicio porque le quita el botón ancho.
5. **Inicio**: I3.
6. **Nutrición**: N1.

## Preguntas para Víctor (respondidas el 2026-10-09)

Respuestas: 1) las acciones naranjas de cada pantalla pasan a neutro; 2) «Más» es una Sheet; 3) flechas junto a la franja para cambiar de semana y el selector Diario/Resumen/Alimentos igual; 4) el calendario sustituye a «Semanas» y tocar un día abre su sesión (con varias, baja a la primera en la lista); 5) una métrica cada vez; 6) se quita «Última vez»; además, «Anterior» empareja calentamientos con calentamientos, efectivas por su número y lados y bajadas con su par; 7) sin objetivo de agua, vaso vacío con «Sin objetivo».

Preguntas tal como se plantearon:

1. **Naranja con el «+» central**: la regla es «una sola acción naranja sólida por vista». Si el «+» va siempre en naranja, ¿se quedan en neutro las acciones naranjas de cada pantalla (el «+» de la cabecera de Nutrición, «Nueva rutina», «Empezar»)?
2. **Más**: ¿Sheet o página con Perfil, Referencias y Ajustes?
3. **N1**: ¿cómo se va a semanas anteriores (flechas junto a la franja o deslizar)? ¿Se mantiene el selector Diario/Resumen/Alimentos tal cual?
4. **H1**: ¿el calendario sustituye a la vista «Semanas» o conviven? ¿Tocar un día abre su sesión?
5. **P1**: ¿una métrica cada vez, o se puede seguir viendo 1RM y peso máximo juntos como hoy?
6. **E1**: con la columna «Anterior», ¿se quita la línea «Última vez: …» del panel?
7. **Agua sin objetivo** (sin sexo en Perfil ni ajuste): ¿vaso vacío, sin vaso o pedir el objetivo?

## Probar en navegador

Solo en `http://appfit-test.localhost:5173` (ver `docs/desarrollo.md`). Las capturas de la comparativa se hicieron sin Playwright: Edge sin interfaz con `--remote-debugging-port`, controlado por CDP desde un script de Node 24 (WebSocket nativo). Los datos se sembraron con `importarBackup` y los repos importados desde la página (`await import('/src/...')`), y la navegación se hizo pulsando botones por su nombre accesible («Menú», destino, pestañas). Es útil para comparar el antes y el después de cada fase.
