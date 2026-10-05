# Identidad enfocada y enérgica — 2026-10-05

Rama: `feat/identidad-enfocada-energica`, desde `origin/master` (`780a2e8`). Encargo: interpretar la opción 3 aportada por Víctor para toda APPFIT, preservando datos, funcionalidad y arquitectura de producto.

## Auditoría y decisión

La base ya ofrecía tokens, primitives, registros de comida equivalentes, fuentes contextualizadas, menú anclado y motion accesible. La deuda era visual: paleta azul tinta, una sola voz tipográfica, paneles con contornos repetidos y entrenamiento subordinado al resumen nutricional en Inicio. Se conserva la arquitectura y se reemplaza el sistema gráfico.

La opción 3 fija grafito/negro, blanco y naranja de acento. Barlow Condensed 700 aporta títulos/métricas deportivos; Manrope conserva nombres, lectura y campos. Se mantienen Sistema/Claro/Oscuro. Inicio propone entrenar y después revisar consumo/peso, sin afirmar una rutina programada ni inventar porcentajes semanales.

## Implementación

- `tokens.css`, Tailwind y CSS global: paleta semántica, escala tipográfica 52/38/32/24, radios 6/10/14/20, superficies por tono, contraste y estados compartidos.
- Card, Metric, PageHeader, SectionHeader, StateMessage y Button; nuevo BrandMark. Las pantallas reutilizadas reciben la identidad por el sistema, sin paletas propias.
- Inicio/TarjetaEntreno: entrenamiento destacado con resultados reales; ResumenNutricional integrado y Registrar comida secundario. Hoy conserva su panel y controles.
- GymHome/EntrenoActivo/WorkoutFinished: ejercicio más reconocible, campos reps/kg de 18 px, métricas y duración final con la nueva voz.
- Nutrición/detalle, platos/ingredientes, rutinas/historial/progreso, referencias, ajustes, formularios, tabs, sheets y menú adoptan las superficies/tipos compartidos.
- Motion existente preservado: 120/200/280 ms, salida 180 ms y éxito 420 ms; Reduce Motion, foco/Atrás, series/descanso y Deshacer conservados.
- Fuente Barlow local, licencia OFL, precarga/precache; theme-color inicial/manifest grafito. Sin dependencias, esquema, cálculos, repositorios, parser ni cambios de backup.

## Validaciones

Todas las pruebas de navegador usan `appfit-test.localhost`, contextos efímeros y datos sintéticos; ninguna usa el perfil personal.

| Comprobación | Resultado |
|---|---|
| `npm test` | 1.193 tests / 65 archivos correctos |
| Guards/contraste/componentes tras el ajuste final | 145 tests correctos |
| `npm run build` | TypeScript, Vite y PWA correctos; 25 entradas de precache |
| `validar-rediseno.cjs` | 514 estados: vacío/habitual/extremo, todas las áreas y formularios |
| `validar-motion.cjs` | 12 contextos, 320–1440 px y perfiles iPhone/Pixel emulados |
| `validar-registros-comida.cjs` | 10 contextos, equivalencia/cifras/acciones/datos conservados |
| `validar-referencias.cjs` | 10 contextos, cobertura/info/salto/fuentes/foco |
| `validar-nutrientes.cjs` | 6 contextos, valores opcionales, cantidad, persistencia |
| `validar-diario-mejoras.cjs` | 9 contextos, arrastre/teclado/tacto, cancelación, Deshacer y fallo/reintento |
| `validar-resumen-diario.cjs` | 24 contextos, consumo integrado/panel, datos extremos y cambios de día |
| `validar-build.cjs` | SW, primera apertura de Referencias offline, fuentes locales, chunks y export íntegro en ambos temas |
| Sintaxis de scripts, JSON/YAML y `git diff --check` | Correctos |

Se actualizan las aserciones del resumen para comprobar contenido, separación y estados en ambas presentaciones, sin exigir el antiguo marco de Inicio. No se modifica una regresión para permitir cambiar valores nutricionales.

Evidencia: `/tmp/appfit-energica-{matriz,motion,registros,referencias,nutrientes,diario,resumen}/`. Confirmación de producción: `/tmp/appfit-energica-confirmacion/`. Texto al 200% de Inicio a 320 px: `/tmp/appfit-energica-home200.png`. Capturas inspeccionadas de móvil/escritorio, ambos temas, menú, formulario, nutrición/referencias, entrenamiento, datos extremos y texto ampliado.

## Revisión final Impeccable

Revisión manual en la sesión principal: CLAUDE.md limita el uso de subagentes a una petición explícita del usuario. Se aplica el contrato de finish review y documentación, con inspección inicial conjunta, un ajuste de duración tipográfica y una confirmación final. No hay comp aprobado ni obligación de reproducir fotos del mockup orientativo.

`disposition: ship` — alcance: implementación revisada en Chromium y los flujos automatizados, sin publicación ni validación de hardware.

### persistence

PRODUCT.md, DESIGN.md con tokens y sidecar, contrato de superficie y ADR 012 actualizados. Colores/radios/tipos documentan el código final; preferencias globales de Impeccable intactas.

### fidelity

| Elemento | Evaluación y evidencia |
|---|---|
| TYPE | Match: Barlow condensado para títulos/métricas, Manrope legible en datos/controles |
| GROUND | Match: fondo 10/10/11, superficies grafito neutras y blanco de contenido |
| MATERIAL | Match: superficies planas por tono, sin imitación de metal/glass/halo |
| Inicio | Adaptación al producto: sesión real o acceso a elegir entrenamiento; consumo/peso reales debajo |
| Nutrición | Match: más tranquila, mantiene jerarquía comida/registro/ingrediente y referencias separadas |
| Entrenamiento | Match: ejercicio/campos/check/descanso prioritarios y cifras legibles |
| Menú/motion | Match: abanico y continuidad conservados, colores/controles integrados |
| Fotografía | Adaptación al encargo: solo cuando aporte valor; no hay material específico de ejercicios y se evita stock decorativo |

### ceiling

Se aplica el carácter de rendimiento mediante compresión tipográfica, contraste, densidad y énfasis operativo. Sin añadir fotografía, objetivos, retos o rachas ausentes. No se declara fidelidad pixel-perfect.

### material_fixes

La duración final de sesión ya usa la misma tipografía numérica; confirmación móvil/escritorio correcta. El detector se ejecuta una vez sobre los targets modificados: cero hallazgos principales y un aviso de radio de 12 px preexistente en `.fan-pages` (paginación futura, sin cambios en este encargo). No se convierte en regla del sistema ni se altera esa interacción por un aviso no bloqueante.

### keep

Identidad grafito/blanco/naranja, dos voces tipográficas, métricas reales y sistemas existentes de foco, datos incompletos, Deshacer y Reduce Motion.

## Documentación y límites

Sistema escrito desde tokens/CSS/componentes finales en DESIGN.md y `.impeccable/design.json`; patrones en DESIGN-SYSTEM y documentación viva de arquitectura/features. No se crean rasters de producto. Barlow: Google Fonts, subconjunto latin 700, archivo de 22.444 bytes; SHA-256 `3787a5a419171630e6890cfa47c4da067474d005cd0ff8dc11ec090fdc3ee2b8`. URL/licencia en DESIGN-SYSTEM y `public/fonts/BarlowCondensed-LICENSE.txt`.

Chromium con emulación móvil no acredita Safari/iOS ni Android físicos, lectores de pantalla, teclado del sistema o haptics reales. No existe script de lint en package.json. Sin commit, push ni despliegue en este encargo.
