# APPFIT completa

Target: `src/app/App.tsx`; related: `src/features/inicio/InicioTab.tsx`, `src/features/nutricion/NutricionTab.tsx`, `src/features/gym/GymTab.tsx`, `src/app/Ajustes.tsx`.
Visitor mode: Operate. Implementación directa solicitada por el usuario; elección de esta sesión, sin modificar preferencias globales de Impeccable.

## Direction contract

THESIS: Herramienta de disciplina, rendimiento y progreso. La opción 3 «Enfocada y Enérgica» aportada por Víctor manda sobre la identidad anterior y sobre el roll.

OWN-WORLD: Negro/grafito, blanco/grises y naranja intenso de acento. Saira local: títulos condensados rectos, cifras en cursiva condensada, lectura/edición a ancho normal. Superficies compactas por tono, radios contenidos, controles reconocibles; sin gaming, halo ni fotografía de relleno.

STORY: Inicio resume el día en tarjetas breves (energía, entreno, peso) y propone registrar comida. Nutrición muestra consumo; Referencias explica criterios/fuentes compartidos. Gym prioriza ejercicio y series. Cada acción conserva datos, navegación y recuperación existentes.

FIRST VIEWPORT: «Hoy» y fecha, tarjeta ancha de energía con rueda (ADR 021), tarjetas Entreno/Peso y Registrar comida. En sesión: estado/tiempo/series/volumen y primera fila editable al alcance. Menú inferior estable y abanico conectado a su origen.

FORM: Dirección fijada por el usuario: opción 3. Seed consultado una vez, `28308d58`, índice 6; el encargo explícito prevalece. Se conserva disciplina tipográfica/claridad operativa sin adoptar topologías ajenas. Riesgo: ampliación de texto y cifras deben envolver sin reducir targets.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

## Motion thesis

Conservar el abanico, confirmación de series, descanso y cierre de sesión. Feedback 120 ms, estados 200 ms, capas 280 ms, salida 180 ms; éxito breve 420 ms. CSS/Web Animations sin rebote ni motor nuevo. Reduce Motion mantiene texto/check y fundido de 80 ms, sin desplazamiento/FLIP/stagger. Haptics opcionales según navegador.

## Constraints

PWA React/TypeScript; no cliente nativo. Sin cambios de backend, cálculos, schema, parser, repositorios o backups. Marcas/descanso siguen en sessionStorage. Sistema/Claro/Oscuro y geometría accesible conservados. Pruebas en `appfit-test.localhost`, perfiles efímeros y fixtures sintéticos.

## Finish record

Revisión visual acotada y documentación en la sesión principal, respetando CLAUDE.md (sin subagentes). Evidencia y límites del sistema inicial: `docs/historico/identidad-enfocada-energica-2026-10-05.md`. Barlow local con licencia/procedencia documentada.

## Extensión aprobada: atmósferas fotográficas

Tras la preview estática de tres pantallas (`/workspace/generated_images/exec-22bc6273-7a5b-4550-b148-caf70875b471.png`), Víctor autoriza «Me gusta mucho, implementa todo». Inicio combina bienestar, fitness y nutrición; Nutrición usa cocina/meal prep calmado; Gym pesas y esfuerzo. Se generan tres escenas específicas sin UI ni texto: la interfaz y sus datos siguen siendo React, no parte de la imagen.

`AtmosferaApp` es decoración sin eventos ni información accesible. Tokens compartidos controlan opacidad, saturación, lectura y desvanecimiento. Referencias/Ajustes reciben una variante más discreta; Claro reduce la foto; Forced Colors la oculta. Sin movimiento, parallax ni hueco decorativo que aleje las primeras series. Menú, capas y formularios conservan superficies protegidas.

Entrega inicial: tres WebP locales (175.712 bytes en total), precargados por la PWA, con prompts exactos en sidecars. Procedencia en `public/images/atmosferas/README.md`. Revisión inicial conjunta de Inicio/Nutrición/sesión móvil oscura e Inicio claro en escritorio: jerarquía, contraste y densidad correctos; no requiere tanda de fixes visuales. Detector: cero hallazgos principales, un aviso preexistente de radio en paginación futura del menú.

Veredicto manual: listo dentro del alcance validado. 1.208 tests / 66 archivos y build TypeScript/Vite/PWA correctos; 514 estados, 12 contextos de motion y producción offline con las tres imágenes verificadas en CacheStorage. Evidencia, accesibilidad y límites en `docs/historico/atmosferas-fotograficas-2026-10-05.md`. Hardware iOS/Android y Safari siguen pendientes. Sin commit ni push.

## Extensión: fotografías propias para Claro (2026-10-06)

Víctor solicita el mismo tratamiento para claro y prefiere fotografías distintas que encajen con el tema. Inicio combina bienestar/fitness en luz natural; Nutrición usa cocina clara y meal prep calmado; Gym conserva intensidad con pesas en un gimnasio luminoso. No sustituir identidad, controles, datos ni el juego oscuro. Un velo marfil más protector y desvanecimiento rápido subordinan la escena al contenido. Referencias/Ajustes conservan intensidad mínima.

`AtmosferaApp` consume el tema resuelto por la preferencia existente mediante `useSyncExternalStore`; una sola imagen, actualización explícita/Sistema y persistencia de preferencia intactas. Seis WebP locales suman 332.504 bytes y están disponibles offline; los tres nuevos assets conservan prompts exactos. Contraste de lectura plana en claro verificado además de paneles/cabeceras.

Revisión acotada manual de móvil/escritorio, sesión, diario, menú y texto ampliado; fondos sin defectos visuales que requieran cambios adicionales. La confirmación estabilizada detecta un desbordamiento previo de campos de objetivos en Ajustes al 200%, registrado fuera del alcance. Veredicto: fondos listos dentro del alcance emulado. 1.212 tests / 66 archivos, build y producción offline correctos. Evidencia y límites: `docs/historico/atmosferas-tema-claro-2026-10-06.md`. Sin dependencias, commit ni push.
