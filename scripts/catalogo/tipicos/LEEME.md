# Típicos: catálogo ampliado y límites

`npm run catalogo:tipicos` genera por defecto la versión 2026-10-25.
También admite `npm run catalogo:tipicos -- AAAA-MM-DD`. Node 24,
sin dependencias nuevas. Lógica pura en tipicosLib.ts; E/S en tipicos.ts.

## Contenido actual

105 filas: 48 valores directos (39 USDA y 9 CoFID) y 57 recetas CIQUAL.
La ampliación del 25 de octubre añade 58 entradas frente a las 47 anteriores:
28 directos aceptados y 30 recetas. No se añaden nuevas filas de vísceras;
la caldereta de cordero incluye hígado como ingrediente de la receta citada.

Las nuevas entradas abarcan legumbres, cereales, semillas y cremas de frutos
secos, pan integral, quesos, desayunos y platos de verduras, carnes, pescados,
mariscos y postres. La petición más reciente amplía por categorías y alimentos
cotidianos, más allá del primer repertorio estrictamente tradicional español.
El objetivo anterior de 500 adicionales sigue pendiente: hay 60 más que en
el primer lote de 45. No se cuentan referencias pendientes como alimentos.

La lista de las 58 incorporaciones, con macros y referencia, está en
`../informes/tipicos-ampliacion-2026-10-25.csv` (instantánea de revisión del lote).
Se han comprobado intactas las 47 filas anteriores, incluidos sus valores e ids.

El manifest enumera las fuentes y sus licencias. No se equiparan DOP ni
productos regionales a alimentos parecidos. Sin cambios en src/, OFF,
dependencias, documentos vivos ni docs/PROCESO.md, según el encargo original.

## Valores directos

Cada fila de directos.csv conserva fuente, identificador, versión, nombre
original, enlace y notas. Valores por 100 g comestibles. Separador `;`, coma
decimal, vacío = desconocido. `|` separa alias y metadatos. Las notas incluyen
`version=...|original=...`. No se convierte sodio a sal: sal queda desconocida.
Los valores se redondean a un decimal al leer, conservando ceros conocidos.

### USDA

FoodData Central, SR Legacy April 2018, CC0. Descarga oficial:
https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_csv_2018-04.zip
Huella: usda-descarga.sha256. Campos de food_nutrient.csv: 1008 energía kcal,
1003 proteína, 1005 hidratos, 1004 grasa, 1079 fibra, 2000 azúcares y 1258
saturadas. Se conservan las definiciones de nutrientes del origen; no se
recalculan los hidratos por diferencia ni se inventan conversiones a criterios UE.

La selección nueva distingue legumbres maduras secas de sus versiones frescas,
variedades de alubias y estados crudo/hervido. No se añaden espelta ni amaranto
crudos porque ya existen en CIQUAL; sí sus estados cocidos ausentes. Lo mismo
para pistacho crudo frente a los tostados de CIQUAL y pita integral frente a pita.

### UK CoFID

Public Health England, McCance and Widdowson’s Composition of Foods Integrated
Dataset 2021, Open Government Licence v3.0. Página oficial:
https://www.gov.uk/government/publications/composition-of-foods-integrated-dataset-cofid
Descarga:
https://assets.publishing.service.gov.uk/media/60538b91e90e07527df82ae4/McCance_Widdowsons_Composition_of_Foods_Integrated_Dataset_2021..xlsx
Huella: cofid-descarga.sha256.

Tabla «1.3 Proximates»: M kcal, J proteína, L hidratos, K grasa, Z fibra AOAC,
Q azúcares, AB saturadas por 100 g de alimento (NO AA, que es por 100 g de ácidos
grasos). `Tr` se interpreta como 0 siguiendo la convención de trazas del
catálogo; `N`/ausente queda desconocido. Los hidratos son los declarados por
CoFID, sin reinterpretar su método. Las notas conservan descripción y referencias
originales: algunas filas son analíticas y otras recetas calculadas por CoFID.
No se presentan las gachas de CoFID como una medición de una receta AppFit.

Aporta cottage, cottage reducido en grasa, halloumi, arroz arborio y basmati
integral (crudos/hervidos), y gachas de avena con leche entera o semidesnatada.
No se publica quark con otro nombre: ya está en CIQUAL como queso blanco.
Tampoco se añade basmati blanco, cebada perlada cocida ni gachas con agua,
ya cubiertos por CIQUAL. Estos descartes no generan alias redundantes.

## Recetas

Todas las recetas se calculan desde los códigos del paquete CIQUAL publicado
que señala el manifest. Ingredientes en gramos netos comestibles, sal y aceite
explícitos; sin huesos, cáscaras o conchas en el peso del ingrediente. Aceite =
retenido en el plato, no todo el baño de fritura. Se suman nutrientes antes
de dividir por peso final y redondear a un decimal. Un extra solo se publica
si TODOS los ingredientes tienen el dato.

Las formulaciones y pesos finales objetivo son criterio AppFit: **no son
mediciones experimentales ni promedios analíticos nacionales**. No se aplican
factores USDA de retención/rendimiento. El modelo conserva la suma teórica
de los nutrientes, incluso al cocinar vino; no presupone cuánto alcohol se
ha evaporado. El peso final de diseño debe contrastarse con el lote real si
se busca representar una preparación concreta.

### Referencias de las recetas

- Las 25 recetas iniciales citan Simone Ortega, *1080 recetas de cocina*,
  Alianza Editorial, como repertorio general. Sigue pendiente contrastar
  cada una con una página concreta; no se atribuyen sus cantidades a la autora.
- Pipirrana de Cazorla y trampó mallorquín tienen referencia institucional
  individual. Conservan íntegros ingredientes y jugos; el peso final definido
  es la suma de gramos. Esto no se extrapola a platos que evaporan o escurren.
- Las 30 recetas nuevas tienen páginas individuales de la Real Academia de
  Gastronomía, Legado Gastronómico, leídas el 25 de octubre. Se registran URL,
  fecha, huella HTML y adaptaciones en revision-2026-10-25.json; cada receta
  incluye su referencia y las decisiones en el campo referencia. No se copian
  instrucciones ni valores nutricionales de esas webs.

Las formulaciones nuevas explicitan sustituciones: agua en lugar de caldo,
vino blanco seco en lugar de vinos concretos o jamón serrano genérico en lugar
de una DOP. Se renombran cuando procede (p. ej. alcachofas con jamón y vino
blanco). No se atribuye a un bacalao desalado el valor del fresco: la tortilla
nueva dice expresamente bacalao fresco. Las variantes sin piel de limón lo
explican; no se inventa un código de ralladura. Las yemas y huevos se pesan
netos, sin convertir unidades de una fuente en una supuesta pesada real.

Arroz negro, romesco, verdinas con almejas y otras preparaciones con ingredientes
sin equivalencia suficientemente precisa no se completan omitiéndolos o
sustituyéndolos por otro alimento sin documentarlo. Alioli y romesco son salsas:
no se añaden como «Platos preparados» por la vía de recetas reservada a platos.

## Calidad y duplicados

Un error bloquea la construcción. Un aviso energético excluye un directo salvo
CIQUAL. El candidato salvado de avena cocido USDA 168873 se conserva en el CSV
para trazar el descarte pero NO se publica: 40 kcal frente a 72 esperadas por
el validador. No se corrige un valor oficial para hacer que pase.

El informe registra duplicados exactos/cercanos con CIQUAL y OFF. Un nombre
exacto CIQUAL o repetido dentro del paquete bloquea. La comparación automática
se complementa con la revisión FR/EN/ES documentada en auditoria-ciqual.txt.
Se preservan todos los ids de las versiones anteriores del paquete típicos.

## Pendientes

Cuatro alias CIQUAL en traducciones.csv pendientes de reconstruir es3:
6140/6141 carrillada de vacuno, 28501 panceta fresca y 28845 jamón serrano.
ES2 sigue intacto; la descarga anterior de compo (~69 MB) quedó incompleta.
No usar XML parciales. Seguir scripts/catalogo/README.md para reintentar.

Dos tests de src/ esperan exactamente CIQUAL/OFF en el manifest y fallan al
publicar la tercera fuente. Se respeta la prohibición de tocar src/; Claude
Code deberá adaptar esas expectativas al integrar.

sin-fuente.json contiene pendientes, no una afirmación de que no exista ninguna
fuente. referencias-tradicionales.json registra 251 referencias RAG; las 30
leídas en esta ampliación tienen su estado actualizado. Esos enlaces no se
cuentan como filas. Spain.info también ofrece un repertorio regional que
necesita revisión individual y deduplicación; no se asume que todo sea nuevo.
