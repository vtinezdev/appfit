# 034 — Cumbres en lugar de Atributos

Fecha: 2026-10-12. Estado: vigente. Retira el nivel, los títulos y los atributos de [ADR 029](029-gamificacion-atributos.md); sus reglas de XP y sus salvaguardas siguen.

## Contexto

Los Atributos (nivel, títulos de «Recién llegado» a «Leyenda» y Fuerza/Nutrición/Constancia) no convencían a Víctor: sonaban a juego de rol y se solapaban con el resto de la gamificación. Cumbres ya subía montañas con esa misma XP (1 XP = 1 m), así que la app contaba el mismo progreso dos veces, y además «Fuerza» subía por ir a entrenar, no por estar más fuerte. Víctor prefería las Cumbres. Al quitar el nivel, pidió que Cumbres siga sin ser retroactiva, que tenga más montañas, que se puedan repetir las coronadas y que haya logros de repetir.

## Decisión

- **Sin nivel, títulos ni atributos**: desaparecen la página Atributos de Más, la tarjeta «Nivel» de Inicio y el bloque «Experiencia» del fin de sesión. La interfaz no habla de XP: habla de metros.
- **La experiencia queda como motor sin pantalla** (`features/experiencia`, antes `features/atributos`): mismas reglas (entrenos hasta el plan, récords, comidas, proteína y semanas cumplidas), mismos topes. Ritmo y Vitrina siguen saliendo de ella.
- **Cumbres es el progreso general**: tarjeta de Inicio (con la invitación a elegir la primera montaña si no hay), «Cumbres» al terminar un entreno (los metros con su porqué) y en su página lo útil de Atributos («Esta semana», los metros de cada día con su porqué y las reglas).
- **No retroactiva**, como hasta ahora: cuenta desde el día en que se elige la primera montaña.
- **Más montañas**: una segunda etapa de once (Fuji, Jungfrau, Cervino, Monte Rosa, Cotopaxi, Chimborazo, Ojos del Salado, Makalu, Lhotse, Kangchenjunga y K2), con fuentes, detrás del Everest para no cambiar la montaña de quien ya sube. Tres colecciones nuevas: Alpes, Volcanes y Los cinco más altos.
- **Repetir montañas**: «Cambiar montaña» admite las coronadas y, con todas hechas, la ruta vuelve a empezar por la menos coronada, así que siempre hay montaña. Cada subida sabe qué vez es («Aneto · 2.ª vez»).
- **Logros nuevos**: «Otra vez arriba» (2, 3 y 5 cumbres en la misma montaña), el oculto «Más rápido que la otra vez» (repetir una cumbre en menos días), un nivel más en Cumbres (22) y en Metros subidos (100.000 m) y las tres colecciones. En las colecciones, repetir una montaña no suma.
- **Sin cambios de datos**: `Settings.cumbres` sigue igual; la ruta guardada ya admitía cualquier lista de ids y ahora acepta repeticiones.

## Consecuencias

- Una sola cifra de progreso (metros) en lugar de dos (XP y metros).
- Quien no elige montaña no ve progreso general hasta hacerlo; Inicio y el fin de sesión lo invitan.
- Reglas vigentes: [features/cumbres.md](../features/cumbres.md) y [features/experiencia.md](../features/experiencia.md).
