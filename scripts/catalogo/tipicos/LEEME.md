# Típicos: catálogo ampliado y límites

`npm run catalogo:tipicos` genera por defecto la versión 2026-10-26.
También admite `npm run catalogo:tipicos -- AAAA-MM-DD`. Node 24,
sin dependencias nuevas. Lógica pura en tipicosLib.ts; E/S en tipicos.ts.

## Contenido actual

881 filas: 375 valores directos (57 USDA, 167 CoFID y 151 valores de referencia
AppFit de alimentos sueltos) y 506 recetas CIQUAL (61 hasta el 25 de octubre y
445 de las cuatro tandas manuales del 26, descritas al final). La ampliación del 25 de octubre añade 58 entradas frente a las 47 anteriores:
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
productos regionales a alimentos parecidos. La fase de ampliación conservó
src/, OFF y dependencias. La integración posterior autorizada en Nutrición
se describe al final de este documento.

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
sustituyéndolos por otro alimento sin documentarlo. Desde el lote del 26 de
octubre una receta puede ir en cualquier categoría AppFit (salsas, bollería,
bebidas…), no solo en «Platos preparados», y admite conservas, envasados y
fiambres tal cual se sirven (atún escurrido, mayonesa, jamón cocido); siguen
prohibidos los ingredientes ya cocinados (cocido, hervido, frito, asado, tostado).

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

Las expectativas antiguas de dos fuentes se han actualizado durante la
integración posterior: el manifest y la sincronización incluyen típicos.

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


## Integración en Nutrición (2026-10-25)

Víctor solicita que los alimentos añadidos salgan al buscarlos en Nutrición,
autorizando completar esta parte de src/. El paquete se instala desde el
manifest al abrir con conexión o desde Ajustes → Catálogo de alimentos →
Buscar actualización. La etiqueta visible es «AppFit» y el nombre en Ajustes
«Alimentos y platos (AppFit)».

La sincronización compara versión y filas para detectar ampliaciones del mismo
día; revalida el paquete sin caché. El buscador observa los metadatos instalados
y repite la consulta al terminar la importación, sin tener que volver a escribir.
CIQUAL mantiene prioridad en los empates; típicos va antes de OFF. No se cambian
los alimentos, las tablas, los snapshots ni los backups.

Pruebas: actualización desde un lote parcial de la misma versión, nombres y
alias en los primeros 15 resultados, preservación de básicos CIQUAL, búsqueda
real en Nutrición durante una descarga demorada y cuatro consultas offline.
Comandos y requisitos en scripts/catalogo/README.md.


## Lote manual de típicos españoles (2026-10-26)

Víctor pide ampliar a mano con platos típicos de España, ya aprovechadas las
fuentes con licencia abierta. Se añaden 110 recetas AppFit calculadas desde
CIQUAL; las 285 filas anteriores conservan ids y valores. Lista con macros,
peso final e ingredientes de las dos tandas:
`../informes/tipicos-espanoles-2026-10-26.csv`.

- Cuchara (15): cocido madrileño con su caldo, fabada, lentejas con chorizo,
  potaje de vigilia, alubias rojas, michirones, callos, judías verdes, menestra,
  cremas de calabacín/calabaza/verduras, sopa castellana y de fideos.
- Arroces y pasta (6): paella valenciana y de verduras, arroz a banda, fideuá,
  arroz al horno y a la cubana.
- Huevos (6), carnes (15) y pescados/mariscos (16): tortillas, huevos a la
  flamenca y rellenos, flamenquín, San Jacobo, lomo adobado, carrilleras, rabo
  de toro, pinchos morunos, marmitako, zarzuela, suquet, pulpo con cachelos,
  cazón en adobo, boquerones en vinagre, almejas a la marinera…
- Ensaladas, tapas y bocadillos (20): ensaladilla rusa, mixta, campera,
  pimientos de Padrón, patatas alioli, papas arrugadas, pan con tomate, migas,
  empanada gallega de atún, bocadillos y sándwich mixto.
- Verduras (4), salsas (5: alioli, mojos, sofrito, brava), dulces (14:
  magdalenas, bizcocho de yogur, rosquillas, pestiños, porras, polvorones,
  mantecados, roscón, ensaimada, tarta de queso, panellets, turrones) y
  bebidas (10: chocolate a la taza, leche merengada, granizado, limonada,
  tintos de verano, calimocho, rebujito, carajillo, agua de Valencia).

Son formulaciones de cocina doméstica con criterio AppFit, **sin referencia
individual contrastada**: el campo referencia de cada receta lo dice y explica
las sustituciones (bacalao fresco en lugar de salado, jamón serrano en lugar de
lacón, pimentón en lugar de choricero o ñora, agua en lugar de fumet, vino
blanco seco en lugar de manzanilla, pimiento verde genérico para Padrón). Los
bocadillos de tortilla y calamares usan 120 g de la receta AppFit del catálogo
expresada en ingredientes crudos. Lomo = pieza magra de jamón de cerdo CIQUAL.

Las bebidas alcohólicas dan aviso energético (el validador no cuenta el
alcohol); como en CIQUAL, no se corrige nada. No se añaden la sangría, la
clara, la tortilla francesa ni el revuelto: ya están en CIQUAL. Se retiran de
sin-fuente.json los 22 platos resueltos. Algunos coinciden casi con productos
de OFF (callos, sofrito) o con platos ya presentes (pulpo a feira sin patata):
se revisarán en la fase de fusión de duplicados que Víctor ha anunciado.

### Segunda tanda (129 recetas más)

Víctor pide seguir ampliando. Mismo método y mismas reglas; 524 filas en total,
las 395 anteriores intactas. Versión 2026-10-26 (el cambio de filas fuerza la
reimportación del mismo día).

- Cuchara (14): caldo gallego, olla gitana, pote asturiano, judiones, alubias
  con almejas, garbanzos con chorizo, lentejas con arroz, cremas de puerros,
  champiñones, zanahoria y lentejas, sopa de pescado y sopa de cocido.
- Arroces y pasta (8): arroz caldoso de pollo, meloso de setas, con tomate y
  huevo; macarrones con chorizo o atún, espaguetis con tomate, canelones de
  carne y fideos a la cazuela.
- Huevos (7), carnes (17) y pescados (15): huevos rotos con jamón o chorizo,
  revueltos, cachopo, filetes rusos, solomillo al whisky, Villeroy, hígado
  encebollado, chorizo a la sidra, pollo en pepitoria, albóndigas en salsa de
  almendras, trucha a la navarra, navajas, salpicón, calamares rellenos, merluza
  a la koskera, pescadito frito…
- Tapas, ensaladas y bocadillos (25): gildas, croquetas de cocido, atún y setas,
  empanadillas, ensaladas de lentejas, alubias y pasta, picatostes, tostadas,
  pan con chocolate, ocho bocadillos más, sándwich vegetal y montadito.
- Verduras (11), salsas (4: vinagreta, verde, de almendras, vizcaína), postres
  (21: torrijas de vino, filloas, cuajada, membrillo, mazapán, yemas, tarta de
  la abuela, brazo de gitano, sobaos, tortas de aceite, natillas de chocolate,
  flan de queso, peras al vino…) y bebidas (14: cafés, batidos, gin tonic,
  cubatas, mojito, sangría blanca, leche de pantera).

Sustituciones documentadas en cada receta: repollo por grelos o berza, tocino
por unto, judía blanca por judión, pecorino como queso curado rallado,
emmental como queso fundente, pepinillo por guindilla encurtida, hinojo por
matalahúva, limón por lima. La cuajada se modela como leche de oveja entera.
Se descarta la caballa al horno: CIQUAL 26019 ya la cubre. Casi duplicados
para la fase de fusión: tortas de aceite (OFF) y los platos parecidos entre
tandas (pollo en pepitoria y gallina en pepitoria, arroz con leche entera y
semidesnatada).

### Tercera tanda (75 recetas más)

637 filas en total con los alimentos sueltos de la sección siguiente; las 524
anteriores intactas.

- Básicos a la española (31): huevo frito o a la plancha con aceite de oliva;
  nombres al estilo CIQUAL («Pollo, pechuga sin piel con aceite de oliva, a la
  plancha») para que el básico CIQUAL siga primero al buscar «a la plancha»;
  pechuga de pollo o pavo, ternera, lomo, salmón, merluza, bacalao, lenguado,
  gallo y mero a la plancha (ración de 150 g crudos, 5 g de aceite); jureles y
  salmonetes; arroz blanco e integral, pasta y patata cocidos con aceite; puré
  con aceite; patatas fritas en aceite de oliva; parrillada, brócoli, judías,
  espinacas, berenjena y calabacín; tostadas integrales; yogur con miel o
  nueces y avena con leche y plátano. Usan la categoría del alimento base
  (Huevos, Carnes, Pescados…), no «Platos preparados».
- Platos (44): cordero asado y al chilindrón, jabalí, ciervo y liebre,
  ternera a la jardinera, redondo, solomillo a la pimienta, vieiras, arroz con
  bogavante, txangurro, pulpo a la brasa, gambas al pil pil, cóctel de gambas,
  tortillitas de camarones, buñuelos de bacalao fresco, ensaladas (murciana,
  canónigos, rúcula, endibias), zarangollo, samfaina, mazamorra, cocido
  montañés, empanada de carne, hornazo, coca de verduras, pepito y serranito;
  dulces (quesada, bizcocho borracho, orejas, huesos de santo, tejas,
  carquiñolis, tarta de manzana, crema pastelera, manzana asada) y tres bebidas.

Sustituciones: pierna de cordero por lechazo, cangrejo genérico por centollo,
gamba por camarón, queso fresco untable por queso pasiego. Los porcentajes de
aceite retenido son estimaciones AppFit.

## Alimentos sueltos con valor de referencia AppFit (2026-10-26)

Víctor pide añadir alimentos sueltos aunque no haya fuente oficial: el
entorno no llega a USDA, CoFID ni CIQUAL y BEDCA no permite reproducir su
tabla. Se añaden 38 filas en directos.csv con fuente `AppFit`: un **valor
típico** por 100 g elegido por AppFit tras consultar varias etiquetas de
productos y webs nutricionales (Open Food Facts, fichas de fabricantes y
tiendas, bases colaborativas). No se copia una base de datos: se toma la
mediana razonable de varias etiquetas, se descartan los datos incoherentes y
se exige coherencia energética (el validador lo comprueba). Las URL
consultadas quedan en la columna de notas (`fuentes=`); el lector de
directos.csv rechaza una fila AppFit sin ellas. Lista:
`../informes/tipicos-sueltos-2026-10-26.csv`.

- Embutidos (15): sobrasada, fuet, salchichón y chorizo ibéricos, lomo
  embuchado, cecina, jamón ibérico de bellota, morcilla de Burgos, butifarra,
  chistorra, chorizo fresco, botillo, torreznos y chicharrón de Cádiz.
- Cortes ibéricos crudos (3): secreto, presa y pluma.
- Quesos (14): manchego curado y semicurado, tetilla, Cabrales, Idiazábal,
  Mahón, torta del Casar, fresco de Burgos y su versión 0 %, San Simón,
  majorero, zamorano, tierno de mezcla y requesón.
- Otros (6): picos, regañás, mollete, maíz frito (kikos), altramuces en
  salmuera, pimientos del piquillo y horchata de chufa.

Son orientativos: las etiquetas de una misma categoría varían mucho
(torreznos, chicharrones y morcilla de Burgos, sobre todo), y la sal queda
vacía cuando las fuentes no coincidían. Referencias en la app lo explica. El
vermut no entra: su energía viene del alcohol y el validador lo excluiría.
Siguen pendientes, en sin-fuente.json, papada cocida, morro, criadillas y
otros sin datos suficientes.

### Segunda tanda de alimentos sueltos (30)

Mismo método; 667 filas en total, las 637 anteriores intactas.

- Embutidos (7): lacón cocido, morcilla asturiana, chorizo de Pamplona,
  longaniza, cabeza de jabalí, panceta y papada ibéricas curadas.
- Quesos (6): manchego viejo, cabra semicurado, oveja curado, Arzúa-Ulloa,
  Valdeón y semicurado de mezcla.
- Conservas de mar (6, peso escurrido): berberechos y navajas al natural,
  bonito del norte y ventresca en aceite de oliva, calamares en su tinta y
  mojama.
- Dulces y bollería envasados (7): turrones de Jijona y de Alicante, polvorón
  de Estepa, sobao pasiego, napolitana de chocolate, ensaimada y alfajor de
  Medina Sidonia. Conviven con las recetas caseras del mismo nombre: son
  versiones de etiqueta comercial (para la fase de fusión).
- Otros (4): cortezas de cerdo, patatas de bolsa en aceite de oliva,
  rosquilletas y miel de caña.

No se añaden las pipas (CIQUAL 15045, semilla de girasol tostada y salada) ni
magdalenas, palmeras, cuajada, flan o mazapán envasados: ya están en CIQUAL.
La morcilla asturiana sigue las etiquetas asturianas (muy grasas); otras
morcillas de cebolla comerciales son mucho más magras y quedan sin fila.

### Tercera tanda de alimentos sueltos (24)

691 filas en total; las 667 anteriores intactas.

- Frutos secos y aperitivos (3): almendra marcona frita, garbanzos tostados
  (torraos) y habas fritas.
- Dulces y bollería (8): peladillas, turrones de chocolate crujiente y de yema
  tostada, pan de higo, membrillo envasado, roscos de vino, bizcochos de
  soletilla y torta de aceite envasada.
- Conservas de mar (4, escurridas): pulpo en aceite de oliva, zamburiñas en
  salsa de vieira, almejas al natural y mejillones en escabeche (el español,
  con aceite; el de CIQUAL 10081 es otro, con tomate y sin apenas grasa).
- Envasados (9): fabada y lentejas con chorizo en conserva, salmorejo,
  croquetas de jamón y empanadillas de atún congeladas (crudas, sin freír),
  natillas de vainilla, chopped de cerdo, tomate frito y ensaladilla rusa.

Ya en CIQUAL y no añadidos: donuts, mortadela, almendra garrapiñada, gazpacho
envasado y arroz con leche de la sección refrigerada.

### Cuarta tanda: alimentos comunes (20)

711 filas en total; las 691 anteriores intactas. Víctor pide alimentos más
comunes. Lo cotidiano (leche, pan, yogur, huevos, legumbres, fruta, atún al
natural o en girasol, tortitas, avena, quinoa, crema de cacahuete, kéfir,
tofu, bebidas energéticas…) ya está en CIQUAL; se añade lo que falta:

- Gimnasio (9): proteína de suero concentrada y aislada, caseína, skyr,
  yogur y leche con más proteínas, batido de proteínas, barrita de proteínas
  y pan proteico. La barrita es un valor típico de varias marcas (con fibra y
  polialcoholes); cada marca varía mucho.
- Carne de supermercado (5): carne picada mixta de vacuno y cerdo (pura, sin
  preparado), burger meat de vacuno y de pollo, salchichas frescas de pollo y
  pavo y cinta de lomo de cerdo cruda (el «lomo» CIQUAL 28302 es aguja, más
  grasa).
- Despensa y bebidas (6): gulas, cacao soluble azucarado, bebida isotónica,
  ñoquis de patata, atún claro en aceite de oliva (escurrido) y crema de
  verduras envasada.


### Quinta tanda: más alimentos comunes (20)

731 filas en total; las 711 anteriores intactas.

- Verduras y setas (5): acelga en hoja (CIQUAL solo tiene el tallo), borraja,
  ajetes, níscalos (ficha del MAPA) y seta de cardo.
- Fruta (1): paraguayo.
- Pescado y carne (6): rosada, besugo, palometa, corvina, cabrito y magret
  de pato con piel.
- Supermercado (8): té frío al limón con azúcar, salsa rosa, galletas
  digestive, gusanitos, queso rallado de cuatro quesos, pan de espelta,
  piparras y pimiento choricero seco.

Algunas webs reproducen valores de BEDCA (paraguayo, besugo, palometa): no
se toman de ellas; se usan tiendas, pescaderías y Mercavalencia. Sin fila:
grelos (las fuentes se contradicen), ñora y carne de pimiento choricero en
tarro (cada marca es muy distinta).

### Sexta tanda (19)

750 filas; las 731 anteriores intactas. Se comprobó una lista amplia de
alimentos comunes contra CIQUAL: muchos «faltantes» solo lo son de nombre
(jamón york = jamón cocido, yogur griego = yogur al estilo griego,
contramuslo = parte alta del muslo, crema de cacao = crema para untar de
chocolate y avellana…) y se resuelven con alias en CIQUAL es3, pendiente del
XML completo. Huecos reales añadidos:

- Mar (5): bacalao desalado, nécora y percebes cocidos, huevas de erizo al
  natural.
- Carne (2): chuletas de cordero lechal y perdiz.
- Fruta (2): pitaya y kumquat (valores USDA; hidratos sin fibra, como en la
  app).
- Despensa (10): caldo de pollo de brik, gominolas, salsas sriracha, romesco
  envasada y picante de chile y vinagre, natas de soja y de avena para
  cocinar, alternativa vegetal al queso en lonchas, bocados de proteína
  vegetal de soja, crema de arroz y harina de avena.

Sin fila: centollo (solo había valores de BEDCA reproducidos por terceros).

### Cuarta tanda de recetas (43)

793 filas; las 750 anteriores intactas. Platos habituales en España que
faltaban, incluidos internacionales de uso diario y recetas de gimnasio:

- Primeros (13): espaguetis carbonara (con yema y con nata), pasta al pesto,
  macarrones a la boloñesa, ensalada César, de pasta y de quinoa, tabulé,
  garbanzos con langostinos, arroz con costillas, hervido valenciano, patatas
  rellenas y sopa de picadillo.
- Segundos (13): filete con patatas, entrecot y solomillo a la plancha,
  hamburguesa completa, wrap, fajitas, quesadilla, pollo al curry con coco,
  pollo con soja y arroz, alitas al horno, albóndigas de pollo, poke de
  salmón y bol de arroz con pollo.
- Huevos y desayunos (10): tortilla y revuelto de claras, tortitas de avena y
  claras, tortitas americanas, gachas, avena remojada, bol de yogur con
  granola, batido de plátano y avena, tostada de aguacate y huevo y sándwich
  frío.
- Postres (7): mousse de chocolate, flan de café, tartas de chocolate y de
  limón, profiteroles, gelatina y fruta troceada con zumo.

No se añaden tiramisú ni panna cotta (CIQUAL ya los tiene). El poke no lleva
algas ni edamame (sin dato CIQUAL) y la quesadilla usa emmental como queso
fundente.


### Quinta tanda de recetas (30)

Cocina española que faltaba: arroces con pollo, con almejas y a la zamorana;
patatas con bacalao fresco; puchero andaluz, escudella y cocido maragato;
cremas de espárragos, setas, brócoli, coliflor y guisantes; bonito en
escabeche, rape a la marinera, dorada al horno con patatas; paletilla de
cordero con patatas, codillo, fricandó, filete de pollo empanado, chuletas
con patatas, pollo en tomate; tortillas de atún y de setas, revuelto de setas
con jamón; judías con tomate, coliflor gratinada, brócoli al ajo, alcachofas
al horno, calabacín relleno de atún y berenjenas gratinadas con carne. La
escudella lleva panceta en lugar de butifarra y pasta seca como galets.

### Sexta tanda de recetas: bocadillos, tostadas y meriendas (30)

Bocadillos de queso (gouda como semicurado), jamón cocido, pavo y queso,
pechuga empanada, lomo con queso, sardinas, anchoas, huevo y bacon, pollo con
pimientos y crema de cacao; sándwiches de pollo, club, atún y salmón; cruasán
mixto, bagel de salmón; seis tostadas; leche con galletas (con y sin cacao),
yogur con frutos secos o fruta, desayuno de bar (café con leche y tostada);
pizzas caseras de jamón y queso y de atún, y empanadillas al horno.

### Séptima tanda de recetas: tapas y raciones (28)

Tapas y raciones de bar: bravioli, morcilla con pimientos, sepia, zamburiñas y langostinos a la plancha, almejas al ajillo, tostas y montaditos, rebozados (queso, berenjena, aros de cebolla, mejillones tigre, lagrimitas), croquetas de queso azul y de gambas, ensaladilla de surimi, aceitunas aliñadas, sardinas fritas, huevos de codorniz con jamón, nachos, patatas gajo, champiñones gratinados, pimientos rellenos de atún, brochetas de langostino, salpicón de pulpo y ensalada de tomate con ventresca. Recetas con ingredientes CIQUAL en crudo.
