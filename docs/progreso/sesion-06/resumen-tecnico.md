# Sesión 06 — Resumen técnico

Estado al cierre: pantalla Inicio, registro de peso y comidas en Card hechos en la rama `feat/mejorar-home`, **sin commits**. Tests y `npm run build` en verde. Detalle en PROCESO §36.

## Qué se hizo

- **Datos**: tabla `pesos` (Dexie v5, `++id, &fecha`), en `TABLAS_USUARIO` y en el backup como tabla opcional (`BACKUP_VERSION` sigue en 2). Tests de esquema (`verno` 5) e ida y vuelta del backup, incluido un backup antiguo sin `pesos`.
- **`features/inicio/`**: `InicioTab`, `ResumenDiaCard` (anillo de kcal + tres carriles P/C/G), `PesoCard` (último peso, variación a 7 días, sparkline SVG de 30 días), `RegistrarPesoSheet`; `data/pesosRepo.ts` y `lib/peso.ts` (puro, con tests).
- **Primitive `ProgressRing`** + `shared/design/carril.ts` (`tramosCarril`, puro). `fraseKcal` extraída a `nutrition.ts`.
- **Navegación**: pestaña «Inicio» primera y por defecto (icono `home`).
- **Nutrición → Hoy**: una Card por comida con `FranjaMacros`, pie «Añadir a …» (abre Añadir comida con la comida preseleccionada, `comidaInicial`) y «Repetir del día anterior». `ComidasVacias` eliminado.

## Problemas conocidos / cómo continuar

- **Sin probar en navegador** (ver resumen humano): falta revisar a 375×812 en claro y oscuro el anillo, la franja de macros y el ancho de las líneas de macro junto al anillo.
- Borrar un pesaje no existe todavía (solo se sobrescribe el del día).
- La sparkline reparte los puntos por orden, no por fecha.
- Inicio crecerá con más tarjetas (p. ej. Gym).
