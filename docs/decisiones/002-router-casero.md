# 002 — Navegación con estado de React, sin router

- **Estado**: vigente (desde la sesión 01)
- **Historia**: `PROCESO.md` §8.

## Contexto

PWA de un único usuario: no hay URLs que compartir ni que indexar, y el botón «atrás» del navegador no existe en la app instalada.

## Decisión

Pestañas y vistas con `useState` (`app/App.tsx`, `<X>Tab`), sin `react-router`. Los overlays y Sheets son estado local de cada pantalla.

## Consecuencias

- Menos dependencias y ningún código de rutas.
- No hay enlaces profundos ni historial: recargar vuelve a Inicio (salvo el entreno activo, que se lee de la base de datos).
- Si algún día hiciera falta abrir una pantalla desde fuera (por ejemplo, desde un atajo), habría que replantear esto; ver también las limitaciones de iOS en [001](001-pwa-local-sin-backend.md).
