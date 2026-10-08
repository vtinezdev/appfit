# Catálogo de alimentos: tubería offline

Convierte fuentes públicas en paquetes JSON estáticos (`public/catalogo/`) que la app descarga sola. No forma parte del build ni de la app; se ejecuta a mano (Node 24, sin dependencias, type stripping). Criterio: **prefiero 3.000 alimentos fiables a 30.000 dudosos**. Nunca se inventa un valor nutricional: si no hay fuente fiable, el alimento no entra.

```
raw/ (ignorado por git) ─► ciqual.ts / off.ts (E/S) ─► ciqualLib.ts / offLib.ts (puros: normalizar, categorizar, deduplicar)
                                                    └─► calidad.ts (validador común: errores bloquean, avisos → informe)
                          ─► public/catalogo/{manifest.json, ciqual-2025-es2.json, offes-AAAA-MM-DD.json}   + informes/*.txt
app: validarPaquete → aCatalogFoods → catalogRepo.importarFuente → buscar (índice `tok`) → corrección de erratas → rankCatalogo → UI
```

Lo que hace la app con los paquetes (sincronización, búsqueda, ranking, erratas): `docs/features/nutricion.md` § Catálogo en la app. Por qué un catálogo local: `docs/decisiones/005-catalogo-local-de-alimentos.md`.

## Fuentes

| Fuente | Qué aporta | Licencia | Obtenida |
|---|---|---|---|
| **CIQUAL 2025** (ANSES) | 3.323 alimentos genéricos, por 100 g | Licence Ouverte Etalab 2.0 | archivos del 2025-11-03 (publicada el 2025-11-19) |
| **Open Food Facts, selección España** (`offes`) | 3.000 productos de marca populares, por 100 g o 100 ml | **ODbL 1.0** (contenidos DbCL) | volcado del 2026-09-30 |

Atribuciones (ya en `manifest.json`): «Fuente: ANSES, Table de composition nutritionnelle des aliments Ciqual 2025 (https://ciqual.anses.fr), Licence Ouverte Etalab 2.0. Nombres traducidos al español.» y «Contiene datos de Open Food Facts (openfoodfacts.org), disponibles bajo la Open Database License (ODbL)…». **`public/catalogo/offes-*.json` es ODbL aunque el código del repo sea MIT.**

Descartadas (y por qué):
- **BEDCA**: sus condiciones de uso (https://www.bedca.net/bdpub/UsoBD.pdf) exigen autorización expresa de AESAN/BEDCA para reproducción, traducción o uso no personal en formato electrónico. Es la mejor fuente española, pero no se puede redistribuir sin permiso; si se consigue, encajaría como fuente nueva.
- **USDA FDC**: CC0, pero en inglés, de EE. UU., y casi todo duplicaría a CIQUAL.
- **UK CoFID**: OGL, mismo motivo que USDA.

Campos usados: CIQUAL → energía (Reglamento UE 1169/2011, kcal), proteínas (factor de Jones), glúcidos, lípidos, fibra, azúcares, sal, AG saturados y, solo para el control de energía, alcohol (no se guarda). OFF → `code`, `product_name`, `quantity`, `brands`, `categories_tags`, `countries_tags`, `data_quality_errors_tags`, `unique_scans_n`, `popularity_tags`, `pnns_groups_2`, `energy-kcal_100g`/`energy-kj_100g`/`energy_100g`, `fat`, `saturated-fat`, `carbohydrates`, `sugars`, `fiber`, `proteins`, `salt`, `alcohol_100g`.

## Formato del paquete 2

`manifest.json` sigue en `formato: 1` (`id`, `version`, `archivo`, `filas`, `licencia`, `atribucion`). Cada paquete: `{ formato: 2, fuente, version, tipo: 'generico' | 'marca', filas }` con fila
`[idExterno, nombre, nombreOriginal, categoria, kcal, prot, carb, grasa, nutrientes?, extra?]`:
- Valores por 100 g (o por 100 ml con `extra.ml`; en la app ml ≈ g, como en el intérprete). Las conversiones a raciones/gramos se hacen en la app.
- `nutrientes` solo los conocidos: `fibra`, `azucares`, `sal`, `agSat` (ausente = desconocido, 0 = conocido). `completitud` = (4 + nº de claves) / 8, no se guarda.
- `extra` = `{ alias?, marca?, gtin?, ml?: 1, oculto?: 1, secundario?: 1 }`. En `offes` el `idExterno` es el GTIN-13 (id `offes:<gtin>`), así que `gtin` no se repite. Si hay `extra` pero no nutrientes, `nutrientes` va como `{}`.
- `oculto`: no aparece al buscar (`tok: []`) pero conserva su id (frecuentes, plantillas y entradas siguen resolviendo). `secundario`: va detrás en el ranking.
- El formato 1 ya no se acepta (se republicaron todos los paquetes). Un cliente con la app antigua rechazará el paquete nuevo y reintentará tras actualizarse (`autoUpdate`).
- `offes` usa una fuente distinta de `off` (escaneados en directo, versión `live`) a propósito: `importarFuente` borra por versión y se llevaría los escaneados.

## Categorías

29 categorías AppFit comunes a CIQUAL, OFF y los alimentos propios de la app. La lista y las reglas de OFF (`categoriaDeOff`) viven en `src/features/nutricion/lib/catalogo/categorias.ts`, un archivo sin imports que la tubería importa con su extensión `.ts` (`ciqualLib.ts` lo reexporta como `CATEGORIAS_APPFIT`); así el escaneo en directo clasifica igual que el paquete. Categorías: Frutas · Verduras y hortalizas · Patatas y tubérculos · Legumbres · Frutos secos y semillas · Cereales, arroz y pasta · Pan y tostadas · Cereales de desayuno y barritas · Galletas, bollería y pasteles · Carnes · Embutidos y fiambres · Pescados · Mariscos · Huevos · Leche y nata · Yogures y postres lácteos · Quesos · Bebidas vegetales · Alternativas vegetales · Aceites y grasas · Salsas y condimentos · Dulces y chocolate · Helados · Bebidas · Bebidas alcohólicas · Snacks salados · Platos preparados · Alimentos infantiles · Otros. En la app es el detalle de búsqueda («Marca · Categoría»), la categoría obligatoria de los alimentos propios, el filtro de Alimentos y el reparto del Resumen. Cambiar la lista afecta a datos del usuario: no renombrar ni quitar categorías sin migrar los alimentos propios.

CIQUAL: por `alim_ssssgrp_code` > `alim_ssgrp_code` > `alim_grp_code` (gana el más específico; un código desconocido hace fallar `construir`). Son `secundarios` los productos de Martinica/Reunión (020104, 020105, 020405, 020406) y el grupo 11 (infantiles): no se ocultan, van detrás. OFF: reglas ordenadas sobre `categories_tags`, después `pnns_groups_2`, después palabras del nombre; «Otros» si nada encaja.

## Validadores (`calidad.ts`)

- **Errores** (bloquean): nombre o id vacío; id repetido; valor no finito o negativo; kcal > 900; macro > 100; P+C+G > 101; sal > 100; azúcares > hidratos + 0,5; saturadas > grasa + 0,5; mismo nombre normalizado (y marca) repetido en una fuente; `ml` en un genérico.
- **Avisos**: coherencia energética. Esperado = 4·P + 4·C + 9·G + 2·fibra (+ 7·alcohol); aviso si |kcal − esperado| > max(15 kcal, 20 %). Solo es un detector: **en CIQUAL nunca se cambia un valor oficial** (avisos al informe); **en OFF un aviso excluye el producto** (datos colaborativos). En OFF además: bebida con > 350 kcal/100 ml se excluye.
- Informes versionados en `informes/` (`ciqual.txt`, `ciqual-duplicados.txt`, `offes.txt`), regenerados por cada `construir`.
- `npm run catalogo:validar` valida todo `public/catalogo/`; un test de vitest hace lo mismo en cada `npm run test`.

## CIQUAL: cómo se construye y se amplía

Descarga (a `raw/`, ignorada por git; el id es el de la API de Dataverse, https://entrepot.recherche.data.gouv.fr/dataset.xhtml?persistentId=doi:10.57745/RDMHWY):

```bash
cd scripts/catalogo/raw
B=https://entrepot.recherche.data.gouv.fr/api/access/datafile
curl -L -o alim_2025_11_03.xml     $B/666252
curl -L -o alim_grp_2025_11_03.xml $B/666250
curl -L -o compo_2025_11_03.xml    $B/666249   # ~69 MB
curl -L -o const_2025_11_03.xml    $B/666246
```

```bash
npm run catalogo:ciqual -- extraer      # ciqual/nombres.csv (code;nombre_fr;nombre_en;grupo)
npm run catalogo:ciqual -- construir    # opciones: --traducciones <ruta>  --sufijo es2  --previo <paquete.json>
```

- **Traducciones y alias**: `ciqual/traducciones.csv` (`code;nombre_es;alias`, alias separados por `|`). Reglas en `GUIA-TRADUCCION.md`. Para añadir un alias: escribirlo en la fila del alimento (solo sinónimos reales). Si cambian nombres, subir el sufijo (`--sufijo es3`). Hoy: 170 alimentos con alias (26 previos + 144 nuevos: banana, palta, frutilla, durazno, choclo, arveja, jugo de…, leche de avena, jamón york…).
- **Ocultos**: `ciqual/ocultos.csv` (`code;motivo`, el motivo es obligatorio). Es una lista curada a mano a partir de `informes/ciqual-duplicados.txt` (mismo nombre base sin descriptores neutros como «(promedio)», «UHT», «pasterizada», «envasado» y 8 nutrientes dentro de tolerancia). Nunca se fusionan estados (crudo/cocido/frito) ni variantes (entera/semi/desnatada). Hoy: 10 ocultos.
- **Ids**: `construir` compara con el paquete `ciqual-*.json` anterior y falla si desaparece algún `idExterno` que no figure en `ciqual/retirados.csv` (`code;motivo`; hoy no existe: ningún id se retira).
- Versión nueva de CIQUAL: descargar los XML, `extraer`, traducir solo los códigos nuevos (los `code` son estables), revisar `CATEGORIAS_APPFIT` si `construir` falla por un grupo nuevo, `construir`.
- Convenciones de valores: coma decimal; `-` o vacío = desconocido; `traces` = 0; `< x` = x/2; 1 decimal. Se descartan los alimentos sin kcal, proteínas, glúcidos o lípidos (161).

## Open Food Facts España: cómo se construye

```bash
cd scripts/catalogo/raw
curl -L -o off-products-2026-09-30.csv.gz https://static.openfoodfacts.org/data/en.openfoodfacts.org.products.csv.gz   # ~1,27 GB
cd ../../.. && npm run catalogo:off -- --max 3000 --min-escaneos 5
```

La fecha del nombre del archivo es la versión del paquete. Lectura en streaming (zlib + readline). Filtros, por orden: `countries_tags` con `en:spain`; **`popularity_tags` con `top-country-es-scans-*`** (el volcado no trae idioma: esto deja los productos cuyo mercado principal es España y por tanto en español); código de barras válido; marca y nombre no vacíos; sin `data_quality_errors_tags`; fuera infantiles, suplementos y comida de mascotas; nombre válido (sin cantidad ni marca repetida, ≤ 80 caracteres, sin emojis ni letras que el español no usa ni palabras de otros idiomas); kcal (o kJ ÷ 4,184), proteínas, hidratos y grasa presentes; `calidad.ts` sin errores ni avisos; mínimo de escaneos; deduplicación (mismo GTIN, o mismo nombre + marca: gana el más escaneado); los `--max` más escaneados. `ml: 1` si `quantity` está en ml/cl/l. GTIN normalizado como `normalizarGtin` de la app (replicado: los scripts no importan de `src`).

Limitaciones conocidas: no hay genéricos españoles (manchego, cocido, tortilla de patata casera…): BEDCA está descartada por licencia y OFF solo aporta marcas. La categoría de un producto de OFF es aproximada. El detector de idioma es una heurística.

## Medidas (2026-09-30)

- Paquetes: `ciqual-2025-es2.json` 609 KB (128 KB gzip); `offes-2026-09-30.json` 447 KB (101 KB gzip). Antes: 626 KB (128 KB gzip). No entran en el precache (`globPatterns` excluye `.json`); el bundle de la app no cambia de forma apreciable.
- Tubería: CIQUAL `construir` ≈ 2 s; OFF ≈ 70–95 s (4,5 M líneas, 354.697 de España, ~68.000 pasan los filtros, 3.000 publicados).
- App (fake-indexeddb en Node, orientativo; el dispositivo real será distinto y hay que medirlo en Safari): validar 12–13 ms, `aCatalogFoods` 12–20 ms, importar ≈ 4,3 s (CIQUAL) y ≈ 3,5 s (OFF); vocabulario del índice (4.049 palabras) ≈ 3,5 s la primera vez (solo cuando una búsqueda no encuentra nada); búsqueda con hasta 600 candidatos: 11–71 ms; `rankCatalogo` con 364 candidatos («queso»): ≈ 14 ms, con 143: ≈ 1 ms.
