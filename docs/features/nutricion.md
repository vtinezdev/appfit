# Nutrición

`src/features/nutricion/`. Estado actual de los flujos y de dónde vive su lógica. Datos e invariantes: `../datos.md`. Lenguaje visual de Hoy y Añadir comida: `../DESIGN-SYSTEM.md`. Tubería del catálogo (fuera de la app): `scripts/catalogo/README.md`.

## Dónde está cada cosa

| Área | Pantalla / componentes | Lógica pura (`lib/`) | Datos / hooks |
|---|---|---|---|
| Día (Hoy) | `pages/Hoy`, `ComidaSection`, `FranjaMacros`, `ResumenNutricional`, `MacroBar`, `AccionesComidaSheet`, `CopiarDiaSheet` | `nutrition.ts` (macros, sumas, `fraseKcal`), `platos.ts` (agrupación y renovación de ids), `plantillas.ts` (`planCopia`) | `entriesRepo` |
| Añadir / editar comida | `pages/AnadirComida`, `DescribirComida`, `ItemRevisionRow`, `CambiarAlimentoSheet`, `AlimentosRapidos`, `ListaElegibles`, `ResultadosBusqueda`, `KcalRapidasSheet`, `MacroInputs` | `alimentos.ts` (modelo de revisión, guardado, frecuentes, kcal rápidas) | `entriesRepo`, `foodsRepo`, `hooks/useInterpretarLocal`, `hooks/useBusquedaCatalogo` |
| Intérprete local | (dentro de Añadir comida) · `pages/Medidas` | `interprete/`: `parsear`, `unidades`, `raciones`, `medidas`, `emparejar` | `hooks/useInterpretarLocal`, `notasMedidaRepo` |
| Catálogo en la app | `CatalogoAjustes` (en Ajustes) | `catalogo/`: `paquete`, `sincronizar`, `preferidos`, `ranking`, `erratas`, `textos` | `catalogRepo`, `hooks/buscarCatalogo` |
| Código de barras | `EscanerCodigo` | `escaner/` (detector con carga perezosa), `off/` (`buscarProducto`, `mapearProducto`) | `catalogRepo.buscarPorGtin` / `guardarProductoOff` |
| Plantillas | `PlantillasLista`, `AplicarPlantillaSheet`, `GestionPlantillaSheet` | `plantillas.ts` | `mealsRepo` |
| Resumen | `pages/Resumen` (diferida, Recharts) | `nutrition.ts` (`resumenPeriodo`), `shared/lib/dates` (periodos) | `entriesRepo.entreFechas` |
| Alimentos | `pages/Alimentos` (con pestaña Plantillas) | `alimentos.ts` (`filtrarAlimentos`) | `foodsRepo`, `mealsRepo` |
| Objetivos | `ObjetivosAjustes` (en Ajustes) | `objetivos.ts` | `shared/db/settings` |

`NutricionTab` orquesta las vistas y los overlays: Añadir comida, la edición de una entrada y las kcal rápidas.

## Hoy

- Navegación por días (no se avanza más allá de hoy), el resumen del día (`ResumenNutricional`, compartido con Inicio) y una sección por comida (desayuno, comida, cena, snack).
- Tocar una entrada la edita. Una entrada `rapida` abre `KcalRapidasSheet` y no la revisión, porque la revisión reconstruye los valores por 100 g dividiendo por los gramos y una rápida tiene 0 g.
- Los alimentos guardados juntos aparecen como **un plato desplegable**, con título, número de ingredientes y suma de kcal/macros. Cada guardado es independiente, aunque se repita la misma descripción. Tocar el plato muestra sus ingredientes, que se editan o borran individualmente. La papelera del plato borra todos sus ingredientes en una transacción y ofrece «Deshacer». Un plato que conserva un único ingrediente sigue teniendo su nombre. Los alimentos añadidos solos y el historial sin agrupación mantienen sus filas habituales.
- «⋯» de una comida → `AccionesComidaSheet`: copiar a otro día o guardar como plantilla. «⋯» del día → `CopiarDiaSheet`. «Repetir del día anterior (n)» copia sin abrir ningún sheet. Nunca se copia a un día futuro (ver la trampa del `max` en `DESIGN-SYSTEM.md` § Trampas de UI).
- Copiar, repetir y aplicar una plantilla conservan sus platos, con ids nuevos para no mezclarlos con aplicaciones anteriores. Las plantillas antiguas sin agrupación conservan sus filas individuales.

## Añadir comida

Secciones, en orden: comida (preseleccionada por hora o por «Añadir a …») → Plantillas → Describir → Kcal rápidas → buscador y frecuentes (con el botón del escáner).

| Vía | Flujo | Guarda con |
|---|---|---|
| Describir (texto o dictado del teclado) | separación visible → intérprete local → revisión editable, con posibilidad de añadir más alimentos | `entriesRepo.guardarComida` (transacción) |
| Buscar o frecuentes | elegir → Sheet de gramos | `anadirDesdeAlimento` (propio) / `anadirDesdeCatalogo` (no crea `Food`) |
| Escanear | ver «Código de barras» | Sheet de gramos o revisión |
| Plantilla | vista previa → «Añadir a {comida actual}» | `mealsRepo.aplicar` |
| Kcal rápidas | kcal obligatorias, macros opcionales, nombre por defecto «Comida fuera» | `anadirRapida` |

Revisión (`ItemRevisionRow`): cada ítem muestra su procedencia («Tuyo» o la fuente del catálogo, `etiquetaFuente`), «Cambiar» (alternativas + buscador), los avisos de gramos estimados y de «no encontrado» (no se guarda sin valores: `faltanValores`), el selector de una medida ambigua y el aviso «Actualizará el alimento guardado» si corrige uno propio. Qué se crea o se actualiza al guardar: `decidirGuardado` y `aItemGuardado` (ver `datos.md` § Invariantes).

Cuando la revisión tiene varios alimentos, se explica que se guardarán como un plato y aparece «Nombre del plato (opcional)». Sin nombre se usan los nombres de los ingredientes unidos con «+». «Añadir otro alimento» incorpora ingredientes al mismo plato hasta pulsar Guardar; para registrar otro plato se guarda y se abre un nuevo añadido. Editar un ingrediente mantiene la agrupación salvo que se cambie su comida (por ejemplo, de cena a snack).

**Entrada recomendada: un alimento por línea, con su cantidad**. Se admiten varios a la vez y `DescribirComida` muestra los fragmentos en tarjetas numeradas que se actualizan mientras escribes, antes de interpretarlos: «2 huevos fritos y una longaniza» aparece como dos bloques separados. Para registrar por tandas, «Añadir otro alimento» abre una nueva descripción dentro de la revisión; «Añadir a la revisión» incorpora sus resultados sin reemplazar los anteriores ni sus correcciones. «Cancelar añadido» conserva la revisión. Mientras se añade, Guardar queda deshabilitado. Todas las tandas se guardan juntas y su descripción original se concatena con saltos de línea; «Volver a interpretar» recupera ese texto completo (recalcula la revisión). Los platos compuestos pueden buscarse como tales; si no están en el catálogo o en tus alimentos, hay que detallar los ingredientes, sin inventar su composición.

Frecuentes: `rankFrecuentes` (usos recientes, con más peso los de la misma comida; excluye las rápidas) mezcla alimentos propios y del catálogo. `foodsRepo.frecuentes` los resuelve, descarta los que ya no existen y completa con tus recientes.

## Intérprete local (`lib/interprete/`)

Sin IA ni red ([ADR 006](../decisiones/006-sin-ia-interprete-local.md)). `useInterpretarLocal`: `parsear` → por cada parte, tus alimentos + `buscarCatalogo` (que incluye y ordena el preferido compartido) → `emparejar` → `ItemRevision[]`. La búsqueda recibe el nombre de la parte, conservando «con piel» para el ranking; el emparejado usa los tokens normalizados de la consulta efectiva, también si se corrigió una errata.

- `parsear.ts`: frase → partes. Separa por `,` (no la decimal), `;`, `+`, salto de línea, punto seguido e «y»/«e». «Y medio» se conserva dentro de una cantidad («1 kilo y medio»), pero separa otro alimento («2 huevos y medio aguacate»). **«Con» separa cuando introduce otra cantidad explícita** («200 g de arroz con 150 g de pollo»); sin ella se conserva el plato («arroz con pollo», «café con leche»). Quita viñetas e introducciones habituales al principio de cada fragmento («He cenado», «Para cenar», «De postre», «Además», «También»). Entiende números en cifra y en palabra, fracciones, «un par de», «media docena» y la cantidad delante o detrás. Un número ≥ 20 sin unidad son gramos. El corpus de frases está en `parsear.test.ts`; `emparejar.catalogo.test.ts` comprueba también cenas completas contra CIQUAL.
- `unidades.ts`: unidades exactas (g, kg, ml, cl, l; ml ≈ g) y medidas caseras con su peso.
- `raciones.ts`: solo pesos por unidad de alimentos habituales (huevo 60 g, plátano 120 g…) y medidas propias de un alimento (lata de atún, loncha de jamón). Sin dato: 100 g y `gramosEstimados`. La selección del alimento vive en `catalogo/preferidos.ts`, compartida con el buscador.
- `medidas.ts`: las medidas **ambiguas** (cucharada, vaso, puñado…) no llevan gramos: la revisión pregunta «¿Cuánto es una cucharada?» con opciones. También genera el catálogo de medidas de la pantalla «Medidas» (que muestra lo que se entiende y guarda notas en `notasMedida`).
- `emparejar.ts`: gana uno tuyo con coincidencia fuerte; si no, el catálogo (el preferido o el primero del ranking, con las formas procesadas —polvo, deshidratado…— detrás salvo que se nombren); si no, uno tuyo débil. Hasta 5 alternativas.
- Ambigüedad conocida: «arroz», «pasta» y «pollo» sin más detalle eligen el crudo. Si se pesa en cocido, especificarlo («arroz cocido», «pechuga de pollo a la plancha») o usar «Cambiar». Siempre se muestra el nombre real con la preparación; las variantes no se fusionan.

## Catálogo en la app (`lib/catalogo/`)

- **Sincronización** (`sincronizar.ts`): descarga `manifest.json` (`cache: 'no-cache'`) y solo las fuentes cuya versión difiere de la instalada; valida el paquete (`paquete.ts`: formato, campos, números, ids repetidos), comprueba que coincide con el manifest (fuente, versión, nº de filas) y lo importa con `catalogRepo.importarFuente`. Un cerrojo en memoria hace que dos llamadas simultáneas compartan la promesa. Se lanza al arrancar (`arquitectura.md` § Arranque) y desde Ajustes.
- **Búsqueda** (`hooks/buscarCatalogo.ts`, compartida por el buscador y el intérprete): `catalogRepo.buscar` (prefijo sobre el índice `tok`, con `tokensConsulta`: sin palabras vacías y en singular aproximado) pide hasta 600 candidatos en orden de índice → incorpora por id el preferido si falta, es visible y compatible → `rankCatalogo` los ordena. No duplica el básico ni recupera uno oculto o incompatible. Si no hay resultados, corrige erratas contra el vocabulario del índice y reintenta una vez, incluyendo la misma selección de preferidos; la UI muestra «Resultados para «…»».
- **Preferidos** (`preferidos.ts`): tabla pequeña curada por id, no clasificación automática de todo el catálogo. Solo se activa para una consulta genérica completa normalizada (incluidos plurales y alias explícitos): «pollo» / «pechuga» / «pechuga de pollo» → pechuga sin piel cruda; «huevo» → entero crudo; «arroz» → blanco crudo; «leche» → semidesnatada; «pasta» → seca estándar. «Tostada» conserva la equivalencia explícita con pan tostado aunque el índice no contenga ese alias. Las consultas específicas («pechuga de pato», «huevo en polvo», «pollo con piel», una marca…) no activan el básico genérico. No cambia ids, nutrientes, paquetes ni referencias guardadas.
- **Ranking** (`rankCatalogo`; el orden completo de criterios está en su JSDoc): relega contradicciones claras (crudo si se pide cocinado; sin piel si se pide con piel), después coloca el básico compatible y conserva el orden de las alternativas: genérico antes que marca (salvo una marca que ya usas), nombre o alias exacto, etc. Los frecuentes siguen personalizando las alternativas a igualdad de coincidencia, sin desplazar el básico; tus alimentos siguen mostrándose en su sección antes del catálogo y el intérprete sigue prefiriendo uno tuyo con coincidencia fuerte. La fuente (`PRIORIDAD_FUENTE`) y el orden alfabético solo deshacen empates. Hay regresiones contra los paquetes reales y pruebas del rescate fuera del límite de candidatos.
- **Erratas** (`erratas.ts`): Damerau-Levenshtein con 0, 1 o 2 letras según la longitud. Solo se aplica si la búsqueda no encuentra nada.
- `useBusquedaCatalogo`: espera de 150 ms entre teclas, descarta respuestas tardías y mantiene los resultados anteriores mientras llega la siguiente.

## Código de barras (`lib/escaner/`, `lib/off/`)

- Lector: polyfill `barcode-detector` sobre `zxing-wasm` (Safari iOS no trae `BarcodeDetector`), cargado con `import()` al abrir el escáner. El `.wasm` se sirve desde el propio origen; `zxing-wasm` va fijado a la versión exacta que pide `barcode-detector` y un test lo vigila. Formatos: EAN-13/8, UPC-A/E.
- `EscanerCodigo`: cámara trasera, apaga los tracks al detectar o desmontar, mensajes según el error (permiso, sin cámara, sin HTTPS…) y **siempre** entrada manual del código.
- `buscarProducto`: `normalizarGtin` → catálogo local (`offes` o un `off` ya escaneado: funciona sin red) → si no, Open Food Facts (`fetch` con timeout, fuera de transacciones; **solo se envía el código**) → `mapearProducto`. Si el producto está completo: `guardarProductoOff` (fuente `off`) y Sheet de gramos. Incompleto: revisión con lo conocido (acaba como alimento propio). No encontrado: «Escribir valores» o «Kcal rápidas».

## Plantillas y copias (`lib/plantillas.ts`)

- Todas las funciones devuelven objetos nuevos (hay tests que mutan el resultado y comprueban que el original no cambia) y propagan `catalogId`.
- `planCopia`: prepara las entradas copiadas (mismos valores, `createdAt` nuevo, sin id). Sin comida de destino, cada entrada conserva la suya (copiar el día).
- `resolverItemsPlantilla`: si la referencia de un ítem sigue existiendo, usa los valores **actuales** del alimento escalados a los gramos guardados; si no, el snapshot. La vista previa usa la misma función que `mealsRepo.aplicar`, así nunca difiere de lo que se guarda.
- Gestión (en Alimentos → Plantillas): renombrar, cambiar gramos (con la densidad del propio snapshot), quitar ítems y borrar la plantilla (con confirmación).

## Resumen

Semana o mes navegables (`fechasPeriodo`, `desplazarPeriodo`, `etiquetaPeriodo`, `esPeriodoActual` en `shared/lib/dates.ts`; cambiar de mes ancla en el día 1 para no desbordar). La media diaria solo cuenta los días con alguna entrada y fecha ≤ hoy (`resumenPeriodo`). Gráficas de kcal por día (con la línea del objetivo) y de macros por día.

## Objetivos (Ajustes)

`lib/objetivos.ts`: kcal y macros «cuadran» si 4·P + 4·C + 9·G ≈ kcal (tolerancia de 5 kcal). Al editar las kcal, los macros se escalan manteniendo su reparto; al editar un macro, las kcal se mantienen y los otros dos se reparten el resto. «Cuadrar» arregla unos objetivos que no cuadran.
