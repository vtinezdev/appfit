# Perfil

`src/features/perfil/`. Sección principal (en la rejilla de secciones, chunk diferido) que estima el gasto y el objetivo energético diario a partir de datos personales. Decisiones y criterios: [ADR 019](../decisiones/019-perfil-y-estimacion-energetica.md); menú: [ADR 018](../decisiones/018-menu-de-seis-destinos.md). La explicación completa y las fuentes viven solo en Referencias › Energía y objetivo; Perfil enlaza.

## Dónde está cada cosa

| Pieza | Archivo | Datos |
|---|---|---|
| Pantalla | `PerfilTab.tsx`: resultado arriba, datos debajo | `perfilRepo.estadoEnergetico(hoy)` y `perfilRepo.objetivosVigentes(hoy)` (macros del reparto; liveQuery) |
| Resultado | `components/ResultadoEnergia.tsx`: título de sección «Tu energía diaria» con su «i» (`Ayuda`: la cuenta en pasos numerados) sobre una Card con el objetivo y su ritmo, la barra de sus partes con una columna por parte (`lib/tramosEnergia.ts`), «Tu día en macros» (gramos de los objetivos vigentes, si mandan los del perfil) y avisos. Con el perfil incompleto, en su lugar, el bloque compacto «Completa tu perfil» (`PerfilIncompleto`) | — |
| Datos | `components/DatosPerfil.tsx`: ficha de cuatro casillas (Sexo · Edad · Altura · Peso) y ListGroup con icono (deporte · objetivo · proteína por kg) con la nota de privacidad de pie; «Borrar datos del perfil» | — |
| Edición | `components/EditarDatoSheet.tsx`: una Sheet con un control por dato. Peso reutiliza `inicio/components/RegistrarPesoSheet` y `pesosRepo.registrar` | `perfilRepo.guardarPerfil` |
| Cálculo | `lib/energia.ts`: `ECUACIONES`, `METODO_TMB`, `NIVELES_ACTIVIDAD`, `calcularEnergia(perfil, pesoKg, hoy)` → `incompleto` · `no-calculable` · `ok` | — |
| Validación | `lib/validacionPerfil.ts`: rangos, `edadEn`, `normalizarPerfil`, `camposPendientes`, `CAMPOS_ENERGIA` (los cinco datos imprescindibles) | — |
| Objetivos vigentes | `lib/objetivosVigentes.ts` (usa `nutricion/lib/objetivos.reajustarObjetivos`) | — |
| Fuentes | `lib/fuentesEnergia.ts`: registro de citas que pinta Referencias | — |
| Proteína por kg | `lib/proteina.ts`: `ajusteProteina`, `aplicarProteinaPorKg`, `reajustarConProteinaFija`; fila «Proteína por kg» en `DatosPerfil` y su control en `EditarDatoSheet` | `settings.perfil` |
| Gasto observado | `lib/gastoObservado.ts` (`semanas`, `diasMin` y `semanasCumplidas` para el progreso de los requisitos), `components/GastoObservadoCard` (título de sección con su «i» sobre la card; con el perfil incompleto, plegado en un Disclosure «Gasto observado») | `perfilRepo.leerGastoObservado` (`entries` y `pesos`) |
| Objetivo de cada día | `lib/objetivosDia.ts`, `data/objetivosDiaRepo.ts` | tabla `objetivosDia` |
| Medidas corporales | `lib/medidas.ts`, `components/MedidasCorporales` | `data/medidasRepo.ts` (tabla `medidas`) |
| Repositorio | `data/perfilRepo.ts`: `getPerfil`, `guardarPerfil(patch)`, `borrarPerfil`/`restaurarPerfil`, `estadoEnergetico`, `objetivosVigentes`, `calcularVigentes` | `settings.perfil`, `pesos`, `entries` |

## Cálculo

`TMB = (Mifflin-St Jeor + Roza-Shizgal) / 2` (criterio de AppFit, no método publicado); `GET = TMB × factor` (1,2 · 1,375 · 1,55 · 1,725 · 1,9); objetivo = `GET ± intensidad` (200–600 kcal, pasos de 100, por defecto 400; mantenimiento sin ajuste), nunca por debajo de max(TMB, 800), redondeado a 10 kcal. IMC < 18,5 bloquea el déficit; edad < 18 o > 100 no calculable; > 78 con aviso; ritmo aproximado > 1 %/semana en definición con aviso. Sin redondeos intermedios. DOI y títulos cotejados con Crossref y coeficientes con una fuente secundaria (no con el texto de los artículos originales); los factores de actividad se atribuyen a McArdle, Katch y Katch (1996) sin edición verificada, y así se dice en Referencias.

## Datos

Solo se guardan los datos fuente en `Settings.perfil` (todo opcional, guardado por partes): `sexo`, `fechaNacimiento` (YYYY-MM-DD), `alturaCm`, `actividad`, `objetivo`, `intensidadKcal`, `proteinaPorKgActiva`, `proteinaPorKg` y `usarGastoObservado`. El peso es el último pesaje ≤ hoy; edad, IMC, TMB, GET, ajuste y kcal objetivo se derivan al leer. `getPerfil` sanea (`normalizarPerfil`) sin escribir. Estos campos no necesitan versión de esquema ni de backup; el backup incluye la fecha de nacimiento.

## Perfil manda

`perfilRepo.objetivosVigentes(hoy)` es la fuente única de objetivos: con perfil completo y objetivo elegido devuelve `{ kcal del perfil, macros reescalados conservando el reparto, origen: 'perfil' }`; si no, los manuales con `origen: 'manual'`. Después, si la proteína por kg está activa y hay peso, P pasa a ser g/kg × peso (`proteinaPorKg` en el resultado) y las kcal restantes se reparten entre hidratos y grasa con su reparto actual; si la proteína no cabe en las kcal, no se aplica. Lo que ven Hoy, Resumen e Inicio es el **objetivo del día** (`objetivosDiaRepo`): su snapshot o estos vigentes. Los leen también Referencias y Ajustes. En Ajustes, con origen `perfil`, las kcal son de solo lectura («Calculado en Perfil» + «Ir a Perfil») y los macros siguen editables.

## Estados

| Caso | Comportamiento |
|---|---|
| Perfil vacío o incompleto | Bloque pequeño «Completa tu perfil» en lugar de la card del resultado: «N de 5 datos», «Faltan: altura y actividad.» y un botón para el primer dato pendiente («Indicar sexo», «Añadir fecha de nacimiento», «Añadir altura», «Registrar peso», «Elegir actividad») que abre el mismo editor que su fila de «Tus datos» y pasa al siguiente al guardar. Sin cifras ni aviso orientativo (no hay estimación); siguen los objetivos manuales. El gasto observado queda plegado; las filas siguen con «Añadir» |
| Sin pesaje | fila Peso con «Registrar» (y «Registrar peso» en el bloque si es el primero que falta) |
| Completo sin objetivo | gasto diario y «Elige tu objetivo» |
| Definición con IMC < 18,5 | mantenimiento + explicación |
| Suelo activo / > 78 años | resultado con aviso en línea |
| Edición en Perfil | Toast «Objetivo actualizado: N kcal» solo si el objetivo cambia |

## Reglas

- Aviso fijo: «Estimación orientativa, no una prescripción médica» (y el texto completo en Referencias) siempre que hay un resultado; el bloque de perfil incompleto no lo lleva porque no muestra ninguna estimación.
- «Borrar datos del perfil» es un borrado inmediato con «Deshacer» (`useAviso`); no toca los pesajes.
- **Proteína por kg**: activada por defecto, 1,8 g/kg (rango 1,6 a 2,2, pasos de 0,1), con peso registrado. Se puede desactivar. Resuelve la antigua limitación de que la proteína bajara al reescalar kcal en definición. Fuentes (Morton 2018, Jäger 2017) y qué se verificó: Referencias, Proteína y agua.
- **Gasto observado**: gasto = kcal medias − (pendiente de la media de peso de 7 días en kg/día × 7.700). Ventana de 28 días sin contar hoy (mínimo 21), al menos el 80 % de los días con comida registrada y 2 pesajes por semana en cada una de las 4 semanas; la card pone el estimado y el observado lado a lado (el observado con «—» y «Faltan datos» mientras no se puede calcular) y, en ese caso, los dos requisitos con sus cifras reales: «Días con comidas · 18 de 23» con su barra y «Semanas con pesajes · 2 de 4» con un tramo por semana (lleno si tiene sus pesajes, con el día en que empieza); los motivos en texto solo si se cumplen ambos y aun así no hay tendencia. La fórmula (como cuenta: lo que comes − lo que cambia tu peso = tu gasto), lo que necesita y sus límites viven tras la «i». El interruptor «Usar el gasto observado» (desactivado por defecto) sustituye el GET en el cálculo del objetivo; su detalle dice cuál se usa. Limitaciones: 7.700 kcal/kg es una aproximación (Hall 2008), el peso varía por agua y sal, el registro de comida suele quedarse corto y la regresión usa pocos puntos; es orientativo.
- **Medidas corporales** (cintura, cadera, pecho, brazo, muslo en cm y grasa en %): «Registrar» abre una Sheet con fecha y los campos que se quieran; si ya hay un registro de ese día se completa. Muestra una ficha con el último valor de cada zona y su cambio respecto al anterior (pastilla neutra `Cambio`); tocar una zona abre su evolución en una Sheet. El historial es una fila («Historial · N registros», con la última fecha de pie) que abre una Sheet con el borrado inmediato; al borrar se cierra para que se vea el «Deshacer». Rangos de plausibilidad de entrada, no clínicos. No confundir con «Medidas caseras» de Nutrición.
- **Objetivo de cada día**: ver `nutricion.md`. Hoy se calcula siempre en vivo; editar el perfil, registrar, borrar o restaurar un peso, y borrar o deshacer el perfil, además actualizan el snapshot de hoy (así, al pasar el día, conserva el último objetivo). Nunca se toca el de días pasados.

### Evolución de las medidas

En Medidas corporales, cada casilla de la ficha abre la evolución de su zona (cintura, cadera, pecho, brazo, muslo o grasa corporal). Periodos de 30/90 días o todo el historial; gráfica con fechas reales, unidad de cada campo, cambio entre primera/última medición y tabla accesible. Los campos no medidos no se convierten en cero.  `shared/components/TendenciaRegistros` y su gráfica diferida se comparten con Agua; la lógica de periodos/huecos está en `shared/lib/tendencias`.
