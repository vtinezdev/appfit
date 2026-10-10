# Atributos

`src/features/atributos/`. Nivel y experiencia (XP) derivados del historial: nada se acumula ni se guarda. Decisión y salvaguardas: [ADR 029](../decisiones/029-gamificacion-atributos.md). Las semanas, el plan y las pausas son de [Ritmo](ritmo.md); los logros, de la [Vitrina](vitrina.md). Plan general (Liga y Cumbres, por concretar): `gaming.md`.

## Dónde está cada cosa

| Pieza | Archivo | Datos |
|---|---|---|
| Reglas, XP, nivel, títulos y textos | `atributos/lib/atributos.ts`: `calcularAtributos`, `xpDeEntreno`, `nivelDeXp`, `costeNivel`, `tituloDe`, `entrenoHoy`, `describirEvento`, `describirSinXp`, `xpPorDia`, `xpDeSesion` | — (puro) |
| Semana cumplida (con pausas) | `ritmo/lib/ritmo.calcularRitmo`, llamado dentro de `calcularAtributos` (devuelve `ritmo`, `entrenos` de ≥ 5 series, todos los `records` y los días de entreno y registro, que reutilizan Ritmo y Vitrina) | — (puro) |
| Lecturas | `atributos/hooks/useAtributos.ts`: `leerAtributos` (async, también para `useVitrina`) y `useAtributos` (useLiveQuery) | `workoutsRepo.terminados`, `setsRepo.todas`, `exercisesRepo.listar`, `entriesRepo.entreFechas` (todo el historial), `objetivosDiaRepo.objetivosPorFecha`, `settings` (plan, pausas e interruptores) |
| Página (Más › Atributos) | `atributos/AtributosTab.tsx` (diferida), `components/FilasXp` | — |
| Tarjeta «Nivel» de Inicio | `inicio/components/AccesoNivel` | `useAtributos` |
| Bloque al terminar un entreno | `atributos/components/XpSesion` (lo compone `gym/components/WorkoutFinished` con `summary.workoutId`) | `useAtributos` |
| Ajustes | `atributos/components/AtributosAjustes` (lo monta `app/Ajustes`) | escribe con `updateSettings`: `gamificacionVisible`, `gamificacionConNutricion`, `planSemanal` |

## Reglas (versión 1, `VERSION_REGLAS`)

| Acción | XP | Tope | Atributo |
|---|---|---|---|
| Entreno terminado con al menos 1 serie efectiva (`esEfectiva`: sin calentamiento ni series marcadas como no hechas) | 100 con ≥ 6 series; con menos, `round(100 × series / 6)` (17, 33, 50, 67, 83) | 1 por día (el de más series); por semana (lunes a domingo), hasta completar el plan | Fuerza |
| Récord personal (`gym/lib/records`, frente a todos los entrenos terminados anteriores) | 25 | 3 por sesión, solo en sesiones que suman | Fuerza |
| Día registrado | 30 con ≥ 2 comidas distintas (desayuno, comida, cena, snack); 10 con una | 1 por día | Nutrición |
| Proteína ≥ 90 % del objetivo congelado de ese día | 20 | 1 por día | Nutrición |
| Semana cumplida según Ritmo: entrenos (días con un entreno que cuenta) ≥ plan y días con alguna comida ≥ plan; en una pausa de entreno, solo los días | 150 | 1 por semana | Constancia |

- **Entreno que cuenta** (para el plan, Ritmo y la Vitrina): ≥ 5 series efectivas (`SERIES_MINIMAS`). Los de menos dan su XP proporcional, pero no cuentan para el plan.
- **Tope semanal = el plan**. Cada entreno que cuenta y suma ocupa un hueco. Los cortos suman mientras quede alguno, sin ocuparlo. Con el plan completo, nada más suma.
- **Varios entrenos el mismo día**: suma el de más series (a igualdad, el primero), aunque sea posterior. Un entreno que no suma explica por qué: sin series efectivas, otro con más series ese día o el plan de la semana ya completo.
- El descanso no multiplica la XP.
- La semana cumplida se apunta el día en que se cumple. Los registros atrasados cuentan siempre, porque todo se recalcula.
- Con «Solo entreno» (`gamificacionConNutricion: false`) no hay XP de nutrición, el atributo Nutrición no aparece y la semana se cumple solo con los entrenos.
- Curva: del nivel n al n + 1 cuestan `round(500 × 1,06^(n−1))` XP (500, 845 en el 10, 1.066 en el 14, 2.709 en el 30). Cada atributo usa la misma curva con su propia XP; el nivel global, con la total.
- Títulos cada 5 niveles: Recién llegado (1), Novato, Habitual, Constante, Sólido, Curtido, Veterano, Experto, Maestro, Referente y Leyenda (50).
- El nivel no baja por inactividad. Si se borra un registro, desaparece la XP que daba.
- Plan (`Settings.planSemanal`): tramos `{ desde, entrenos, diasRegistro }`. Cada semana usa el último tramo con `desde` ≤ su lunes, y las anteriores al primero usan el primero. Cambiar el plan sustituye o añade el tramo de la semana en curso: las semanas pasadas conservan el suyo.

## Pantallas

- **Inicio**: tarjeta «Nivel» al final del mosaico, con nivel y título, una barra de XP decorativa (dentro del botón; las cifras van en texto) y lo que valdría entrenar hoy («Quedan 2 entrenos del plan esta semana», «Hoy ya suma un entreno», «Plan de la semana completo: ya suman sus 3 entrenos»). Abre Atributos.
- **Atributos** (Más): card con el nivel (`Metric hero`), título, barra y XP total. Debajo, los atributos en `ListGroup` con su barra; «Esta semana» (entrenos y días frente al plan, XP de la semana y lo que falta para cumplirla); «Cada día», con la XP de cada día y su porqué (14 días y «Ver más días»); y los Disclosure «Cómo se gana XP» y «Títulos». Ocultos, muestra un estado vacío con «Ir a Ajustes».
- **Fin de sesión**: bajo los récords, «Experiencia» con la XP del entreno y de sus récords, o por qué no suma, y una card con el nivel («Subes al nivel 9» si sube). Sin animación.
- **Ajustes › Atributos, Ritmo y Vitrina**: Mostrar/Ocultar (oculta las tarjetas de Inicio, los bloques del fin de sesión, el sello de la revisión, el Herbario del Resumen y los tres destinos de Más), Con nutrición/Solo entreno, entrenos por semana (2–6) y días con comidas por semana (3–7), con `SegmentedControl`.

## Rendimiento

Se recalcula todo el historial en cada lectura: unos 70 ms en escritorio con 500 entrenos, 12.500 series y 8.000 entradas (con la Vitrina, unos 150 ms). Inicio lo lee una vez (`InicioTab`) para las dos tarjetas. Los récords se comparan con un historial agrupado que crece entreno a entreno (`acumularComparables` + `recordsFrenteA`), no con todas las series en cada entreno.
