# Lugares de España: tubería offline

Genera `public/lugares/espana.json`, la lista de pueblos y ciudades con coordenadas que usan las **rutas propias** de Caminos (elegir salida, llegada y paradas, y calcular los km). La app la descarga del propio origen la primera vez que se crea o edita una ruta y el service worker la guarda para usarla sin conexión. No forma parte del build; se ejecuta a mano (Node 24, sin dependencias, type stripping).

```
raw/ES.txt (ignorado por git) ─► lugares.ts (E/S) ─► lugaresLib.ts (puro) ─► public/lugares/espana.json
app: caminos/data/lugares.cargarLugares → caminos/lib/lugares (buscar, proponer paradas, km) → CrearRuta
```

## Fuente

| Fuente | Qué aporta | Licencia | Obtenida |
|---|---|---|---|
| **GeoNames**, volcado de España (`ES.zip`) | 7.834 núcleos de población con habitantes (en la práctica, los municipios con su cifra del INE), coordenadas y provincia | **CC BY 4.0** | 2026-10-12 |

Atribución (en el paquete y en «Cómo se avanza» de Caminos): «Lugares y poblaciones: GeoNames (geonames.org), CC BY 4.0.»

Descartada por ahora: el **Nomenclátor Geográfico de Municipios y Entidades de Población** del IGN (CC BY 4.0, la fuente oficial) porque su Centro de Descargas solo entrega el archivo a través de su carrito en el navegador, sin enlace directo para un script. Si se descarga a mano, encajaría como sustituta.

## Regenerar

1. Descargar https://download.geonames.org/export/dump/ES.zip y descomprimir `ES.txt` en `scripts/lugares/raw/`.
2. `npm run lugares:construir`.
3. Revisar el número de lugares que imprime y probar una ruta en la app.

## Formato (`formato: 1`)

`{ formato, fuente, licencia, atribucion, version, provincias: string[], lugares }` con cada lugar `[nombre, provincia, lat, lon, poblacion]`: índice en `provincias`, coordenadas con 4 decimales (~10 m) y habitantes. Ordenados de más a menos habitantes. Qué entra: clase `P` de GeoNames con población > 0 y tipo `PPL`, `PPLA*`, `PPLC` o `PPLL` (sin barrios `PPLX` ni abandonados), de las 52 provincias; un nombre repetido en la misma provincia se queda con el más poblado. Los nombres son los oficiales de GeoNames (p. ej. «Lleida», «A Coruña»).
