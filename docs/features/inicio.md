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
| Tu semana (Ritmo) | `components/AccesoSemana` | estado de `useAtributos` (lo lee `InicioTab` una vez para las dos tarjetas); `ritmo/components/DiasSemana`, `ritmo/lib/textos` |
| Nivel (Atributos) | `components/AccesoNivel` | estado de `useAtributos` (todo el historial, solo lectura); `atributos/lib/atributos` (`nivelDeXp`, `tituloDe`, `descansoActual`) |
| Aviso de copia | `components/AvisoBackup` (banda con «Exportar ahora» y «Más tarde»), `shared/lib/recordatorioBackup.ts` | `shared/db/settings` (`ultimaExportacion`, `recordatorioBackupPospuesto`, `recordatorioBackupDias`) |

## Primer inicio en iPhone

El shell (`app/TrasladarDatos`) muestra antes del resumen un aviso breve para añadir AppFit a la pantalla de inicio; si ya está abierta como PWA pero todavía no hay datos, pregunta «¿Primera vez abriendo AppFit?». «Ver instrucciones» abre Ajustes directamente en su guía de instalación y traslado de comidas, con el foco en ella. La guía explica cómo exportar en Safari e importar en el nuevo acceso y permite ir a los botones de backup. Condiciones y almacenamiento: `../datos.md` § Conservación y primer traslado en iPhone.

## Presentación y acciones

«Hoy» con la fecha debajo. Después, de arriba abajo:

1. **Energía** (tarjeta ancha): rueda con las kcal del día en el centro; a su lado, objetivo, frase de `fraseKcal` («Quedan 860 kcal», «250 kcal sobre el objetivo») y gramos de proteína, hidratos y grasa. Toda la tarjeta abre el día en Nutrición. Si la rueda no cabe junto al texto (tarjeta de 20 rem o menos, p. ej. a 320 px o con texto ampliado), la rueda se centra y el texto pasa entero debajo.
2. **Peso** y **Agua** (dos tarjetas en mosaico). Peso: último pesaje, variación a 7 días y una minigráfica de los últimos 12 pesajes (x por fecha real, y ceñida a su mínimo y máximo, el último punto marcado; SVG propio, porque Recharts no entra en Inicio); la tarjeta abre el historial (solo lectura) y su «+» abre el registro. Agua: lo bebido hoy, «de 2 L» y un vaso que se llena con la proporción frente al objetivo (lleno al alcanzarlo); sin objetivo, el vaso queda vacío y dice «Sin objetivo». El «+» del pie suma una toma de 250 ml y el «−» quita la última (desactivado a 0 ml), ambos con «Deshacer»; la tarjeta abre una Sheet para elegir 250/330/500 ml u otra cantidad, quitar la última toma y repasar los últimos 7 días. El objetivo sale de Ajustes (lo editado manda) o, sin él, del sexo de Perfil: 2,0 L (hombre) o 1,6 L (mujer), según la ingesta adecuada de agua total de EFSA (2010) menos un 20 % por la humedad de los alimentos (criterio de AppFit; ver Referencias › Proteína y agua). Peso y agua son datos: no usan el acento.
3. **Último entreno** (tarjeta ancha): nombre de la rutina (o «Entreno libre»), «Ayer · 52 min · 6.420 kg», el mapa muscular frontal y trasero en miniatura (niveles del `muscleSnapshot`) y lo más trabajado en texto («Cuádriceps y glúteos, lo más trabajado»: los grupos de nivel máximo, como mucho dos), para no depender del color. Con una sesión en curso: «En curso · Desde 18:05». Sin entrenos: «Sin entrenos». Abre Entreno.
4. **Tu semana** (tarjeta ancha, si la gamificación está visible): «Cumplida», «En pausa» o el hilo; los 7 días con entreno y comidas; las cifras frente al plan y lo que falta. Abre Ritmo ([features/ritmo.md](ritmo.md)).
5. **Nivel** (tarjeta ancha, si la gamificación está visible): nivel y título, barra de XP del nivel, «734 de 1.066 XP para el nivel 15» y lo que valdría entrenar hoy según el descanso. Abre Atributos ([features/atributos.md](atributos.md)).

Registrar comida, empezar entreno, peso y agua también están en el «+» central de la barra ([ADR 028](../decisiones/028-barra-de-pestanas-y-registrar.md)); Inicio no tiene botón ancho. Las acciones de las tarjetas van en tono neutro.

Debajo del aviso de copia, los lunes puede aparecer la **revisión semanal** (ver abajo). Su detalle empieza con una card «Ritmo» con el estado de esa semana, sus cifras y el hilo, si la gamificación está visible.

Encima de las tarjetas puede aparecer el **aviso de copia de seguridad** si hay datos y han pasado 14 días (configurable en Ajustes: 7/14/30) desde la última exportación (o nunca se exportó). «Exportar ahora» lleva a Ajustes › Copias de seguridad; «Más tarde» lo pospone 3 días. Sin notificaciones. La fecha de la última exportación se guarda solo si la descarga se lanzó.

Las medidas corporales (cintura, cadera…) viven en Perfil; «Medidas caseras» pertenece a Nutrición.

## Revisión semanal

Resume la última semana cerrada (lunes-domingo) frente a la anterior, con cifras y diferencias sin juicio de valor (el mismo tono suba o baje, sin colores de bien o mal) y sin consejos.

- **Cuándo sale**: desde el lunes, si la semana revisada tiene algún dato (comida, pesaje, agua o un entreno terminado) y no se ha cerrado ya. «Hecho» guarda su lunes en `settings.revisionSemanalCerrada` y la oculta hasta el lunes siguiente, con «Deshacer» en el Toast. Sin notificaciones.
- **Tarjeta**: semana, peso medio con su cambio, kcal al día frente al objetivo y entrenos con su cambio; «Hecho» y «Ver revisión» en tono neutro (el naranja sigue siendo solo «Registrar comida»). Solo lee comidas, pesos, agua y entrenos: las series se cargan al abrir el detalle.
- **Detalle** (página modal, con flechas de semana hasta la última cerrada): Peso (media de los pesajes de la semana y nº de pesajes; diferencia de medias solo si ambas semanas tienen pesajes), Nutrición (kcal y proteína medias de los días registrados frente a la media de los objetivos de esos días, días registrados de 7 y adherencia ±10 %, con el criterio del Resumen), Entreno (sesiones, duración, series efectivas y volumen del resumen semanal de Gym, cada uno con su cambio, y los 3 grupos con más series), Récords personales (los de los entrenos de la semana, cada uno frente a los anteriores a él; 3 visibles y «y N más») y Agua (media de los días con registro y días que llegan al objetivo vigente). Cada bloque sin datos lo dice en su sitio.
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
