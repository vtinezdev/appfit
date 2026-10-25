# APPFIT — rediseño con Impeccable, 2026-10-03

Informe histórico del cambio, no una segunda especificación. Sistema vigente en [DESIGN](../../DESIGN.md), implementación en [DESIGN-SYSTEM](../DESIGN-SYSTEM.md) y decisiones en [ADR 009](../decisiones/009-identidad-y-motion-impeccable.md).

## Análisis y dirección

Impeccable fue el sistema principal de critique, diseño, motion, auditoría y cierre. La auditoría inicial independiente A/B recorrió arquitectura, navegación, componentes y flujos de Inicio, Nutrición, Gym y Ajustes, con estados sintéticos. Encontró paneles demasiado homogéneos, controles que posponían el contenido, una rueda desligada del botón y poca confirmación durante el entrenamiento. También detectó la doble espera de salida de Sheet y fills animados mediante width.

La critique inicial obtuvo 28/40; es una puntuación del diseño anterior, no del resultado final. [Snapshot](../../.impeccable/critique/2026-10-03T14-46-47Z__src-app-app-tsx.md). Se conservaron datos honestos, plantillas/copias/Deshacer, campos directos, foco modal y funcionamiento local-first.

El usuario delegó reemplazar el mundo visual. Se eligió una dirección propia de pista indoor y señalética deportiva: tinta/mineral/naranja, Manrope local, densidad operativa y superficies planas. El contrato code-led y la dirección corroborada están en [.impeccable/surfaces/appfit.md](../../.impeccable/surfaces/appfit.md); no se fingió un comp aprobado ni se copiaron controles de referencias ajenas.

## Cambios principales

1. **Visual:** jerarquía más fuerte y nueva paleta común en ambos temas; resumen diario más compacto; Registrar comida integrado en su contexto; entreno activo distinguido de historial y ajustes. Se conserva la columna móvil centrada, los datos y los patrones que ya funcionaban.
2. **Sistema:** roles semánticos de entrenamiento/éxito, tipografía/espaciado y tokens de motion en la fuente compartida. DESIGN y su sidecar documentan lo realmente construido. No se añadió dependencia.
3. **Componentes:** navegación y capas rediseñadas; botones, campos, listas, cabeceras, carga, barras, tabs y selectores alineados. El selector mide la opción real para que etiquetas como Desayuno no se corten en 320 px. Reloj y cierre de entrenamiento son componentes reutilizables.
4. **Motion:** presión 120 ms, estado 200 ms, overlays/abanico 280 ms, reversa 180 ms y cierre de sesión 420 ms. Curvas desaceleradas, sin rebote ni motor spring. CSS/WAAPI animan transform/opacity; FLIP ocurre al cambiar estructura, no al escribir o en cada tick.
5. **Menú:** cuatro destinos emergen desde el centro medido del botón inferior, en dos niveles ascendentes. Selección visible y accesible; cierre inverso, fondo/Escape/Atrás, foco y aislamiento. Texto ampliado o poco alto usa una rejilla de dos columnas, sin targets reducidos; futuros destinos mantienen paginación.
6. **Entrenamiento:** check reversible, feedback de éxito, edición que desmarca, alta y continuidad de series, Deshacer, descanso opcional y reloj absoluto. La configuración se despliega bajo demanda; con descanso activo una fila completa sigue visible a 320×568. Terminar confirma, permite continuar, espera escrituras, conserva error/reintento y muestra resultados guardados reales.
7. **Plataformas:** PWA con safe areas/visualViewport, History efímero para capas y Reduce Motion que mantiene estados sin desplazamientos. Vibration API es opcional en Android y no está disponible en iOS/Safari. No se presentó la emulación como validación nativa.
8. **No implementado:** gráficos/cifras animados sin valor informativo, récords inventados, confeti, fotografías decorativas, librería spring/gestures, reordenación gestual nueva y notificaciones de descanso en background. No justificaban cambiar negocio/datos o aumentar complejidad en este alcance.

Marcas y descanso viven por workout en sessionStorage; sobreviven navegación y recarga de la misma pestaña, no forman parte del historial ni del backup. Todas las series registradas se guardan al terminar, marcadas o no. No se modificaron tablas, migraciones, repositorios, cálculos, formato de backup ni dependencias.

## Verificación terminada

| Comprobación | Resultado |
|---|---|
| `npm run build` | TypeScript, Vite y PWA correctos; chunks diferidos conservados |
| `npm run test` | 1.133 tests en 59 archivos correctos, incluidos contraste y guards |
| `validar-rediseno.cjs` | 514 estados correctos: 320/375/430, temas, vacío/habitual/extremo, flujos, nombres largos, teclado simulado y tablet |
| `validar-menu-radial.cjs` | 12 contextos correctos: normal/reducido, foco, geometría, teclado, cierres, scroll, paginación y backup |
| `validar-motion.cjs` | 12 contextos correctos: 320–1440, perfiles táctiles emulados, cierres interrumpidos repetidos, resize, texto 200 %, landscape, marcas/descanso/recarga, alta/borrado/undo, touchCancel y fallo/reintento al terminar |
| `validar-build.cjs` | Producción: SW, recarga offline, fuente local, destinos/chunks y export íntegro en ambos temas |
| Sintaxis/diff | `node --check` de los scripts y `git diff --check` correctos |
| Documentación | YAML/referencias, 54 roles RGB, 9 roles tipográficos y 10 snippets de sidecar comprobados |

No existe un comando lint en package.json; no se declara una ejecución inexistente. Las pruebas usan perfiles efímeros con fixtures y `appfit-test.localhost`, nunca el origen de datos personales. Los comandos reproducibles están en [Desarrollo](../desarrollo.md).

Se inspeccionó el resultado renderizado y los recorridos, no solo la compilación. La revisión independiente final usó 136 capturas válidas, pidió cinco correcciones materiales y verificó su resolución en un único lote: densidad de entreno, check del menú compacto, etiqueta Desayuno, título antes del contexto y DESIGN actualizado. Su [verdict](../../.impeccable/review/finish-review.md) es `ship` para esos cinco fixes, no una aprobación de fuentes o dispositivos que no inspeccionó. No se repitió el detector final.

## Límites y siguiente comprobación

Chromium emulado no acredita Safari/WebKit, iOS o Android físicos, teclados/safe areas reales, VoiceOver/TalkBack, tacto háptico ni rendimiento por frame en hardware. Esas verificaciones quedan pendientes. El descanso no promete ejecución ni avisos fiables en background.

En dispositivos reales: abrir/cerrar rápidamente el menú; usar Atrás en Android; editar una serie con teclado; activar/desactivar Reduce Motion; completar/desmarcar, terminar/saltar descanso, cancelar y guardar sesión; comprobar instalación/offline y lector de pantalla. Usar datos de prueba o una copia aislada.

Trabajo entregado sin commit, push ni despliegue. La instalación preexistente de skills/hooks no se modificó.
