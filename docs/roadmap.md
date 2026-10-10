# Roadmap: pendientes, ideas y descartadas

Única lista viva de lo que falta. Cuando algo se haga, se quita de aquí (y se documenta donde toque); cuando se descarte, pasa a «Descartadas» con el motivo. Nada de esto se empieza sin que Víctor lo pida. Origen de la mayoría de ideas (con su valor y esfuerzo estimados): `historico/ideas-nutricion-v2.md`.

## Pendiente de probar en el iPhone real

Según los registros de sesión, sin confirmar todavía (preguntar a Víctor antes de darlo por hecho):
- Rediseño completo (§51): safe areas, teclado y tacto en iOS/Android reales. Chromium cubre tamaños/temas/foco/scroll y viewport reducido, no reproduce el teclado real de WebKit.
- Catálogo: tiempo de importación (~6.300 filas) y de búsqueda en Safari/WebKit.
- Escáner: 3 productos reales (la cámara necesita HTTPS).
- Exportar el backup (`<a download>` con un blob) desde la PWA instalada.
- Inicio minimalista con rueda de energía (§79): tacto de las tarjetas y del «+» del peso, y nitidez de la rueda en pantalla Retina. Probado en Edge emulado a 320/375/430 px.
- Persistencia (§44): trasladar una copia de Safari al acceso de pantalla de inicio, cerrar/reabrir y actualizar la PWA en la misma dirección. Comprobado en Chromium con perfil persistente y modos de iOS emulados; confirmar el comportamiento del almacenamiento y del permiso en WebKit.
- Perfil (§74): selector de fecha nativo, campo de altura con teclado decimal (coma) y Sheets con teclado. Probado en Edge emulado a 320/375/430 px.
- Categorías e iconos (§82): sin recorrido en navegador ni en iPhone. Revisar el Diario a 320 px (columna de iconos de 44 px), la burbuja del nombre al pulsar el icono (cierre al tocar fuera en Safari) y los selectores de categoría con el teclado de iOS. El build de Cloudflare de la rama `feat/categorias-alimentos` falló como build de producción (el de `master` salió bien): revisar la configuración de builds de rama.
- Mejoras funcionales (§80): recorridas en Edge emulado a 320/375/430 px en ambos temas; **sin probar en iPhone**: pitido de fin de descanso (Web Audio: iOS puede exigir un gesto previo o silenciar el audio con el interruptor), descarga de varios CSV `<a download>` desde la PWA instalada, selectores `date`/`time` nativos al editar un entreno y teclado real en los Sheets de raciones, recetas y medidas.
- Pulido visual «precisión silenciosa» (§85): recorrido en Edge emulado a 320/375/430 px en ambos temas; sin probar en iPhone: nitidez del carril fino de la rueda y de la rejilla de Progreso en Retina, tacto del chevrón del plato en su nueva columna y lectura de la tarjeta de entreno en oscuro dentro del gimnasio.
- Rediseño visual v2 (§97): recorrido en Edge emulado a 320/375/430 px en ambos temas, 375 con texto al 200 % y Reducir movimiento; sin probar en iPhone: cabecera fija del entreno y píldora del descanso con safe areas y teclado abierto, barra de pestañas con la barra de inicio de iOS, recorrido del tinte de la serie hecha, tacto de los días del calendario y de la semana de Nutrición (unos 37–39 px de ancho a 320 px).
- Revisión semanal en Inicio (§95): recorrida en Edge emulado a 320/375/430 px en ambos temas y con texto al 200 %; sin probar en iPhone (tacto de «Hecho»/«Ver revisión» y página modal con safe areas).

## Limitaciones conocidas

- Ilustraciones de ejercicios: los 116 originales tienen ilustración propia (IA, revisadas en hoja de contactos); los 88 añadidos el 2026-10-09 (lotes 30–51, en `prompts-2.md`) muestran el hueco con icono hasta que se generen. Pequeñas licencias del modelo aceptadas: remo en T a una mano con la barra en landmine en vez de agarre en V. Al añadir un ejercicio al catálogo hay que añadirlo a `scripts/ejercicios/ilustraciones.json` (lote nuevo o imagen suelta `ia/<slug>.png`). Ver `scripts/ejercicios/README.md`.
- Perfil: los factores de actividad (1,2–1,9) se atribuyen a McArdle, Katch y Katch (1996) sin haber verificado la edición ni una derivación experimental; la cifra de 600 kcal/día de NICE procede de CG189 y no se ha cotejado en NG246. La media de Mifflin y Roza-Shizgal es criterio de AppFit, no un método publicado. Los scripts `scripts/ui/validar-*.cjs` adaptados a Perfil no se han ejecutado (rutas fijas a `/usr/bin/chromium` y al puerto 5174); el recorrido se probó con un script propio en Edge (PROCESO §74).
- Ajustes: los campos de objetivos diarios desbordan a 375 px con texto al 200% (fila sin wrap y anchos fijos). Detectado al confirmar los fondos claros; pendiente de adaptación del formulario, sin relación con la capa fotográfica.
- Buscador e intérprete priorizan los básicos compartidos en `catalogo/preferidos.ts`; arroz, pasta y pollo sin más detalle se eligen en crudo. Si se pesa en cocido, especificarlo o usar «Cambiar». Si aún hay ruido, valorar sugerencias prioritarias con «Ver más variantes», sin fusionar alimentos por nombre.
- Catálogo: no hay genéricos españoles (manchego, tortilla de patata…); la categoría y la detección de idioma de Open Food Facts son heurísticas (ver `scripts/catalogo/README.md`).
- «Alimentos» ya no muestra la procedencia de cada alimento (se quitó en §38).
- Categorías (§82): la de un alimento del catálogo no se puede cambiar (solo la de los propios); un producto escaneado antes de las categorías sigue sin ella hasta volver a escanearlo con conexión, y sus entradas cuentan como «Sin categoría» en el Resumen. El buscador de Añadir comida no filtra por categoría (solo la lista de Alimentos). La categoría no es un snapshot: reclasificar un alimento reclasifica su historial, y uno borrado deja sus entradas sin categoría.
- El `theme_color` del manifest es el claro; el meta de la página se adapta al tema.
- Gasto observado (Perfil): exige 28 días con ≥ 80 % de comidas registradas y 2 pesajes por semana; usa 7.700 kcal/kg (aproximación, Hall 2008), el peso varía por agua y sal y el registro de comida suele quedarse corto. Es orientativo y no sustituye al estimado salvo que se active.
- Proteína por kg y agua: rango 1,6–2,2 g/kg (Morton 2018, Jäger 2017) verificado con el texto de las fuentes; el objetivo de agua (2,0/1,6 L) parte de EFSA (2010) con un 20 % descontado por la humedad de los alimentos, que es criterio de AppFit y no una cifra de EFSA (el resumen de EFSA no da ese porcentaje; efsa.europa.eu rechazó la consulta directa y se leyó una copia archivada). Si sale una fuente mejor para el descuento, sustituirlo.
- Objetivo por día: los días anteriores a esta versión no tienen snapshot y se comparan con el objetivo vigente; registrar comida de un día pasado congela el vigente de ese momento. Cambiar de peso o de Perfil no reescribe días con snapshot.
- Récords: un ejercicio sin historial previo no genera récords; las repeticiones solo se comparan con pesos ya usados. Un entreno registrado a posteriori se compara por su fecha de inicio.
- Raciones propias: solo de una palabra y solo en alimentos propios o del catálogo (se gestionan desde la revisión, no hay ficha del alimento del catálogo). Recetas: los ingredientes son un snapshot; no se vuelven a calcular si cambia el alimento de origen.
- Medidas corporales y agua: sin gráficas, solo último valor, variación e historial.
- `scripts/ui/validar-rediseno.cjs` conserva selectores anteriores a la Inicio de ADR 021 (espera el saludo «Buenos/Buenas», pulsa «Registrar» e «Historial de peso») y, como el resto de `scripts/ui/`, el Chromium de `/usr/bin/chromium` y el puerto 5173. En §85 se ejecutó su matriz desde una copia adaptada fuera del repo (Edge, «Hoy», «Registrar peso», tarjeta Peso).

- Entreno activo: la columna «Anterior» solo cabe en la fila con paneles de 20,5rem o más (móviles de 414 px en adelante); en 375/390/393 px va en una línea bajo reps y kg, para no estrechar los campos.
- `scripts/ui/validar-*.cjs` se han adaptado a la barra de pestañas (§97) sin ejecutarlos: siguen apuntando a `/usr/bin/chromium` y conservan otros selectores anteriores.

## Ideas sin empezar

Registro:
- Más nombres de unidades propias de varias palabras («trozo grande») en las raciones propias del intérprete.

Gimnasio:
- **Plan de mejoras de Entreno**: implementadas las diez mejoras iniciales: papelera, RIR, notas, gráficas, carga corporal, unilateral, agarres, dropsets, negativas y progresión confirmada. Alcance, orden, decisiones y ampliaciones futuras en [mejoras.md](../mejoras.md). Se validan los bloques que Víctor autoriza antes de continuar; sustituye aquí el detalle anterior de progresión para evitar planes duplicados.

Gamificación:
- **Gaming** (2026-10-10): plan y decisiones en [gaming.md](../gaming.md). **Atributos, Ritmo y Vitrina implementados** (PROCESO §100 y §101, [ADR 029](decisiones/029-gamificacion-atributos.md), [atributos](features/atributos.md), [ritmo](features/ritmo.md), [vitrina](features/vitrina.md)). **Liga por ejercicio** implementada (PROCESO §103 a §107, [ADR 030](decisiones/030-liga-por-ejercicio.md), [liga](features/liga.md)); pendiente probar en el iPhone si las 16 semanas y la bajada se sienten bien. Queda **Cumbres** para otra sesión (Cumbres decidida, con etapas y víveres, por implementar; **Caminos**, cuando AppFit registre caminatas o carreras con distancia), y el Tablón aparcado. Pendiente: probarlo en el iPhone con los datos reales (rendimiento del recálculo y si la XP, la curva y los umbrales se sienten bien); la proteína opcional del plan semanal; el póster con un hito redondo al terminar; y, si Víctor quiere, la variante «Maestría muscular».

Cuerpo y objetivos:
- Objetivos distintos en días de entreno y de descanso (kcal extra a hidratos): la integración Gym ↔ Nutrición se decidirá más adelante.
- Definir recomendaciones contrastadas por grupos de alimentos y comparar raciones con el consumo real. La sección Referencias y sus tipos ya están preparados y los alimentos ya tienen categoría (§82); faltan fuentes, valores y la correspondencia entre categorías y grupos de las guías, sin recomendaciones ficticias.
- Filtro por categoría en el buscador de Añadir comida y cambiar la categoría de un alimento del catálogo (una preferencia personal por `FoodRef`, como los nombres cortos).

Análisis:
- Gráficas de agua y de medidas corporales; variación de la media de peso en Inicio.

Calidad de datos:
- Aviso de coherencia energética (kcal frente a 4·P + 4·C + 9·G) en la revisión y en Alimentos; la tubería del catálogo ya tiene uno (`calidad.ts`).
- Alias y fusión de alimentos propios duplicados («pechuga de pollo» / «pollo, pechuga»), reasignando entradas y plantillas.

Catálogo:
- BEDCA como fuente, si AESAN/BEDCA lo autorizan (ver `scripts/catalogo/README.md`).

## Descartadas

- **Todo lo que dependía de la IA** (foto de la etiqueta o del plato, «¿qué como?», cola de audio sin conexión, probar la conexión con Gemini): la IA se retiró ([ADR 006](decisiones/006-sin-ia-interprete-local.md)).
- **Notificaciones push y recordatorios**: en iOS necesitan un servidor push, lo que rompe «sin backend».
- **Atajos de iOS y enlaces profundos** (`?texto=…`): Atajos abre Safari, que en iOS tiene un almacenamiento separado del de la PWA instalada.
- **Compartir una foto a la app** (Web Share Target): no existe en iOS.
- **Sincronización entre dispositivos**: requiere backend; el backup JSON cubre el cambio de móvil.
- **Micronutrientes completos** (vitaminas, minerales): complican mucho la UI para un uso personal.
- Fuentes de catálogo descartadas (USDA, CoFID…): `scripts/catalogo/README.md` § Fuentes.
