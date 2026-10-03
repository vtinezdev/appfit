# Inicio

`src/features/inicio/`. Es la pestaña por defecto: un resumen del día que compone piezas de las otras features (ver `../arquitectura.md` § Capas).

## Dónde está cada cosa

| Pieza | Archivo | Datos |
|---|---|---|
| Pantalla | `InicioTab.tsx` (saludo según la hora: `lib/saludo.ts`) | lee `entriesRepo.delDia`, `getSettings`, `pesosRepo.delRango` |
| Resumen de kcal y macros | `nutricion/components/ResumenNutricional` (el mismo que en Hoy) | — |
| Entreno en curso o último | `gym/components/TarjetaEntreno` | solo lectura de `workoutsRepo` y `setsRepo` |
| Peso | `components/PesoCard`, `components/RegistrarPesoSheet`, `components/HistorialPeso` | `pesosRepo` (tabla `pesos`) |
| Lógica del peso | `lib/peso.ts`: `validarPeso` (rango y decimales admitidos), `tendenciaPeso`, `puntosSparkline` | — |

## Primer inicio en iPhone

El shell (`app/TrasladarDatos`) muestra antes del resumen un aviso breve para añadir AppFit a la pantalla de inicio; si ya está abierta como PWA pero todavía no hay datos, pregunta «¿Primera vez abriendo AppFit?». «Ver instrucciones» abre Ajustes directamente en su guía de instalación y traslado de comidas, con el foco en ella. La guía explica cómo exportar en Safari e importar en el nuevo acceso y permite ir a los botones de backup. Condiciones y almacenamiento: `../datos.md` § Conservación y primer traslado en iPhone.

## Presentación y acciones

Resumen nutricional plano compartido con Hoy, sin anillo ni contador. «Registrar comida» abre directamente el flujo de Nutrición. Entreno y peso son paneles de contexto, con acciones claras. El historial de peso se consulta desde «⋯»: lista completa con fechas/kg, solo lectura sobre el repositorio existente. No hay tracking de medidas corporales; «Medidas caseras» pertenece a Nutrición.

## Reglas

- **Un pesaje por día**: registrar de nuevo el mismo día lo sustituye (`pesosRepo.registrar`, upsert por fecha en una transacción).
- **Variación a 7 días**: compara el último pesaje con el último cuya fecha sea ≤ la suya − 7 días. Si no hay ninguno, no se muestra.
- **Mini gráfica de 30 días**: SVG propio (`puntosSparkline`, los puntos se reparten por orden, no por fecha). Recharts no entra en Inicio para no cargarlo al arrancar.
- Todavía no se puede borrar un pesaje (ver `../roadmap.md`).
