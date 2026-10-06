# Perfil

`src/features/perfil/`. Sección principal (Menú → Perfil, chunk diferido) que estima el gasto y el objetivo energético diario a partir de datos personales. Decisiones y criterios: [ADR 019](../decisiones/019-perfil-y-estimacion-energetica.md); menú: [ADR 018](../decisiones/018-menu-de-seis-destinos.md). La explicación completa y las fuentes viven solo en Referencias › Energía y objetivo; Perfil enlaza.

## Dónde está cada cosa

| Pieza | Archivo | Datos |
|---|---|---|
| Pantalla | `PerfilTab.tsx`: resultado arriba, datos debajo | `perfilRepo.estadoEnergetico(hoy)` (liveQuery) |
| Resultado | `components/ResultadoEnergia.tsx`: Card «Tu energía diaria», cadena de 3 filas, avisos, Disclosure «Cómo se ha calculado» | — |
| Datos | `components/DatosPerfil.tsx`: ListGroup Sexo · Fecha de nacimiento · Altura · Peso · Actividad · Objetivo; «Borrar datos del perfil» | — |
| Edición | `components/EditarDatoSheet.tsx`: una Sheet con un control por dato. Peso reutiliza `inicio/components/RegistrarPesoSheet` y `pesosRepo.registrar` | `perfilRepo.guardarPerfil` |
| Cálculo | `lib/energia.ts`: `ECUACIONES`, `METODO_TMB`, `NIVELES_ACTIVIDAD`, `calcularEnergia(perfil, pesoKg, hoy)` → `incompleto` · `no-calculable` · `ok` | — |
| Validación | `lib/validacionPerfil.ts`: rangos, `edadEn`, `normalizarPerfil`, `camposPendientes` | — |
| Objetivos vigentes | `lib/objetivosVigentes.ts` (usa `nutricion/lib/objetivos.reajustarObjetivos`) | — |
| Fuentes | `lib/fuentesEnergia.ts`: registro de citas que pinta Referencias | — |
| Repositorio | `data/perfilRepo.ts`: `getPerfil`, `guardarPerfil(patch)`, `borrarPerfil`/`restaurarPerfil`, `estadoEnergetico`, `objetivosVigentes` | `settings.perfil`, `pesos` |

## Cálculo

`TMB = (Mifflin-St Jeor + Roza-Shizgal) / 2` (criterio de AppFit, no método publicado); `GET = TMB × factor` (1,2 · 1,375 · 1,55 · 1,725 · 1,9); objetivo = `GET ± intensidad` (200–600 kcal, pasos de 100, por defecto 400; mantenimiento sin ajuste), nunca por debajo de max(TMB, 800), redondeado a 10 kcal. IMC < 18,5 bloquea el déficit; edad < 18 o > 100 no calculable; > 78 con aviso; ritmo aproximado > 1 %/semana en definición con aviso. Sin redondeos intermedios. DOI y títulos cotejados con Crossref y coeficientes con una fuente secundaria (no con el texto de los artículos originales); los factores de actividad se atribuyen a McArdle, Katch y Katch (1996) sin edición verificada, y así se dice en Referencias.

## Datos

Solo se guardan los datos fuente en `Settings.perfil` (todo opcional, guardado por partes): `sexo`, `fechaNacimiento` (YYYY-MM-DD), `alturaCm`, `actividad`, `objetivo`, `intensidadKcal`. El peso es el último pesaje ≤ hoy; edad, IMC, TMB, GET, ajuste y kcal objetivo se derivan al leer. `getPerfil` sanea (`normalizarPerfil`) sin escribir. Sin Dexie v7 ni cambio de `BACKUP_VERSION`; el backup incluye la fecha de nacimiento.

## Perfil manda

`perfilRepo.objetivosVigentes(hoy)` es la fuente única de objetivos: con perfil completo y objetivo elegido devuelve `{ kcal del perfil, macros reescalados conservando el reparto, origen: 'perfil' }`; si no, los manuales con `origen: 'manual'`. La leen Hoy, Resumen, Inicio, Referencias y Ajustes. En Ajustes, con origen `perfil`, las kcal son de solo lectura («Calculado en Perfil» + «Ir a Perfil») y los macros siguen editables.

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
- Limitación conocida: al reescalar por reparto, la proteína baja en definición. Pendientes en `../roadmap.md`.
