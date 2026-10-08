# 023 — Categorías de alimentos: una lista compartida y leída en vivo

Fecha: 2026-10-08. Estado: vigente. Complementa [004](004-identidad-alimentos-y-snapshots.md) (identidad de alimentos y snapshots) y [022](022-esquema-v7-recetas-y-objetivos-por-dia.md) (recetas como alimento).

## Contexto

Víctor quiere que cada alimento que registra tenga una categoría, para verla, filtrar la lista de Alimentos y ver en el Resumen de dónde vienen las kcal. El catálogo (CIQUAL y Open Food Facts) ya traía una de 29 categorías AppFit; los alimentos propios, las recetas y los productos escaneados en directo no tenían ninguna. Pidió que fuera obligatoria al crear y revisar a mano los alimentos antiguos.

## Decisión

- **Una sola lista**, la del catálogo, en `src/features/nutricion/lib/catalogo/categorias.ts` junto con las reglas de OFF (`categoriaDeOff`). El archivo no tiene imports y la tubería (`scripts/catalogo`, Node con type stripping) lo importa con su extensión; antes la regla era que los scripts no importan de src. Así un escaneo en directo y el paquete de OFF clasifican igual y no hay dos listas que mantener.
- **`Food.categoria` opcional en el tipo, obligatoria al crear** (`foodsRepo.crear`, `resolverParaGuardar`, `recetasRepo`). Campo sin índice: ni versión de Dexie ni de backup, y los alimentos antiguos siguen siendo válidos hasta que se revisan. No se adivina la de los antiguos (Víctor eligió revisarlos a mano).
- **Leída en vivo, no snapshot.** Las entradas no guardan la categoría: `foodsRepo.categoriasDeEntradas` la resuelve por `FoodRef` (propio o catálogo). Clasificar un alimento antiguo clasifica también su historial, que es lo que se busca al revisarlos. A diferencia de los valores nutricionales (ADR 004), la categoría es una clasificación, no lo que se comió. Alternativa descartada: un snapshot en cada entrada, que habría dejado el historial previo sin categoría o exigido reescribirlo.
- **La categoría de una receta vive solo en su `Food`**, para que editarla desde Alimentos o desde la receta sea lo mismo.

## Consecuencias

- Un alimento borrado deja sus entradas «sin categoría»; las kcal rápidas también lo están.
- La categoría de un alimento del catálogo no se puede cambiar; los `off` escaneados antes se reclasifican al volver a escanearlos con conexión.
- Renombrar o quitar una categoría de la lista afecta a datos del usuario: haría falta migrar `foods`.
- Detalle: [datos](../datos.md) (invariante 14), [nutrición](../features/nutricion.md), [tubería](../../scripts/catalogo/README.md).
