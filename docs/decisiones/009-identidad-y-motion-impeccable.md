# ADR 009 — Identidad deportiva y motion como sistema

## Contexto

El usuario delega un rediseño profundo, no un pulido del mundo anterior, y pide que los destinos nazcan del botón Menú. La critique independiente detecta homogeneidad de paneles, contenido pospuesto por controles y falta de confirmación durante el entrenamiento. La rueda dentro de una Sheet pierde su origen físico. APPFIT sigue siendo una PWA local-first, no un proyecto nativo.

## Decisión

Sustituir los neutros cálidos por tinta azul y mineral, conservar Manrope local y el naranja con significado, y reforzar jerarquía/densidad. Criterio vigente en [DESIGN.md](../../DESIGN.md); tokens y patrones en [DESIGN-SYSTEM](../DESIGN-SYSTEM.md). Se conserva la arquitectura pequeña de ADR 007 y los datos honestos.

El menú es un abanico ascendente ligado al centro medido del botón inferior, no una Sheet ni una circunferencia decorativa. Usa la misma infraestructura modal. Texto ampliado o poco alto cambia a rejilla accesible; más destinos siguen paginándose. Se conserva el coste de dos pulsaciones autorizado en ADR 008.

CSS y Web Animations comparten duraciones, curvas y reducción de movimiento. `useOverlayPresence` establece una única frontera de salida; `useModalLayer` añade entradas efímeras de History para cerrar capas con Atrás sin introducir rutas ni historial de pestañas. No se añade una dependencia de animación ni un motor spring.

Completar series y descansar son estado visual por workout en sessionStorage, no datos históricos. La confirmación espera escrituras; editar desmarca. Terminar guarda todas las series registradas, explica esa regla y ofrece un resumen real. IndexedDB, repositorios, cálculos y formato de backup no cambian.

## Consecuencias

La identidad y el movimiento se mantienen en tokens/componentes, no en parches por pantalla. No se animan cifras, no se inventan récords y no se impone tinta a todo contenido. El descanso se configura bajo demanda para conservar espacio de edición.

Haptic es complemento opcional mediante Vibration API; iOS/Safari no lo ofrece y Android depende del navegador. Reduce Motion conserva estados sin desplazamientos. La validación Chromium no sustituye dispositivos reales, VoiceOver/TalkBack o teclados y safe areas reales de WebKit.

ADR 007 queda sustituido solo en la dirección visual cálida; ADR 008, solo en la rueda dentro de Sheet. Sus decisiones de arquitectura y lista central se conservan.
