# Mejoras de uso 1–8 · 17 de octubre de 2026

> Resultados previos a integrar el catálogo ampliado de master. La integración y preparación de la publicación se registran en PROCESO §155; los checks de la PR verifican el conjunto.

Implementadas sobre el trabajo anterior, conservando los cambios pendientes del árbol. Sin nuevas dependencias, esquema ni formato de backup; sin commit, push o despliegue.

| Mejora | Documentación vigente |
|---|---|
| Calendarios táctiles y alternativa compacta | [Gimnasio](../features/gym.md#comodidad-de-registro-y-confianza-al-guardar), [Nutrición](../features/nutricion.md#selección-y-preparación-al-añadir-comida) |
| Estado local y reintento | [Gimnasio](../features/gym.md#comodidad-de-registro-y-confianza-al-guardar) |
| Aviso de carga para revisar/conservar | [Gimnasio](../features/gym.md#comodidad-de-registro-y-confianza-al-guardar) |
| Categorías y preparación al elegir alimentos | [Nutrición](../features/nutricion.md#selección-y-preparación-al-añadir-comida) |
| Pistas contextuales y ayuda recuperable | [Gimnasio](../features/gym.md#comodidad-de-registro-y-confianza-al-guardar) |
| Pestañas con rótulos completos | [Design System](../DESIGN-SYSTEM.md#controles-compactos-y-tendencias-154) |
| Evolución de agua y medidas con tabla | [Inicio](../features/inicio.md#evolución-del-agua), [Perfil](../features/perfil.md#evolución-de-las-medidas) |
| Diagnóstico local, revisable y copiable | [Arquitectura](../arquitectura.md#diagnóstico-local-para-comunicar-problemas) |

Los periodos y campos de las gráficas solo leen registros. Los días sin agua registrada no se suponen cero. Los avisos de peso no establecen límites ni cambian la progresión. El diagnóstico técnico conserva únicamente categoría/fecha del error en memoria, nunca el mensaje ni los registros; no se envía automáticamente.

Las pruebas con datos de medidas al 200 % también detectaron y corrigieron el estrechamiento de nombre/cifra/variación. Disclosure permite envolver rótulos y deja espacio al icono al girar. Guardar notas al salir cancela el guardado diferido que quedaba pendiente para evitar dos intentos involuntarios.

## Verificación

| Comprobación | Resultado final |
|---|---|
| `npm run test` | 2.261 tests / 186 archivos correctos |
| `npm run build` | TypeScript, Vite y PWA correctos; 110 entradas de precache |
| Entrenamiento diario | [33 escenarios correctos](entreno.json), 11 por motor |
| Matriz de interfaz | [30 configuraciones correctas y 690 medidas](responsive.json), cero targets inferiores a 44 px en los estados medidos |
| Producción offline | Pesaje conservado, recarga, nueve destinos y primera gráfica/tabla de agua sin red correctos |
| Ocho mejoras | [60 escenarios correctos](uso.json), 10 por combinación de motor y 320 claro / 375 oscuro al 200 % |

[Logs](logs/) y [capturas](evidencias/) conservados. `uso.json` consolida cinco configuraciones de la ejecución general y la reejecución final de Firefox al 200 % con su posición interior de pulsación; los logs conservan ambas para distinguir el fallo de automatización inicial del resultado final. Comandos: [desarrollo](../desarrollo.md#regresión-de-las-ocho-mejoras-de-uso).

Los motores se ejecutan en Linux: Chromium 151.0.7922.173, Firefox 153.0 y WebKit 26.5. Hay una limitación reproducida del ratón virtual de Firefox al pulsar la parte baja de ciertos viewports; se explica con su alternativa de prueba en desarrollo.md. No se presenta como un defecto de AppFit ni como una certificación del clic físico.

Pendiente hardware real: Android/iPhone, teclados, instalación, gestos, suspensión y permisos. El workflow incluye el nuevo recorrido de uso, pero aún no se ha publicado ni ejecutado en GitHub. Cuenta y servicios reales no se han modificado ni utilizado para estos cambios.
