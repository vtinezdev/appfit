# Atmósferas del tema claro — 2026-10-06

Víctor pide trasladar el tratamiento atmosférico al tema claro con fotografías que encajen con él. Rama `feat/atmosferas-tema-claro`. Se generan tres placas fotográficas nuevas: bienestar/fitness con luz natural, meal prep en cocina clara y gimnasio luminoso. Oscuro conserva sus imágenes y valores visuales.

`AtmosferaApp` selecciona una única imagen por ámbito y tema resuelto. `theme.ts` expone suscripción/snapshot de la preferencia ya existente, sin otro ajuste o almacenamiento. Tokens compartidos controlan velo, saturación e intensidad reducida de Referencias/Ajustes. No cambian navegación, motion, cálculos, registros, catálogos, esquema ni backups; no se añaden dependencias.

Las nuevas WebP suman 156.792 bytes; las seis, 332.504. Precache local, prompt exacto en cada sidecar y procedencia en [README de assets](../../public/images/atmosferas/README.md). Principios e implementación vigentes: [DESIGN](../../DESIGN.md), [DESIGN-SYSTEM](../DESIGN-SYSTEM.md) y [ADR 013](../decisiones/013-atmosferas-fotograficas.md).

## Evidencia

- `npm run test`: 1.212 tests / 66 archivos correctos. Se amplía contraste sobre extremos fotográficos y presupuesto/procedencia de ambas variantes.
- `npm run build`: TypeScript/Vite/PWA correctos; seis imágenes precacheadas.
- `node scripts/ui/validar-build.cjs`: recarga offline, seis escenas en CacheStorage, variante correcta al navegar en ambos temas, fuentes/chunks y exportación intacta.
- Navegador aislado con fixture sintético: recorrido de 44 estados en 320/375/430/768/1440 px, claro, oscuro y texto al 200%. Targets, inputs, navegación, sesión, marcar/desmarcar serie, preferencia explícita frente al sistema, recarga y cambio dinámico de Sistema. Backups iguales antes/después de navegación/cambio de tema. Forced Colors oculta decoración; Reduce Motion sin movimiento de la foto. La confirmación con carga diferida estabilizada descubre un desbordamiento preexistente en los campos de objetivos de Ajustes al 200% (anchos fijos y fila sin wrap); no causado por la capa fotográfica y fuera de este cambio. Resto de vistas verificadas sin scroll horizontal.
- Revisión visual acotada con Impeccable: inspección inicial conjunta y confirmación estabilizada tras esperar la carga diferida del diario. Jerarquía, densidad, fondo secundario y controles legibles; sin tanda de cambios visuales adicional. Detector sin hallazgos principales y un aviso preexistente no bloqueante sobre paginación futura del menú. Seis assets con procedencia; sin script de lint separado.

Capturas/informe temporal: `/tmp/appfit-fondos-claros/resultado.json` y `/tmp/appfit-fondos-claros-confirmacion/`; la primera matriz podía medir el estado de carga de Ajustes, por lo que su resultado de overflow al 200% queda sustituido por el diagnóstico confirmado. Chromium emulado; Safari, dispositivos físicos iOS/Android y lectores de pantalla siguen pendientes. Veredicto manual: fondos listos dentro del alcance validado; limitación de Ajustes registrada. Sin commit, push ni despliegue.
