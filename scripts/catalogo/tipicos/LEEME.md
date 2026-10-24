# Típicos: lote inicial y límites

Ejecutar `npm run catalogo:tipicos` (versión fija 2026-10-24) o
`npm run catalogo:tipicos -- AAAA-MM-DD`. Sin dependencias nuevas. La lógica pura
vive en tipicosLib.ts; el CLI solo coordina archivos y el manifest.

Este lote NO cumple todavía el volumen solicitado de 300–500 entradas.
Incluye 20 directos USDA y 27 recetas. La ampliación solicitada de 500 alimentos adicionales sigue pendiente. No se equiparan quesos con DOP, piezas
ibéricas ni embutidos regionales a productos parecidos de otros países.
`sin-fuente.json` contiene pendientes, no afirmaciones de que no exista ninguna
fuente posible. `auditoria-ciqual.txt` documenta búsquedas iniciales y equivalencias.

## Directos

Fuente: USDA FoodData Central, SR Legacy April 2018, CC0.
Descarga oficial:
https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_csv_2018-04.zip
Cada fila contiene id FDC, versión, nombre original y URL. Valores de food_nutrient.csv:
1008 energía kcal, 1003 proteína, 1005 hidratos, 1004 grasa, 1079 fibra,
2000 azúcares y 1258 saturadas. Sal desconocida: no se sustituye por el sodio.
Ninguna porción doméstica se convierte a 100 g: el origen ya expresa 100 g
comestibles. El estado congelado de las orejas se conserva en el nombre.

`directos.csv` no admite comillas ni punto decimal: `;` delimita campos y `|`
separa alias/metadatos. Notas obligatorias: `version=...|original=...`.
Un error bloquea el lote; un aviso energético excluye un directo salvo CIQUAL.
No se alteran valores oficiales para hacerlos pasar por calidad.ts.

## Recetas

Referencia culinaria: Simone Ortega, *1080 recetas de cocina*, Alianza Editorial.
Se cita como repertorio de cocina doméstica, sin copiar texto ni datos nutricionales.
Las formulaciones son criterio AppFit, no se atribuyen sus cantidades a la autora.
Cada JSON conserva gramos netos comestibles de ingredientes CIQUAL y peso final
objetivo del lote listo. Aceite = retenido en el plato, no todo el baño de fritura.
Agua y sal aparecen explícitos cuando se incorporan. No hay descuentos implícitos
por absorción de aceite ni por escurrido. No hay factores USDA de retención.
La energía/macros se suman antes de dividir por peso final y redondear a un decimal.
Los extras solo se publican si todos los ingredientes tienen ese dato.

**Revisión de Víctor necesaria para las 25 recetas iniciales:** los pesos finales son objetivos de formulación,
no mediciones experimentales. Contrastarlos pesando lotes antes de considerar
este conjunto una tabla representativa. Las recetas no son promedios analíticos
nacionales y no representan todas las variantes domésticas. No se ha verificado
la correspondencia individual con páginas concretas del repertorio citado.

Arroz con pollo y conejo no se llama paella valenciana porque no pretende fijar
su receta tradicional. Arroz con marisco tampoco se presenta como una paella
oficial. Arroz negro pendiente: no se omite la tinta para generar una fila.

## CIQUAL y verificaciones pendientes

Cuatro alias añadidos en traducciones.csv, pendientes de reconstruir es3:
6140, 6141 (carrillada de vacuno), 28501 (panceta fresca), 28845 (jamón serrano).
ES2 se mantiene intacto. La descarga compo (~69 MB) no se completó en el plazo;
los XML parciales no se deben usar. Seguir README.md para reintentar y reconstruir.

El manifest con una tercera fuente invalida las expectativas de dos tests de
src/ que enumeran exactamente CIQUAL/OFF. No se modifican por la restricción
expresa del encargo. Claude Code debe adaptar esas expectativas al integrar.
La documentación viva y docs/PROCESO.md quedan para Claude Code, según el encargo.

## Ampliación exclusivamente tradicional española

Se incorporan pipirrana de Cazorla y trampó mallorquín, con referencias
individuales de turismo institucional y gramajes AppFit. Son mezclas crudas
que retienen íntegros ingredientes y jugos: el peso final es la suma exacta
de los gramajes. No se extrapola este balance a platos que evaporan agua,
se escurren o absorben aceite.

`referencias-tradicionales.json` registra 251 enlaces localizados en los
14 índices del Legado Gastronómico de la Real Academia de Gastronomía.
Son referencias pendientes, NO 251 alimentos nuevos ni recetas calculadas.
Hay variantes, platos ya existentes y preparaciones que necesitan fuentes
específicas para sus ingredientes. El número de enlaces no cuenta para
el objetivo de 500. Las referencias culinarias no se usan como tablas
nutricionales. El repertorio de Spain.info tiene 363 referencias y también
necesita deduplicación y revisión individual; no se asume que sean todas nuevas.
