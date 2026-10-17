# Segunda ampliación y elección de agarres · 17 de octubre de 2026

Tras la primera ampliación de 204 a 236 ejercicios, Víctor pide seguir ampliando y elegir los agarres al seleccionar un ejercicio. Esta tanda añade **32 ejercicios**: 12 de gimnasio, 12 de calistenia y 8 de pilates. Total: **268 ejercicios e ilustraciones propias**. Los 236 anteriores conservan ids, nombres y músculos.

## Ejercicios añadidos

Los nuevos movimientos se anexan al final de sus patrones. No cambia la preferencia relativa de los ejercicios anteriores del creador de rutinas. Cada alta tiene imagen de 192 px, con el mismo render gris/naranja y fondo blanco; lotes 60–67. Gemelos sentado y curl femoral con deslizadores se refinan individualmente para mostrar la musculatura posterior y el apoyo de talones.

| Ejercicio | Principal | Secundarios | Lote |
| --- | --- | --- | --- |
| Press de suelo con mancuernas (`press-suelo-mancuernas`) | Pecho | Tríceps, Hombros | 60 |
| Press de pecho unilateral con mancuerna (`press-unilateral-mancuerna`) | Pecho | Tríceps, Hombros, Core | 60 |
| Remo gorila con kettlebells (`remo-gorila`) | Espalda | Bíceps, Hombros, Antebrazo, Core | 60 |
| Peso muerto con kettlebell (`peso-muerto-kettlebell`) | Glúteos | Isquiotibiales, Cuádriceps, Aductores, Espalda, Antebrazo, Core | 60 |
| Sentadilla al cajón con barra (`sentadilla-cajon`) | Cuádriceps | Glúteos, Aductores, Espalda, Core | 61 |
| Remo renegado con mancuernas (`remo-renegado`) | Espalda | Bíceps, Hombros, Antebrazo, Core, Tríceps | 61 |
| Hip thrust con mancuerna (`hip-thrust-mancuerna`) | Glúteos | Isquiotibiales, Cuádriceps, Core | 61 |
| Curl femoral con deslizadores (`curl-femoral-deslizadores`) | Isquiotibiales | Glúteos, Gemelos, Core | 61 |
| Elevación de gemelos sentado con mancuernas (`gemelos-sentado-mancuerna`) | Gemelos | — | 62 |
| Press Z con barra (`press-z`) | Hombros | Tríceps, Pecho, Core | 62 |
| Elevación lateral inclinada con mancuerna (`elevacion-lateral-inclinada`) | Hombros | Espalda | 62 |
| Arrastre de trineo hacia atrás (`arrastre-trineo-atras`) | Cuádriceps | Glúteos, Gemelos, Core | 62 |
| Flexiones con rodillas apoyadas (`flexiones-rodillas`) | Pecho | Tríceps, Hombros, Core | 63 |
| Flexiones pseudo plancha (`flexiones-pseudo-plancha`) | Pecho | Tríceps, Hombros, Core | 63 |
| Flexiones escapulares (`flexiones-escapulares`) | Pecho | Hombros, Core | 63 |
| Flexiones hindúes (`flexiones-hindu`) | Hombros | Pecho, Tríceps, Core | 63 |
| Dominadas arqueras (`dominadas-arqueras`) | Espalda | Bíceps, Hombros, Antebrazo, Core | 64 |
| Fondos en barra recta (`fondos-barra-recta`) | Tríceps | Pecho, Hombros, Core | 64 |
| Curl de bíceps en anillas (`curl-biceps-anillas`) | Bíceps | Antebrazo, Core | 64 |
| Extensión de tríceps en anillas (`extension-triceps-anillas`) | Tríceps | Hombros, Core | 64 |
| Sentadilla con salto (`sentadilla-salto`) | Cuádriceps | Glúteos, Gemelos, Core | 65 |
| Zancadas con salto (`zancadas-salto`) | Cuádriceps | Glúteos, Aductores, Isquiotibiales, Gemelos, Core | 65 |
| Puente con caminata de talones (`puente-isquios-caminando`) | Isquiotibiales | Glúteos, Gemelos, Core | 65 |
| Plancha inversa (`plancha-inversa`) | Core | Glúteos, Isquiotibiales, Hombros, Espalda | 65 |
| Rolling like a ball de pilates (`pilates-rolling-like-ball`) | Core | — | 66 |
| Roll over de pilates (`pilates-roll-over`) | Core | — | 66 |
| Double leg kick de pilates (`pilates-double-leg-kick`) | Espalda | Glúteos, Isquiotibiales, Hombros | 66 |
| Single leg kick de pilates (`pilates-single-leg-kick`) | Isquiotibiales | Espalda, Glúteos, Core, Hombros | 66 |
| Hip twist de pilates (`pilates-hip-twist`) | Core | Hombros, Cuádriceps | 67 |
| Leg pull back de pilates (`pilates-leg-pull-back`) | Core | Glúteos, Isquiotibiales, Hombros, Tríceps | 67 |
| Side kick arrodillado de pilates (`pilates-side-kick-arrodillado`) | Glúteos | Core, Hombros | 67 |
| Seal de pilates (`pilates-seal`) | Core | Aductores | 67 |

## Elección de agarres

- El selector abre «Elegir agarre» solo cuando hay dimensiones editables. Sin modalidades relevantes, añade directamente. Se puede volver conservando consulta/filtros o añadir sin especificar. Abrir, cambiar chips y volver no escriben en IndexedDB. Se reutiliza `ModalPage`, con capas y foco compartidos.
- `lib/agarres.ts` asigna perfiles a ids editoriales: orientación, anchura y accesorio son dimensiones independientes. Una variante que ya nombra neutro/supino/cuerda/barra conserva esos detalles. Los personalizados no se enlazan por nombre aproximado y permiten especificar sus datos sin inferir una máquina concreta.
- La orientación mixta se ofrece en pesos muertos con barra compatibles; no en presses. El agarre neutro no se ofrece para una barra recta. Cuerda exige neutro sin anchura; V exige neutro/estrecho; individual no tiene anchura. Cambiar accesorio retira selecciones incompatibles de ese borrador.
- La elección se mantiene visible en el editor de rutinas y en el plan del asistente; puede editarse antes de guardar. En el entreno se ve en la cabecera y puede cambiarse con «Variante», como antes. Las series con un agarre diferente al de la cabecera conservan su etiqueta propia.
- Perfiles anteriores incompatibles siguen mostrándose como «Agarre anterior» en la edición y no se reescriben al leer. Las restricciones se aplican a elecciones nuevas, no a una migración del historial.

## Persistencia y comparación

- `SeleccionEjercicio.agarre`: omitido mantiene el comportamiento de consumidores anteriores; `null` expresa la elección «sin especificar»; un objeto expresa los valores elegidos. No cambia la identidad del ejercicio.
- `Routine.agarres?`: mapa opcional por `Exercise.id`, con `Agarre | null`. Dos rutinas pueden usar variantes distintas del mismo ejercicio; no se cambia `Exercise.ejecucionHabitual` al elegir en el catálogo. Se filtran claves de ejercicios retirados y al sustituir no se hereda el agarre del movimiento anterior.
- Al empezar un entreno (también uno pasado), se copia la configuración de la rutina a `Workout.ejecucionesEjercicios`, incluso sin series objetivo, conservando la lateralidad habitual y sustituyendo solo el agarre. Las series reciben su snapshot en `SetEntry.agarre`; la rutina no se modifica al editar la sesión.
- Seleccionar identidad/configuración/primera serie es transaccional: un error revierte todo. La precarga usa solo series efectivas del agarre elegido; si no existen, parte de los valores iniciales, sin reciclar kg/reps de otro agarre. La clave de comparación de progreso/récords sigue distinguiendo variantes.
- Sin tablas ni índices nuevos: Dexie v12 y backup v3. La copia completa conserva el campo opcional de rutina, la configuración de sesión y los snapshots de las series.

## Referencias de contraste

- [NASM · Core training](https://www.nasm.org/resource-center/blog/training/best-abs-exercises): remo renegado como combinación de tirón y estabilidad del tronco/hombro.
- [NASM · Push-up](https://www.nasm.org/resource-center/exercise-library/push-up): variantes con apoyo de rodillas y participación del tren superior/tronco.
- [Pilates Anytime · I am Resilient](https://www.pilatesanytime.com/class-view/4724/video/Pilates-Day-6-I-am-Resilient-by-Kira-Lamb): repertorio de hip twist, leg pull y seal.
- La traducción a las 12 zonas musculares y los perfiles de agarre son criterios editoriales de AppFit. No se atribuyen porcentajes de activación ni se cambia automáticamente el reparto muscular al cambiar un agarre.
