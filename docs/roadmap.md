# Roadmap: pendientes, ideas y descartadas

Única lista viva de lo que falta. Cuando algo se haga, se quita de aquí (y se documenta donde toque); cuando se descarte, pasa a «Descartadas» con el motivo. Nada de esto se empieza sin que Víctor lo pida. Origen de la mayoría de ideas (con su valor y esfuerzo estimados): `historico/ideas-nutricion-v2.md`.

**Plan de evolución (2026-10-22):** 33 mejoras elegidas en el dashboard de evolución, repartidas en dos carriles que trabajan en paralelo (A: Entreno, Social y actividades; B: Inicio, Nutrición, navegación y progreso). Orden, implementación, reglas para no pisarse y decisiones pendientes en [`plan-evolucion/`](plan-evolucion/README.md). Las ideas de abajo que coinciden con un paso del plan (tendencia de peso, coherencia energética, TCX) se quitan de aquí al terminar ese paso.

**Plan en curso:** las mejoras acordadas el 2026-10-12 (serie hecha, pista del menú de serie, filtro de abductores, creatina, cheat day, creador de rutinas y uso por otras personas) tienen su plan y estado en [`mejoras.md`](mejoras.md).

**Cuentas y copia en la nube:** implementadas en `feat/cuentas` ([cuenta](features/cuenta.md)); queda la prueba en iPhone real y, antes de publicar, un dominio propio para el correo (hoy sale por Brevo desde un Gmail). Estado en [`cuentas.md`](cuentas.md).

**Parte social:** Social (feed, ánimos, comentarios, avisos) y Amigos (perfil y personas) fusionados en `master` el 2026-10-15 ([ADR 040](decisiones/040-parte-social.md), [social](features/social.md)). Pendiente antes de abrirlo a desconocidos: la fase 6 (condiciones de uso, política de privacidad con el consentimiento y los 16 años, ficha de datos de Google Play, revisión por alguien que sepa de protección de datos) y la 7 (prueba en iPhone y Android). Plan y estado en [`social.md`](social.md).

**Publicación:** abrir la app a otras personas (gratis, Google Play para Android y PWA para iPhone) tiene su plan en [`despliegue.md`](despliegue.md). Va después del rediseño visual.

## Pendientes de la auditoría de compatibilidad

- **Auditoría del 21–22 de octubre:** AF-01–05 corregidos y regresión AF-07 incorporada; quedan el perfilado de rendimiento AF-06 y la validación física. Las nueve mejoras visuales aprobadas (UI-02 a UI-10) están implementadas; UI-01 sigue descartada. Estado y alcance en [plan-auditoria-2026-10-22.md](plan-auditoria-2026-10-22.md).

- [Auditoría del 17 de octubre](auditoria-2026-10-17/INFORME.md): los cinco defectos iniciales están corregidos. A06/A07 se abordan después en §154: semana desplazable con botones táctiles, calendario compacto por lista (desde §173, solo por debajo de 360 px o con texto ampliado) y pestañas con rótulos completos. La validación física sigue pendiente.
- Comprobar instalación, teclado, giro/recortes, Atrás, permisos y suspensión en iPhone/Android físicos. Chromium, Firefox y WebKit Linux están probados; no sustituyen esos dispositivos. Cuenta/Social se recorrieron con dobles locales; esta auditoría no reejecutó SQL/RLS ni cuentas remotas reales. Workflow de QA incluido para PR y master; sus resultados se comprueban antes del merge.

## Pendiente de probar en Android real

- Adaptación de tamaños (§152): instalación desde Chrome y desde el menú, icono/recorte del lanzador, teclado real en formularios, giro con recortes laterales, botón/gesto Atrás, cámara del escáner y primera apertura offline después de instalar. La validación Chromium usa emulación Pixel 7 y viewport reducido; no sustituye al dispositivo físico.

## Pendiente de probar en el iPhone real

Según los registros de sesión, sin confirmar todavía (preguntar a Víctor antes de darlo por hecho):
- Rediseño completo (§51): safe areas, teclado y tacto en iOS/Android reales. Chromium cubre tamaños/temas/foco/scroll y viewport reducido, no reproduce el teclado real de WebKit.
- Catálogo: tiempo de importación (~6.300 filas) y de búsqueda en Safari/WebKit.
- Mapa muscular de progreso ([ADR 051](decisiones/051-mapa-muscular-de-progreso.md)): tocar zonas en el móvil y lectura con datos reales; en Chromium (Edge) solo se probó con fixtures.
- Gimnasios (ADR 054): elegir y crear gimnasios, nota de primera vez y teclado del nombre en la hoja; probado en Chromium a 320/375/430 px en ambos temas.
- Escáner: 3 productos reales (la cámara necesita HTTPS).
- Exportar el backup (`<a download>` con un blob) desde la PWA instalada.
- Póster como imagen (ENT-11): «Compartir…» con la hoja de compartir de iOS (WhatsApp, Instagram) y «Guardar imagen» desde la PWA instalada; la letra incrustada en el PNG en Safari. Probado en Chromium (descarga y `navigator.share` simulado) a 320/375/430 px en ambos temas.
- Inicio minimalista con rueda de energía (§79): tacto de las tarjetas y del «+» del peso, y nitidez de la rueda en pantalla Retina. Probado en Edge emulado a 320/375/430 px.
- Persistencia (§44): trasladar una copia de Safari al acceso de pantalla de inicio, cerrar/reabrir y actualizar la PWA en la misma dirección. Comprobado en Chromium con perfil persistente y modos de iOS emulados; confirmar el comportamiento del almacenamiento y del permiso en WebKit.
- Perfil (§74): selector de fecha nativo, campo de altura con teclado decimal (coma) y Sheets con teclado. Probado en Edge emulado a 320/375/430 px.
- Categorías e iconos (§82): sin recorrido en navegador ni en iPhone. Revisar el Diario a 320 px (columna de iconos de 44 px), la burbuja del nombre al pulsar el icono (cierre al tocar fuera en Safari) y los selectores de categoría con el teclado de iOS. El build de Cloudflare de la rama `feat/categorias-alimentos` falló como build de producción (el de `master` salió bien): revisar la configuración de builds de rama.
- Mejoras funcionales (§80): recorridas en Edge emulado a 320/375/430 px en ambos temas; **sin probar en iPhone**: pitido de fin de descanso (Web Audio: iOS puede exigir un gesto previo o silenciar el audio con el interruptor), descarga de varios CSV `<a download>` desde la PWA instalada, selectores `date`/`time` nativos al editar un entreno y teclado real en los Sheets de raciones, recetas y medidas.
- Acento volt y pulido visual (§121, [ADR 035](decisiones/035-acento-volt-y-pulido-visual.md)): recorrido en Edge emulado a 390 px en ambos temas, 320 en oscuro y 430 en claro; sin probar en iPhone: borrar deslizando en el Diario (gesto horizontal frente al scroll vertical en Safari, toque fuera para cerrar), la barra flotante sobre la safe area inferior con el contenido pasando por debajo, el volt en la pantalla real (que no deslumbre en oscuro) y el plegado de ejercicios con la hoja del RIR.
- Fondos dibujados (§122, [ADR 036](decisiones/036-fondos-dibujados.md)): recorridos en Edge emulado; sin probar en iPhone: que las curvas y los puntos se vean en la pantalla real en oscuro (opacidades cerca del límite de contraste) y la máscara SVG en Safari.
- Pulido visual «precisión silenciosa» (§85): recorrido en Edge emulado a 320/375/430 px en ambos temas; sin probar en iPhone: nitidez del carril fino de la rueda y de la rejilla de Progreso en Retina, tacto del chevrón del plato en su nueva columna y lectura de la tarjeta de entreno en oscuro dentro del gimnasio.
- Rediseño visual v2 (§97): recorrido en Edge emulado a 320/375/430 px en ambos temas, 375 con texto al 200 % y Reducir movimiento; sin probar en iPhone: cabecera fija del entreno y píldora del descanso con safe areas y teclado abierto, barra de pestañas con la barra de inicio de iOS, tacto de los días del calendario y de la semana de Nutrición (unos 37–39 px de ancho a 320 px).
- Actividades y Caminos (§123, [ADR 037](decisiones/037-actividades-y-caminos.md)): recorridos en Edge emulado a 320/375/430 px en ambos temas con GPS simulado; sin probar en iPhone: grabar con el GPS real (permiso de ubicación en la PWA instalada, Wake Lock en Safari, qué pasa al bloquear la pantalla y volver, batería y precisión de la altitud), importar un GPX desde Archivos (Strava, Wikiloc, el reloj) y los selectores nativos de fecha y hora en la hoja. Con datos reales: si 10 m por km y 3 días por semana se sienten bien en Cumbres y si los km de las rutas cuadran con lo que se anda.
- Rutas propias de Caminos (§124): recorridas en Edge emulado a 320/375/430 px; sin probar en iPhone el buscador de pueblos con el teclado, los campos de km y la descarga de la lista de pueblos en la PWA instalada (y luego sin conexión).
- Revisión semanal en Inicio (§95): recorrida en Edge emulado a 320/375/430 px en ambos temas y con texto al 200 %; sin probar en iPhone (tacto de «Hecho»/«Ver revisión» y página modal con safe areas).

## Limitaciones conocidas

- Ilustraciones de ejercicios: las 268 definiciones actuales tienen ilustración propia (IA; lotes 1–67, con 64 altas de gimnasio/calistenia/pilates el 2026-10-17). Al añadir ejercicios se amplían `scripts/ejercicios/ilustraciones.json` y `mapeo.json`; la tubería conserva las miniaturas aunque falten los originales. Ver `scripts/ejercicios/README.md` y la [revisión del catálogo](historico/revision-ejercicios-2026-10-17.md).
- Perfil: los factores de actividad (1,2–1,9) se atribuyen a McArdle, Katch y Katch (1996) sin haber verificado la edición ni una derivación experimental; la cifra de 600 kcal/día de NICE procede de CG189 y no se ha cotejado en NG246. La media de Mifflin y Roza-Shizgal es criterio de AppFit, no un método publicado. Los scripts `scripts/ui/validar-*.cjs` adaptados a Perfil no se han ejecutado (rutas fijas a `/usr/bin/chromium` y al puerto 5174); el recorrido se probó con un script propio en Edge (PROCESO §74).
- Buscador e intérprete priorizan los básicos compartidos en `catalogo/preferidos.ts`; arroz, pasta y pollo sin más detalle se eligen en crudo. Si se pesa en cocido, especificarlo o usar «Cambiar». Si aún hay ruido, valorar sugerencias prioritarias con «Ver más variantes», sin fusionar alimentos por nombre.
- Catálogo: no hay genéricos españoles (manchego, tortilla de patata…); la categoría y la detección de idioma de Open Food Facts son heurísticas (ver `scripts/catalogo/README.md`).
- «Alimentos» ya no muestra la procedencia de cada alimento (se quitó en §38).
- Categorías (§82): la de un alimento del catálogo no se puede cambiar (solo la de los propios); un producto escaneado antes de las categorías sigue sin ella hasta volver a escanearlo con conexión, y sus entradas cuentan como «Sin categoría» en el Resumen. Añadir comida y Cambiar alimento ya filtran por categoría (§154). La categoría no es un snapshot: reclasificar un alimento reclasifica su historial, y uno borrado deja sus entradas sin categoría.
- El `theme_color` del manifest es el claro; el meta de la página se adapta al tema.
- Gasto observado (Perfil): exige 28 días con ≥ 80 % de comidas registradas y 2 pesajes por semana; usa 7.700 kcal/kg (aproximación, Hall 2008), el peso varía por agua y sal y el registro de comida suele quedarse corto. Es orientativo y no sustituye al estimado salvo que se active.
- Proteína por kg y agua: rango 1,6–2,2 g/kg (Morton 2018, Jäger 2017) verificado con el texto de las fuentes; el objetivo de agua (2,0/1,6 L) parte de EFSA (2010) con un 20 % descontado por la humedad de los alimentos, que es criterio de AppFit y no una cifra de EFSA (el resumen de EFSA no da ese porcentaje; efsa.europa.eu rechazó la consulta directa y se leyó una copia archivada). Si sale una fuente mejor para el descuento, sustituirlo.
- Objetivo por día: los días anteriores a esta versión no tienen snapshot y se comparan con el objetivo vigente; registrar comida de un día pasado congela el vigente de ese momento. Cambiar de peso o de Perfil no reescribe días con snapshot.
- Récords: un ejercicio sin historial previo no genera récords; las repeticiones solo se comparan con pesos ya usados. Un entreno registrado a posteriori se compara por su fecha de inicio.
- Raciones propias: solo de una palabra y solo en alimentos propios o del catálogo (se gestionan desde la revisión, no hay ficha del alimento del catálogo). Recetas: los ingredientes son un snapshot; no se vuelven a calcular si cambia el alimento de origen.
- `scripts/ui/validar-rediseno.cjs` conserva selectores anteriores a la Inicio de ADR 021 (espera el saludo «Buenos/Buenas», pulsa «Registrar» e «Historial de peso») y, como el resto de `scripts/ui/`, el Chromium de `/usr/bin/chromium` y el puerto 5173. En §85 se ejecutó su matriz desde una copia adaptada fuera del repo (Edge, «Hoy», «Registrar peso», tarjeta Peso).

- Entreno activo: la columna «Anterior» solo cabe en la fila con paneles de 20,5rem o más (móviles de 414 px en adelante); en 375/390/393 px va en una línea bajo reps y kg, para no estrechar los campos.
- `scripts/ui/validar-*.cjs` se han adaptado a la barra de pestañas (§97) sin ejecutarlos: siguen apuntando a `/usr/bin/chromium` y conservan otros selectores anteriores.

La ampliación de publicaciones libres, logros compartidos, comunidades y mapa muscular está implementada. Víctor confirmó la ejecución correcta de `0006_comunidades_y_publicaciones.sql` en el proyecto real el 2026-10-16; las pruebas con cuentas reales de esta ampliación siguen pendientes. Ver [Social](features/social.md).

## Ideas sin empezar

Social:
- [Plan consolidado de mejoras](social-mejoras.md): fases 0–1 y mejoras autorizadas de fase 2 implementadas. Víctor confirma SQL 0009–0013 en el proyecto real (2026-10-18), con campos opcionales desactivados. [Social](features/social.md) documenta los flujos; tareas con 6–8 personas, dos cuentas e iPhone/Android pendientes antes de abrir el siguiente piloto.
- Rediseño visual ([ADR 045](decisiones/045-rediseno-visual-de-social.md)) implementado. Víctor confirma `0014_social_rediseno.sql` en el proyecto real (2026-10-18). La lista de primeros pasos con progreso (P15 de la propuesta) se implementa compacta y plegada con UI-09 (2026-10-22).
- Avatares de catálogo ([ADR 047](decisiones/047-avatares-de-catalogo.md)) implementados: Víctor confirma `0015_social_avatares.sql` en el proyecto real (2026-10-19); falta probarlo con dos cuentas reales.
- Administración desde la app ([ADR 049](decisiones/049-administracion-de-social.md)) implementada: Víctor ejecuta `0017_social_administracion.sql` en el proyecto real y se nombra administrador (`tinez`) el 2026-10-19; falta probarlo en el móvil y con una segunda cuenta. Pendiente, si hace falta: suspender o cerrar una comunidad desde Moderación (hoy, SQL o suspender a su creador) y avisar a quien denunció.
- Seguimiento mutuo al aceptar ([ADR 050](decisiones/050-seguimiento-mutuo-al-aceptar.md)) implementado: Víctor ejecuta `0018_social_seguimiento_mutuo.sql` en el proyecto real (2026-10-19); falta probarlo con dos cuentas.
- Omitir duración/volumen: lector preparado, escritura desactivada hasta completar la actualización de lectores anteriores. Perfil deportivo sin imágenes, reacciones privadas, respuestas, silencios y gestión de comunidades implementados.
- Filtros por tipo requieren datos de volumen. Ocultación automática requiere capacidad de moderación; se conserva revisión manual. Fase 3 (semana en compañía, semana de Ritmo, enlaces/QR, expediciones y push) pendiente de sus pilotos, decisiones y bloqueos técnicos; las rutinas reutilizables ya están (A13, ADR 055), a falta de ejecutar 0022 en el proyecto real. No hay agregados nuevos del diario ni servicio de push.

Registro:
- Más nombres de unidades propias de varias palabras («trozo grande») en las raciones propias del intérprete.

Gimnasio:
- Mapa muscular de progreso (ADR 051): versión extendida de unos cinco años (tramos por encima de Avanzado III) cuando alguien llegue al máximo; es retroactiva porque todo se deriva del historial. Observar con datos reales si las dosis de los grupos pequeños (6 series) son justas.
- **Gimnasios** ([ADR 054](decisiones/054-historial-por-gimnasio.md)): implementado el historial de máquinas por gimnasio. Ideas que se dejaron fuera: un factor de conversión estimado entre la máquina de un gimnasio y la del habitual (relación de 1RM estimados) y marcar ejercicios concretos como «depende de la máquina» o no, en vez de deducirlo del equipo.
- Creador de rutinas: con 2 y 3 días por semana y sesiones de 45–60 min, el hueco de gemelos queda fuera del tiempo y el grupo no progresa en el mapa (simulación del ADR 051). Valorar meterlo antes o avisarlo.
- **Plan de mejoras de Entreno**: implementadas las diez mejoras iniciales: papelera, RIR, notas, gráficas, carga corporal, unilateral, agarres, dropsets, negativas y progresión confirmada. Alcance, orden, decisiones y ampliaciones futuras en [mejoras.md](../mejoras.md). Se validan los bloques que Víctor autoriza antes de continuar; sustituye aquí el detalle anterior de progresión para evitar planes duplicados.

Gamificación:
- **Gaming** (2026-10-10): plan y decisiones en [gaming.md](../gaming.md). **Experiencia, Ritmo y Vitrina implementados** (PROCESO §100 y §101, [ADR 029](decisiones/029-gamificacion-atributos.md); desde PROCESO §119 la experiencia no tiene pantalla y Cumbres sustituye al nivel y los atributos, [ADR 034](decisiones/034-cumbres-en-lugar-de-atributos.md), [experiencia](features/experiencia.md), [ritmo](features/ritmo.md), [vitrina](features/vitrina.md)). **Liga por ejercicio** implementada (PROCESO §103 a §107, [ADR 030](decisiones/030-liga-por-ejercicio.md), [liga](features/liga.md)); pendiente probar en el iPhone si las 16 semanas y la bajada se sienten bien. **Cumbres** implementada en prueba con la XP como motor (1 XP = 1 m; PROCESO §109, [cumbres](features/cumbres.md)): Víctor la probará y decidirá qué funcionalidades de `gaming.md` se quedan. Aparcados los víveres (etapas y víveres) y «tu montaña» (nombre y altitud propios); **Caminos** implementado con las actividades (PROCESO §123, [ADR 037](decisiones/037-actividades-y-caminos.md), [caminos](features/caminos.md)); el Tablón, aparcado. Pendiente: probarlo en el iPhone con los datos reales (rendimiento del recálculo y si la XP, la curva y los umbrales se sienten bien); la proteína opcional del plan semanal; el póster con un hito redondo al terminar; y, si Víctor quiere, la variante «Maestría muscular».

Cuerpo y objetivos:
- Objetivos distintos en días de entreno y de descanso (kcal extra a hidratos): la integración Gym ↔ Nutrición se decidirá más adelante.
- Definir recomendaciones contrastadas por grupos de alimentos y comparar raciones con el consumo real. La sección Referencias y sus tipos ya están preparados y los alimentos ya tienen categoría (§82); faltan fuentes, valores y la correspondencia entre categorías y grupos de las guías, sin recomendaciones ficticias.
- Cambiar la categoría de un alimento del catálogo (una preferencia personal por `FoodRef`, como los nombres cortos). El filtro de categoría en Añadir comida está implementado (§154).

Actividades y Caminos:
- **App nativa** (p. ej. Capacitor) para grabar con el GPS en segundo plano y leer los entrenos de Apple Salud o Health Connect (caminatas y carreras del reloj con su recorrido, sin hacer nada) y los pasos de cada día, que hoy se apuntan a mano en Caminos. Exige cuenta de desarrollador de Apple, compilar en un Mac (o en la nube) y la revisión del App Store; cambia el plan de publicación ([despliegue.md](despliegue.md)).
- Más rutas: Tour del Mont Blanc, Muro de Adriano, Vía Francígena, GR 11, Camino de Invierno, Camino Portugués de la Costa, Shikoku, Appalachian Trail… (al final de `RUTAS`, con su fuente), y más viajes de libro de dominio público (Viaje al centro de la Tierra, el Quijote).
- Importar FIT además de GPX y TCX; CSV de actividades.
- Rutas propias: sustituir GeoNames por el Nomenclátor del IGN (oficial) si se descarga a mano; lugares fuera de España; nombres en castellano además de los oficiales («Lérida», «Gerona») en el buscador.

Calidad de datos:
- Alias y fusión de alimentos propios duplicados («pechuga de pollo» / «pollo, pechuga»), reasignando entradas y plantillas.

Catálogo:
- BEDCA como fuente, si AESAN/BEDCA lo autorizan (ver `scripts/catalogo/README.md`).

## Descartadas

- **Otros fondos de la propuesta de §122** (halo volt solo, foto en duotono, grano, aurora, anillos): Víctor eligió curvas de nivel y rejilla de puntos.
- **Todo lo que dependía de la IA** (foto de la etiqueta o del plato, «¿qué como?», cola de audio sin conexión, probar la conexión con Gemini): la IA se retiró ([ADR 006](decisiones/006-sin-ia-interprete-local.md)).
- **Notificaciones push y recordatorios** (incluidos los de creatina): en iOS necesitan un servidor push, lo que rompe «sin backend».
- **Atajos de iOS y enlaces profundos** (`?texto=…`): Atajos abre Safari, que en iOS tiene un almacenamiento separado del de la PWA instalada.
- **Compartir una foto a la app** (Web Share Target): no existe en iOS.
- **Sincronización registro a registro entre dispositivos**: exigiría pasar los ids a UUID y resolver conflictos por registro; la copia cifrada de la cuenta ([cuenta](features/cuenta.md)) cubre el cambio de móvil.
- **Micronutrientes completos** (vitaminas, minerales): complican mucho la UI para un uso personal.
- Fuentes de catálogo descartadas (USDA, CoFID…): `scripts/catalogo/README.md` § Fuentes.

- Actualizaciones visibles: comprobar en un iPhone físico el paso de una build a otra desde Ajustes y la guía de cierre/reapertura. Pruebas automatizadas en Chromium con SW real y datos de prueba, sin WebKit físico.

- Comunidades de anuncios: opción de publicación solo por su creador implementada. Víctor confirmó la ejecución correcta de 0007 en Supabase el 2026-10-16; Testers y las demás comunidades existentes conservan sus permisos. Falta probar esta opción con cuentas reales y en un iPhone físico.
- Descripción editable de comunidades: implementada. 0008 ejecutada en Supabase y su suite SQL superada en el proyecto real el 2026-10-16. Falta probarla con cuentas reales en un iPhone físico.
