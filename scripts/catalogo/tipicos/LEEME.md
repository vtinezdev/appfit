# Típicos: catálogo ampliado y límites

`npm run catalogo:tipicos` genera por defecto la versión 2026-10-25.
También admite `npm run catalogo:tipicos -- AAAA-MM-DD`. Node 24,
sin dependencias nuevas. Lógica pura en tipicosLib.ts; E/S en tipicos.ts.

## Contenido actual

285 filas: 224 valores directos (57 USDA y 167 CoFID) y 61 recetas CIQUAL.
La ampliación del 25 de octubre añade 58 entradas frente a las 47 anteriores:
28 directos aceptados y 30 recetas. No se añaden nuevas filas de vísceras;
la caldereta de cordero incluye hígado como ingrediente de la receta citada.

Las nuevas entradas abarcan legumbres, cereales, semillas y cremas de frutos
secos, pan integral, quesos, desayunos y platos de verduras, carnes, pescados,
mariscos y postres. La petición más reciente amplía por categorías y alimentos
cotidianos, más allá del primer repertorio estrictamente tradicional español.
El objetivo anterior de 500 adicionales sigue pendiente: hay 240 más que en
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

Siete filas CIQUAL con alias añadidos en traducciones.csv pendientes de
reconstruir es3: 6140/6141 carrillada de vacuno, 28501 panceta fresca,
28845 jamón serrano, 36036 pollo empanado/milanesa de pollo, 36318 milanesa
de pavo y 13134 macedonia de frutas.
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

## Preparaciones de un mismo alimento

Se incorporan otras 12 filas directas (4 USDA y 8 CoFID), sin calcular absorción
de aceite ni rendimientos propios: pechuga de pollo con piel rebozada o
simplemente enharinada y frita, jamoncito/ala rebozados y fritos, pollo con piel
frito sin rebozado, patatas caseras fritas en girasol, patatas asadas con girasol,
patatas con piel y zanahorias al microondas, bacalao rebozado al horno,
empanado al horno y rebozado frito en colza. Lista con macros y referencias:
`../informes/tipicos-preparaciones-2026-10-25.csv`.

Se conserva literalmente la preparación del origen: batter = rebozado,
flour = enharinado, breadcrumbs = empanado. No se llama «a la romana» a un
recubrimiento cuya receta no especifica huevo. No se cambia girasol/colza
por oliva ni se convierte un dato de freidora convencional en freidora de aire.
Los nutrientes incluyen la piel y el recubrimiento cuando lo dice el nombre;
los pesos son comestibles, sin huesos. Algunas filas CoFID son cálculos del
propio organismo, descritos en las notas, no análisis de cada muestra individual.

Las preparaciones ya cubiertas por CIQUAL no crean filas de típicos: pollo a
la plancha, pollo asado, pollo hervido, pollo/pavo empanados, patata hervida,
asada sin aceite, patatas congeladas fritas/al horno, bacalao y salmón al vapor.
Se añaden solo tres alias en las dos filas de escalopas empanadas de CIQUAL;
esos alias siguen pendientes de publicar en es3, igual que los anteriores.

La prueba de regresión de búsqueda está en
`scripts/integracion/preparacionesBusqueda.test.ts`: una consulta general de
pechuga con piel conserva el básico CIQUAL, y la consulta con «rebozada» elige
la nueva preparación. Se usan nombres coherentes con el básico de CIQUAL
(«Pollo, pechuga, carne y piel, …»), sin cambiar el ranking ni archivos de src/.
La prueba usa el entorno Vitest de la app y se mantiene fuera del ámbito de
compilación Node de la tubería offline.

## Lote de platos cotidianos (39 directos)

Se añaden 39 entradas CoFID 2021: canelones de espinacas/ricota o verduras,
lasaña de vacuno e integral de verduras, macarrones con queso, espaguetis
boloñesa, risottos y arroces pilaf, quiches, sopas, calabacín con huevos,
champiñones al ajillo, guisos y salteados, pimientos rellenos, musaca normal
y vegetal, chili con carne, pizza casera, hamburguesa sin bollo, patatas en
gajos, brownie, crumble, bizcocho de plátano, guacamole y mayonesa caseros.
Lista y valores: `../informes/tipicos-cotidianos-2026-10-25.csv`.

Son valores directos publicados por CoFID: sus cálculos de recetas se conservan
como tales, no como supuestas mediciones ni como formulaciones AppFit. Algunas
filas sí proceden de muestras analizadas, según descripción/referencia original.
Se preservan los 117 registros anteriores, incluidos todos sus valores e ids.

Las versiones caseras no se renombran como recetas tradicionales españolas.
Se mantienen «pilaf», «quiche», «chili», «musaca», etc., y se distinguen de los
productos CIQUAL envasados y de rellenos/cereales distintos. Una hamburguesa
sin bollo no recibe el valor de un bocadillo completo. Las salsas son vía 2,
con categoría Salsas y condimentos, no recetas AppFit disfrazadas de platos.

De 40 candidatos se descarta la macedonia: CIQUAL 13134 ya cubre la ensalada
de frutas cruda; no se presupone ausencia de azúcar en CIQUAL para crear otra
fila. Solo se añade su alias al CSV, pendiente de publicar es3. Tampoco se
añaden gofre artesanal, suflé de queso o pan de leche ya cubiertos por CIQUAL.

## Lote vegetal, ensaladas y básicos (32 directos)

Se añaden 31 filas CoFID y hummus casero USDA 172454, sin nuevos cálculos de
recetas AppFit. Total 188, con las 156 filas anteriores intactas. Lista:
`../informes/tipicos-vegetales-2026-10-25.csv`.

Incluye berenjenas rellenas, pasteles y tortitas de legumbres, frijoles
refritos, arroz con legumbres, pilaf natural, risotto de verduras con alubias
y anacardos, ensaladas de patata/remolacha/arroz/pasta integral, ensalada griega
y Waldorf, sopas de lentejas/guisantes con jamón, guarniciones de patata y
boniato, coliflor con queso y leche semidesnatada, edamame, chapata, ricota,
paneer y hummus casero. Se conserva el aceite de colza del boniato, no se
renombra como oliva. Edamame: semillas comestibles, vainas descartadas.
Waldorf incluye manzana, nuez, apio y mayonesa según la descripción CoFID.
Las ensaladas de arroz y risotto que incluyen frutos secos lo indican.

No se añaden quark, arroz rojo/tailandés, puré de patata con leche y mantequilla,
boniato cocido genérico ni judías verdes hervidas: ya están cubiertos por CIQUAL.
Tampoco se añade otra sopa de patata/puerro que solape la porrusalda existente.
Ricota/paneer no se renombran como queso de Burgos ni otros quesos españoles.
No se añaden seis variantes casi iguales de un pastel vegetal para aumentar
el recuento. El origen de cada plato y sus recetas publicadas se conserva en
las notas, sin presentarlos como recetas tradicionales españolas.

## Lote de pescado, aves y clásicos españoles (24 entradas)

20 directos CoFID y 4 recetas calculadas desde CIQUAL. Las 188 filas anteriores
se conservan exactamente. Lista con valores y fuentes:
`../informes/tipicos-pescado-clasicos-2026-10-25.csv`.

Los directos añaden tortitas de pescado (fishcakes) caseras o empanadas al
horno, bolitas de pescado asiáticas al vapor, bullabesa, curry de pescado blanco,
pez espada a la parrilla, langostinos de aguas cálidas a la parrilla, pollo a
la cazadora/fricasé, cerdo con manzana/mostaza y nata/barbacoa/agridulce, brochetas
de cerdo y piña, carne picada de pavo o cerdo estofada, pavo en maíz, quiche de
queso y huevo y pilaf integral con huevo y patata. Las notas conservan muestras,
recetas y cálculos de CoFID. Se excluyen las variantes pesadas con huesos.
No se equiparan fishcakes a croquetas españolas con bechamel.

Las 4 recetas nuevas son croquetas de jamón serrano, croquetas de pollo,
patatas bravas y pulpo a feira sin patata. Referencias individuales leídas:
Real Academia de Gastronomía para jamón/bravas/pulpo y RTVE España Directo
(23-02-2010) para pollo. La consulta inicial a RAG agotó el tiempo del buscador;
se recuperaron las páginas por descarga normal y se revisaron sus ingredientes
y elaboración. No se usan nutrientes de RTVE, webs comerciales ni recetas de marca.

Los gramajes y pesos finales siguen siendo formulaciones AppFit, no pesadas
experimentales. El aceite es el retenido que se sirve, no el baño de fritura.
Las croquetas de jamón usan serrano identificado, no un valor supuesto para
ibérico. Las de pollo usan pechuga sin piel pesada cruda. Las bravas incluyen
caldo de ave/verdura como 3 g de polvos CIQUAL y 197 g de agua: no se omite la
sal del concentrado. El pimentón dulce/picante se contabiliza como pimentón
CIQUAL, no como cayena. En el pulpo no se suman la cebolla ni el agua de cocción
que se desechan: no se modela su extracción al alimento servido. No se aplica
un factor de retención/rendimiento USDA; el peso final es objetivo de formulación.

La ensaladilla rusa sigue pendiente: la referencia contiene atún en aceite y
mayonesa; no se sustituye el valor del atún en conserva por fresco ni se omite
el atún para publicarla con el mismo nombre. Los platos resueltos por las cuatro
recetas nuevas salen de sin-fuente.json. En total hay ahora 34 recetas con
referencia individual revisada (33 RAG y 1 RTVE), además de las 25 iniciales de
referencia general y las 2 mezclas crudas institucionales.

## Lote de salsas, guisos y repostería (29 directos)

29 nuevas filas CoFID 2021, sin fórmulas ni rendimientos nuevos de AppFit.
Total 241; los 212 registros anteriores permanecen iguales. Lista con valores:
`../informes/tipicos-salsas-guisos-2026-10-25.csv`.

Incluye salsas caseras barbacoa, boloñesa, pesto, holandesa, queso con leche
entera, aliños francés/aceite-limón y tomate; vacuno Stroganoff, Wellington,
meatloaf, guisos de conejo/salchichas, cordero salteado, goulash, curry de
garbanzos/verduras con yogur/pollo korma y dal de lentejas. En repostería:
tarta de queso, zanahoria con cobertura, bizcochos de cerezas/chocolate/coco,
muffins con pepitas o salvado y pudin de pan. Se añaden falafel de garbanzos
frito en colza y tortitas caseras de bacalao.

Las notas identifican recetas calculadas por CoFID y referencias originales;
el dal 13-484 procede de muestras analizadas. Las referencias culinarias a
libros que aparecen en CoFID no se usan como tablas nutricionales por AppFit:
se redistribuyen los valores del conjunto oficial autorizado, con sus ids.
La salsa boloñesa es salsa sola, no espaguetis; no se extrapola a platos
completos. El aliño aceite/limón no se presenta como hecho de oliva. La tarta
de queso no se llama vasca ni de La Viña, ni se presupone horneada. La cobertura
de la tarta de zanahoria se incluye, sin adivinar si es de queso o mantequilla.
El meatloaf no se presenta como pastel murciano de carne con masa.

No se duplican bechamel casera (11143), salsa de yogur casera (11166), bizcocho
de Saboya (23050), éclair (23477), baba al ron (19688), ni coq au vin (25121).
Entre las salsas de tomate CoFID 50-1173 y 17-834 solo se elige 17-834; no se
crean dos genéricos indistinguibles. Tampoco se incorporan seis tipos de curry
con cambios menores de grasa para aumentar la cifra.


## Lote de pizzas (14 directos)

13 valores USDA SR Legacy y 1 CoFID 2021. Total 255; las 241 filas anteriores
se conservan exactamente. Lista completa con valores y enlace a la fuente:
`../informes/tipicos-pizzas-2026-10-25.csv`.

Añade hawaiana (jamón y piña); queso, pepperoni y salchicha de restauración
rápida con masa fina, normal o gruesa; queso con borde relleno; carne y verduras
con masa normal; queso congelada/cocinada con masa fina o masa que sube al
hornear. La hawaiana es promedio de masas finas y gruesas, no dos filas nuevas.
Las variantes USDA de restauración rápida son genéricos estadounidenses, no
recetas caseras ni promedios de pizzerías españolas. Los nombres lo indican.

CIQUAL ya cubre margarita, jamón/queso, pollo, atún, verduras/cuatro estaciones,
champiñones, chorizo/salami y otras coberturas: no se duplican esas entradas
sin una distinción documentada. No se añaden marcas ni se inventa una pizza
cuatro quesos a partir del genérico de quesos. La salchicha no se traduce como
chorizo y rising crust no se confunde con borde relleno. El relleno del borde
no tiene un ingrediente especificado. Los originales conservan el diámetro,
pero no se calcula un peso por pizza ni una ración a partir de él.

No hay recetas nuevas ni rendimientos AppFit en este lote. Se dejan sal y
cualquier nutriente ausente como desconocidos. El objetivo de 500 adicionales
sigue pendiente: 210 añadidos desde el lote inicial de 45, faltan 290.


## Lote variado: fruta, panes, verduras y pescado (30 directos)

30 valores directos CoFID 2021; total 285. Las 255 filas anteriores conservan
exactamente nombres, ids y nutrientes. Lista con valores y referencia:
`../informes/tipicos-variedad-2026-10-25.csv`.

- Frutas (10): pera, albaricoque, ciruela y mezcla de moras/manzana cocidas,
  cada una con y sin azúcar añadido; pera y piña deshidratadas.
- Panes (6): malta con frutas, trigo malteado, germen de trigo, soda con harina
  blanca, naan peshwari con frutos secos/pasas y crumpet tostado.
- Verduras y guarniciones (7): berenjena rellena de arroz/tomate/cebolla/pasas,
  brócoli con queso/leche semidesnatada, lombarda con manzana, repollo relleno
  de cordero/arroz, crepes blancas o integrales rellenas de verduras y patatas
  duquesa caseras.
- Mar/pescado (3): calamar rebozado al horno y nigiri de salmón o atún
  (platos con arroz, no pescado solo).
- Crepes sin relleno (2): dulce con leche entera y salada integral con leche
  entera, caseras; no se presentan como panqueques gruesos estadounidenses.
- Mezclas (2): cacahuetes/pasas y cacahuetes/pasas/chocolate con leche.

No se añaden bagel, pan de semillas, muesli ni métodos de salmón que ya cubre
CIQUAL. No se traduce scampi a una especie concreta sin comprobarla. Se dejan
pendientes el pan de ajo/hierbas CoFID 11-937 y salmón en croute 16-453: su
etiqueta retail no confirma si los valores corresponden al peso tras el
calentamiento/cocinado; no se inventa esa conversión. Figuran en sin-fuente.json
hasta comprobar el estado comestible. Las frutas sin azúcar añadido conservan
sus azúcares naturales; no se llaman sin azúcar. No se usan filas pesadas con
piel/huesos descartados.

Las cantidades de las mezclas y los cálculos publicados de CoFID se trazan
en notas; no son recetas nuevas de AppFit. Sal desconocida y extras ausentes
se mantienen vacíos. No se cambia NSP por AOAC. No se añaden alias CIQUAL ni
fuentes/licencias nuevas en este lote. 240 adicionales desde las 45 iniciales;
faltan 260 para el objetivo anterior de 500 adicionales.
