# Inicio

`src/features/inicio/`. Es la pestaña por defecto: tarjetas breves del día que componen datos de las otras features (ver `../arquitectura.md` § Capas). Composición minimalista y rueda de energía: [ADR 021](../decisiones/021-inicio-minimalista-rueda-energia.md).

## Dónde está cada cosa

| Pieza | Archivo | Datos |
|---|---|---|
| Pantalla | `InicioTab.tsx` | lee `entriesRepo.delDia`, `objetivosDiaRepo.objetivosDe` (el objetivo de hoy: snapshot o vigentes), `pesosRepo.delRango`, `aguaRepo.delDia` |
| Energía (rueda, objetivo, «Quedan…», gramos de P/C/G) | `components/TarjetaEnergia` | totales de `sumMacros` y objetivos vigentes |
| Geometría de la rueda | `lib/anilloEnergia.ts`: tramos por macro, tramo `otros` y segunda vuelta | — |
| Entreno (en curso o último terminado) | `components/AccesoEntreno` | solo lectura de `workoutsRepo` y `setsRepo`; resumen con `gym/lib/workout` |
| Peso | `components/AccesoPeso`, `components/RegistrarPesoSheet`, `components/HistorialPeso` | `pesosRepo` (tabla `pesos`) |
| Tarjeta pequeña común | `components/TarjetaAcceso` (etiqueta, dato, toda la tarjeta como botón y acción opcional en la esquina) | — |
| Lógica del peso | `lib/peso.ts`: `validarPeso` (rango y decimales admitidos), `tendenciaPeso`, `fraseVariacion`, `mediaMovilPeso` (media de los 7 días naturales que acaban en cada fecha) | — |
| Gráfica del peso | `components/GraficaPeso` (Recharts, diferida desde `HistorialPeso`): pesajes y media de 7 días | — |
| Agua | `components/AccesoAgua` (tarjeta con «−» quitar la última toma y «+» de 250 ml), `components/AguaSheet` (250/330/500/otra, quitar la última toma, últimos 7 días), `lib/agua.ts` (objetivo, validación, formato) | `aguaRepo` (tabla `agua`) |
| Aviso de copia | `components/AvisoBackup` (banda con «Exportar ahora» y «Más tarde»), `shared/lib/recordatorioBackup.ts` | `shared/db/settings` (`ultimaExportacion`, `recordatorioBackupPospuesto`, `recordatorioBackupDias`) |

## Primer inicio en iPhone

El shell (`app/TrasladarDatos`) muestra antes del resumen un aviso breve para añadir AppFit a la pantalla de inicio; si ya está abierta como PWA pero todavía no hay datos, pregunta «¿Primera vez abriendo AppFit?». «Ver instrucciones» abre Ajustes directamente en su guía de instalación y traslado de comidas, con el foco en ella. La guía explica cómo exportar en Safari e importar en el nuevo acceso y permite ir a los botones de backup. Condiciones y almacenamiento: `../datos.md` § Conservación y primer traslado en iPhone.

## Presentación y acciones

«Hoy» con la fecha debajo. Después, de arriba abajo:

1. **Energía** (tarjeta ancha): rueda con las kcal del día en el centro; a su lado, objetivo, frase de `fraseKcal` («Quedan 860 kcal», «250 kcal sobre el objetivo») y gramos de proteína, hidratos y grasa. Toda la tarjeta abre el día en Nutrición. Si la rueda no cabe junto al texto (tarjeta de 20 rem o menos, p. ej. a 320 px o con texto ampliado), la rueda se centra y el texto pasa entero debajo.
2. **Entreno** y **Peso** (dos tarjetas pequeñas). Entreno: «En curso · Desde 18:05», el último entreno («Ayer · 52 min · 600 kg») o «Sin entrenos». Abre Entreno para elegir rutina o entreno libre, sin inventar una programación. Peso: último pesaje y variación a 7 días; la tarjeta abre el historial (solo lectura) y su «+» abre el registro.
3. **Agua**: tarjeta con lo bebido hoy (y el objetivo con su barra en grafito, como dato: no usa el acento). El «+» suma una toma de 250 ml y el «−» quita la última toma (desactivado a 0 ml), ambos con «Deshacer»; la tarjeta abre una Sheet para elegir 250/330/500 ml u otra cantidad, quitar la última toma y repasar los últimos 7 días. El objetivo sale de Ajustes (lo editado manda) o, sin él, del sexo de Perfil: 2,0 L (hombre) o 1,6 L (mujer), según la ingesta adecuada de agua total de EFSA (2010) menos un 20 % por la humedad de los alimentos (criterio de AppFit; ver Referencias › Proteína y agua). Sin sexo ni ajuste no hay objetivo y solo se muestra lo bebido.
4. **Registrar comida**: acción principal (abre Nutrición con el registro). Es lo único naranja con masa de la pantalla: las acciones de las tarjetas («+» del peso, «−»/«+» del agua) van en tono neutro.

Encima de las tarjetas puede aparecer el **aviso de copia de seguridad** si hay datos y han pasado 14 días (configurable en Ajustes: 7/14/30) desde la última exportación (o nunca se exportó). «Exportar ahora» lleva a Ajustes › Copias de seguridad; «Más tarde» lo pospone 3 días. Sin notificaciones. La fecha de la última exportación se guarda solo si la descarga se lanzó.

Las medidas corporales (cintura, cadera…) viven en Perfil; «Medidas caseras» pertenece a Nutrición.

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
