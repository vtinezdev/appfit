# 042 — Actualizaciones visibles y aplicadas a petición

- **Estado**: aceptada (2026-10-16).
- **Contexto**: las personas no saben si ejecutan la última versión. Descargar o activar un service worker no cambia el JavaScript de una página ya abierta; cerrar y reabrir varias veces deja un resultado poco claro.

## Decisión

Cada build tiene una identidad y fecha propias, presentes tanto en el código como en `version.json` del mismo origen. La consulta evita la caché y valida la respuesta antes de comparar identidades. Una comprobación fallida o sin conexión no permite afirmar que la app está al día. No se usa la fecha para ordenar versiones: también debe detectarse una vuelta a una build anterior.

El SW se registra explícitamente y usa `prompt`: descarga en segundo plano, y solo activa a petición. Ajustes muestra el estado, la última comprobación, «Comprobar actualizaciones» y «Actualizar ahora», además de una guía para cerrar completamente y reabrir desde el mismo acceso en el móvil si no termina. Inicio muestra un acceso discreto con ese mismo estado.

Se espera la instalación y el cambio de controlador antes de recargar la página que pidió actualizar. Otras pestañas no se recargan a la fuerza. La interfaz avisa de que se recargará y pide guardar las ediciones pendientes. No se borra IndexedDB, preferencias ni todos los cachés, ni se pide reinstalar. El estado de actualización vive en memoria; no se añade al backup.

## Consecuencias

Se requiere una consulta pequeña al propio origen para confirmar el estado y no se puede garantizar «al día» sin conexión. Hay reintentos y tiempos máximos para consultas, descargas y activación. La guía y el estado permiten distinguir la versión ejecutada de la descargada. Las personas con una build anterior necesitan cargar esta primera versión para ver el nuevo control.

Operación y pruebas: [Desarrollo](../desarrollo.md#actualizaciones-visibles-de-la-pwa). Arquitectura: [PWA](../arquitectura.md#estado-y-aplicación-de-actualizaciones).
