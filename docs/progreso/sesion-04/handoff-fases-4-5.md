# Handoff — food-database, Fases 4 y 5

Documento para arrancar una sesión nueva sin contexto previo. Primero, lee `CLAUDE.md` (reglas del proyecto) y este archivo. Después, solo las secciones de `docs/PROCESO.md` que se citan (§31–§33).

## 0. Cómo trabajar (lo ha pedido Víctor)

- **Implementa MAIN directamente**, sin subagentes (ni implementador, ni auditores, ni `documentation-agent`) y **sin bucles de revisión**. El plan original (`~/.claude/plans/usa-ciqual-usda-preparame-un-mellow-cloud.md`) describe un modo con subagentes que **ya no se aplica**. De ese plan solo valen las secciones técnicas de cada fase, que aquí aparecen actualizadas.
- **Una fase por sesión.** No empieces la Fase 5 sin que Víctor lo confirme.
- **No hagas commits ni push** si Víctor no los pide. La rama es `feature/food-database`. Las Fases 2 y 3 siguen **sin commitear**: pregúntale al empezar si quiere commitearlas antes.
- **Al cerrar cada fase:**
  - `npm run test` y `npm run build` en verde.
  - Añade una sección `## 34.` (o la que toque) a `docs/PROCESO.md`.
  - Si cambian carpetas, actualiza el mapa de `CLAUDE.md`.
  - Crea `docs/progreso/sesion-NN/` con `resumen-tecnico.md` y `resumen-humano.md`, y actualiza el índice de `docs/progreso/README.md`.
- **Prueba en navegador:** solo en `http://appfit-test.localhost:5173`, nunca en `localhost:5173`, que tiene los datos y la API key reales. Víctor revisa él mismo a 375×812 con DevTools si no hay extensión de Chrome, y en la Fase 3 le fue bien.

## 1. Estado al empezar

- **Fase 1** (PROCESO §31): esquema Dexie v3 con `catalogFoods` (`&id, *tok, gtin, fuente`) y `catalogSources`, fuera del backup. `Entry`/`MealItem` tienen `catalogId?`, y el invariante es «como mucho uno de `foodId`/`catalogId`» (`shared/db/foodRef.ts`).
- **Fase 2** (§32): paquete CIQUAL 2025 traducido, 3.323 alimentos en `public/catalogo/`. Se descarga e importa solo al abrir la app (`lib/catalogo/sincronizar.ts`, `main.tsx`). La sección «Catálogo de alimentos» está en Ajustes.
- **Fase 3** (§33): el buscador de «Añadir comida» busca en tus alimentos y en el catálogo. Ranking en `lib/catalogo/ranking.ts`. Los frecuentes mezclan tus alimentos y los del catálogo. `entriesRepo.anadirDesdeCatalogo` guarda la entrada con `catalogId` y un snapshot, **sin crear un `Food`**. Víctor la revisó en pantalla y está OK.
- 418 tests y el build en verde.
- **Pendiente de Víctor:**
  - Prueba en el iPhone tras un deploy: tiempo de importación y velocidad de búsqueda.
  - Revisar `scripts/catalogo/raw/revision-habituales.txt`. Las correcciones irían a `scripts/catalogo/ciqual/traducciones.csv` y a un paquete `es2`.

### APIs que reutilizarás

| Dónde | Qué |
|---|---|
| `shared/lib/text.ts` | `normalizeName`, `tokenizar`, `singular` (raíz singular aproximada), `tokensConsulta` (quita palabras vacías y singulariza) |
| `shared/db/foodRef.ts` | `FoodRef`, `refDe`, `camposDeRef`, `catalogId(fuente, idExterno)`, `normalizarGtin`, `claveRef` |
| `data/catalogRepo.ts` | `buscar(q, limite)`: por prefijo, **en orden de índice y sin ranking**; pide 300 y ordena con `rankCatalogo`. También `obtener`, `porIds`, `buscarPorGtin`, `guardarFuente`, `fuentes` |
| `lib/catalogo/ranking.ts` | `rankCatalogo(foods, q)`, `PRIORIDAD_FUENTE` |
| `hooks/useBusquedaCatalogo.ts` | búsqueda con espera de 150 ms entre teclas y descarte de respuestas obsoletas (`CANDIDATOS = 300`) |
| `data/foodsRepo.ts` | `buscar(q)`, `buscarPorNombres`, `resolverParaGuardar(item)` (por nombre: crear, reutilizar o actualizar) |
| `data/entriesRepo.ts` | `guardarComida({fecha, comida, items: ItemGuardado[], textoOriginal})`: transacción `foods`+`entries`, hoy siempre con `resolverParaGuardar`. `anadirDesdeCatalogo` |
| `lib/alimentos.ts` | `Por100`, `ItemGuardado`, `OrigenItem`, `ItemRevision`, `mismosValores`, `revisarItems` (Gemini), `aItemGuardado`, `actualizaAlimentoGuardado`, `filtrarAlimentos`, `AlimentoElegible`, `elegibleDeFood`/`elegibleDeCatalogo` |
| `lib/nutrition.ts` | `macrosPorGramos(por100, gramos)` |
| `components/AlimentosRapidos.tsx` | contiene `ListaElegibles` (función local). **Sácala a un componente propio** si la reutilizas en «Cambiar» o en el escáner |
| `pages/AnadirComida.tsx` | Sheet de gramos (`gramosRapido: { alimento: AlimentoElegible; gramos }`), revisión (`items: ItemRevision[]`), `useInterpretarComida` (Gemini) |

### Trampas conocidas

- `pages/AnadirComida.tsx` tiene **finales de línea CRLF**. Edítalo con la herramienta Edit, no con reemplazos de `node`/`sed` de varias líneas.
- No metas acentos graves (backticks) dentro de `node -e "..."` en bash: se ejecutan como sustitución de comandos.
- Vitest no muestra los `console.log`. Si necesitas ver una salida en un test exploratorio, escríbela en un archivo temporal de `$CLAUDE_JOB_DIR/tmp` y bórralo después.
- `catalogRepo.buscar` **no** se usa dentro de `useLiveQuery`.
- Ningún `fetch` dentro de `db.transaction`.
- Solo los `*Repo.ts` tocan `db.*` (lo vigila `acceso.test.ts`).
- Nada de colores ni tamaños sueltos (lo vigila `guard.test.ts`).
- Inputs de 16 px como mínimo.

---

## 2. Fase 4 — Intérprete local (texto y dictado de iOS, sin IA)

**Objetivo:** «Interpretar» funciona sin conexión y sin Gemini para frases típicas. El micrófono del teclado de iOS ya escribe el texto, así que no hace falta audio.

### Lógica pura (todo con tests), en `src/features/nutricion/lib/interprete/`

- **`parsear.ts`**: texto → `{ texto, cantidad?, unidad?, consulta }[]`.
  - Separadores: `,` `;` salto de línea `+` y ` y `. **No separa por «con»**, porque «arroz con pollo» es un plato.
  - Números:
    - Dígitos y decimales con coma, `1/2` y `½`.
    - «un/una/uno», «medio/media», «cuarto», «dos»…«doce», «un par de» y «media docena».
    - El dictado de iOS suele escribir cifras: «200 gramos», «200g», «2 huevos».
  - `consulta`: se quitan la cantidad y la unidad, y el resto pasa por `tokensConsulta`/`singular` de `shared/lib/text.ts`, **no repliques esa lógica**.
- **`unidades.ts`**:
  - Peso y volumen: g, gr, gramos, kg, ml, cl, l (se toma ml ≈ g).
  - Medidas caseras: cucharada 15, cucharadita 5, vaso 200, taza 250, rebanada 30, puñado 30, lata, loncha…
- **`raciones.ts`**: tabla curada de unos 40 alimentos con su peso por unidad (huevo 60, plátano 120, manzana 180, yogur 125, rebanada de pan 30…), indexada por la raíz singular. Si no hay dato: 100 g con `gramosEstimados: true`.
- **`emparejar.ts`**: recibe la consulta y los candidatos (tus alimentos, filtrados con `filtrarAlimentos`, y los del catálogo, ordenados con `rankCatalogo`). Devuelve el mejor y hasta 5 alternativas. **Los tuyos ganan** si la coincidencia es fuerte.

### Modelo de revisión (`lib/alimentos.ts`)

- **`OrigenItem`**: añade `catalogId?` y `alternativas?: AlimentoElegible[]`.
- **`ItemRevision`**: añade `gramosEstimados?` y `sinCoincidencia?`.
- **`ItemGuardado`**: añade `catalogId?`.
  - `aItemGuardado` solo lo rellena si el nombre normalizado es igual a `origen.nombreNorm` **y** `mismosValores`.
  - Si el usuario cambió algo, sale un alimento propio `manual` por el camino de siempre.
- **Recomendado:** para un origen de catálogo, `origen.fuente = 'manual'` y `guardado: false`. Así no se amplía `FuenteAlimento` y no hay que tocar `types.ts` ni `migrarBackup`.
  - Si prefieres añadir `'catalogo'`, revisa `migrarBackup` en `shared/lib/backup.ts`.
- **`entriesRepo.guardarComida`**:
  - Un ítem con `catalogId` → entrada con `catalogId`, sin `foodId` y sin `resolverParaGuardar`.
  - El resto, como hoy.
  - Test: invariante de `foodRef` y que no se crea ningún `Food`.
- **No romper Gemini:** `revisarItems` y `useInterpretarComida` tienen que seguir funcionando igual (Fase 6 los conectará con `emparejar`). El flujo de editar una entrada (`itemDesdeEntrada` en `AnadirComida`) tampoco cambia.

### Hook y UI

- **`hooks/useInterpretarLocal.ts`**: parsear → por cada parte, `foodsRepo.buscar` + `catalogRepo.buscar(consulta, 300)` → `rankCatalogo` → `emparejar` → `ItemRevision[]`. Sin `useLiveQuery`.
- **`components/EntradaIA.tsx`**:
  - Botón principal «Interpretar», que usa el intérprete local.
  - «Con IA» pasa a secundario y **solo se muestra si hay API key** (`getSettings().apiKey`).
  - `VoiceRecorder` sigue ligado a la IA.
  - Placeholder que sugiera el dictado, p. ej. «Escribe o dicta con el micrófono del teclado: 200 g de arroz, 2 huevos…».
- **`components/ItemRevisionRow.tsx`**:
  - Etiqueta de procedencia: Tuyo, CIQUAL o Estimado.
  - Aviso cuando los gramos son estimados.
  - «Cambiar» abre un Sheet con las alternativas y un buscador (reutiliza `ListaElegibles` y `useBusquedaCatalogo`).
- **Sin coincidencia:** fila con aviso («No encontrado: busca o escribe los valores»).
- **Corpus:** unas 40 frases típicas en `interprete/parsear.test.ts`.

### Verificación

- Frase de prueba: «200 g de arroz, 2 huevos y un plátano», en modo Offline (DevTools → Network).
  - Deben salir 3 ítems con gramos correctos.
  - Al guardar, Hoy cuadra y las entradas llevan `catalogId`.
- Cambiar un ítem por una alternativa.
- Una frase sin coincidencia muestra el aviso.
- El flujo de Gemini sigue funcionando: simula `fetch` en el origen de pruebas.

---

## 3. Fase 5 — Código de barras con Open Food Facts

**Objetivo:** escanear un producto de marca y añadirlo. **Solo se envía el código de barras.**

### Escáner

- **Paquete:** `barcode-detector`, un polyfill de `BarcodeDetector` sobre `zxing-wasm`, porque Safari iOS no lo trae de serie.
  - Cárgalo **con `import()` dinámico** y solo al abrir el escáner.
  - **Comprueba en la versión instalada** cómo se sirve el `.wasm`. Por defecto `zxing-wasm` lo descarga de jsDelivr. Hay que servirlo **desde el propio origen**: override del módulo (`locateFile`/`prepareZXingModule`, según la versión) y el wasm importado con `?url` de Vite.
  - Mide en el build el tamaño del chunk y del wasm y justifícalo.
- **Precache:** `vite.config.ts` → `workbox.globPatterns` incluye `js`, así que el chunk del polyfill se precachea; el `.wasm`, no.
  - Tienes que decidir, con Víctor, entre dos opciones:
    - Añadir `wasm` a `globPatterns`: el escáner funciona sin conexión, pero la instalación pesa más.
    - Dejarlo fuera: la primera vez hace falta conexión, que de todas formas se necesita para Open Food Facts.
  - Recomendación: dejarlo fuera.
- **`components/EscanerCodigo.tsx`**, dentro de un `Sheet`:
  - `getUserMedia({ video: { facingMode: 'environment' } })` y bucle de detección con `requestAnimationFrame` o un intervalo.
  - **Cierra los tracks al salir.**
  - Si se deniega el permiso → `ErrorState`.
  - **Siempre se puede escribir el código a mano** (input numérico de 16 px, `inputMode="numeric"`).
- La cámara necesita un contexto seguro. `appfit-test.localhost` cuenta como seguro, así que se puede probar con la webcam del PC. Para el iPhone hace falta un deploy HTTPS a Cloudflare Pages, que hace Víctor.

### Flujo

1. `normalizarGtin` → `catalogRepo.buscarPorGtin`. Si el producto ya está en caché, funciona sin conexión.
2. Si no está: `fetch` a `https://world.openfoodfacts.org/api/v2/product/{gtin}.json?fields=code,product_name,product_name_es,brands,nutriments`, **fuera de cualquier transacción**, con un tiempo máximo y los errores de red controlados.
3. **`lib/off/mapearProducto.ts`** (puro, con tests):
   - Qué se crea: `CatalogFood { id: catalogId('off', gtin), fuente: 'off', tipo: 'marca', marca, gtin, version: 'live', tok: tokenizar(nombre + marca), nombreNorm, completitud }`.
   - Nombre: `product_name_es`, y si no existe, `product_name`.
   - Macros:
     - `energy-kcal_100g`; si solo hay `energy-kj_100g`, dividir entre 4,184.
     - `proteins_100g`, `carbohydrates_100g`, `fat_100g`.
   - Nutrientes con las mismas claves que CIQUAL: `fibra` (`fiber_100g`), `azucares` (`sugars_100g`), `sal` (`salt_100g`), `agSat` (`saturated-fat_100g`). Una clave ausente significa desconocido; nunca se rellena con 0.
   - Faltan macros → devuelve un resultado «incompleto» con lo que haya.
4. **`catalogRepo.guardarProductoOff(food)`**: `put` más la `CatalogSource` de `off` (licencia ODbL, atribución «Open Food Facts»).
   - Comprueba que `sincronizar` y `borrarVersionesAntiguas` no tocan `off`: la Fase 2 solo toca las fuentes del manifest, así que añade un test.
   - Comprueba cómo muestra `CatalogoAjustes` la fuente `off`.
5. Con macros completos → se abre el Sheet de gramos de la Fase 3 (`setGramosRapido({ alimento: elegibleDeCatalogo(f), gramos: 100 })`).
   - Incompletos → revisión con valores editables, que acaba como alimento propio `manual`.
   - No encontrado → mensaje y accesos a «Kcal rápidas» o a crear el alimento a mano.
6. **Entrada:** botón «Escanear» en `AnadirComida`, junto al buscador.

### Tests y verificación

- **Tests:**
  - `mapearProducto`: kJ, campos que faltan, nombre en español > genérico.
  - GTIN de 8/12/13/14 dígitos (`normalizarGtin` ya existe).
  - `guardarProductoOff`.
  - La sincronización no toca `off`.
- **Navegador:** simula OFF interceptando `fetch` y comprueba la entrada manual del código.
- **iPhone real:** tras el deploy, Víctor escanea 3 productos reales.

---

## 4. Después (no empezar sin permiso)

- **Fase 6:** Gemini como respaldo (pasar sus ítems por `emparejar` y un modelo de respaldo configurable).
- **Fase 7:** USDA SR Legacy como segunda fuente, con las raciones de `food_portion`.

Detalle técnico: sección «Fase 6» y «Fase 7» del plan original.
