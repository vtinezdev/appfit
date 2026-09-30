# Nutrición

`src/features/nutricion/`. Estado actual de los flujos y de dónde vive su lógica. Datos e invariantes: `../datos.md`. Lenguaje visual de Hoy y Añadir comida: `../DESIGN-SYSTEM.md`. Tubería del catálogo (fuera de la app): `scripts/catalogo/README.md`.

## Dónde está cada cosa

| Área | Pantalla / componentes | Lógica pura (`lib/`) | Datos / hooks |
|---|---|---|---|
| Día (Hoy) | `pages/Hoy`, `ComidaSection`, `FranjaMacros`, `ResumenNutricional`, `MacroBar`, `AccionesComidaSheet`, `CopiarDiaSheet` | `nutrition.ts` (macros, sumas, `fraseKcal`), `plantillas.ts` (`planCopia`) | `entriesRepo` |
| Añadir / editar comida | `pages/AnadirComida`, `DescribirComida`, `ItemRevisionRow`, `CambiarAlimentoSheet`, `AlimentosRapidos`, `ListaElegibles`, `ResultadosBusqueda`, `KcalRapidasSheet`, `MacroInputs` | `alimentos.ts` (modelo de revisión, guardado, frecuentes, kcal rápidas) | `entriesRepo`, `foodsRepo`, `hooks/useInterpretarLocal`, `hooks/useBusquedaCatalogo` |
| Intérprete local | (dentro de Añadir comida) · `pages/Medidas` | `interprete/`: `parsear`, `unidades`, `raciones`, `medidas`, `emparejar` | `hooks/useInterpretarLocal`, `notasMedidaRepo` |
| Catálogo en la app | `CatalogoAjustes` (en Ajustes) | `catalogo/`: `paquete`, `sincronizar`, `ranking`, `erratas`, `textos` | `catalogRepo`, `hooks/buscarCatalogo` |
| Código de barras | `EscanerCodigo` | `escaner/` (detector con carga perezosa), `off/` (`buscarProducto`, `mapearProducto`) | `catalogRepo.buscarPorGtin` / `guardarProductoOff` |
| Plantillas | `PlantillasLista`, `AplicarPlantillaSheet`, `GestionPlantillaSheet` | `plantillas.ts` | `mealsRepo` |
| Resumen | `pages/Resumen` (diferida, Recharts) | `nutrition.ts` (`resumenPeriodo`), `shared/lib/dates` (periodos) | `entriesRepo.entreFechas` |
| Alimentos | `pages/Alimentos` (con pestaña Plantillas) | `alimentos.ts` (`filtrarAlimentos`) | `foodsRepo`, `mealsRepo` |
| Objetivos | `ObjetivosAjustes` (en Ajustes) | `objetivos.ts` | `shared/db/settings` |

`NutricionTab` orquesta las vistas y los overlays: Añadir comida, la edición de una entrada y las kcal rápidas.

## Hoy

- Navegación por días (no se avanza más allá de hoy), el resumen del día (`ResumenNutricional`, compartido con Inicio) y una sección por comida (desayuno, comida, cena, snack).
- Tocar una entrada la edita. Una entrada `rapida` abre `KcalRapidasSheet` y no la revisión, porque la revisión reconstruye los valores por 100 g dividiendo por los gramos y una rápida tiene 0 g.
- «⋯» de una comida → `AccionesComidaSheet`: copiar a otro día o guardar como plantilla. «⋯» del día → `CopiarDiaSheet`. «Repetir del día anterior (n)» copia sin abrir ningún sheet. Nunca se copia a un día futuro (ver la trampa del `max` en `DESIGN-SYSTEM.md` § Trampas de UI).

## Añadir comida

Secciones, en orden: comida (preseleccionada por hora o por «Añadir a …») → Plantillas → Describir → Kcal rápidas → buscador y frecuentes (con el botón del escáner).

| Vía | Flujo | Guarda con |
|---|---|---|
| Describir (texto o dictado del teclado) | intérprete local → revisión editable | `entriesRepo.guardarComida` (transacción) |
| Buscar o frecuentes | elegir → Sheet de gramos | `anadirDesdeAlimento` (propio) / `anadirDesdeCatalogo` (no crea `Food`) |
| Escanear | ver «Código de barras» | Sheet de gramos o revisión |
| Plantilla | vista previa → «Añadir a {comida actual}» | `mealsRepo.aplicar` |
| Kcal rápidas | kcal obligatorias, macros opcionales, nombre por defecto «Comida fuera» | `anadirRapida` |

Revisión (`ItemRevisionRow`): cada ítem muestra su procedencia («Tuyo» o la fuente del catálogo, `etiquetaFuente`), «Cambiar» (alternativas + buscador), los avisos de gramos estimados y de «no encontrado» (no se guarda sin valores: `faltanValores`), el selector de una medida ambigua y el aviso «Actualizará el alimento guardado» si corrige uno propio. Qué se crea o se actualiza al guardar: `decidirGuardado` y `aItemGuardado` (ver `datos.md` § Invariantes).

Frecuentes: `rankFrecuentes` (usos recientes, con más peso los de la misma comida; excluye las rápidas) mezcla alimentos propios y del catálogo. `foodsRepo.frecuentes` los resuelve, descarta los que ya no existen y completa con tus recientes.

## Intérprete local (`lib/interprete/`)

Sin IA ni red ([ADR 006](../decisiones/006-sin-ia-interprete-local.md)). `useInterpretarLocal`: `parsear` → por cada parte, tus alimentos + `buscarCatalogo` (+ el preferido) → `emparejar` → `ItemRevision[]`.

- `parsear.ts`: frase → partes. Separa por `,` (no la decimal), `;`, `+`, salto de línea, punto seguido e «y»/«e» (no «y medio»); **no por «con»** («arroz con pollo» es un plato). Entiende números en cifra y en palabra, fracciones, «un par de», «media docena» y la cantidad delante o detrás. Un número ≥ 20 sin unidad son gramos. El corpus de frases está en `parsear.test.ts`.
- `unidades.ts`: unidades exactas (g, kg, ml, cl, l; ml ≈ g) y medidas caseras con su peso.
- `raciones.ts`: peso por unidad de alimentos habituales (huevo 60 g, plátano 120 g…), medidas propias de un alimento (lata de atún, loncha de jamón) y **alimento preferido** del catálogo cuando el primero del ranking no es el habitual («huevo» → huevo crudo, «pasta» → pasta seca). Sin dato: 100 g y `gramosEstimados`.
- `medidas.ts`: las medidas **ambiguas** (cucharada, vaso, puñado…) no llevan gramos: la revisión pregunta «¿Cuánto es una cucharada?» con opciones. También genera el catálogo de medidas de la pantalla «Medidas» (que muestra lo que se entiende y guarda notas en `notasMedida`).
- `emparejar.ts`: gana uno tuyo con coincidencia fuerte; si no, el catálogo (el preferido o el primero del ranking, con las formas procesadas —polvo, deshidratado…— detrás salvo que se nombren); si no, uno tuyo débil. Hasta 5 alternativas.
- Ambigüedad conocida: «arroz» y «pasta» eligen el crudo. Si se pesa en cocido: «Cambiar» o cambiar el preferido en `raciones.ts`.

## Catálogo en la app (`lib/catalogo/`)

- **Sincronización** (`sincronizar.ts`): descarga `manifest.json` (`cache: 'no-cache'`) y solo las fuentes cuya versión difiere de la instalada; valida el paquete (`paquete.ts`: formato, campos, números, ids repetidos), comprueba que coincide con el manifest (fuente, versión, nº de filas) y lo importa con `catalogRepo.importarFuente`. Un cerrojo en memoria hace que dos llamadas simultáneas compartan la promesa. Se lanza al arrancar (`arquitectura.md` § Arranque) y desde Ajustes.
- **Búsqueda** (`hooks/buscarCatalogo.ts`, compartida por el buscador y el intérprete): `catalogRepo.buscar` (prefijo sobre el índice `tok`, con `tokensConsulta`: sin palabras vacías y en singular aproximado) pide `CANDIDATOS` en orden de índice (de sobra, porque el índice no ordena por relevancia) → `rankCatalogo` los ordena. Si no hay resultados, corrige erratas contra el vocabulario del índice y reintenta una vez; la UI muestra «Resultados para «…»».
- **Ranking** (`rankCatalogo`; el orden completo de criterios está en su JSDoc): lo primero es genérico antes que marca (salvo una marca que ya usas) y después nombre o alias exacto; la fuente (`PRIORIDAD_FUENTE`) y el orden alfabético solo deshacen empates. Hay tests de regresión contra el paquete publicado.
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
