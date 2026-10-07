# 020 — Acento naranja y superficies suaves

Fecha: 2026-10-07. Estado: vigente. Sustituye la paleta de [017](017-paleta-cobalto-y-composicion-respirada.md) (grafito frío, cobalto y ámbar) y su regla «sin sombras en cards/nav». La composición de 017 sigue vigente.

## Contexto

Víctor aportó una referencia visual de otra app de fitness: clara, con tarjetas blancas muy redondeadas, mucho aire y un acento naranja. No quería copiarla ni rediseñar AppFit. Buscaba una evolución natural: más aire, tarjetas limpias, una jerarquía más clara, menos ruido, una paleta armonizada y el naranja como acento sin abusar de él. Se hizo una preview temporal sobre una copia del proyecto, con capturas antes/después de Inicio, Nutrición, Entreno, Progreso y Perfil en claro y oscuro. Víctor la aprobó tal cual («me gusta como queda»), incluida la fusión de acción y energía en una sola familia de color.

## Decisión

Solo cambian tokens y algunos patrones de los primitives; la navegación, los layouts, la tipografía Saira, la tarjeta de entreno en grafito y las fotografías se mantienen.

- **Neutros**: grafito sin sesgo azul. Claro: fondo marfil frío 245/244/241 y superficies blancas. Oscuro: 10/11/13 con superficies 22/23/26.
- **Un único acento naranja**: acción principal, selección, foco, pestaña activa e icono de la sección actual. En claro, naranja tostado 200/80/0 con texto blanco (4,6:1); en oscuro, 245/128/52 con texto grafito. La barra de kcal del día pertenece a la misma familia y deja de tener un ámbar propio. El mapa muscular pasa a una rampa del naranja.
- **Acento con mesura**: las acciones terciarias (`Button ghost`: Ver día, Registrar…) van en grafito y solo su icono lleva el acento. Los datos (línea de peso) y los iconos decorativos de la tarjeta de entreno no usan el acento.
- **Borrar** se desplaza a carmín en claro (182/20/58) para separarse del naranja. En oscuro conserva el rojo coral.
- **Forma y aire**: radios sm/md/lg/sheet 8/14/22/28 px, separación entre secciones de 32 px y padding de card de 20 px.
- **Elevación mínima**: `shadow-card` en Card, `.training-surface` y ListGroup agrupada (solo en claro; en oscuro las cards se separan por tono). `shadow-control` en el botón secundario, la opción elegida del SegmentedControl y el botón Menú. La barra inferior pierde su línea y gana una sombra difusa.
- **Estados activos**: ViewTabs marca la vista en negrita con una barra corta y redondeada de acento. SegmentedControl es una cápsula con la opción elegida elevada. El botón Menú es una cápsula.
- **Menos líneas**: `ListGroup` es por defecto una superficie agrupada con divisores interiores (variante `plana` dentro de una card o un Sheet). Progreso agrupa última sesión, fuerza y volumen en tres Cards. Desaparece el divisor sobre los accesos rápidos de Inicio.

## Consecuencias

- `contrast.test.ts` sustituye «kcal y acción ≥ 15» por «kcal en la familia del acento (ΔE ≤ 10)», y «acción textual y borrar ≥ 15» por ≥ 8. Naranja y rojo son vecinos: borrar siempre va con texto o icono y en claro se aleja hacia el carmín. Todo el contraste AA (texto, paneles y fotografías) sigue exigiéndose sin excepciones.
- 017 había abandonado el naranja de [012](012-identidad-enfocada-energica.md) porque hacía a la vez de acción y de kcal y aparecía unas diez veces por pantalla. Aquí vuelve como acento único, pero con las reglas de 017 que reducen su presencia (acciones repetidas `subtle`, terciarias en grafito y cabeceras de comida neutras).
- Las luces de ambiente (`atmosphere-*`) y las fotografías no cambian.
- Implementación: [DESIGN-SYSTEM](../DESIGN-SYSTEM.md) § Tokens. Intención: [DESIGN.md](../../DESIGN.md) § Colors.
