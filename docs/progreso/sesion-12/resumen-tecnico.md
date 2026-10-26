# Sesión 12 — Resumen técnico

Estado al cierre (2026-10-26): `master` en `f1e43ae` (PR #170). Desde el cierre de la sesión 11 (PR #161) se fusionaron los PR #162, #164 y #170. Detalle de cada cambio en PROCESO §235–§248. Este cierre solo añade documentación: el plan de recetas, este resumen y §248.

## Qué se hizo

- **Catálogo** (§235, §246, §247; PR #162 y #170):
  - Paquete `tipicos` integrado en la búsqueda de Nutrición.
  - Ampliado a mano de 285 a 1.999 filas y, tras fusionar duplicados, 1.972. Son recetas CIQUAL y sueltos con fuente `AppFit` (valores orientativos con URL).
  - Método, tandas y criterios de fusión: `scripts/catalogo/tipicos/LEEME.md`.
- **Entreno**:
  - Rutinas precargadas serie a serie desde la última sesión (§236, PR #164).
  - Récords dentro de cada ejercicio en el detalle del historial (§239).
  - Imagen del entreno en 9:16, con ejercicios, mejor serie y medallas (§240).
- **Navegación**: la media luna se equilibró (§237) y después se sustituyó por la rejilla de secciones (§238, ADR 060).
- **Nutrición**:
  - Pestaña Plan con la lista de la compra por semanas (§241).
  - «Encajan con lo que te falta» pasa a Escribir, con los cuatro macros, combinaciones e ideas (§243, §244). Cada propuesta tiene el tamaño de una comida (§245).
- **Pasos**: pasos por semana y tarjeta Pasos en Inicio (§242).
- **Recetas con preparación** (§248, sin código): plan en [`docs/plan-recetas-2026-10-26.md`](../../plan-recetas-2026-10-26.md).

## Cómo continuar

- **Recetas**: abrir la sesión con el mensaje del plan.
  - Fase 1: prototipo en `feat/recetas-prototipo` con cuatro recetas de prueba y capturas. No se fusiona.
  - Víctor decide después si sigue (fase 2) o se descarta.
- **Catálogo**: los alias que necesitan filas de CIQUAL («salsa barbacoa», «salsa César») esperan a reconstruir CIQUAL es3 (§247).
- **Siguen pendientes**: B17 (fotos de progreso, decisión D13) y A15 (piloto de A14). Ver el resumen de la sesión 11 y `roadmap.md`.
- **Pendiente de probar en el iPhone real**: anotado en `roadmap.md`.
