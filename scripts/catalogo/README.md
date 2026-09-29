# Catálogo de alimentos: tubería offline

Convierte fuentes públicas en paquetes JSON estáticos (`public/catalogo/`) que la app descarga bajo demanda. No forma parte del build ni de la app; se ejecuta a mano (Node 24, sin dependencias).

## CIQUAL (ANSES)

- Versión: **CIQUAL 2025** (publicada el 2025-11-19; archivos del 2025-11-03).
- Fuente: https://entrepot.recherche.data.gouv.fr/dataset.xhtml?persistentId=doi:10.57745/RDMHWY (sustituye a la de 2020 de data.gouv.fr; ficha en https://ciqual.anses.fr).
- Licencia: **Licence Ouverte Etalab 2.0**. Atribución obligatoria: «ANSES, Table de composition nutritionnelle des aliments Ciqual 2025», con la indicación de que los nombres están traducidos al español (ya la incluye `manifest.json`).

### Descarga (a `scripts/catalogo/raw/`, ignorada por git)

Cuatro XML (no hace falta `sources`); el id es el de la API de Dataverse:

```bash
cd scripts/catalogo/raw
B=https://entrepot.recherche.data.gouv.fr/api/access/datafile
curl -L -o alim_2025_11_03.xml     $B/666252
curl -L -o alim_grp_2025_11_03.xml $B/666250
curl -L -o compo_2025_11_03.xml    $B/666249   # ~69 MB
curl -L -o const_2025_11_03.xml    $B/666246
```

La versión sale del nombre del archivo (`alim_AAAA_MM_DD.xml`; si hay varios, el más reciente).

### Uso

```bash
npm run catalogo:ciqual -- extraer     # escribe ciqual/nombres.csv (code;nombre_fr;nombre_en;grupo)
npm run catalogo:ciqual -- construir   # lee ciqual/traducciones.csv y escribe public/catalogo/
# opciones de construir: --traducciones <ruta>   --sufijo es1
```

`ciqual/traducciones.csv`: `code;nombre_es;alias` (alias opcional, separados por `|`). `construir` falla listando los códigos sin traducción. Salida: `public/catalogo/ciqual-<versión>-<sufijo>.json` (p. ej. `ciqual-2025-es1.json`) y `manifest.json` (se conservan otras fuentes que ya estén).

Para un cambio de versión de CIQUAL: descargar los nuevos XML, `extraer`, traducir solo los códigos nuevos (los `code` son estables), subir el sufijo de traducción si cambian los nombres y `construir`.

### Convenciones

- Nutrientes por 100 g. Energía = kcal del Reglamento UE 1169/2011; proteína = N × factor de Jones. Constituyentes localizados por nombre en `const.xml`.
- Valores: coma decimal; `-` o vacío = desconocido (clave ausente); `traces` = 0; `< x` = x/2. Redondeo a 1 decimal.
- Se descartan los alimentos sin kcal, proteína, glúcidos o lípidos conocidos.
- `nutrientes` (solo los conocidos): `fibra`, `azucares`, `sal`, `agSat` (g/100 g). `completitud` (0..1) = nutrientes conocidos de los 8 (4 básicos + estos 4) / 8; no se guarda en el paquete, se deduce de las claves.
- Fila del paquete: `[idExterno, nombre, nombreOriginal, categoria, kcal, prot, carb, grasa, nutrientes?, alias?]`. `nombreOriginal` = nombre francés. Si hay alias pero ningún extra, `nutrientes` va como `{}`.
- Categorías: mapa `CATEGORIAS_CIQUAL` (grupos 01–11 de CIQUAL, más `00` = «Otros»).
