# Carril B · Inicio, Nutrición, navegación y progreso

Estado y orden de los pasos del carril B. Reglas comunes, reparto de carpetas, cruces y decisiones: [README](README.md). **Este archivo solo lo edita la sesión del carril B.**

Dueño de: `src/features/inicio/`, `nutricion/`, `perfil/`, `ritmo/`, `cumbres/`, `caminos/`, `vitrina/`, `experiencia/`, `referencias/`, `cuenta/`, `src/app/`, `src/shared/` y los documentos generales (`DESIGN.md`, `PRODUCT.md`, `docs/DESIGN-SYSTEM.md`, `docs/arquitectura.md`, `docs/datos.md`, ADR y los `docs/features/` de esas features). Es el único carril que crea versiones de Dexie y toca el backup. **No toca `gym/`, `liga/`, `actividades/` ni `social/`**: los usa tal cual; si hiciera falta cambiarlos, es un cruce con A.

Orden: de lo más pequeño y seguro a lo más grande. Tamaños: **S** (media sesión), **M** (una sesión), **L** (una o dos sesiones), **XL** (varias sesiones, con decisiones).

## Resumen

| Paso | ID | Mejora | Tamaño | Depende de | Estado |
|---|---|---|---|---|---|
| B1 | DOC-01 | Poner al día los documentos vivos | S | — | Hecho (2026-10-22) |
| B2 | NUT-06 | Tendencia de peso en Inicio | S | — | Hecho (2026-10-22) |
| B3 | NUT-09 | Aviso de coherencia energética | S | — | Pendiente |
| B4 | NAV-02 | «Volver» en las secciones anidadas | S | — | Pendiente |
| B5 | PRO-02 | Revisiones semanales desde Ritmo | S | — | Pendiente |
| B6 | NUT-03 | Registrar comida desde Inicio | M | — | Pendiente |
| B7 | GAM-01 | Teselas de progreso con la semana | M | — | Pendiente |
| B8 | REN-01 | Un único cálculo derivado | L | — | Pendiente |
| B9 | GLO-02 | Módulos activables | L | B7 | Pendiente |
| B10 | NUT-05 | «Cerrar el día» | M | — | Pendiente |
| B11 | PRO-01 | Lecturas cruzadas de entreno y nutrición | L | B2 | Pendiente |
| B12 | GAM-02 | Un solo destino «Progreso» | L | B4, B7 | Pendiente |
| B13 | GAM-04 | Metas personales | L | B12 | Pendiente |
| B14 | PRO-06 | Calendario único de registros | L | B12 | Pendiente |
| B15 | GAM-03 | Tu mes y tu año en AppFit | L | B8 (A10 para la imagen) | Pendiente |
| B16 | NUT-04 | Comidas planificadas y lista de la compra | XL | — (versión 14 de Dexie) | Pendiente |
| B17 | PRO-04 | Fotos de progreso privadas | XL | B16 (por la versión de Dexie) | Pendiente |

---

### [x] B1 · DOC-01 · Poner al día los documentos vivos

- **Tamaño:** S · **Rama:** `docs/b-documentos-vivos` · **Hecho:** 2026-10-22 (PR #117)
- **Qué corregir** (comprobado en la auditoría; manda el código):
  1. `docs/features/nutricion.md`, § Añadir comida: dice «Inicio abre este flujo directamente»; hoy la tarjeta de energía solo abre Nutrición (`inicio/components/TarjetaEnergia.tsx`).
  2. `DESIGN.md`: § Inicio describe «Tu semana» con anillos por día (retirada por ADR 043) y § Entrenamiento dice que Empezar pone arriba la rutina que más tiempo lleva sin hacerse (desde la PR #107 es «Empezar entreno» vacío, con las rutinas debajo).
  3. `PRODUCT.md`: dice «sin backend ni cuentas» y que el único usuario es Víctor; hoy hay cuenta opcional con copia cifrada, Social y apertura a otras personas.
  4. `docs/features/ritmo.md`, `cumbres.md`, `experiencia.md` y `vitrina.md` enlazan `atributos.md`, que no existe (Atributos se retiró, ADR 034). El de `gym.md` lo corrige A en A1.
  5. `docs/features/vitrina.md`, § Rendimiento: «La Vitrina solo se calcula en su página y al terminar un entreno»; también la calcula Inicio (`AccesoProgreso` usa `useVitrina`).
- **Documentos:** los de la lista y una entrada en `docs/PROCESO.md`.

### [x] B2 · NUT-06 · Tendencia de peso en Inicio

- **Tamaño:** S · **Rama:** `feat/b-tendencia-peso` · **Hecho:** 2026-10-22 (PR #119). Víctor eligió, tras la vista previa, que Peso ocupe su fila entera en el móvil.
- **Para la persona:** la tarjeta Peso enseña la media de 7 días como cifra principal y el ritmo («−0,3 kg/sem»), con el último pesaje en pequeño. Con pocos pesajes, se queda como hoy y lo dice.
- **Cómo:**
  1. En `inicio/lib/peso.ts` ya existe `mediaMovilPeso`. Añadir `ritmoSemanal(pesos, hoy)`: pendiente (regresión lineal) de la media móvil en los últimos 21 días, en kg/semana, solo con ≥ 4 pesajes que abarquen ≥ 14 días; si no, `null`.
  2. `inicio/components/AccesoPeso.tsx`: cifra principal = media de 7 días; segunda línea «−0,3 kg/sem» (o la variación actual si `ritmoSemanal` es `null`); «Último: 80,6 kg» en `caption`. Mismo tono neutro, sin acento ni colores de bien o mal.
- **Tests:** `peso.test.ts`: pesajes diarios, pesajes sueltos, menos de 4, días sin pesaje.
- **Navegador:** 320/375/430 px, los dos temas; tarjetas Peso/Agua apiladas por debajo de 18 rem.
- **Documentos:** `docs/features/inicio.md` § Peso y quitar la línea de `docs/roadmap.md` (Análisis).

### [ ] B3 · NUT-09 · Aviso de coherencia energética

- **Tamaño:** S · **Rama:** `feat/b-coherencia-kcal`
- **Para la persona:** al crear o corregir un alimento propio, si las kcal no cuadran con los macros, un aviso en línea lo dice y ofrece «Calcular kcal desde los macros». No bloquea.
- **Cómo:**
  1. Función pura `coherenciaEnergetica({ kcal100, prot100, carb100, grasa100 })` en `nutricion/lib/alimentos.ts`: compara con 4·P + 4·C + 9·G y avisa si la diferencia supera el 15 % y 20 kcal (la fibra, los polialcoholes y el alcohol explican diferencias pequeñas; el texto lo dice). La tubería del catálogo tiene una comprobación parecida (`scripts/catalogo/calidad.ts`): revisar sus umbrales para no contradecirlos.
  2. Aviso en «Detalles del alimento» de la revisión (`components/ItemRevisionRow.tsx`) y en el formulario de Alimentos. Solo para alimentos propios o valores editados; no para los del catálogo sin tocar.
- **Tests:** la función (cuadra, no cuadra, alcohol, valores a cero).
- **Documentos:** `docs/features/nutricion.md`; quitar la línea de `docs/roadmap.md` (Calidad de datos).

### [ ] B4 · NAV-02 · «Volver» en las secciones anidadas

- **Tamaño:** S · **Rama:** `feat/b-volver`
- **Para la persona:** Cumbres, Caminos, Ritmo y Vitrina tienen «‹ Inicio» y Referencias «‹ Ajustes»; al volver, el foco regresa a la tesela o fila de origen.
- **Cómo:**
  1. `shared/components/PageHeader.tsx`: prop opcional `volver?: { etiqueta: string; onVolver: () => void }` que pinta un botón de 44 px encima del título (patrón de «Volver» de `DetalleRutina`/`DetalleEntreno`, sin componente nuevo).
  2. `app/App.tsx`: pasar `onVolver` a `CumbresTab`, `CaminosTab`, `RitmoTab`, `VitrinaTab` (→ `navegar('inicio')`) y `ReferenciasTab` (→ Ajustes). Recordar el origen (`origenProgreso`) para que Inicio enfoque la tesela al montar.
  3. Amigos es de A (`social/AmigosTab.tsx`): lo hace A en el cruce A-X1, que puede tocar la línea de `App.tsx` que monta `AmigosTab`.
- **Tests:** `PageHeader` con y sin `volver` (`components.test.tsx`), y foco de vuelta.
- **Navegador:** `scripts/ui/navegar.cjs` sigue funcionando; Atrás del sistema igual que antes.
- **Documentos:** ADR 043 § Consecuencias (ya hay «Volver»), `docs/arquitectura.md` § Navegación, `docs/DESIGN-SYSTEM.md` (PageHeader).

### [ ] B5 · PRO-02 · Revisiones semanales desde Ritmo

- **Tamaño:** S · **Rama:** `feat/b-revisiones-ritmo`
- **Para la persona:** en Ritmo › Semanas, cada semana cerrada con datos tiene «Ver revisión», que abre la misma revisión semanal de Inicio, aunque ya se haya cerrado.
- **Cómo:** `ritmo/components/CalendarioSemanas.tsx` (hoy `{ ritmo, hoy }`) recibe `onVerRevision(lunes)`; el botón va en la lista de estados por semana (el desplegable textual), que ya es accesible, y opcionalmente en cada celda. `RitmoTab` monta `inicio/components/RevisionSemanal` con `React.lazy` (`{ lunes, hoy, onClose }`); la propia revisión ya navega por semanas.
- **Tests:** el calendario llama a `onVerRevision` con el lunes correcto; semanas futuras o vacías sin botón.
- **Documentos:** `docs/features/ritmo.md`, `docs/features/inicio.md` (quitar «no hay un acceso permanente») y `docs/arquitectura.md` (nueva composición ritmo → inicio).

### [ ] B6 · NUT-03 · Registrar comida desde Inicio

- **Tamaño:** M · **Rama:** `feat/b-registro-inicio`
- **Para la persona:** al pie de la tarjeta de energía, «+ Añadir desayuno» (la comida según la hora) abre Añadir comida ya en esa comida y, si hay una combinación que se repite, «Lo de siempre · 520 kcal» la añade en un toque con Deshacer.
- **Cómo:**
  1. Lógica pura `loDeSiempre(entries, fecha, comida)` en `nutricion/lib/comidasTipicas.ts`: en los 7 días anteriores, la combinación (misma `claveCombinacion`) más repetida en **esa** comida, si aparece ≥ 3 días; devuelve sus ítems (los de la aparición más reciente, con `itemsDesdeEntradas`), nombre y kcal. `null` si hoy ya hay algo en esa comida. Lectura en `comidasTipicasRepo` (solo lee).
  2. `TarjetaEnergia`: hoy la tarjeta entera es un botón; las acciones van en una fila al pie, **fuera** de ese botón (como las acciones al pie de `TarjetaAcceso`). Botones neutros, sin volt (regla del acento).
  3. «Añadir…»: `App` navega a Nutrición con `anadirInicial: Comida`; `NutricionTab` recibe la prop y abre `AnadirComida` con `comidaInicial` una sola vez al montar (mismo patrón que `referenciaInicial`).
  4. «Lo de siempre»: `mealsRepo.aplicarSugerencia(items, { fecha: hoy, comida })`, después `congelarObjetivoDia(hoy)` (como `AplicarPlantillaSheet`) y aviso «Desayuno añadido · 520 kcal» con Deshacer → `entriesRepo.borrarVarias(ids)`. La etiqueta accesible nombra los alimentos.
- **Decidir (D1):** si se recupera este acceso en Inicio (choca con ADR 021 y 043) y el umbral de «lo de siempre». Si se aprueba, ADR nuevo o actualización del 043.
- **Tests:** `loDeSiempre` (umbral, mezcla de comidas, días futuros, hoy ya registrado, platos); el flujo de aplicar y deshacer con fake-indexeddb.
- **Navegador:** a las 8:00, 14:00 y 21:00 simuladas; 320 px con texto al 200 %; Deshacer.
- **Documentos:** `docs/features/inicio.md`, `docs/features/nutricion.md`, `DESIGN.md` § Inicio.

### [ ] B7 · GAM-01 · Teselas de progreso con la semana

- **Tamaño:** M · **Rama:** `feat/b-teselas-semana`
- **Para la persona:** cada tesela de Inicio añade una línea con la semana: Cumbres «+620 m esta semana», Caminos «+12,4 km», Ritmo «2 de 3 entrenos · falta 1» con siete puntos, Vitrina «2 nuevas».
- **Cómo:** solo lecturas de lo que `useVitrina`/`useCaminos` ya devuelven:
  1. Cumbres: `cumbres/lib/cumbres.metrosEntre(tramos, lunes, hoy)`. Caminos: su equivalente en `caminos/lib/caminos.ts`. Ritmo: semana actual del resultado de Ritmo con `ritmo/lib/textos` (`cifrasSemana`, `faltaParaCumplir`). Vitrina: función nueva `piezasDesde(logros, lunes)` en `vitrina/lib/logros.ts`.
  2. `inicio/components/AccesoProgreso.tsx`: una línea más por tesela en `caption`; metros y km en grafito (no en el acento, `DESIGN.md`); los siete puntos como en `ritmo/components/DiasSemana`, en pequeño y decorativos (el texto ya lo dice).
- **Tests:** `piezasDesde` y un test de componente con una semana a medias y una vacía.
- **Navegador:** 320 px (teselas apiladas), texto al 200 %, gamificación oculta.
- **Documentos:** `docs/features/inicio.md` § Progreso.

### [ ] B8 · REN-01 · Un único cálculo derivado

- **Tamaño:** L · **Rama:** `perf/b-calculo-derivado`
- **Para la persona:** Inicio y el fin de sesión más rápidos, sobre todo con años de datos.
- **Ya hecho en `master`:** la auditoría (AF-06) quitó la lectura duplicada de Caminos en Inicio; `AccesoProgreso` solo usa `useVitrina`. Queda el perfilado, el triple cálculo del fin de sesión y que cada hook recalcule por su cuenta.
- **Cómo:**
  1. **Medir primero:** con un historial sintético de 3 años (500 entrenos, 12.500 series, 8.000 entradas), tiempo de `leerCumbres`, `leerCaminos` y `useVitrina` en Chromium con la CPU ralentizada 4×. Anotar las cifras en `docs/PROCESO.md`.
  2. Un único lector compartido, `experiencia/hooks/useProgreso.ts`: una sola suscripción (`liveQuery` de Dexie) que lee una vez experiencia, Cumbres, Caminos (también los pasos) y Vitrina y reparte el resultado con `useSyncExternalStore`; se suscribe al montar el primer componente y se libera con el último. `useVitrina`, `useCumbres`, `useCaminos` y `useExperiencia` pasan a ser selectores de ese resultado, con la misma firma, para no tocar a quien los usa. Todas las pantallas comparten un único cálculo.
  3. Solo lee (`docs/datos.md`: las lecturas nunca escriben).
  4. Web Worker solo si las medidas siguen siendo malas tras el paso 2.
  5. Avisar en el PR (y en `docs/arquitectura.md`) del nombre del lector: A lo usará en A9 (cruce X4).
- **Tests:** el resultado del lector compartido coincide con el de las funciones actuales sobre los mismos datos; varias suscripciones calculan una sola vez.
- **Documentos:** `docs/features/experiencia.md`, `vitrina.md`, `cumbres.md` y `caminos.md` (§ Rendimiento), `docs/arquitectura.md`.

### [ ] B9 · GLO-02 · Módulos activables

- **Tamaño:** L · **Rama:** `feat/b-modulos`
- **Para la persona:** Ajustes › «Lo que usas»: interruptores para Nutrición, Gimnasio, Actividades, Agua y Peso, con su consecuencia escrita, y «Ordenar Inicio» con flechas. Ocultar nunca borra datos.
- **Cómo:**
  1. `Settings` (en `shared/db/types.ts`): `modulos?: Partial<Record<'nutricion' | 'gym' | 'actividades' | 'agua' | 'peso', boolean>>` (ausente = todo activo) y `ordenInicio?: string[]`. Campos opcionales: sin versión de Dexie ni de backup, pero con test de importar un backup sin ellos.
  2. Lógica pura en `shared/lib/modulos.ts`: `moduloActivo`, `tarjetasInicio(settings)` (orden y visibles) y `conNutricionEfectiva(settings)` (Nutrición desactivada ⇒ gamificación «Solo entreno», derivado al leer, sin escribir).
  3. Efectos: `app/navegacion.ts` + `BottomNav` filtran la media luna (como hoy `ocultos` con Social; `arco.test.ts` a 320 px); `InicioTab` pinta las tarjetas según `tarjetasInicio`; la experiencia usa `conNutricionEfectiva`; la tesela Caminos se oculta sin Actividades.
  4. La pestaña «Actividades» dentro de Entreno es de A (`gym/GymTab`): en este paso no se toca; si Víctor quiere ocultarla también, es un cruce.
  5. Ajustes: sección nueva en `app/seccionesAjustes.ts` y su vista.
- **Decidir (D2):** qué módulos y qué pasa con la gamificación.
- **Tests:** `modulos.test.ts`, `navegacion.test.ts`, `arco.test.ts`, settings sin el campo.
- **Navegador:** cada combinación principal (solo gym, solo nutrición, todo); 320 px.
- **Documentos:** `docs/arquitectura.md`, `docs/datos.md` (ajustes), `docs/features/inicio.md`, `experiencia.md`.

### [ ] B10 · NUT-05 · «Cerrar el día»

- **Tamaño:** M · **Rama:** `feat/b-cerrar-dia`
- **Para la persona:** en Añadir comida › Buscar, si falta proteína, el chip «Encajan con lo que te falta» ordena tus alimentos frecuentes por proteína por kcal y propone la cantidad que cubre lo que falta sin pasar de las kcal que quedan.
- **Cómo:** función pura `encajanConLoQueFalta(frecuentes, falta)` en `nutricion/lib/alimentos.ts` (solo alimentos con macros; cantidad redondeada a 5 g; nada si faltan menos de 10 g). `AnadirComida` lee los totales del día y el objetivo (`entriesRepo.delDia`, `objetivosDe`) y añade el chip junto a las categorías. Elegir uno abre la hoja de gramos con la cantidad propuesta, editable.
- **Decidir (D6):** si encaja, y el tono (nada de «deberías»).
- **Tests:** la función (sin objetivo, objetivo cumplido, kcal agotadas, alimento sin proteína).
- **Documentos:** `docs/features/nutricion.md`.

### [ ] B11 · PRO-01 · Lecturas cruzadas de entreno y nutrición

- **Tamaño:** L · **Rama:** `feat/b-lecturas-cruzadas`
- **Para la persona:** «Tus 8 semanas»: peso medio y kcal medias por semana en la misma gráfica (dos ejes rotulados) y frases descriptivas como «Semanas con la proteína en objetivo: 5 de 8 · récords en esas semanas: 9; en las otras: 2». Nunca causas.
- **Cómo:** lógica pura `inicio/lib/lecturasCruzadas.ts` sobre las semanas cerradas: reutiliza `revisionSemanal` (bloques de nutrición sin cheat days, peso medio), `gym/lib/records` y `ritmo` (lecturas). Plantillas de frase cerradas, con un test que impida «porque», «gracias a» o «debido a». Gráfica con Recharts en el chunk diferido de la revisión. Cada frase solo aparece con datos suficientes (al menos 4 semanas con las dos variables).
- **Decidir (D5):** dónde vive (propuesto: al final de la revisión semanal) y la redacción.
- **Documentos:** `docs/features/inicio.md` § Revisión semanal.

### [ ] B12 · GAM-02 · Un solo destino «Progreso»

- **Tamaño:** L · **Rama:** `feat/b-destino-progreso`
- **Para la persona:** las teselas abren «Progreso» con pestañas Semana · Cumbres · Caminos · Vitrina y «‹ Inicio». La pestaña Semana reúne Ritmo, lo subido y recorrido esta semana y las piezas nuevas; el calendario de semanas abre las revisiones (B5).
- **Cómo:**
  1. `app/navegacion.ts`: destino `progreso` (dentro de Inicio en `DENTRO_DE`); `cumbres`, `caminos`, `ritmo` y `vitrina` dejan de ser destinos y pasan a vistas. `App` pasa la vista inicial (la tesela tocada).
  2. `ProgresoTab` (en `inicio/` o en una feature nueva `progreso/`, documentada en `CLAUDE.md` y `arquitectura.md`) con `ViewTabs`. Las páginas actuales (`CumbresTab`…) se montan como vistas con una prop que oculta su `PageHeader` y conservan su «Cómo funciona».
  3. Las vistas de módulos desactivados (B9) no aparecen.
  4. Actualizar `scripts/ui/navegar.cjs` (mapa `DENTRO`) y `navegacion.test.ts`.
- **Decidir (D3):** cambia el ADR 043 (ADR nuevo) y si «Progreso» va en la media luna o solo desde Inicio.
- **Documentos:** ADR nuevo, `docs/arquitectura.md` § Navegación, `docs/features/cumbres.md`, `caminos.md`, `ritmo.md`, `vitrina.md`, `inicio.md`, `DESIGN.md`.

### [ ] B13 · GAM-04 · Metas personales

- **Tamaño:** L · **Rama:** `feat/b-metas`
- **Para la persona:** en Progreso, «Metas»: récord de un ejercicio («Sentadilla 100 kg»), km de un mes o semanas cumplidas, con fecha opcional. Se ven en la pestaña Semana y, al cumplirse, dan una pieza en la Vitrina. Si pasa la fecha: «Sin cumplir · ¿Cambiar fecha?», sin rojo ni cuenta atrás.
- **Cómo:**
  1. `Settings.metas?: Meta[]` (`{ id, tipo: 'record' | 'km-mes' | 'semanas', exerciseId?, metrica?, valor, fecha?, creada }`). El estado (progreso, cumplida, fecha de cumplimiento) se deriva al leer, nunca se guarda.
  2. Lógica pura `vitrina/lib/metas.ts`: progreso con `gym/lib/records` y `gym/lib/progreso` (récords), las actividades (km) y Ritmo (semanas). Escritura en `vitrina/data/metasRepo.ts` (crear, editar, borrar con Deshacer).
  3. Logro repetible «Meta cumplida» en `vitrina/lib/logros.ts`.
  4. **Cruce X2:** la línea de la meta en la gráfica del ejercicio la dibuja A (A-X2) cuando esto esté en `master`. Exportar una función `metaDeEjercicio(settings, exerciseId)` para A.
- **Decidir (D4):** tipos de meta (nunca peso corporal, salvaguarda del ADR 029) y si da pieza en la Vitrina.
- **Documentos:** `docs/features/vitrina.md`, `docs/datos.md` (ajustes).

### [ ] B14 · PRO-06 · Calendario único de registros

- **Tamaño:** L · **Rama:** `feat/b-calendario`
- **Para la persona:** en Progreso, «Calendario»: el mes con iconos por día (entreno, actividad, comidas, peso) y una hoja del día con todo.
- **Cómo:** lógica pura de agregación por día (entrenos terminados, actividades, días con comidas, pesajes, agua), con las mismas lecturas de los repos. Rejilla con el patrón de `gym/components/CalendarioEntrenos` (≥ 44 px por día y lista por debajo de 20 rem), pero componente propio de B. La hoja del día enlaza a Nutrición en ese día (de B) y resume el entreno con `gym/lib/workout` (lectura).
- **Cruce opcional:** abrir el detalle de un entreno desde fuera de Entreno necesita una prop nueva en `gym/GymTab` (de A). Primera versión sin ese enlace; si se quiere, se pide a A.
- **Documentos:** documento de la vista de Progreso y `docs/arquitectura.md`.

### [ ] B15 · GAM-03 · Tu mes y tu año en AppFit

- **Tamaño:** L · **Rama:** `feat/b-tu-mes`
- **Para la persona:** los primeros días de cada mes, una tarjeta cerrable en Inicio, «Tu octubre», que abre un resumen en grafito (entrenos, toneladas, récords, metros, km, días registrados, plantas distintas, el músculo que más subió). En enero, «Tu 2026». Todo local.
- **Cómo:** lógica pura `vitrina/lib/tuPeriodo.ts` sobre el resultado del lector compartido (B8) y `gym/lib/progresoMuscular` (lectura). Tarjeta en Inicio los días 1–7; `Settings.resumenMesCerrado?: string` (mes cerrado). Página modal con secciones verticales (sin carrusel ni dependencia nueva). Imagen compartible con la utilidad de A10 (`gym/lib/exportarImagen.ts`, cruce X3) si ya está en `master`; si no, sin imagen.
- **Documentos:** `docs/features/inicio.md`, `vitrina.md`.

### [ ] B16 · NUT-04 · Comidas planificadas y lista de la compra

- **Tamaño:** XL · **Rama:** `feat/b-planificadas` (+ versión 14 de Dexie)
- **Para la persona:** en los días futuros del Diario se pueden colocar comidas típicas como «planificadas» (no cuentan hasta pulsar «Lo he comido») y sacar de lo planificado una lista de la compra copiable.
- **Cómo (recomendado):** una **tabla aparte**, `planificadas`, y no un campo en `entries`. Así ningún cálculo existente (medias, rachas, XP, típicas, gasto observado, objetivo congelado, Herbario) las ve sin querer. Versión 14 de Dexie (la 13 es `gimnasios`) siguiendo la cabecera de `shared/db/db.ts` (test de migración en `db.test.ts`), `TABLAS_USUARIO`, `migrarBackup` y `BACKUP_VERSION`. «Lo he comido» mueve las filas a `entries` en una transacción y congela el objetivo del día. Lista de la compra: agregar gramos por alimento de los días elegidos; texto copiable.
- **Decidir (D12):** cómo se ven en el Diario y la rueda (propuesto: atenuadas y fuera de los totales) y si se pueden planificar en días pasados.
- **Documentos:** `docs/datos.md`, `docs/features/nutricion.md`, ADR si se aprueba la tabla aparte.

### [ ] B17 · PRO-04 · Fotos de progreso privadas

- **Tamaño:** XL · **Rama:** `feat/b-fotos` (+ versión 15 de Dexie)
- **Para la persona:** en Perfil › Medidas, fotos guardadas solo en el móvil y un comparador antes/después con deslizador.
- **Cómo:** tabla `fotos` (blob, fecha, vista frontal/lateral/trasera, nota), comprimidas en el móvil (canvas a JPEG/WebP ~1.200 px). Aviso de espacio con `navigator.storage.estimate()`. Nunca salen a Social.
- **Decidir (D13):** `CLAUDE.md` exige que toda tabla vaya en `TABLAS_USUARIO` (y por tanto en el backup y en la copia cifrada). Las fotos pueden pesar cientos de MB: o entran con un límite, o se excluyen con una regla nueva (ADR) y un backup aparte.
- **Documentos:** `docs/datos.md`, `docs/features/perfil.md`, ADR.
