# Sesión 11 — Resumen técnico

Estado al cierre (2026-10-24): `master` en `f1e91e8` (PR #160), sin PR abiertos ni avisos programados. Tests (2.766 / 243 archivos) y `npm run build` en verde. Carril A del [plan de evolución](../../plan-evolucion/README.md) completo salvo A15. Carril B completo salvo B17. Detalle de cada paso en PROCESO §197–§208 y §212–§234, y en los carriles [A](../../plan-evolucion/carril-a.md) y [B](../../plan-evolucion/carril-b.md).

## Qué se hizo

- **Carril A** (PR #120–#152):
  - Hechos A2, A3, A5, A6, A8–A14, A16–A19, A21–A24, A28 y A29, más los cruces A-X1 y A-X2.
  - Descartados A4, A7, A20, A25–A27 y A30–A33, por decisión de Víctor en las previews.
  - Migraciones de Supabase 0022–0026, ejecutadas por Víctor (§208, §217, §223).
  - ADR 054–057.
- **Carril B, B9–B16** (PR #153–#160). Desde el 2026-10-24, la misma sesión lleva los dos carriles: los cruces se resuelven en el mismo paso.
  - B9 módulos. B10 «Cerrar el día». B11 lecturas cruzadas.
  - B12 destino Progreso (ADR 058). B13 metas, junto con A-X2. B14 calendario.
  - B15 tu mes, con imagen. B16 planificadas: Dexie v14, ADR 059.
  - Las decisiones de Víctor para B9–B16 están en la cabecera de `carril-b.md`.
- **Feature nueva** `src/features/progreso/` ([progreso.md](../../features/progreso.md)). La media luna tiene siete destinos, con la geometría en `app/arco.ts`.

## Cómo se trabajó (por si se repite)

- **Una rama por paso**, con su PR. La entrada de PROCESO va en un commit aparte, «docs: process log entry».
- **Fusión en cadena** con scripts del scratchpad, que ya no existen:
  - esperar a que se fusione el PR anterior;
  - rebasar sobre `master`;
  - abrir el PR;
  - esperar al CI (`pruebas-y-build`, `navegador`) y fusionar.
- **Trampa con varias ramas apiladas:** si un rebase anterior resolvió conflictos, la rama siguiente reintenta aplicar los commits viejos.
  - Solución: `git rebase --onto origin/master <commit previo original> <rama>`.
  - Cada rama solo debe llevar su propio commit.
- **Conflictos habituales:** las filas vecinas de las tablas de `carril-a.md`/`carril-b.md` y del README del plan.
- **El job `navegador` del CI** falla a veces al instalar paquetes (apt). Se reintenta.
- **Pruebas en navegador:**
  - Playwright con `executablePath: '/opt/pw-browsers/chromium'` y `--host-resolver-rules=MAP appfit-test.localhost 127.0.0.1`, contra `appfit-test.localhost:5173`.
  - `scripts/ui/navegar.cjs` entra en cada destino por la media luna.
  - Para Social: `scripts/ui/supabase-falso.mjs` (puerto 54329) y Vite en 5175 con `VITE_SUPABASE_URL`.

## Cómo continuar (carril B)

- **Único paso que queda: B17 · Fotos de progreso privadas** (XL, rama `feat/b-fotos`, Dexie v15).
  - Antes de empezar, Víctor tiene que decidir D13: si las fotos entran en el backup y en la copia cifrada con un límite de tamaño, o si quedan fuera con una regla nueva en un ADR y un backup aparte. `CLAUDE.md` exige hoy que toda tabla esté en `TABLAS_USUARIO`.
  - Plan en `carril-b.md` § B17.
- **Al terminar B17:** si A15 sigue esperando, el carril B queda cerrado.
- **Cuando los dos carriles estén completos:** `docs/plan-evolucion/` pasa a `docs/historico/` («Al terminar» del README del plan).
- **Para elegir después:** las ideas «No elegidas en el dashboard» del README del plan (GLO-01, ENT-03…) y REN-03 (app nativa, solo hablándolo).
- **A15** (expediciones de comunidad) espera al piloto de 3–4 semanas de A14 con parejas reales.
- **Pruebas en iPhone pendientes:** anotadas en `roadmap.md` § Pendiente de probar en el iPhone real.
