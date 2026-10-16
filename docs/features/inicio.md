# Inicio

`src/features/inicio/`. Es la pestaña por defecto: tarjetas breves del día que componen datos de las otras features (ver `../arquitectura.md` § Capas). Composición minimalista y rueda de energía: [ADR 021](../decisiones/021-inicio-minimalista-rueda-energia.md).

## Dónde está cada cosa

| Pieza | Archivo | Datos |
|---|---|---|
| Pantalla | `InicioTab.tsx` | lee `entriesRepo.delDia`, `objetivosDiaRepo.objetivosDe` (el objetivo de hoy: snapshot o vigentes), `pesosRepo.delRango`, `aguaRepo.delDia` |
| Energía (rueda, objetivo, «Quedan…», gramos de P/C/G) | `components/TarjetaEnergia` | totales de `sumMacros` y objetivos vigentes |
| Geometría de la rueda | `lib/anilloEnergia.ts`: tramos por macro, tramo `otros` y segunda vuelta | — |
| Último entreno (tarjeta ancha: en curso o último terminado) | `components/AccesoEntreno` | solo lectura de `workoutsRepo`, `setsRepo`, `routinesRepo` y `exercisesRepo` (solo sin snapshot); resumen con `gym/lib/workout`, mapa con `gym/lib/cargaMuscular` (`trabajoMuscularWorkout`, `masTrabajados`) y `MiniMapa` (diferido) |
| Peso | `components/AccesoPeso` (con minigráfica SVG, `lib/miniGrafica`), `components/RegistrarPesoSheet`, `components/HistorialPeso` | `pesosRepo` (tabla `pesos`) |
| Registro desde el «+» de la barra | `components/RegistroRapido` (peso y agua con las mismas hojas; lo abre `app/AccionesRapidas`) | `pesosRepo`, `objetivosDiaRepo.actualizarObjetivoHoy`, `settings`/`perfilRepo` (objetivo de agua) |
| Tarjeta común | `components/TarjetaAcceso` (etiqueta, dato, toda la tarjeta como botón, acción opcional en la esquina y acciones opcionales al pie) | — |
| Lógica del peso | `lib/peso.ts`: `validarPeso` (rango y decimales admitidos), `tendenciaPeso`, `fraseVariacion`, `mediaMovilPeso` (media de los 7 días naturales que acaban en cada fecha) | — |
| Gráfica del peso | `components/GraficaPeso` (Recharts, diferida desde `HistorialPeso`): pesajes y media de 7 días | — |
| Agua | `components/AccesoAgua` (tarjeta con vaso que se llena, `lib/agua.nivelVaso`; «−» quita la última toma y «+» suma 250 ml), `components/AguaSheet` (250/330/500/otra, quitar la última toma, últimos 7 días), `lib/agua.ts` (objetivo, validación, formato) | `aguaRepo` (tabla `agua`) |
| Revisión semanal | `components/TarjetaRevisionSemanal` (tarjeta), `components/RevisionSemanal` (página modal, chunk diferido), `hooks/useRevisionSemanal` (lecturas), `lib/revisionSemanal.ts` (semanas, bloques y diferencias) | `entriesRepo`, `objetivosDiaRepo.objetivosPorFecha`, `pesosRepo`, `aguaRepo`, `workoutsRepo`, `setsRepo` y `exercisesRepo` (solo el detalle lee series y ejercicios); reutiliza `gym/lib/resumenSemanal`, `gym/lib/records`, `nutricion/lib/adherencia` y `ListaRecords` de Gym; `settings.revisionSemanalCerrada` |
| Tu semana (Ritmo) | `components/AccesoSemana` | estado de `cumbres/hooks/useCumbres` (lo lee `InicioTab` una vez para las dos tarjetas; incluye la experiencia); `ritmo/components/DiasSemana` (con `anillos`), `ritmo/lib/textos`; las kcal de la semana, `entriesRepo.entreFechas` + `objetivosDiaRepo.objetivosPorFecha` con `nutricion/lib/semanaKcal` |
| Montaña (Cumbres) | `components/AccesoCumbre` | estado de `cumbres/hooks/useCumbres` (experiencia y Cumbres, todo el historial, solo lectura); `experiencia/lib/experiencia` (`entrenoHoy`), `cumbres/lib/cumbres` y `cumbres/components/PerfilMontana`; ver [cumbres.md](cumbres.md) |
| Ruta (Caminos) | `components/AccesoCamino` | `caminos/hooks/useCaminos` (actividades y ajustes, solo lectura), `caminos/lib/caminos`, `caminos/components/TrazadoCamino`; ver [caminos.md](caminos.md) |
| Aviso de copia | `components/AvisoBackup` (banda de una línea con «Exportar» y la X de «Más tarde»), `shared/lib/recordatorioBackup.ts` (`textoSinCopia`: «14 días sin copia») | `shared/db/settings` (`ultimaExportacion`, `recordatorioBackupPospuesto`, `recordatorioBackupDias`) |
| Aviso social | `social/components/AvisoAmigos` (banda «Novedades en Social» o «Solicitudes en Amigos» con «Ver», bajo el aviso de copia, solo con algo pendiente; ver [social](social.md)) | Supabase (`avisos`) |

## Primer inicio en iPhone

El shell (`app/TrasladarDatos`) muestra antes del resumen un aviso breve para añadir AppFit a la pantalla de inicio; si ya está abierta como PWA pero todavía no hay datos, pregunta «¿Primera vez abriendo AppFit?». «Ver instrucciones» abre Ajustes directamente en su guía de instalación y traslado de comidas, con el foco en ella. La guía explica cómo exportar en Safari e importar en el nuevo acceso y permite ir a los botones de backup. Condiciones y almacenamiento: `../datos.md` § Conservación y primer traslado en iPhone.

## Presentación y acciones

«Hoy» con la fecha debajo. Después, de arriba abajo:

1. **Energía** (tarjeta ancha, la cifra protagonista): rueda de 160 px con las kcal del día en grande en el centro; a su lado, «Quedan» (o «Sobre el objetivo») con su cifra (`restoKcal`) y el objetivo; debajo, proteína, hidratos y grasa con una barrita frente a su objetivo y «58/137 g». Toda la tarjeta abre el día en Nutrición. Si la rueda no cabe junto al texto (tarjeta de 20 rem o menos, p. ej. a 320 px o con texto ampliado), la rueda se centra y el texto pasa entero debajo.
2. **Peso** y **Agua** (dos tarjetas en mosaico). Peso: último pesaje, variación a 7 días y una minigráfica de los últimos 12 pesajes (x por fecha real, y ceñida a su mínimo y máximo, relleno plano bajo la línea, el último punto marcado y el máximo y el mínimo rotulados al lado; SVG propio, porque Recharts no entra en Inicio); la tarjeta abre el historial (solo lectura) y su «+» abre el registro. Agua: lo bebido hoy, «de 2 L» y un vaso que se llena con la proporción frente al objetivo (lleno al alcanzarlo); sin objetivo, el vaso queda vacío y dice «Sin objetivo». El «+» del pie suma una toma de 250 ml y el «−» quita la última (desactivado a 0 ml), ambos con «Deshacer»; la tarjeta abre una Sheet para elegir 250/330/500 ml u otra cantidad, quitar la última toma y repasar los últimos 7 días. El objetivo sale de Ajustes (lo editado manda) o, sin él, del sexo de Perfil: 2,0 L (hombre) o 1,6 L (mujer), según la ingesta adecuada de agua total de EFSA (2010) menos un 20 % por la humedad de los alimentos (criterio de AppFit; ver Referencias › Proteína y agua). Peso y agua son datos: no usan el acento.
3. **Creatina** (tarjeta ancha, solo al activarla en Ajustes): dosis de hoy, mantenimiento o día de carga y el control reversible «Tomada hoy». Abre su hoja con los últimos siete días. No cuenta para la gamificación.
4. **Último entreno** (tarjeta ancha): nombre de la rutina (o «Entreno libre»), «Ayer · 52 min · 6.420 kg», el mapa muscular frontal y trasero en miniatura (niveles del `muscleSnapshot`) y lo más trabajado en texto («Cuádriceps y glúteos, lo más trabajado»: los grupos de nivel máximo, como mucho dos), para no depender del color. Con una sesión en curso: «En curso · Desde 18:05». Sin entrenos: «Sin entrenos». Abre Entreno.
5. **Tu semana** (tarjeta ancha, si la gamificación está visible): «Cumplida», «En pausa» o el hilo; los 7 días, cada uno con un anillo de sus kcal frente al objetivo y una pesa dentro si hubo entreno que cuenta (si la nutrición no cuenta en Ritmo, el cuadro del entreno de siempre); las cifras frente al plan y lo que falta. Abre Ritmo ([features/ritmo.md](ritmo.md)).
6. **Cumbre** (tarjeta ancha, si la gamificación está visible): la montaña actual con «2.340 de 3.715 m» y su perfil, la última cumbre durante tres días («Cumbre del Teide ayer»), «En el refugio» si hay pausa y lo que valdría entrenar hoy según el plan. Sin montaña elegida, «Cumbres» invita a elegir la primera. Abre Cumbres ([features/cumbres.md](cumbres.md)).
7. **Camino** (tarjeta ancha, si la gamificación está visible): la ruta actual con «5,42 de 111,5 km», su trazado y la etapa en curso («Hacia Pontedeume: faltan 22,3 km»), y la última llegada durante tres días. Sin ruta elegida, «Caminos» invita a elegir la primera. Abre Caminos ([features/caminos.md](caminos.md)).

Registrar comida, empezar entreno, una actividad, peso y agua también están en el «+» de la barra ([ADR 028](../decisiones/028-barra-de-pestanas-y-registrar.md)); Inicio no tiene botón ancho. Las acciones de las tarjetas van en tono neutro.

Debajo del aviso de copia, los lunes puede aparecer la **revisión semanal** (ver abajo). Su detalle empieza con una card «Ritmo» con el estado de esa semana, sus cifras y el hilo, si la gamificación está visible.

Encima de las tarjetas puede aparecer el **aviso de copia de seguridad** si hay datos y han pasado 14 días (configurable en Ajustes: 7/14/30) desde la última exportación (o nunca se exportó). Es una banda de una línea («14 días sin copia» o «Aún no has hecho ninguna copia» y «Tus registros solo están en este móvil»): «Exportar» lleva a Ajustes › Copias de seguridad; la X («Más tarde») lo pospone 3 días. Sin notificaciones. La fecha de la última exportación se guarda solo si la descarga se lanzó.

Las medidas corporales (cintura, cadera…) viven en Perfil; «Medidas caseras» pertenece a Nutrición.

## Revisión semanal

Resume la última semana cerrada (lunes-domingo) frente a la anterior, con cifras y diferencias sin juicio de valor (el mismo tono suba o baje, sin colores de bien o mal) y sin consejos.

- **Cuándo sale**: desde el lunes, si la semana revisada tiene algún dato (comida, pesaje, agua o un entreno terminado) y no se ha cerrado ya. La X («Hecho») guarda su lunes en `settings.revisionSemanalCerrada` y la oculta hasta el lunes siguiente, con «Deshacer» en el Toast. Sin notificaciones.
- **Tarjeta**: «Tu semana · 5–11 oct» y, en una fila de tres, peso medio con su cambio, kcal al día con el objetivo y entrenos con su cambio; toda la tarjeta abre la revisión («Ver revisión») y la X de la esquina es «Hecho», en tono neutro. Solo lee comidas, pesos, agua y entrenos: las series se cargan al abrir el detalle.
- **Detalle** (página modal, con flechas de semana hasta la última cerrada): Peso (media de los pesajes de la semana y nº de pesajes; diferencia de medias solo si ambas semanas tienen pesajes), Nutrición (kcal y proteína medias de los días registrados frente a la media de los objetivos de esos días, días registrados de 7 y adherencia ±10 %, con el criterio del Resumen: los cheat days quedan fuera, en esta semana y en la anterior, y se nombran en «N cheat days fuera de la media»), Entreno (sesiones, duración, series efectivas y volumen del resumen semanal de Gym, cada uno con su cambio, y los 3 grupos con más series), Récords personales (los de los entrenos de la semana, cada uno frente a los anteriores a él; 3 visibles y «y N más») y Agua (media de los días con registro y días que llegan al objetivo vigente). Cada bloque sin datos lo dice en su sitio.
- **Límites**: los días sin snapshot del objetivo se comparan con el vigente (como en el Resumen); el objetivo de agua no se guarda por día, así que se usa el actual. Cerrada la revisión, no hay un acceso permanente para volver a abrirla.

## Rueda de energía

- **Anillo exterior**: lo consumido hasta el objetivo, en tramos de proteína, hidratos y grasa proporcionales a sus kcal (4/4/9 kcal/g). Lo que falta va en negro (`stroke-kcal-rest`) sobre un carril más fino (6 frente a 12 del viewBox), para que manden los colores de lo consumido. Al alcanzar el objetivo queda lleno.
- **Kcal sin desglose**: si las kcal del día superan a las de los macros (kcal rápidas, alimentos sin macros), la diferencia es un tramo final en `kcal`. Si las de los macros superan a las del día (redondeos), se reparte entre ellos sin pasar de lo consumido.
- **Segunda vuelta**: el exceso sobre el objetivo se dibuja en un anillo interior fino en `kcal`, hasta una vuelta completa (= otro objetivo entero). Sin rojo: pasarse se cuenta con el mismo tono que quedarse corto.
- **Sin objetivo**: si hay consumo, el anillo entero muestra el reparto, sin «de X kcal» ni frase.
- SVG propio (Recharts no entra en Inicio para no cargarlo al arrancar), decorativo (`aria-hidden`): cifras, objetivo y gramos están en texto. Sin animación de llenado.

## Reglas

- **Un pesaje por día**: registrar de nuevo el mismo día lo sustituye (`pesosRepo.registrar`, upsert por fecha en una transacción).
- **Variación a 7 días**: compara el último pesaje con el último cuya fecha sea ≤ la suya − 7 días. Si no hay ninguno, no se muestra.
- **Borrar un pesaje**: en el historial, papelera por fila con borrado inmediato y «Deshacer» en línea (dentro de un Sheet el Toast queda debajo). `pesosRepo.borrar` devuelve el registro y `restaurar` lo repone con su id; no pisa un pesaje que se haya registrado el mismo día entretanto.
- **Media móvil de 7 días**: el historial (con al menos 2 pesajes) dibuja los pesajes y la media de los 7 días naturales que acaban en cada fecha. La variación de Inicio sigue siendo la de los pesajes (no se cambió a la media: con pesajes poco frecuentes la media de 7 días lee peor).
- **Objetivo del día**: al registrar un peso se actualiza el objetivo congelado de hoy (`objetivosDiaRepo.actualizarObjetivoHoy`), porque la proteína por kg y el objetivo del Perfil dependen del peso.

## Creatina

Función opcional, desactivada por defecto. Ajustes › Creatina permite activarla y fijar una dosis manual de mantenimiento (gramos, con coma o punto; dejar vacío y guardar recupera la automática). Desactivar oculta la tarjeta, conservando dosis y registros. Las fórmulas se explican en el desplegable «Cómo se calcula» de esa vista. `CreatinaAjustes` y `CreatinaHoy` componen `creatinaRepo`; las fórmulas viven en `lib/creatina`.

Mantenimiento automático: 0,05 g/kg del último pesaje con fecha ≤ hoy, mínimo 3 g y redondeo a 0,5 g. Sin pesaje válido: 3 g. La manual sustituye a esa dosis. La carga opcional se inicia desde Ajustes, requiere pesaje y dura cinco días naturales, incluido el de inicio: 0,3 g/kg al día, repartidos en cuatro tomas. La manual solo afecta al mantenimiento. Cancelar vuelve a mantenimiento; al sexto día vuelve automáticamente, sin escrituras al leer. Si se pierde el pesaje durante una carga, se pide registrar peso para calcularla y no se inventa masa.

La tarjeta aparece debajo de Peso/Agua; muestra gramos con decimales y el estado de la fase. «Tomada hoy» usa `aria-pressed`, marca una sola vez al día (también en carga) y permite quitar la marca con el mismo control. La hoja muestra siete días, como «Tomada» o «Sin marcar», sin inferir tomas. Escrituras bloquean toques duplicados; los fallos aparecen en línea y permiten reintentar sin confirmar la marca. La toma persiste tras recargar y en las copias; no suma XP, no modifica Ritmo, rachas, Cumbres ni Vitrina. No hay notificaciones. Datos y compatibilidad: [datos](../datos.md#creatina).

### Estado de actualización

Bajo la cabecera se muestra una línea discreta y táctil con el estado real de la página («App al día», actualización disponible, comprobación en curso o falta de conexión). `shared/components/AvisoActualizacion` lee el gestor compartido y abre Ajustes › Actualizaciones mediante `onRevisarActualizaciones`. Detección, acción y guía de cierre/reapertura: [Desarrollo](../desarrollo.md#actualizaciones-visibles-de-la-pwa). No exige cuenta ni cambia registros.
