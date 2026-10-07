# Datos: IndexedDB, repositorios y backup

Fuentes de verdad en el código: el esquema es `src/shared/db/db.ts`, los tipos `src/shared/db/types.ts`, y las **reglas para cambiar el esquema y el backup** están en la cabecera de `db.ts` y de `src/shared/lib/backup.ts`. Este documento explica lo que no se ve leyendo un solo archivo: para qué sirve cada tabla, qué invariantes hay y dónde están las trampas.

## Tablas

La versión actual del esquema es la v7; cada versión lleva un comentario con qué añadió. El backup es la v3 (`BACKUP_VERSION`); importa también v1 y v2.

| Tabla | Lista | Para qué | Notas |
|---|---|---|---|
| `foods` | usuario | alimentos propios («Alimentos») | identidad = `&nombreNorm` (ver invariantes); `fuente` `manual` \| `gemini` (este último solo en datos antiguos) |
| `entries` | usuario | lo comido: una fila por ingrediente y comida del día | snapshot de gramos/macros; `platoId`/`nombrePlato` opcionales agrupan un guardado múltiple; `rapida: true` = «Kcal rápidas» (sin alimento, `gramos: 0`) |
| `meals` | usuario | plantillas de comida | `items[]` con snapshot, referencia y agrupación opcional; `usos`/`usadoAt` para ordenar |
| `settings` | usuario | registro único (`id: 1`) con los objetivos manuales y, opcional, el `perfil` | ver «Ajustes» |
| `exercises` | usuario | ejercicios | `&nombreNorm` |
| `routines` | usuario | rutinas: `exerciseIds[]` ordenados | |
| `workouts` | usuario | entrenos | sin `fin` = en curso; snapshot muscular opcional v1 al terminar |
| `sets` | usuario | series | índice `[exerciseId+createdAt]` para la última serie de un ejercicio |
| `notasMedida` | usuario | notas libres sobre medidas caseras que el intérprete aún no entiende | pantalla «Medidas» |
| `pesos` | usuario | pesajes | `&fecha`: uno por día |
| `nombresAlimentos` | usuario | nombres cortos personales para Nutrición | clave = `FoodRef` estable (`user:<id>` o `catalog:<id>`); no cambia los nombres ni nutrientes de origen |
| `porciones` | usuario | raciones propias por alimento («rebanada» de pan bimbo = 32 g) | `ref` = `claveRef` (`user:<id>` o `catalog:<id>`), índice `ref`; nombre de una sola palabra |
| `recetas` | usuario | recetas caseras: snapshot de ingredientes + peso cocinado | `&nombreNorm`; `foodId` apunta al `Food` propio que la representa ([ADR 022](decisiones/022-esquema-v7-recetas-y-objetivos-por-dia.md)) |
| `agua` | usuario | ml bebidos por día | `&fecha`; `tomas?: number[]` permite quitar la última |
| `objetivosDia` | usuario | snapshot del objetivo (kcal y macros) de cada día | `&fecha`; solo lo escriben acciones del usuario, nunca una lectura |
| `medidas` | usuario | medidas corporales (cm y %) | `&fecha`; todos los campos opcionales |
| `catalogFoods` | catálogo | alimentos de referencia (CIQUAL, Open Food Facts) | id `fuente:idExterno`, estable; `*tok` multiEntry para buscar; `gtin` no único |
| `catalogSources` | catálogo | fuentes instaladas (versión, licencia, atribución, nº de filas) | |

- **`TABLAS_USUARIO`** entran en el backup, se vacían al importar y con «Borrar todos los datos».
- **`TABLAS_CATALOGO`** se pueden volver a descargar: no entran en el backup ni se borran con «borrar todo». `db.test.ts` exige que toda tabla esté en una de las dos listas.
- Fuentes del catálogo: `ciqual` y `offes` llegan en paquetes (`public/catalogo/`; formato en `scripts/catalogo/README.md`). `off` son los productos escaneados en directo (`version: 'live'`). Son fuentes distintas a propósito: `importarFuente` borra por versión y se llevaría los escaneados.

`porciones`, `recetas`, `agua`, `objetivosDia` y `medidas` son las cinco tablas de la v7 (nuevas y vacías, sin `upgrade()`). Los campos opcionales nuevos de tablas existentes no llevan índice ni versión: `Workout.ordenEjercicios`, `Routine.objetivos`, `SetEntry.tipo` (`'calentamiento'`) y `SetEntry.rir`.

`nombresAlimentos` guarda alias de presentación independientes de los nombres completos en `foods`, el catálogo y las entradas. Se vinculan por `FoodRef` para que sobrevivan a las actualizaciones del catálogo y sigan disponibles cuando se elimina un alimento referenciado por el historial. Al ser datos personales, están incluidos en los backups; los backups anteriores importan esta tabla vacía.

## Invariantes

1. **Un alimento propio se identifica por su nombre normalizado** (`normalizeName`, `nombreNorm` único). `foodsRepo.crear`/`actualizar` recalculan `nombreNorm` y lanzan `NombreDuplicadoError`. Renombrar en la revisión crea o reutiliza *otro* alimento, nunca renombra el guardado. La decisión crear / reutilizar / actualizar es pura: `decidirGuardado` en `nutricion/lib/alimentos.ts`. Por qué: [ADR 004](decisiones/004-identidad-alimentos-y-snapshots.md).
2. **Las entradas y los ítems de plantilla guardan un snapshot** de sus valores. Editar una entrada solo cambia esa entrada; la casilla «Aplicar también a «X» en Alimentos» (desmarcada por defecto) corrige además el alimento. Las referencias son blandas: borrar un alimento deja `foodId` colgando y el snapshot sigue siendo válido.
3. **Como mucho una referencia**: `foodId` (propio) o `catalogId` (catálogo); ninguna solo en «rápidas» o referencias colgantes. Se lee y se escribe con `refDe`/`camposDeRef` de `shared/db/foodRef.ts`.
4. **Añadir desde el catálogo no crea ningún `Food`**: la entrada lleva `catalogId` y el snapshot. Si en la revisión se cambian el nombre o los valores de un ítem del catálogo, se guarda como alimento propio `manual` (`aItemGuardado`).
5. **Los ids del catálogo no desaparecen**: un alimento `oculto` sale de la búsqueda (`tok: []`) pero conserva su id, así que entradas, plantillas y frecuentes lo siguen resolviendo. `construir` falla si se pierde un id (ver `scripts/catalogo/README.md`).
6. **Como mucho un entreno activo**: `workoutsRepo.empezar` es transaccional y devuelve el activo si ya existe. `setsRepo.agregar` calcula `orden` dentro de la transacción (un doble toque no repite orden).
7. **Un pesaje por día**: `pesosRepo.registrar` sobrescribe el de la misma fecha.
8. **Un plato por guardado múltiple**: `guardarComida` asigna un `platoId` único a todos los ingredientes de una revisión con más de un alimento (incluidas las tandas). La excepción explícita es `platoDestinoId`: valida en la misma transacción que el plato siga existiendo en esa fecha/comida, hereda su id y nombre guardado (también para un solo ingrediente nuevo) e inserta únicamente los añadidos. No reescribe snapshots anteriores, no mezcla platos ni recrea un destino borrado; el fallo revierte todos los añadidos. No hay una entrada extra de totales: calorías, macros y frecuentes siguen calculándose sobre los ingredientes. `nombrePlato` es opcional; la vista deriva el título de los nombres si falta. `agruparPlatos` separa por fecha, comida e id, sin adivinar agrupaciones de registros antiguos. Al editar gramos se mantiene el plato; mover un ingrediente a otra comida lo separa. Copias y aplicaciones de plantillas renuevan los ids de plato por operación, conservando las separaciones y nombres. Borrar un plato y deshacer conservan todos los snapshots e ids de sus ingredientes.

`platoId` y `nombrePlato` son campos opcionales sin índice, tanto en entradas como en ítems de plantilla: no requieren cambiar el esquema Dexie ni la versión del backup. Los registros y las plantillas anteriores siguen siendo válidos y no se reagrupan automáticamente.

`entriesRepo.copiar` admite `origen.platoId` para limitar la copia a un plato explícito de la fecha/comida indicadas. Lee las entradas actuales del origen dentro de la transacción, inserta sus snapshots con nuevos ids de grupo y deja intactos el origen y el contenido previo del destino. Permite otra comida del mismo día, también en el histórico. Un destino igual al origen es no-op; un plato eliminado o que no coincide con la fecha/comida no copia otros platos. Deshacer elimina exclusivamente los ids nuevos. Sin `platoId`, conserva la copia de comida/día completo.

`entriesRepo.moverPlato` cambia únicamente `comida` de los ingredientes de un grupo en una transacción. Conserva ids, fecha, createdAt, cantidades, referencias, nombre y todos los snapshots. Exige la lista completa de ids elegidos al iniciar la acción: si cambia su composición, fecha/comida o desaparece, rechaza sin escrituras. Mismo origen/destino es no-op; comidas desconocidas se rechazan. Si el destino ya tiene otro grupo con ese `platoId`, asigna un UUID nuevo al movido para no fusionarlos. `deshacerMovimientoPlato` revierte solo la ubicación de esos ids actuales, conserva ediciones posteriores y nunca resucita ingredientes borrados ni sobrescribe snapshots antiguos. Ni la operación ni las referencias nutricionales añaden campos persistentes o migraciones.

`nutrientes` es un campo opcional sin índice para fibra, azúcares, sal y grasas saturadas. En alimentos propios y catálogo son gramos por 100 g (o 100 ml cuando la fuente lo indica); en entradas e ítems de plantilla es el snapshot del aporte consumido. Clave ausente significa desconocido y `0` significa conocido; no se completan registros antiguos con valores del catálogo actual. Las copias, plantillas, edición de gramos, deshacer y backups conservan estos datos. El escalado usa hasta tres decimales para no perder pequeñas cantidades de sal. Las sumas exponen su cobertura por nutriente. Como el campo es opcional y no transforma registros ni índices, se mantiene Dexie v6 y el formato de backup v2, igual que con los metadatos opcionales de platos.

9. **Una receta = un `Food` propio**: `recetasRepo.crear/actualizar` mantienen en la misma transacción la receta y su alimento (valores por 100 g del peso cocinado: suma de los ingredientes entre el peso final). Un alimento con el mismo nombre → `NombreDuplicadoError`. Editar la receta actualiza el alimento; las entradas antiguas conservan su snapshot. Si el alimento se borró desde Alimentos, `actualizar` lo recrea. `recetasRepo.borrar(id, conservarAlimento)`.
10. **Raciones propias**: nombre de una sola palabra, única por alimento (`porcionesRepo`). El parser reconoce sus formas (singular/plural) como unidad y el intérprete las usa con prioridad sobre las raciones fijas, solo si el alimento encaja con lo escrito (`elegirPorcion`).
11. **Un registro por día** en `agua`, `objetivosDia` y `medidas` (`&fecha`). `aguaRepo.anadir` suma una toma; `medidasRepo.registrar` completa el día existente.
12. **Objetivos por día**: `objetivosDiaRepo.congelar(fecha)` crea el snapshot si no existe (al guardar comidas de esa fecha) y `actualizarHoy` lo recalcula (registrar peso, editar Perfil o Ajustes). **Hoy se calcula siempre en vivo** (los vigentes de ahora; el snapshot de hoy se ignora al leer) y el snapshot solo manda para fechas pasadas; así un cambio que no pase por `actualizarHoy` (importar un backup, cumplir años…) nunca deja un objetivo de hoy desfasado. `congelar(hoy)` hace upsert (queda el de la última acción del día) y con fecha pasada solo crea el primero. Hoy y Resumen leen con `objetivosDe`, `objetivosMediosDe` y `objetivosPorFecha`: las lecturas no escriben. Los fallos al congelar se ignoran para no estropear la acción principal.
13. **Entreno pasado y edición**: `workoutsRepo.crearPasado` crea un entreno ya terminado (nunca activo). Al añadir o quitar series de un entreno terminado se llama a `recalcularSnapshot`, que lo recalcula con la clasificación **actual** de los ejercicios. `descartar`/`borrar` borran el entreno y sus series en una transacción. Las series de calentamiento (`tipo`) no cuentan en volumen, récords, mapa, progreso, resumen semanal ni como «última serie» para precargar.

## Repositorios (`features/*/data/*Repo.ts`)

Gym: `Exercise.id` numérico sigue siendo la clave de rutinas y series. `catalogId`, `primaryMuscles`, `secondaryMuscles` y `equipment` son campos opcionales sin índices. El catálogo editorial vive en código, no en una tabla ni como 116 ejercicios del usuario. Al seleccionar se materializa solo esa definición, o se enlaza un antiguo por nombre/alias exacto conservando id/nombre. Los personalizados guardan músculos/equipo sin vínculo al catálogo. No hay upgrade de registros; Dexie v6/backup v2 se mantienen y la tabla `exercises` exporta/restaura los metadatos nuevos. Abrir/buscar/filtrar no escribe; recientes derivan de las series. Detalle del flujo en [Gym](features/gym.md).

`Workout.muscleSnapshot` opcional v1 conserva `exerciseId`, nombre, `catalogId` opcional, `primaryMuscles` y `secondaryMuscles` por ejercicio registrado. Se guarda con `fin` en una transacción de workouts/exercises/sets; las series mantienen reps/peso y permiten recalcular. No guarda colores, niveles ni esfuerzo ficticio. Cierre repetido conserva el snapshot original; fallo revierte fin/snapshot. Sin nuevos índices/migración: Dexie v6/backup v2 incluye el campo al serializar filas completas. Sesiones antiguas sin snapshot usan asociaciones actuales en solo lectura con aviso; desconocidos guardados sin clasificación no se adivinan después. Decisión: [ADR 015](decisiones/015-mapa-muscular-de-sesion.md).

Son lo único de las features que importa `db` (`shared/db/acceso.test.ts`). Fuera de las features, solo `shared/db/settings.ts` y `shared/lib/backup.ts` lo tocan.

| Feature | Repos | Tablas |
|---|---|---|
| nutricion | `foodsRepo`, `entriesRepo` (`fechasConRegistro`), `mealsRepo`, `catalogRepo`, `notasMedidaRepo`, `nombresAlimentosRepo`, `porcionesRepo`, `recetasRepo` | `foods`, `entries`, `meals`, `catalog*`, `notasMedida`, `nombresAlimentos`, `porciones`, `recetas` |
| gym | `exercisesRepo` (ejercicios propios: editar/borrar), `routinesRepo`, `workoutsRepo` (descartar, borrar, crearPasado, notas, orden), `setsRepo` | `exercises`, `routines`, `workouts`, `sets` |
| inicio | `pesosRepo` (`delRango`, `registrar`, `borrar`/`restaurar`, `ultimoHasta(fecha)`: último pesaje ≤ fecha, solo lectura), `aguaRepo` | `pesos`, `agua` |
| perfil | `perfilRepo` (`estadoEnergetico`, `objetivosVigentes`, `calcularVigentes`, `leerGastoObservado`), `objetivosDiaRepo`, `medidasRepo` | `settings` (campo `perfil`), `pesos` y `entries` (lectura), `objetivosDia`, `medidas` |

Reglas y patrones:
- **Lecturas sin escrituras**, para poder usarlas en `useLiveQuery`. Una búsqueda puntual (catálogo, intérprete) no usa `useLiveQuery`.
- **Varias filas → `db.transaction`**, con todo o nada (hay tests que simulan el fallo). Dentro, solo `await` de Dexie: la red (`fetch`) va antes o después.
- **Deshacer**: `borrar` devuelve el registro borrado y `restaurar` lo repone con el mismo id (`put`). `foodsRepo.restaurar` lanza `NombreDuplicadoError` si entretanto se creó otro con ese nombre.
- **Importar el catálogo** (`catalogRepo.importarFuente`): `guardarLote` → `borrarVersionesAntiguas` → `guardarFuente`. No cabe en una sola transacción, así que la fuente se anota **al final**: si se interrumpe, no consta como instalada y se reintenta (es idempotente por `bulkPut`). Solo toca filas de su fuente.
- **Vocabulario del catálogo** (`catalogRepo.vocabulario`, para corregir erratas): se guarda en caché en memoria y lo invalida cada escritura en `catalogFoods`.

## Ajustes (`shared/db/settings.ts`)

- `getSettings()` es de **solo lectura**: completa con `DEFAULT_OBJETIVOS` lo que falte (`conDefaults`) y descarta los campos antiguos (`apiKey`, `modelo`). Así, un campo nuevo de ajustes no necesita `upgrade()`.
- `ensureSettings()` es la única escritura al arrancar (`main.tsx`). `updateSettings()` guarda cambios en una **transacción** (lectura + `put`), porque escriben dos pantallas (Ajustes y Perfil); un campo `undefined` en el parche lo borra.
- `Settings.perfil?: Perfil` (campo opcional, sin versión de esquema ni de backup propia): `sexo`, `fechaNacimiento` (YYYY-MM-DD), `alturaCm`, `actividad`, `objetivo`, `intensidadKcal`. Solo datos fuente: peso (último pesaje ≤ hoy), edad, IMC, TMB, GET y kcal objetivo se derivan al leer. `perfilRepo` lo sanea al leer (`normalizarPerfil`, sin escribir). Va en el backup (incluye la fecha de nacimiento) y lo borra «Borrar todos los datos». Backups antiguos importan con perfil vacío.
- Campos nuevos de `Settings` (todos opcionales, sin versión): `ultimaExportacion` (ms, solo si la descarga del backup se lanzó; al importar una copia queda como su `exportedAt`, o la que traiga si no es válida, para que el aviso no diga «aún no has hecho una copia» tras trasladar datos), `recordatorioBackupPospuesto` (ms hasta los que se silencia el aviso), `recordatorioBackupDias` (por defecto 14), `barraKg` (calculadora de discos, por defecto 20), `sonidoDescanso` (por defecto sí) y `aguaObjetivoMl` (sin valor por defecto: el recomendado sale del sexo de Perfil).
- Campos nuevos de `Perfil`: `proteinaPorKgActiva` (activa por defecto: solo `false` la desactiva), `proteinaPorKg` (1,6–2,2, por defecto 1,8) y `usarGastoObservado` (por defecto `false`). `normalizarPerfil` los sanea.
- `hayDatosGuardados` cuenta un perfil con algún campo como dato introducido.

## Conservación y primer traslado en iPhone

- La base se llama siempre `appfit`, sin el número de build en su nombre. Está en IndexedDB, ligada al origen (protocolo, dominio y puerto) y al almacenamiento del navegador/PWA. Cerrar, recargar o desplegar en la misma dirección no crea una base nueva.
- En iPhone, Safari y la PWA abierta desde el acceso de la pantalla de inicio pueden usar almacenes separados. Añadir el acceso no traslada automáticamente los registros de Safari. Si parece vacío, comprobar el enlace original en Safari y **exportar allí → importar en el acceso nuevo**. No reinstalar ni borrar los datos para intentar recuperarlos.
- `app/TrasladarDatos` muestra un aviso breve en iOS: antes de añadir el acceso, y en el primer inicio de la PWA si no hay registros. «Ver instrucciones» abre y enfoca la guía «Primera vez en AppFit» de Ajustes, con pasos para añadir el acceso y trasladar la copia; desde allí se puede saltar a Exportar/Importar. `shared/db/estadoDatos.ts` consulta todas las tablas de usuario en solo lectura; los ajustes por defecto y el catálogo no cuentan como datos introducidos, pero los objetivos personalizados sí.
- `shared/lib/almacenamiento.ts` consulta/solicita protección con StorageManager. Distingue permiso concedido, rechazado, API no disponible y error. No cambia de base ni elimina registros si falla o se rechaza. Ajustes muestra el acceso actual y permite reintentar la solicitud.
- La protección depende del navegador y no sustituye a una copia exportada. Borrar los datos del sitio, cambiar de dominio/perfil o cambiar de móvil requiere recuperar esa copia; no hay sincronización entre almacenes.

## Backup (`shared/lib/backup.ts`)

- Un único JSON con las `TABLAS_USUARIO` (nunca el catálogo), versión 3: añade `porciones`, `recetas`, `agua`, `objetivosDia` y `medidas` (opcionales: un backup v1/v2 las importa vacías). `BACKUP_VERSION` y sus reglas de cambio están en la cabecera del archivo.
- `migrarBackup(raw)` es pura: valida y convierte cualquier versión conocida a la actual, y rechaza una versión más nueva con un mensaje claro. Las tablas de `TABLAS_OPCIONALES` (las posteriores al primer backup) pueden faltar: se importan vacías.
- `importarBackup` **sustituye** todo en una transacción: vacía todas las tablas de usuario, también las que el backup no trae, y los ajustes pasan por `conDefaults`.
- En Ajustes, seleccionar un archivo solo lo valida y muestra cuántos registros de comida contiene. La escritura empieza al pulsar «Importar copia». Si ya hay datos, se advierte que serán sustituidos y se puede exportar antes. Cancelar o elegir un archivo inválido no altera ningún registro. Los fallos de lectura/exportación/importación se muestran en línea.
- Fixture de referencia para las migraciones: `src/test/fixtures/backup-v1.json`.
- **CSV** (`shared/lib/csv.ts`, `exportarCsv.ts`): comidas, pesos, series (con fecha, ejercicio, tipo, reps, peso y RIR), agua y medidas, un archivo por tema, con `;`, coma decimal y UTF-8 con BOM, para Excel en español. Texto que empieza por `=`, `+`, `-` o `@` se prefija con `'` para que no se ejecute como fórmula. No es un formato de copia: no se importa.

## Checklist: cambiar el esquema o la forma de los datos

1. Leer las reglas de la cabecera de `db.ts` y de `backup.ts`.
2. `this.version(n + 1)` nuevo, sin tocar las anteriores. Si se redeclara una tabla existente, se declara entera (ver trampas).
3. Tabla nueva: añadirla a `TABLAS_USUARIO` o `TABLAS_CATALOGO`; si es de usuario, a `TABLAS_OPCIONALES` del backup y al tipo `BackupV2`.
4. Test de migración en `db.test.ts`: abrir una base de datos creada con la versión anterior y con datos, y comprobar `verno`, datos intactos y tabla o índice nuevos.
5. Si un `upgrade()` transforma registros o cambia su forma: subir `BACKUP_VERSION` y añadir el paso equivalente en `migrarBackup`, con test (importar se salta los `upgrade()`).
6. Actualizar la tabla de este documento.

## Trampas de Dexie (ya pasaron)

- **Escribir dentro de `useLiveQuery`** da `ReadOnlyError`. Por eso `getSettings` no escribe y existe `ensureSettings`.
- **`id?: number` en los tipos** hace que `.add()` pueda devolver `undefined`. Se declara `id: number` y `EntityTable<T, 'id'>` permite omitirlo al insertar.
- **`await` que no es de Dexie dentro de una transacción** (p. ej. `fetch`): la transacción se cierra sola y falla lo siguiente.
- **`stores()` sustituye el esquema de la tabla que menciona**: al añadir un índice hay que redeclarar la tabla entera (así se hizo con `entries` en v3).
- **Un índice multiEntry devuelve la fila una vez por token coincidente**: hace falta `distinct()` (`catalogRepo.buscar`).
- **`UpdateSpec` no tipa bien sustituir un array entero** (`meals.items`): se hace lectura + `put` dentro de una transacción.
- **Importar un backup hace `bulkAdd`** y se salta los `upgrade()`: de ahí la regla de `migrarBackup`.
