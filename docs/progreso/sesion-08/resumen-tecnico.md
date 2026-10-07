# Sesión 08 — Resumen técnico

Estado al cierre: sección Perfil y menú de seis destinos en `feat/perfil` (commit `737094e`, sobre `master` = `origin/master` `e175688`), **PR #30 abierta a `master`**. Tests (1.348 / 77 archivos) y `npm run build` en verde. Detalle en PROCESO §74, [ADR 019](../../decisiones/019-perfil-y-estimacion-energetica.md), [ADR 018](../../decisiones/018-menu-de-seis-destinos.md) y [Perfil](../../features/perfil.md).

## Qué se hizo

- **Plan** en modo plan; decisiones de Víctor: Perfil manda (objetivos derivados al leer), rueda de 6 con dianas circulares, fecha de nacimiento, TMB = media Mifflin + Roza-Shizgal, factores 1,2–1,9 («¿Cuánto deporte haces?»), definición/volumen de 200 a 600 kcal elegidos por el usuario.
- **Implementación** con un agente Sonnet (a petición de Víctor): `features/perfil/` (lib pura `energia`, `validacionPerfil`, `objetivosVigentes`, `fuentesEnergia`; `perfilRepo`; `PerfilTab` y Sheets), `Settings.perfil` sin Dexie v7 ni cambio de backup, `updateSettings` transaccional, `pesosRepo.ultimoHasta`, consumidores de objetivos, Ajustes con kcal en solo lectura, área Referencias › Energía y objetivo, `SegmentedControl` vertical/`valor={null}`, icono `user`, rueda 3+3.
- **Ramas**: `master` local avanzado a `origin/master` (Saira, Cobalto, fondo quieto) y el trabajo reaplicado encima. Conflictos en `index.css` (dianas con borde/paginador de Cobalto, `--menu-pages-offset` −19,375 rem), `arquitectura.md` y `PROCESO.md`. ADR renumerados a 018/019 (017 ya era Cobalto).
- **Vitest** excluye `.claude/**`; `.gitignore` ignora `.claude/worktrees/`.
- **Navegador**: Edge vía Playwright instalado en el scratchpad (no en el repo), origen `appfit-test.localhost`, servidor propio en 5175. 90/90 comprobaciones (menú, flujo, integración, backups, 320/375/430, temas, texto 200 %) y prueba offline de producción.
- **PR #30** creada con la API de GitHub (no hay `gh` en el equipo).

## Problemas conocidos / cómo continuar

- El servidor de Víctor en `localhost:5173` servía CSS anterior al cambio de `tailwind.config.js`: reiniciarlo para ver las dianas.
- `scripts/ui/validar-*.cjs` no ejecutados (Chromium y puerto fijos); en Windows hay que pasar Edge (`APPFIT_CHROMIUM`) y adaptar el puerto.
- Fuentes sin verificar (McArdle, NICE NG246) y coeficientes cotejados solo con Wikipedia: `roadmap.md` § Limitaciones.
- Pendiente en iPhone real y futuros (proteína por g/kg, histórico de objetivos, TDEE adaptativo): `roadmap.md`.
- Ramas locales antiguas ya fusionadas sin limpiar.
