# Experiencia

`src/features/experiencia/`. El motor de la gamificación: la experiencia (XP) que dan los entrenos, los récords, las actividades (km), las comidas y las semanas cumplidas, derivada del historial (nada se acumula ni se guarda). No tiene pantalla propia: [Cumbres](cumbres.md) la convierte en metros (1 XP = 1 m) y es lo único que la enseña, siempre como metros. Aquí se calculan también [Ritmo](ritmo.md) (semanas, plan y pausas) y lo que usa la [Vitrina](vitrina.md). Decisiones: [ADR 029](../decisiones/029-gamificacion-atributos.md) (reglas y salvaguardas) y [ADR 034](../decisiones/034-cumbres-en-lugar-de-atributos.md) (sin nivel, títulos ni atributos). Plan general: `gaming.md`.

## Dónde está cada cosa

| Pieza | Archivo | Datos |
|---|---|---|
| Reglas, XP y textos | `experiencia/lib/experiencia.ts`: `calcularExperiencia`, `xpDeEntreno`, `entrenoHoy`, `textoEntrenoHoy`, `describirEvento`, `describirSinXp`, `xpPorDia`, `xpEntre`, `xpDeSesion` | — (puro) |
| Semana cumplida (con pausas) | `ritmo/lib/ritmo.calcularRitmo`, llamado dentro de `calcularExperiencia` (devuelve `ritmo`, `entrenos` de ≥ 5 series, todos los `records` y los días de entreno y registro, que reutilizan Ritmo y Vitrina) | — (puro) |
| Lecturas | `hooks/leerExperiencia.ts`: `leerExperiencia` (async; la usa `leerCumbres` y, a través de él, `leerVitrina`). `hooks/useProgreso.ts`: el **lector compartido** de toda la gamificación (ver § Rendimiento); `useExperiencia`, `useCumbres`, `useCaminos` y `useVitrina` toman de él su parte (`hooks/selectoresProgreso.ts`) con la firma de siempre. `useExperiencia` lo usan Ritmo y la revisión semanal | `workoutsRepo.terminados`, `setsRepo.todas`, `exercisesRepo.listar`, `entriesRepo.entreFechas` (todo el historial), `cheatDaysRepo.entreFechas`, `actividadesRepo.terminadas`, `objetivosDiaRepo.objetivosPorFecha`, `settings` (plan, pausas e interruptores) |
| Ajustes | `ritmo/components/GamificacionAjustes` (lo monta `app/Ajustes`) | escribe con `updateSettings`: `gamificacionVisible`, `gamificacionConNutricion`, `planSemanal` |

## Reglas (versión 2, `VERSION_REGLAS`)

| Acción | XP (= metros) | Tope |
|---|---|---|
| Entreno terminado con al menos 1 serie efectiva (`esEfectiva`: sin calentamiento ni series marcadas como no hechas) | 100 con ≥ 6 series; con menos, `round(100 × series / 6)` (17, 33, 50, 67, 83) | 1 por día (el de más series); por semana (lunes a domingo), hasta completar el plan |
| Récord personal (`gym/lib/records`, frente a todos los entrenos terminados anteriores) | 25 | 3 por sesión, solo en sesiones que suman |
| Actividades del día ([actividades](actividades.md): caminar, correr y senderismo, sumadas) | 10 por km (`xpDeActividad`), hasta 100; un día cuenta desde 1 km | 1 por día; por semana, los 3 primeros días con actividad (`XP_ACTIVIDAD`), aparte del plan de entrenos |
| Día registrado | 30 con ≥ 2 comidas distintas (desayuno, comida, cena, snack); 10 con una | 1 por día |
| Proteína ≥ 90 % del objetivo congelado de ese día (no en un [cheat day](nutricion.md#cheat-day)) | 20 | 1 por día |
| Semana cumplida según Ritmo: entrenos (días con un entreno que cuenta) ≥ plan y días con alguna comida ≥ plan; en una pausa de entreno, solo los días | 150 | 1 por semana |

- **Entreno que cuenta** (para el plan, Ritmo y la Vitrina): ≥ 5 series efectivas (`SERIES_MINIMAS`). Los de menos dan su XP proporcional, pero no cuentan para el plan.
- **Tope semanal = el plan**. Cada entreno que cuenta y suma ocupa un hueco. Los cortos suman mientras quede alguno, sin ocuparlo. Con el plan completo, nada más suma.
- **Varios entrenos el mismo día**: suma el de más series (a igualdad, el primero), aunque sea posterior. Un entreno que no suma explica por qué: sin series efectivas, otro con más series ese día o el plan de la semana ya completo.
- **Actividades** (desde la versión 2, sin efecto en la XP ya ganada porque antes no había actividades): no cuentan para el plan, Ritmo ni la semana cumplida. Un día con menos de 1 km o por encima de los 3 de la semana no suma y explica por qué (`actividadesSinXp`, `describirActividadSinXp`). `xpDeActividadId` da la XP del día de una actividad para su detalle; `semanaActual.diasActividad`, los días que ya suman esta semana.
- El descanso no multiplica la XP.
- La semana cumplida se apunta el día en que se cumple. Los registros atrasados cuentan siempre, porque todo se recalcula.
- Con «Solo entreno» (`gamificacionConNutricion: false`), o con Nutrición oculta en Ajustes › «Lo que usas» (B9, `shared/lib/modulos.conNutricionEfectiva`, derivado al leer), no hay XP de nutrición y la semana se cumple solo con los entrenos.
- Si se borra un registro, desaparece la XP que daba.
- Plan (`Settings.planSemanal`): tramos `{ desde, entrenos, diasRegistro }`. Cada semana usa el último tramo con `desde` ≤ su lunes, y las anteriores al primero usan el primero. Cambiar el plan sustituye o añade el tramo de la semana en curso: las semanas pasadas conservan el suyo.

## Pantallas

No tiene. Sus cifras se ven como metros en [Cumbres](cumbres.md#pantallas) (Inicio, la página y el fin de sesión), como semanas en [Ritmo](ritmo.md) y como logros en la [Vitrina](vitrina.md). En Ajustes, la sección «Cumbres, Ritmo y Vitrina»: Mostrar/Ocultar, Con nutrición/Solo entreno, entrenos por semana (2–6) y días con comidas por semana (3–7), con `SegmentedControl`.

## Rendimiento

Se recalcula todo el historial en cada lectura. Con tres años densos (500 entrenos, 12.500 series, 8.000 entradas, 300 actividades y 600 días con pasos) y la CPU de Chromium ralentizada 4× (un móvil medio): leer las tablas, ~0,5 s; calcular la experiencia, ~0,55 s; experiencia completa, ~1,1–1,2 s; con Cumbres, Caminos y Vitrina, ~1,3 s (`scripts/ui/medir-progreso.cjs`, PROCESO §201).

**Lector compartido** (`hooks/useProgreso.ts`, REN-01): todas las pantallas leen y calculan la gamificación una sola vez por día. Una sola suscripción `liveQuery` de Dexie por `hoy` (`crearAlmacenProgreso(leerVitrina)`), repartida con `useSyncExternalStore`, que se recalcula al cambiar los datos y se libera `MARGEN_MS` (30 s) después de que la suelte la última pantalla. Así, el fin de sesión (Cumbres y dos lecturas de la Vitrina) pasa de ~3,7 s a ~1 s y volver de una sección a Inicio (o pasar entre Cumbres, Caminos, Ritmo y Vitrina) no recalcula. Ritmo y la revisión semanal calculan también la Vitrina (unos 0,1 s más) a cambio de compartirla. Solo lee. Sin Web Worker: no hace falta mientras el primer cálculo no bloquee de forma visible. Los récords se comparan con un historial agrupado que crece entreno a entreno (`acumularComparables` + `recordsFrenteA`), no con todas las series en cada entreno.
