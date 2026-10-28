# Referencias

`src/features/referencias/`. Sección global: Ajustes › Saber más › Referencias, y los enlaces de Nutrición y Perfil. «‹ Ajustes», «‹ Nutrición» o «‹ Perfil» encima del título vuelve a donde se abrió (desde Ajustes, con el foco en la fila Referencias). Decisión: [ADR 011](../decisiones/011-consumo-y-referencias.md).

**Nutrición muestra qué está consumiendo el usuario y cómo va. Referencias explica por qué APPFIT utiliza esos valores y de dónde proceden.**

## Áreas

- **Catálogo de alimentos**: ANSES · CIQUAL 2025 y Open Food Facts (selección España y escaneo). Procedencia, licencias, nutrientes disponibles y limitaciones de composición/etiquetado. Solo fuentes distribuidas actualmente en `public/catalogo/manifest.json` y utilizadas por el lector. No se atribuyen datos a BEDCA/USDA.
- **Objetivos nutricionales**: ocho referencias consultables. Calorías/P/C/G reflejan los objetivos vigentes (kcal de Perfil si manda, o los de Ajustes); el proyecto no documenta una fuente clínica para sus valores iniciales. Fibra, azúcares, sal y saturadas conservan los criterios anteriores, incluida la diferencia entre azúcares totales y libres. Valores y fuentes: registro central, sin nuevas metas persistidas.
- **Energía y objetivo** (`EnergiaReferencias`): arriba, «Cómo sale tu objetivo» en cuatro pasos numerados (reposo, deporte, objetivo y límites; `lib/pasosEnergia`), cada uno con su regla y, con perfil completo, tu cifra (lee `perfilRepo.estadoEnergetico`, sin escribir). El aviso, en dos frases. Después, una sección plegable por paso con el mismo número y lo visual primero: las dos ecuaciones con tu cifra y su media (fórmulas en «Las fórmulas»), los cinco niveles de actividad con el tuyo marcado, una regla de −600 a +600 kcal con tu punto, tu ajuste y tu ritmo, y los cuatro límites en casillas con icono. La bibliografía de cada paso, plegada en «En qué se apoya»; al final, «Cómo se usa en la app» en tres puntos y las fuentes con DOI/URL (`perfil/lib/fuentesEnergia.ts`). `App.areaReferencias` abre esta área desde Perfil.
- **Proteína y agua** (`ProteinaAguaReferencias`, `lib/fuentesProteinaAgua.ts`): de dónde salen el rango de proteína por kg y el objetivo de agua, con cada fuente y **qué se comprobó y qué no**. Morton et al. (2018): DOI, título y año con Crossref y 1,62 g/kg/día (IC 95 % 1,03 a 2,20) con el texto del artículo en PubMed Central. Jäger et al. (2017): DOI con Crossref y 1,4 a 2,0 g/kg/día con el texto del artículo. EFSA (2010): DOI, título y año con Crossref; 2,0 L (mujeres) y 2,5 L (hombres) de agua total, incluida la de los alimentos y solo para clima y actividad moderados, con el resumen de EFSA (copia archivada: efsa.europa.eu rechaza la consulta directa). El 20 % que AppFit descuenta por la humedad de los alimentos es un criterio propio y no una cifra de EFSA. Iraki 2019 no se cita para el rango (su cifra de proteína no se cotejó).
- **Recomendaciones alimentarias**: estado vacío explícito hasta contar con criterios y fuentes. No se muestran ejemplos numéricos como recomendaciones.
- **Sobre los datos**: cobertura por registros, ausencia frente a cero, sumas conocidas, snapshots que no cambian al actualizar catálogo y azúcares totales.

## Presentación

El índice lleva un icono por área. Cada área empieza con su aviso en un recuadro con icono (`components/SeccionReferencia.AvisoReferencia`) y reparte su contenido en tarjetas plegables con título y una línea de resumen (`SeccionReferencia`), cerradas al empezar (punto 33 del bloque 7). Catálogo de alimentos: una tarjeta por fuente con su licencia y su enlace.

## Fuente común

`shared/lib/referenciasNutricionales.ts` define `NutrienteId` (las ocho claves existentes), nombres, orden, tipo, valor/unidad, criterio, particularidades, fuente y mínimo/máximo opcionales. `referenciaNutricional(id, objetivos, origen)` (origen `perfil` o `manual`: la referencia de kcal indica de dónde sale) deriva valores de los ajustes actuales y de los mismos criterios puros que utilizan las barras. `nutricion/lib/referenciasNutrientes.ts` conserva un reexport compatible.

`ReferenciaNutrienteContenido` renderiza el mismo registro en la Sheet contextual y en los Disclosure de Objetivos nutricionales. «Ver en Referencias» cierra primero la Sheet y después abre/enfoca la referencia correspondiente mediante `App`, sin modificar la URL. Cada área tiene vuelta al índice con retorno de foco. Enlaces externos solo se consultan al pulsarlos; no se envían registros del usuario.

Las referencias son contenido local y lecturas de Settings; no hay escrituras, esquemas nuevos ni cambios en cálculo, catálogo o historial. El chunk de la sección es diferido y se precachea para uso offline.

## Grupos futuros

`lib/contenidoReferencias.ts` centraliza áreas, catálogo, limitaciones y la estructura futura. `GrupoAlimentarioId` contempla fruta, verduras, legumbres, pescado, frutos secos, carnes y otros. `RecomendacionAlimentaria` tiene grupo, periodo diario/semanal, unidad raciones, mínimo/máximo opcionales, explicación y fuente. `ESTADO_RECOMENDACIONES = 'pendiente-definicion'` es el placeholder interno; la colección está vacía.

La UI puede representar registros con rangos y fuente cuando existan. Todavía no clasifica alimentos, calcula raciones ni compara consumo real por grupos: el modelo actual no proporciona esa información y no se inventa.
