# Progreso

`src/features/progreso/`. Un solo destino para el progreso ([ADR 058](../decisiones/058-destino-progreso.md), B12), en la rejilla de secciones entre Entreno y Social: pestañas Semana · Cumbres · Caminos · Vitrina y, en la cabecera, «Calendario» (B14). Las teselas de Inicio lo abren en su pestaña con «‹ Inicio». Con Cumbres, Caminos, Ritmo y Vitrina ocultos en Ajustes no sale en la rejilla de secciones; sin Actividades (B9) no hay pestaña Caminos.

## Dónde está cada cosa

| Pieza | Archivo | Datos |
|---|---|---|
| Página y pestañas | `ProgresoTab` (Cumbres, Caminos, Ritmo y Vitrina diferidas, montadas con `incrustada`) | `getSettings` (módulos) |
| Pestañas visibles y tesela ↔ pestaña | `lib/vistas.ts`: `vistasProgreso`, `vistaDeTesela`, `teselaDeVista` | — (puro) |
| Esta semana | `ProgresoTab.EstaSemana`: metros subidos, km recorridos y piezas nuevas de la semana (textos de `inicio/lib/progresoSemana`) | `vitrina/hooks/useVitrina` |
| Metas (B13) | `vitrina/components/MetasVista`, en la pestaña Semana; ver [vitrina](vitrina.md#metas-personales-b13) | `vitrina/data/metasRepo`, `useVitrina` |
| Calendario (B14) | `components/CalendarioRegistros` (ModalPage diferida con la hoja del día) | `lib/calendario.ts`: `calendarioRegistros`, `conRegistros`, `resumenDia` (puro); lee `workoutsRepo`, `setsRepo`, `routinesRepo`, `actividadesRepo`, `entriesRepo`, `pesosRepo`, `aguaRepo` |

## Flujos

- **Semana**: arriba, lo de esta semana en Cumbres, Caminos y Vitrina; después las metas y Ritmo (su página de siempre, con el calendario de semanas que abre las revisiones).
- **Calendario** (B14): el mes, de lunes a domingo, con una marca por día para lo registrado (entreno, actividad, comidas y peso; la leyenda va debajo) y los días con algo en tono suave. El agua no tiene marca, pero sale en la hoja del día. Hoy, con contorno; los días futuros no se pueden abrir. Por debajo de 20 rem (320 px o texto ampliado) pasa a la lista de días con registros, como el calendario de Entreno. Tocar un día abre una hoja con los entrenos (rutina, duración, series efectivas y volumen), las actividades (con sus cifras), las comidas (kcal y proteína, con «Ver en Nutrición», que abre el diario en ese día: `NutricionTab.fechaInicial`), el peso y el agua. Abrir el detalle de un entreno desde aquí queda para más adelante.
