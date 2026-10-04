# Referencias

`src/features/referencias/`. Sección global accesible desde Menú. Decisión: [ADR 011](../decisiones/011-consumo-y-referencias.md).

**Nutrición muestra qué está consumiendo el usuario y cómo va. Referencias explica por qué APPFIT utiliza esos valores y de dónde proceden.**

## Áreas

- **Catálogo de alimentos**: ANSES · CIQUAL 2025 y Open Food Facts (selección España y escaneo). Procedencia, licencias, nutrientes disponibles y limitaciones de composición/etiquetado. Solo fuentes distribuidas actualmente en `public/catalogo/manifest.json` y utilizadas por el lector. No se atribuyen datos a BEDCA/USDA.
- **Objetivos nutricionales**: ocho referencias consultables. Calorías/P/C/G reflejan los objetivos personales actuales de Ajustes; el proyecto no documenta una fuente clínica para sus valores iniciales. Fibra, azúcares, sal y saturadas conservan los criterios anteriores, incluida la diferencia entre azúcares totales y libres. Valores y fuentes: registro central, sin nuevas metas persistidas.
- **Recomendaciones alimentarias**: estado vacío explícito hasta contar con criterios y fuentes. No se muestran ejemplos numéricos como recomendaciones.
- **Sobre los datos**: cobertura por registros, ausencia frente a cero, sumas conocidas, snapshots que no cambian al actualizar catálogo y azúcares totales.

## Fuente común

`shared/lib/referenciasNutricionales.ts` define `NutrienteId` (las ocho claves existentes), nombres, orden, tipo, valor/unidad, criterio, particularidades, fuente y mínimo/máximo opcionales. `referenciaNutricional(id, objetivos)` deriva valores de los ajustes actuales y de los mismos criterios puros que utilizan las barras. `nutricion/lib/referenciasNutrientes.ts` conserva un reexport compatible.

`ReferenciaNutrienteContenido` renderiza el mismo registro en la Sheet contextual y en los Disclosure de Objetivos nutricionales. «Ver en Referencias» cierra primero la Sheet y después abre/enfoca la referencia correspondiente mediante `App`, sin modificar la URL. Cada área tiene vuelta al índice con retorno de foco. Enlaces externos solo se consultan al pulsarlos; no se envían registros del usuario.

Las referencias son contenido local y lecturas de Settings; no hay escrituras, esquemas nuevos ni cambios en cálculo, catálogo o historial. El chunk de la sección es diferido y se precachea para uso offline.

## Grupos futuros

`lib/contenidoReferencias.ts` centraliza áreas, catálogo, limitaciones y la estructura futura. `GrupoAlimentarioId` contempla fruta, verduras, legumbres, pescado, frutos secos, carnes y otros. `RecomendacionAlimentaria` tiene grupo, periodo diario/semanal, unidad raciones, mínimo/máximo opcionales, explicación y fuente. `ESTADO_RECOMENDACIONES = 'pendiente-definicion'` es el placeholder interno; la colección está vacía.

La UI puede representar registros con rangos y fuente cuando existan. Todavía no clasifica alimentos, calcula raciones ni compara consumo real por grupos: el modelo actual no proporciona esa información y no se inventa.
