# APPFIT

<!-- impeccable:product-schema 1 -->

## Platform

web

APPFIT es una PWA móvil que se utiliza en iOS y Android. Este repositorio no contiene un cliente nativo; las convenciones de plataforma se adaptan dentro de las capacidades del navegador.

## Users

Registro personal de alimentación, peso y entrenamiento. La documentación identifica a Víctor como usuario actual; no se infieren perfiles, cuentas ni clientes adicionales.

## Product Purpose

Registrar y consultar datos propios de nutrición y fuerza con rapidez, también entre series, usando el móvil con una mano. El éxito es completar la tarea, entender el estado y recuperar los registros al volver.

## Operating Context

Uso repetido durante entrenamientos y a lo largo del día. La conexión puede faltar, el teclado ocupa espacio y una sesión puede interrumpirse. Inicio resume nutrición, entrenamiento y peso; Nutrición ofrece registro, búsqueda, plantillas e históricos; Gym ofrece rutinas, sesiones e indicadores de progreso.

## Capabilities and Constraints

- React, TypeScript, Vite, Tailwind, Dexie, Recharts; datos locales en IndexedDB, sin backend ni cuentas.
- Las escrituras siguen los repositorios existentes y las copias conservan el esquema actual.
- El catálogo se descarga del propio origen; Open Food Facts recibe exclusivamente el código de barras. No se añaden servicios de red.
- Español en interfaz y documentación. Datos reales y estados vacíos honestos; no inventar rachas, resultados, récords o recomendaciones de salud.
- El encargo permite rediseñar la UI completa y añadir feedback de series/descansos cuando sea necesario para la interacción, preservando funcionalidad y registros existentes.

## Brand Commitments

Nombre APPFIT, identidad deportiva, moderna, premium, limpia, energética y rápida. El usuario delega las decisiones visuales y pide un menú cuyas opciones nazcan espacialmente del botón inferior. Evitar ornamentación que compita con el entrenamiento.

La referencia elegida el 2026-10-05 es «Enfocada y Enérgica»: títulos deportivos y métricas claras. El 2026-10-06 la paleta pasa a Cobalto (grafito frío, cobalto para actuar, ámbar para la energía) con una composición más respirada; la regla anterior de naranja + negro + blanco queda retirada. Disciplina/rendimiento/progreso, sin estética gaming ni imágenes que no ayuden a usar el producto.

La preview aprobada ese mismo día incorpora fondos generados con acabado fotográfico propios de Inicio, Nutrición y Gym. Aportan contexto a baja intensidad, conservan la prioridad del contenido y se distribuyen localmente para funcionar offline. Referencias y Ajustes reutilizan estas escenas con menor presencia. No representan datos ni fotografías del usuario.

El 2026-10-06 Víctor pide también una dirección fotográfica para claro, con imágenes distintas que encajen en ese tema: luz natural, materiales claros y energía deportiva contenida. La selección respeta la preferencia Claro/Oscuro/Sistema existente.

El mismo día solicita elegir ejercicios sin escribirlos: catálogo local de 100–150 comunes, búsqueda, chips combinables por músculo/equipo, recientes de uso real y personalizados. Se implementan 116 definiciones con identidad estable, manteniendo rutinas/series/histórico y sin fuentes externas ni funciones futuras ficticias.

Antes de cerrar esa rama solicita mapa muscular al terminar y en el historial. La visualización refleja trabajo estimado desde series registradas y asociaciones del catálogo/personalizados; conserva clasificación semántica por sesión. No interpreta intensidad fisiológica, fatiga, recuperación ni riesgo. Las comparaciones semanales/mensuales quedan para una evolución posterior.

Después pide y aprueba una preview de fondos largos de Gym, y autoriza extender el tratamiento a toda la app. Fotografía con color discreto, transición continua y luces ambientales durante el scroll; escenas diferenciadas en Inicio/Nutrición/Gym y lectura más tenue en Referencias/Ajustes. Se adapta a Claro/Oscuro/Sistema sin modificar layout, contenido, controles, datos ni motion.

## Evidence on Hand

Código en `src/`, documentación de flujos en `docs/features/`, fixtures de prueba en `src/test/fixtures/`, fuentes e iconos locales en `public/`. Los fixtures son sintéticos y se usan exclusivamente en contextos de prueba.

## Product Principles

1. La velocidad de registro y la legibilidad durante un entrenamiento mandan.
2. Nutrición y entrenamiento forman un solo producto coherente.
3. El movimiento explica cambios y confirma acciones, sin retrasarlas.
4. Privacidad, persistencia local y conservación de datos son requisitos.

## Accessibility & Inclusion

Targets táctiles amplios, inputs de al menos 16 px, contraste AA, nombres accesibles, navegación por teclado, foco/aislamiento en overlays, safe areas y alternativa explícita de movimiento reducido. La vibración solo se usa cuando la plataforma la admite.
