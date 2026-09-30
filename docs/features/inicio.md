# Inicio

`src/features/inicio/`. Es la pestaña por defecto: un resumen del día que compone piezas de las otras features (ver `../arquitectura.md` § Capas).

## Dónde está cada cosa

| Pieza | Archivo | Datos |
|---|---|---|
| Pantalla | `InicioTab.tsx` (saludo según la hora: `lib/saludo.ts`) | lee `entriesRepo.delDia`, `getSettings`, `pesosRepo.delRango` |
| Resumen de kcal y macros | `nutricion/components/ResumenNutricional` (el mismo que en Hoy) | — |
| Entreno en curso o último | `gym/components/TarjetaEntreno` | solo lectura de `workoutsRepo` y `setsRepo` |
| Peso | `components/PesoCard`, `components/RegistrarPesoSheet` | `pesosRepo` (tabla `pesos`) |
| Lógica del peso | `lib/peso.ts`: `validarPeso` (rango y decimales admitidos), `tendenciaPeso`, `puntosSparkline` | — |

## Reglas

- **Un pesaje por día**: registrar de nuevo el mismo día lo sustituye (`pesosRepo.registrar`, upsert por fecha en una transacción).
- **Variación a 7 días**: compara el último pesaje con el último cuya fecha sea ≤ la suya − 7 días. Si no hay ninguno, no se muestra.
- **Mini gráfica de 30 días**: SVG propio (`puntosSparkline`, los puntos se reparten por orden, no por fecha). Recharts no entra en Inicio para no cargarlo al arrancar.
- Todavía no se puede borrar un pesaje (ver `../roadmap.md`).
