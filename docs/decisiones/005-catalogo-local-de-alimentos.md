# 005 — Catálogo de alimentos local, separado de los datos del usuario

- **Estado**: vigente
- **Historia**: `PROCESO.md` §31–§33, §35 y §39. Fuentes, licencias y fuentes descartadas: `scripts/catalogo/README.md`.

## Contexto

Registrar comidas exigía teclear los valores o depender de una IA con cuota. Hacían falta valores nutricionales fiables, en español y sin conexión.

## Decisión

- Un **catálogo de referencia** (tablas `catalogFoods` y `catalogSources`) con fuentes abiertas: CIQUAL (genéricos, traducidos) y una selección de Open Food Facts España (productos de marca).
- Se genera **fuera de la app** (`scripts/catalogo/`) como paquetes JSON estáticos en `public/catalogo/`, que la app descarga, valida e importa sola.
- **Fuera del backup** y de «borrar todos los datos»: se puede volver a descargar.
- Criterio de calidad: mejor pocos alimentos fiables que muchos dudosos; nunca se inventa un valor nutricional.
- Productos escaneados: solo se envía el código de barras a Open Food Facts.

## Consecuencias

- Buscar y registrar funciona sin conexión.
- El paquete publicado es parte del contrato: sus ids no pueden desaparecer y varios tests lo usan.
- Los datos del catálogo tienen licencias propias, distintas de la del código (ver `scripts/catalogo/README.md`).
- No hay genéricos específicamente españoles (BEDCA no es redistribuible sin permiso).
