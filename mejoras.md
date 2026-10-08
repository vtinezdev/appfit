# Mejoras de AppFit

Plan de trabajo · 8 de octubre de 2026.

Estado: implementación por pasos; implementadas las diez mejoras del alcance inicial. Validación y decisiones de ejecución en ADR 025/026. Base revisada: `master`, commit `cb1e9c5`.

## Qué existe actualmente

- `PanelEjercicio` comparte las filas de series entre entreno activo y edición del historial. Permite borrar una serie desde «…» y quitar el ejercicio completo mediante la papelera de su cabecera, con Deshacer.
- Cada serie guarda repeticiones, kg, calentamiento opcional y RIR opcional de 0 a 5. El RIR se edita directamente en la fila; «—» conserva el estado sin dato.
- Las rutinas ya tienen número de series, rango de repeticiones y descanso por ejercicio. Al iniciarlas se precargan series con valores anteriores.
- **Completar una serie se persiste en `SetEntry.realizada`.** Ausente = desconocida en datos antiguos; true = confirmada, false = pendiente. Al terminar se conservan también las pendientes, identificadas y excluidas del trabajo realizado. El editor permite confirmar series antiguas/pasadas sin inferirlas de la precarga.
- Las series distinguen carga externa, corporal, lastre y asistencia, con snapshot corporal opcional. Ejecución bilateral/unilateral, lados, agarres, tempo, negativas y tramos de dropset se guardan semánticamente.
- Existen notas generales y por ejercicio en esa sesión; la última nota anterior se consulta sin copiarla.
- Progreso separa modos y permite ocultar métricas; Nutrición permite ocultar Consumo/Objetivo. El volumen suma carga externa/lastre × reps; cuerpo y asistencia no suman tonelaje, y 1RM solo se estima para carga externa.
- Datos locales: Dexie v7, backup v3. Las nuevas opciones deben conservar el historial y poder exportarse/importarse.

## Orden decidido de implementación

| Paso | Mejora solicitada | Primera solución | Estado |
|---|---|---|---|
| 1 | Papelera para borrar ejercicio | Quitar de la sesión con Deshacer | Implementada |
| 2 | RIR al lado de Reps y Kg | Campo visible, opcional, sin perder «sin dato» | Implementada |
| 3 | Nota por ejercicio | Nota de esa sesión, con consulta de la anterior | Implementada |
| 4 | Activar/desactivar opciones de gráficas | Leyenda interactiva para mostrar/ocultar métricas | Implementada |
| 5 | Peso corporal | Separar corporal, lastre y asistencia | Implementada |
| 6 | Ejercicios unilaterales | Datos comunes por defecto; distinguir lados cuando haga falta | Implementada |
| 7 | Diferentes agarres? | Variantes relevantes con historial comparable separado | Implementada |
| 8 | Dropsets? | Serie extendida con tramos de peso/reps vinculados | Implementada |
| 9 | Negativas? | Distinguir excéntrica lenta de repeticiones solo negativas | Implementada |
| 10 | Recomendaciones de peso/reps | Doble progresión con datos comparables y confirmados | Implementada |

Se empieza por accesos y registro; después, semántica de carga/variantes y técnicas; por último, recomendaciones que necesitan esos datos. Tras validar la papelera, Víctor autoriza implementar también 2, 3, 4 y 5. Después autoriza completar las mejoras restantes, 6–10. Se implementan sin añadir rest-pause, superseries o recomendaciones médicas.

Las fases agrupan dependencias, no fechas comprometidas. Cada bloque debe dejar la app utilizable y validada antes del siguiente.

## 1. Papelera del ejercicio

La papelera de la cabecera significa **«Quitar este ejercicio de este entreno»**, no borrar el ejercicio de Mis ejercicios ni modificar la rutina original.

- Implementada en entreno activo y editor del historial mediante `PanelEjercicio` y `hooks/useQuitarEjercicio`.
- Borra sus series y guarda `Workout.ejerciciosOmitidos` en la misma transacción; no modifica el catálogo, la rutina ni otras sesiones. Las marcas de completado se retiran del estado de presentación.
- Toast con Deshacer restaura los ids y valores originales (incluidos calentamiento y RIR), posición y marcas. Se conserva el orden recordado sin sobrescribir reordenaciones posteriores.
- En el historial se retira/restaura solo la asociación muscular del ejercicio; se conserva la clasificación histórica de los demás.
- La omisión sobrevive a recargar y a exportar/importar. Añadir de nuevo desde el selector cancela esa omisión.
- Toques duplicados bloqueados; fallo transaccional conserva el ejercicio. Foco al siguiente/anterior o Añadir ejercicio; Deshacer devuelve el foco al título restaurado.

La papelera también retira y restaura notas/configuración de carga incorporadas en las mejoras 3 y 5. Flujos y datos actuales: [Gym](docs/features/gym.md) y [datos](docs/datos.md).

## 2. RIR visible

Implementada en `PanelEjercicio` para sesión activa/editor. RIR ya no se edita dentro de «…».

Hacerlo visible **y editable** junto a Reps y Kg. Reutilizar el campo `SetEntry.rir`; no duplicar su almacenamiento.

- Valores 0–5 y «—» para sin dato. Vacío no equivale a RIR 0.
- Edición rápida por selector compacto; teclado y lectores de pantalla con nombre que incluya serie y ejercicio.
- «…» conserva calentamiento, discos y otras opciones secundarias.
- A 320 px, no comprimir cinco columnas hasta hacerlas incómodas: permitir dos líneas alineadas, manteniendo RIR visible y controles ≥44 px. Validar también texto ampliado.
- Conservar la regla actual: cambiar RIR no desmarca la serie; cambiar reps/kg sí.

## 3. Nota por ejercicio

Implementada con `NotaEjercicio`, `Workout.notasEjercicios` y métodos transaccionales de `workoutsRepo`. Se lee en el historial y se conserva en backup/CSV.

La primera versión guarda **una nota del ejercicio en ese entreno**: «asiento 4», «hoy usé otra máquina», «molestia en la última serie».

- Acceso discreto desde la cabecera; editor reutilizando Sheet/Textarea. Mostrar una línea de la nota cuando exista, sin ocupar altura cuando no exista.
- Guardado con indicador de error, también en el historial. La nota de la sesión completa sigue independiente.
- Propuesta de almacenamiento: mapa opcional en `Workout` por `exerciseId`, gestionado por `workoutsRepo`; no escribir estas notas en el catálogo global.
- Mostrar la última nota como referencia, identificada por su fecha; no copiarla automáticamente como si se hubiese escrito hoy.
- Si posteriormente se quieren instrucciones permanentes de máquina/técnica, añadir una nota fija del ejercicio separada de la nota de sesión.

Implementada como nota de cada sesión. Instrucciones permanentes separadas quedan para una futura petición; no se añade un segundo sistema ahora.

## 4. Opciones de las gráficas

Implementada con `ChartVisibility`: curvas/métricas de Progreso por tipo de carga y Consumo/Objetivo de Nutrición. Escala, tooltip y rótulos usan solo curvas visibles; ocultar todas ofrece un estado explicativo y conserva los datos textuales. Sin preferencias nuevas persistidas.

Alcance confirmado por Víctor: mostrar/ocultar curvas y métricas mediante una leyenda interactiva. Empezar por Peso máximo y 1RM en Progreso y reutilizar el patrón en las gráficas existentes con varias métricas. Mantener los tipos de gráfica y los controles de periodo actuales.

- Botones o chips accesibles de al menos 44 px, con texto e indicador de estado; no depender solo del color.
- Recalcular eje, rótulos y tooltip usando las curvas visibles. La tabla de datos sigue disponible.
- No mezclar volumen y kg de fuerza en el mismo eje. Volumen conserva su gráfico independiente.
- Si se ocultan todas, mostrar «Selecciona una métrica» con los controles disponibles; no una gráfica vacía inexplicable.
- Primera entrega sin nueva preferencia persistida. Guardar la elección entre aperturas solo si aporta valor y se pide.

Decisión confirmada el 8 de octubre de 2026: «Mostrar/ocultar curvas y métricas».

## 5. Peso corporal, lastre y asistencia

Implementada. Criterio y límites definitivos: [ADR 025](docs/decisiones/025-carga-corporal-y-notas-de-sesion.md). No se estima volumen corporal; las cifras antiguas mantienen kg externos.

No resolverlo escribiendo el peso del usuario en el actual campo Kg: eso mezclaría conceptos y alteraría comparaciones.

- Modos explícitos: **carga externa**, **peso corporal**, **corporal + lastre** y **corporal asistido**. Mostrar solo los que tengan sentido para el ejercicio.
- En dominadas/fondos: «Corporal · 76 kg», «Lastre · +10 kg» o «Asistencia · 20 kg». La asistencia es un dato separado, no kg negativos.
- Proponer el pesaje disponible al registrar la sesión y guardar un snapshot del valor utilizado. Corregirlo si hace falta; no recalcular entrenos antiguos con el peso corporal actual.
- Si no hay pesaje, permitir registrar repeticiones con peso corporal desconocido. No inventar masa ni exigir crear un pesaje para añadir el ejercicio.
- Separar volumen externo del trabajo estimado incluyendo cuerpo. La masa movida en una flexión no equivale automáticamente al peso corporal completo; no generalizar una fórmula de dominadas a todos los ejercicios corporales.
- Para asistencia en máquinas, comparar dentro del mismo ejercicio/máquina y expresar «menos asistencia». No presentarla como una medición exacta de carga corporal efectiva.
- Revisar récords, Última vez, valores precargados, progreso, mapa muscular y resumen de volumen. Introducir récords de repeticiones corporales y lastre; no aplicar Epley indiscriminadamente a asistencia o peso corporal.
- Los registros anteriores mantienen su significado: kg externos tal como se guardaron. No reinterpretar automáticamente antiguos 0 kg como peso corporal conocido.

## 6. Unilateral y bilateral

Implementada con configuración de sesión y preferencia habitual opcional. **Ambos lados iguales por defecto al elegir unilateral**, con kg por lado o totales explícitos; «Distinguir lados» permite reps/kg/RIR independientes o registrar solo uno. Bilateral conserva el registro habitual.

- Cambiar interpretación vacía los datos afectados para no convertir números antiguos silenciosamente.
- El volumen suma ambos lados exactamente una vez; el mapa promedia por lado sin duplicar una serie completa. Lado ausente no se supone realizado.
- RIR por lado también está visible fuera de «…». La edición detallada de reps/kg/lados está en técnica de la serie.
- Comparaciones separadas por ejecución/significado de kg/lados registrados. El mapa no incorpora anatomía izquierda/derecha.

## 7. Agarres

Implementados como orientación (prono/supino/neutro), anchura y accesorio opcionales. Opciones editoriales pertinentes en dominadas, jalones, remos, curl y poleas; personalizados permiten especificarlas. Ejercicios oficiales que ya fijan neutro/cuerda/barra conservan esa definición.

Se puede aplicar a todo el ejercicio en esa sesión o elegir una variante por serie. No se duplican ejercicios ni asociaciones musculares. El panel y la nota siguen compartidos por ejercicio; cada serie conserva su propia variante y las comparaciones se separan mediante una clave canónica. No se inventan cambios musculares por agarre.

## 8. Dropsets

Implementadas en «… → Ejecución, agarre y técnica → Añadir bajada». Cada tramo tiene id estable, reps/kg y lados opcionales. Se puede editar o quitar una bajada; Guardar aplica el borrador completo atómicamente y Cancelar conserva el original.

- Una dropset cuenta como **una serie extendida**, con el volumen de todos sus tramos sumado una vez.
- Completar, borrar y Deshacer actúan sobre la serie y todos sus tramos.
- No genera récords convencionales ni recomendaciones de doble progresión; no se mezcla en sus curvas.
- El mapa usa un único techo de reps para la serie extendida, sin tratar cada bajada como una serie independiente ni inventar un aumento fisiológico.
- Rest-pause y superseries quedan fuera del alcance inicial.

## 9. Negativas y descenso lento

Implementadas ambas interpretaciones, opcionales por serie:

1. Repetición completa con segundos de descenso.
2. Solo fase negativa, con segundos opcionales.

Se pueden combinar con carga corporal/lastre/asistencia y calentamiento. No son kg negativos. Historial y CSV identifican la técnica. Progreso separa la variante de negativas y no calcula su 1RM; tampoco genera récords convencionales. Tempo y negativas quedan fuera del motor de progresión. Sin multiplicadores inventados de intensidad en el mapa.

## 10. Recomendaciones de progresión

Implementadas con `lib/progresion`: motor local, determinista y explicable. El selector indica «Sugerencia de progresión disponible» y el panel abre la propuesta con sus sesiones y motivos.

- Objetivo configurable por ejercicio: series, rango, incremento real del equipo y RIR mínimo opcional; si no hay plan habitual puede usar el objetivo de la rutina. No se modifica la rutina al configurar el habitual.
- Mínimo **3 sesiones terminadas y comparables**, con todas las series objetivo confirmadas. No se infiere realización del historial antiguo; se puede confirmar manualmente en su editor.
- Si las dos últimas llegan al máximo, propone el incremento configurado. Si no, puede sugerir una repetición en una única serie cuyo desempeño se sostuvo. Sin datos suficientes o incremento necesario, explica lo que falta.
- Comparabilidad incluye modo, ejecución, kg por lado/totales, agarre, tempo y lados registrados. Calentamientos, dropsets, negativas y tempos definidos quedan fuera.
- En asistencia propone menos ayuda, sin pasar a negativo; corporal sin lastre progresa reps dentro del rango. Lastre/asistencia necesitan masa conocida y estable (tolerancia inicial 2 %). No se usa tonelaje para decidir subir peso.
- Progresión conjunta de lados distintos exige registrar ambos con carga igual; progresión independiente de cada lado queda para una ampliación.
- **Aplicar / Mantener / Descartar** guarda la decisión para esa propuesta/sesión. Aplicar revalida en transacción y solo cambia series aún no realizadas, antes de añadir calentamientos/técnicas; puede crear las series objetivo faltantes. Nunca se copian RIR anteriores como esfuerzo de hoy ni se marca realizada una propuesta.

Criterio completo, límites y fórmulas: [ADR 026](docs/decisiones/026-ejecucion-tecnicas-y-progresion-confirmada.md).

## Arquitectura y compatibilidad

- Mantener `Exercise.id`, `catalogId` y los ids históricos. Las preferencias habituales del ejercicio no deben reescribir la configuración de sesiones anteriores.
- Configuración/nota de una ejecución en su sesión; datos realizados en cada serie; parámetros habituales en ejercicio/rutina; fórmulas en funciones puras. No repartir los cálculos entre SVG, componentes y gráficas.
- Mantener separados: calentamiento/serie efectiva, técnica especial, lateralidad, agarre, carga externa y peso corporal. Una sola propiedad `tipo` no cubre estas dimensiones.
- Representación opcional en las tablas actuales: configuración/snapshot, lados y tramos semánticos; sin tablas futuras por anticipado.
- Toda escritura conjunta pasa por repos y transacciones. Los borrados/restauraciones conservan configuración, ids y orden.
- Cambiar la forma de registros existentes requiere versión de backup y migración; campos opcionales nuevos no cambian su versión. Cambiar índices/esquema requiere nueva versión Dexie sin editar las anteriores. Seguir las reglas de `db.ts` y `backup.ts`: la omisión opcional de esta entrega mantiene Dexie v7 y backup v3.
- Recalcular solo lo que cambia en la sesión editada. Preservar clasificación muscular histórica y no reinterpretar datos antiguos por defecto.

## Fases de implementación y comprobación

1. **Acceso y registro:** papelera del ejercicio, RIR visible, notas por ejercicio y leyenda interactiva de Progreso. Validar sesión activa e historial, Deshacer, fallos de guardado, tacto y 320/375/430 px en ambos temas. Estas mejoras no requieren esperar a las técnicas avanzadas.
2. **Semántica de carga y ejecución:** confirmar reglas de peso corporal/unilateral/agarres; implementar snapshots y un cálculo compartido. Revisar volumen, récords, Última vez, precarga, mapa y export/import antes de usar esas variables para consejos.
3. **Técnicas especiales:** dropsets y negativas solo según uso real. Probar agrupación, recuentos, comparaciones, edición e historial.
4. **Progresión:** persistir confirmación de realización y acordar su UX; activar el motor solo cuando reúna datos aptos. Puede recopilar confirmaciones antes de ofrecer consejos. Tests de historial escaso, RIR vacío/0, distintas variantes, cambios de masa, incrementos distintos, asistencia, calentamientos y sesiones incompletas.

Cada implementación termina con tests, TypeScript/build, revisión visual móvil y pruebas de backup/Deshacer cuando afecte a datos. No hay nuevas dependencias previstas. Los cambios de UI respetarán el sistema visual vigente de Saira, un único acento naranja y «precisión silenciosa».

## Preferencias configurables y ampliaciones

Las diez mejoras iniciales están implementadas. No se asigna un incremento ni RIR universal: se configura por ejercicio según tu equipo y objetivo. Negativas permite ambas interpretaciones y agarres ofrece opciones pertinentes, sin obligarte a usarlas.

Quedan fuera: anatomía lateral, progresión independiente de cada lado, instrucciones permanentes separadas de la nota de sesión, superseries/rest-pause y asesoramiento de recuperación o seguridad. Son ampliaciones, no bloqueos de esta entrega.
