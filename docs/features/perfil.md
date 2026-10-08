# Perfil

`src/features/perfil/`. Sección principal (Menú → Perfil, chunk diferido) que estima el gasto y el objetivo energético diario a partir de datos personales. Decisiones y criterios: [ADR 019](../decisiones/019-perfil-y-estimacion-energetica.md); menú: [ADR 018](../decisiones/018-menu-de-seis-destinos.md). La explicación completa y las fuentes viven solo en Referencias › Energía y objetivo; Perfil enlaza.

## Dónde está cada cosa

| Pieza | Archivo | Datos |
|---|---|---|
| Pantalla | `PerfilTab.tsx`: resultado arriba, datos debajo | `perfilRepo.estadoEnergetico(hoy)` (liveQuery) |
| Resultado | `components/ResultadoEnergia.tsx`: título de sección «Tu energía diaria» sobre una Card con la cadena de 3 filas, avisos y Disclosure «Cómo se ha calculado» | — |
| Datos | `components/DatosPerfil.tsx`: ListGroup Sexo · Fecha de nacimiento · Altura · Peso · Actividad · Objetivo; «Borrar datos del perfil» | — |
| Edición | `components/EditarDatoSheet.tsx`: una Sheet con un control por dato. Peso reutiliza `inicio/components/RegistrarPesoSheet` y `pesosRepo.registrar` | `perfilRepo.guardarPerfil` |
| Cálculo | `lib/energia.ts`: `ECUACIONES`, `METODO_TMB`, `NIVELES_ACTIVIDAD`, `calcularEnergia(perfil, pesoKg, hoy)` → `incompleto` · `no-calculable` · `ok` | — |
| Validación | `lib/validacionPerfil.ts`: rangos, `edadEn`, `normalizarPerfil`, `camposPendientes` | — |
| Objetivos vigentes | `lib/objetivosVigentes.ts` (usa `nutricion/lib/objetivos.reajustarObjetivos`) | — |
| Fuentes | `lib/fuentesEnergia.ts`: registro de citas que pinta Referencias | — |
| Proteína por kg | `lib/proteina.ts`: `ajusteProteina`, `aplicarProteinaPorKg`, `reajustarConProteinaFija`; fila «Proteína por kg» en `DatosPerfil` y su control en `EditarDatoSheet` | `settings.perfil` |
| Gasto observado | `lib/gastoObservado.ts`, `components/GastoObservadoCard` (título de sección sobre la card) | `perfilRepo.leerGastoObservado` (`entries` y `pesos`) |
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
| Perfil vacío | EmptyState «Completa tus datos…»; filas con «Añadir» |
| Incompleto | «Faltan: altura y actividad.» sin cifras; siguen los objetivos manuales |
| Sin pesaje | fila Peso con «Registrar» |
| Completo sin objetivo | gasto diario y «Elige tu objetivo» |
| Definición con IMC < 18,5 | mantenimiento + explicación |
| Suelo activo / > 78 años | resultado con aviso en línea |
| Edición en Perfil | Toast «Objetivo actualizado: N kcal» solo si el objetivo cambia |

## Reglas

- Aviso fijo: «Estimación orientativa, no una prescripción médica» (y el texto completo en Referencias).
- «Borrar datos del perfil» es un borrado inmediato con «Deshacer» (`useAviso`); no toca los pesajes.
- **Proteína por kg**: activada por defecto, 1,8 g/kg (rango 1,6 a 2,2, pasos de 0,1), con peso registrado. Se puede desactivar. Resuelve la antigua limitación de que la proteína bajara al reescalar kcal en definición. Fuentes (Morton 2018, Jäger 2017) y qué se verificó: Referencias, Proteína y agua.
- **Gasto observado**: gasto = kcal medias − (pendiente de la media de peso de 7 días en kg/día × 7.700). Ventana de 28 días sin contar hoy (mínimo 21), al menos el 80 % de los días con comida registrada y 2 pesajes por semana en cada una de las 4 semanas; si no, estado «datos insuficientes» con los motivos. Se muestra junto al estimado; «Usar el observado» (desactivado por defecto) sustituye el GET en el cálculo del objetivo. Limitaciones: 7.700 kcal/kg es una aproximación (Hall 2008), el peso varía por agua y sal, el registro de comida suele quedarse corto y la regresión usa pocos puntos; es orientativo.
- **Medidas corporales** (cintura, cadera, pecho, brazo, muslo en cm y grasa en %): «Registrar» abre una Sheet con fecha y los campos que se quieran; si ya hay un registro de ese día se completa. Muestra el último valor de cada zona y su variación respecto al anterior, y un historial con borrado inmediato y «Deshacer». Rangos de plausibilidad de entrada, no clínicos. No confundir con «Medidas caseras» de Nutrición.
- **Objetivo de cada día**: ver `nutricion.md`. Hoy se calcula siempre en vivo; editar el perfil, registrar, borrar o restaurar un peso, y borrar o deshacer el perfil, además actualizan el snapshot de hoy (así, al pasar el día, conserva el último objetivo). Nunca se toca el de días pasados.
