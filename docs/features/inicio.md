# Inicio

`src/features/inicio/`. Es la pestaña por defecto: tarjetas breves del día que componen datos de las otras features (ver `../arquitectura.md` § Capas). Composición minimalista y rueda de energía: [ADR 021](../decisiones/021-inicio-minimalista-rueda-energia.md).

## Dónde está cada cosa

| Pieza | Archivo | Datos |
|---|---|---|
| Pantalla | `InicioTab.tsx` | lee `entriesRepo.delDia`, `perfilRepo.objetivosVigentes` (objetivos del Perfil o manuales), `pesosRepo.delRango` |
| Energía (rueda, objetivo, «Quedan…», gramos de P/C/G) | `components/TarjetaEnergia` | totales de `sumMacros` y objetivos vigentes |
| Geometría de la rueda | `lib/anilloEnergia.ts`: tramos por macro, tramo `otros` y segunda vuelta | — |
| Entreno (en curso o último terminado) | `components/AccesoEntreno` | solo lectura de `workoutsRepo` y `setsRepo`; resumen con `gym/lib/workout` |
| Peso | `components/AccesoPeso`, `components/RegistrarPesoSheet`, `components/HistorialPeso` | `pesosRepo` (tabla `pesos`) |
| Tarjeta pequeña común | `components/TarjetaAcceso` (etiqueta, dato, toda la tarjeta como botón y acción opcional en la esquina) | — |
| Lógica del peso | `lib/peso.ts`: `validarPeso` (rango y decimales admitidos), `tendenciaPeso`, `fraseVariacion` | — |

## Primer inicio en iPhone

El shell (`app/TrasladarDatos`) muestra antes del resumen un aviso breve para añadir AppFit a la pantalla de inicio; si ya está abierta como PWA pero todavía no hay datos, pregunta «¿Primera vez abriendo AppFit?». «Ver instrucciones» abre Ajustes directamente en su guía de instalación y traslado de comidas, con el foco en ella. La guía explica cómo exportar en Safari e importar en el nuevo acceso y permite ir a los botones de backup. Condiciones y almacenamiento: `../datos.md` § Conservación y primer traslado en iPhone.

## Presentación y acciones

«Hoy» con la fecha debajo. Después, de arriba abajo:

1. **Energía** (tarjeta ancha): rueda con las kcal del día en el centro; a su lado, objetivo, frase de `fraseKcal` («Quedan 860 kcal», «250 kcal sobre el objetivo») y gramos de proteína, hidratos y grasa. Toda la tarjeta abre el día en Nutrición.
2. **Entreno** y **Peso** (dos tarjetas pequeñas). Entreno: «En curso · Desde 18:05», el último entreno («Ayer · 52 min · 600 kg») o «Sin entrenos». Abre Gym para elegir rutina o entreno libre, sin inventar una programación. Peso: último pesaje y variación a 7 días; la tarjeta abre el historial (solo lectura) y su «+» abre el registro.
3. **Registrar comida**: acción principal (abre Nutrición con el registro).

La pantalla se irá llenando con más tarjetas a medida que haya funciones nuevas. No hay tracking de medidas corporales; «Medidas caseras» pertenece a Nutrición.

## Rueda de energía

- **Anillo exterior**: lo consumido hasta el objetivo, en tramos de proteína, hidratos y grasa proporcionales a sus kcal (4/4/9 kcal/g). Lo que falta va en negro (`stroke-kcal-rest`). Al alcanzar el objetivo queda lleno.
- **Kcal sin desglose**: si las kcal del día superan a las de los macros (kcal rápidas, alimentos sin macros), la diferencia es un tramo final en `kcal`. Si las de los macros superan a las del día (redondeos), se reparte entre ellos sin pasar de lo consumido.
- **Segunda vuelta**: el exceso sobre el objetivo se dibuja en un anillo interior fino en `kcal`, hasta una vuelta completa (= otro objetivo entero). Sin rojo: pasarse se cuenta con el mismo tono que quedarse corto.
- **Sin objetivo**: si hay consumo, el anillo entero muestra el reparto, sin «de X kcal» ni frase.
- SVG propio (Recharts no entra en Inicio para no cargarlo al arrancar), decorativo (`aria-hidden`): cifras, objetivo y gramos están en texto. Sin animación de llenado.

## Reglas

- **Un pesaje por día**: registrar de nuevo el mismo día lo sustituye (`pesosRepo.registrar`, upsert por fecha en una transacción).
- **Variación a 7 días**: compara el último pesaje con el último cuya fecha sea ≤ la suya − 7 días. Si no hay ninguno, no se muestra.
- Todavía no se puede borrar un pesaje (ver `../roadmap.md`).
