# Datos: IndexedDB, repositorios y backup

Fuentes de verdad en el código: el esquema es `src/shared/db/db.ts`, los tipos `src/shared/db/types.ts`, y las **reglas para cambiar el esquema y el backup** están en la cabecera de `db.ts` y de `src/shared/lib/backup.ts`. Este documento explica lo que no se ve leyendo un solo archivo: para qué sirve cada tabla, qué invariantes hay y dónde están las trampas.

## Tablas

La versión actual del esquema es el último `this.version(n)` de `db.ts`. Cada versión lleva un comentario con qué añadió.

| Tabla | Lista | Para qué | Notas |
|---|---|---|---|
| `foods` | usuario | alimentos propios («Alimentos») | identidad = `&nombreNorm` (ver invariantes); `fuente` `manual` \| `gemini` (este último solo en datos antiguos) |
| `entries` | usuario | lo comido: una fila por ingrediente y comida del día | snapshot de gramos/macros; `platoId`/`nombrePlato` opcionales agrupan un guardado múltiple; `rapida: true` = «Kcal rápidas» (sin alimento, `gramos: 0`) |
| `meals` | usuario | plantillas de comida | `items[]` con snapshot, referencia y agrupación opcional; `usos`/`usadoAt` para ordenar |
| `settings` | usuario | registro único (`id: 1`) con los objetivos | ver «Ajustes» |
| `exercises` | usuario | ejercicios | `&nombreNorm` |
| `routines` | usuario | rutinas: `exerciseIds[]` ordenados | |
| `workouts` | usuario | entrenos | sin `fin` = en curso (como mucho uno) |
| `sets` | usuario | series | índice `[exerciseId+createdAt]` para la última serie de un ejercicio |
| `notasMedida` | usuario | notas libres sobre medidas caseras que el intérprete aún no entiende | pantalla «Medidas» |
| `pesos` | usuario | pesajes | `&fecha`: uno por día |
| `catalogFoods` | catálogo | alimentos de referencia (CIQUAL, Open Food Facts) | id `fuente:idExterno`, estable; `*tok` multiEntry para buscar; `gtin` no único |
| `catalogSources` | catálogo | fuentes instaladas (versión, licencia, atribución, nº de filas) | |

- **`TABLAS_USUARIO`** entran en el backup, se vacían al importar y con «Borrar todos los datos».
- **`TABLAS_CATALOGO`** se pueden volver a descargar: no entran en el backup ni se borran con «borrar todo». `db.test.ts` exige que toda tabla esté en una de las dos listas.
- Fuentes del catálogo: `ciqual` y `offes` llegan en paquetes (`public/catalogo/`; formato en `scripts/catalogo/README.md`). `off` son los productos escaneados en directo (`version: 'live'`). Son fuentes distintas a propósito: `importarFuente` borra por versión y se llevaría los escaneados.

## Invariantes

1. **Un alimento propio se identifica por su nombre normalizado** (`normalizeName`, `nombreNorm` único). `foodsRepo.crear`/`actualizar` recalculan `nombreNorm` y lanzan `NombreDuplicadoError`. Renombrar en la revisión crea o reutiliza *otro* alimento, nunca renombra el guardado. La decisión crear / reutilizar / actualizar es pura: `decidirGuardado` en `nutricion/lib/alimentos.ts`. Por qué: [ADR 004](decisiones/004-identidad-alimentos-y-snapshots.md).
2. **Las entradas y los ítems de plantilla guardan un snapshot** de sus valores. Editar una entrada solo cambia esa entrada; la casilla «Aplicar también a «X» en Alimentos» (desmarcada por defecto) corrige además el alimento. Las referencias son blandas: borrar un alimento deja `foodId` colgando y el snapshot sigue siendo válido.
3. **Como mucho una referencia**: `foodId` (propio) o `catalogId` (catálogo); ninguna solo en «rápidas» o referencias colgantes. Se lee y se escribe con `refDe`/`camposDeRef` de `shared/db/foodRef.ts`.
4. **Añadir desde el catálogo no crea ningún `Food`**: la entrada lleva `catalogId` y el snapshot. Si en la revisión se cambian el nombre o los valores de un ítem del catálogo, se guarda como alimento propio `manual` (`aItemGuardado`).
5. **Los ids del catálogo no desaparecen**: un alimento `oculto` sale de la búsqueda (`tok: []`) pero conserva su id, así que entradas, plantillas y frecuentes lo siguen resolviendo. `construir` falla si se pierde un id (ver `scripts/catalogo/README.md`).
6. **Como mucho un entreno activo**: `workoutsRepo.empezar` es transaccional y devuelve el activo si ya existe. `setsRepo.agregar` calcula `orden` dentro de la transacción (un doble toque no repite orden).
7. **Un pesaje por día**: `pesosRepo.registrar` sobrescribe el de la misma fecha.
8. **Un plato por guardado múltiple**: `guardarComida` asigna un `platoId` único a todos los ingredientes de una revisión con más de un alimento (incluidas las tandas). No hay una entrada extra de totales: calorías, macros y frecuentes siguen calculándose sobre los ingredientes. `nombrePlato` es opcional; la vista deriva el título de los nombres si falta. `agruparPlatos` separa por fecha, comida e id, sin adivinar agrupaciones de registros antiguos. Al editar gramos se mantiene el plato; mover un ingrediente a otra comida lo separa. Copias y aplicaciones de plantillas renuevan los ids de plato por operación, conservando las separaciones y nombres. Borrar un plato y deshacer conservan todos los snapshots e ids de sus ingredientes.

`platoId` y `nombrePlato` son campos opcionales sin índice, tanto en entradas como en ítems de plantilla: no requieren cambiar el esquema Dexie ni la versión del backup. Los registros y las plantillas anteriores siguen siendo válidos y no se reagrupan automáticamente.

## Repositorios (`features/*/data/*Repo.ts`)

Son lo único de las features que importa `db` (`shared/db/acceso.test.ts`). Fuera de las features, solo `shared/db/settings.ts` y `shared/lib/backup.ts` lo tocan.

| Feature | Repos | Tablas |
|---|---|---|
| nutricion | `foodsRepo`, `entriesRepo`, `mealsRepo`, `catalogRepo`, `notasMedidaRepo` | `foods`, `entries`, `meals`, `catalog*`, `notasMedida` |
| gym | `exercisesRepo`, `routinesRepo`, `workoutsRepo`, `setsRepo` | `exercises`, `routines`, `workouts`, `sets` |
| inicio | `pesosRepo` | `pesos` |

Reglas y patrones:
- **Lecturas sin escrituras**, para poder usarlas en `useLiveQuery`. Una búsqueda puntual (catálogo, intérprete) no usa `useLiveQuery`.
- **Varias filas → `db.transaction`**, con todo o nada (hay tests que simulan el fallo). Dentro, solo `await` de Dexie: la red (`fetch`) va antes o después.
- **Deshacer**: `borrar` devuelve el registro borrado y `restaurar` lo repone con el mismo id (`put`). `foodsRepo.restaurar` lanza `NombreDuplicadoError` si entretanto se creó otro con ese nombre.
- **Importar el catálogo** (`catalogRepo.importarFuente`): `guardarLote` → `borrarVersionesAntiguas` → `guardarFuente`. No cabe en una sola transacción, así que la fuente se anota **al final**: si se interrumpe, no consta como instalada y se reintenta (es idempotente por `bulkPut`). Solo toca filas de su fuente.
- **Vocabulario del catálogo** (`catalogRepo.vocabulario`, para corregir erratas): se guarda en caché en memoria y lo invalida cada escritura en `catalogFoods`.

## Ajustes (`shared/db/settings.ts`)

- `getSettings()` es de **solo lectura**: completa con `DEFAULT_OBJETIVOS` lo que falte (`conDefaults`) y descarta los campos antiguos (`apiKey`, `modelo`). Así, un campo nuevo de ajustes no necesita `upgrade()`.
- `ensureSettings()` es la única escritura al arrancar (`main.tsx`). `updateSettings()` guarda cambios.

## Conservación y primer traslado en iPhone

- La base se llama siempre `appfit`, sin el número de build en su nombre. Está en IndexedDB, ligada al origen (protocolo, dominio y puerto) y al almacenamiento del navegador/PWA. Cerrar, recargar o desplegar en la misma dirección no crea una base nueva.
- En iPhone, Safari y la PWA abierta desde el acceso de la pantalla de inicio pueden usar almacenes separados. Añadir el acceso no traslada automáticamente los registros de Safari. Si parece vacío, comprobar el enlace original en Safari y **exportar allí → importar en el acceso nuevo**. No reinstalar ni borrar los datos para intentar recuperarlos.
- `app/TrasladarDatos` muestra un aviso breve en iOS: antes de añadir el acceso, y en el primer inicio de la PWA si no hay registros. «Ver instrucciones» abre y enfoca la guía «Primera vez en AppFit» de Ajustes, con pasos para añadir el acceso y trasladar la copia; desde allí se puede saltar a Exportar/Importar. `shared/db/estadoDatos.ts` consulta todas las tablas de usuario en solo lectura; los ajustes por defecto y el catálogo no cuentan como datos introducidos, pero los objetivos personalizados sí.
- `shared/lib/almacenamiento.ts` consulta/solicita protección con StorageManager. Distingue permiso concedido, rechazado, API no disponible y error. No cambia de base ni elimina registros si falla o se rechaza. Ajustes muestra el acceso actual y permite reintentar la solicitud.
- La protección depende del navegador y no sustituye a una copia exportada. Borrar los datos del sitio, cambiar de dominio/perfil o cambiar de móvil requiere recuperar esa copia; no hay sincronización entre almacenes.

## Backup (`shared/lib/backup.ts`)

- Un único JSON con las `TABLAS_USUARIO` (nunca el catálogo). `BACKUP_VERSION` y sus reglas de cambio están en la cabecera del archivo.
- `migrarBackup(raw)` es pura: valida y convierte cualquier versión conocida a la actual, y rechaza una versión más nueva con un mensaje claro. Las tablas de `TABLAS_OPCIONALES` (las posteriores al primer backup) pueden faltar: se importan vacías.
- `importarBackup` **sustituye** todo en una transacción: vacía todas las tablas de usuario, también las que el backup no trae, y los ajustes pasan por `conDefaults`.
- En Ajustes, seleccionar un archivo solo lo valida y muestra cuántos registros de comida contiene. La escritura empieza al pulsar «Importar copia». Si ya hay datos, se advierte que serán sustituidos y se puede exportar antes. Cancelar o elegir un archivo inválido no altera ningún registro. Los fallos de lectura/exportación/importación se muestran en línea.
- Fixture de referencia para las migraciones: `src/test/fixtures/backup-v1.json`.

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
