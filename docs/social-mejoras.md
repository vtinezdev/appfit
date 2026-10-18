# Mejoras de Social: plan consolidado

Plan de trabajo · 18 de octubre de 2026.

**Estado:** sin implementar. Nada está decidido todavía: las mejoras marcadas con **[DECIDIR]** esperan una respuesta de Víctor antes de programarse. Las demás se pueden implementar en el orden propuesto cuando Víctor lo autorice.

**Base revisada:** `master` en `63a51ba`. El código social (`src/features/social`, `supabase/`, `src/features/gym/lib/records.ts`) es idéntico al de `9a856b8` y `6fb3569`, las revisiones que analizaron las dos auditorías de origen.

**Origen:** une dos auditorías del mismo día:

- La de Codex, archivada en [auditoria-social-2026-10-18/appfit-social-2026-10-18.md](auditoria-social-2026-10-18/appfit-social-2026-10-18.md) (IDs A01–D06; benchmark, catálogo y priorización en sus CSV).
- La de Claude Code, publicada como página privada de Víctor («Auditoría de Social en AppFit»), con maquetas de la tarjeta y de las alternativas de récords.

Este documento es autosuficiente: recoge todo lo que hace falta para implementar sin abrir las auditorías. Cuando una mejora viene de Codex, se indica su ID entre paréntesis.

## Cómo usar este plan

- **Orden.** Fase 0 → 1 → 2 → 3. Dentro de cada fase, las mejoras son independientes salvo las dependencias indicadas. La fase 0 va primero porque la nota (F1-5) y los récords resumidos (F1-4) dependen de F0-2 y F0-4.
- **Reglas del repositorio** (`CLAUDE.md`):
  - Solo `features/*/data/*Repo.ts` toca Dexie.
  - Lógica en funciones puras con tests al lado.
  - Tokens y primitives; sin colores ni tamaños sueltos.
  - Controles ≥ 44 px e inputs ≥ 16 px.
  - Sheets y páginas modales con las capas compartidas.
  - Borrados de publicaciones con `ConfirmacionDestructiva`; errores dentro de un Sheet con `ErrorState`.
  - Validar a 320/375/430 px, en los dos temas y con texto largo.
  - `npm run test` y `npm run build` en verde.
  - Probar en navegador solo en `appfit-test.localhost`.
- **SQL.**
  - Cada cambio de servidor es una migración nueva (`supabase/migrations/0009_…`, `0010_…`), sin tocar las anteriores.
  - Lleva su suite en `supabase/pruebas/` con usuarios sintéticos y rollback.
  - Víctor la ejecuta a mano en el SQL Editor **antes** de desplegar el cliente que la usa.
  - Cada `raise exception` nuevo necesita su mensaje en `social/lib/mensajes.ts`; un test lo comprueba.
  - Las RPC nuevas se añaden también a `scripts/ui/supabase-falso.mjs`, para que `scripts/ui/validar-social.cjs` siga funcionando.
  - Ninguna RPC nueva debe saltarse las comprobaciones actuales: seguidor aprobado, pertenencia a comunidad, bloqueos y suspensiones (`social_puede_ver_publicacion`).
- **Compatibilidad del resumen** (`social/lib/publicacion.ts`):
  - **No subir `VERSION_RESUMEN`.** `leerResumen` rechaza cualquier versión distinta de 1, y las apps sin actualizar dejarían de mostrar esas publicaciones.
  - Los campos nuevos (nota, récords estructurados, total) van como **opcionales dentro de v1**. `leerResumen` reconstruye el objeto solo con los campos que conoce, así que las apps antiguas los ignoran sin romperse.
- **Al cerrar cada bloque:**
  - Actualizar `docs/features/social.md` (flujos, reglas, migraciones), `docs/roadmap.md` y `docs/datos.md` si cambia algo local.
  - Añadir una entrada a `docs/PROCESO.md`.
  - Un ADR solo si cambia una decisión de los ADR 040/041; por ejemplo, F2-8, F3-1 o F3-6.

## Estado actual en una página

| Pieza | Dónde | Lo relevante para este plan |
|---|---|---|
| Pantalla Social | `social/SocialTab.tsx` | Cabecera con tres botones secundarios iguales («Crear publicación», «Avisos», «N solicitudes»); ViewTabs Siguiendo · Tú · Comunidades |
| Lista paginada | `social/components/ListaFeed.tsx` | 20 por página, «Cargar más»; `fin = nuevas.length < POR_PAGINA`; solo relee al cambiar `version` |
| Lectura RPC | `social/data/socialSupabase.ts` l. 19 | `publicaciones()` descarta las filas que `leerPublicacion` no valida |
| Publicación | `social/components/PublicacionFeed.tsx` | Autor, tarjeta y pie: ánimo (llama y número), comentarios (bocadillo y número), «Borrar publicación» con confirmación |
| Tarjeta | `social/components/TarjetaPublicacion.tsx` | Mismo Card y `text-title` para los 4 tipos; fecha = `fecha` (inicio del entreno), no `creada`; entreno con todo desplegado |
| Resumen | `social/lib/publicacion.ts` | Tipos v1 texto/logro/entreno/actividad; `texto()` recorta a 60 caracteres; `resumenEntreno` corta récords, ligas y logros a 6 (`MAX_LINEAS`) sin guardar el total; el texto lleva `titulo: 'Publicación'` |
| Compartir | `social/components/Publicar.tsx`, `CrearPublicacion.tsx`, `gym/components/PublicarEntreno.tsx`, `vitrina/components/CompartirLogro.tsx` | Vista previa y destinatario; sin nota en entrenos, actividades ni logros; todo o nada |
| Comentarios | `social/components/ComentariosSheet.tsx`, `0005_feed.sql` l. 160–178 | Planos, del más antiguo al más nuevo, `limit 200` sin cursor; `onRecuento(cs.length)` |
| Avisos | `social/components/AvisosSheet.tsx`, `AvisoAmigos.tsx`, `0006` l. 303–340 | Solo ánimos y comentarios en lo mío (30 últimos) y número de solicitudes |
| Comunidades | `social/components/Comunidades.tsx` | Fuera del feed Siguiendo; lista por nombre; en su feed el autor no se puede tocar |
| Servidor | `0006` l. 94–112 (`social_publicar`) | Solo valida campo a campo texto y logro; entreno y actividad aceptan cualquier objeto ≤ 8 KB |
| Récords | `gym/lib/records.ts` | Por ejercicio puede dar peso máximo, 1RM estimado y uno de repeticiones **por cada peso** mejorado; texto largo con «(antes …)» |

## Fase 0 · Fiabilidad

Sin funciones nuevas. Corrige fallos confirmados en el código.

### F0-1 · Confirmar el borrado también desde el detalle (Codex A01) · P0

- **Problema:** en `Publicar.tsx` (l. 82), «Borrar publicación» llama a `borrar()` al momento. En el feed (`PublicacionFeed.tsx`) pide confirmación, aunque el efecto es el mismo: se pierden comentarios y ánimos.
- **Qué hacer:** misma `ConfirmacionDestructiva` que en el feed, con el mismo mensaje («Se borrarán esta publicación, sus reacciones y comentarios. No se puede deshacer.»). El entreno o la actividad local se conservan, como ya ocurre en `publicacionesRepo.borrarPublicacion`.
- **Tests:** UI con `validar-social.cjs`: cancelar no borra, confirmar borra, y el reintento tras perder la respuesta sigue funcionando.
- **Aceptación:** no hay ningún camino que borre una publicación sin confirmar.

### F0-2 · Paginación que no se corta (Codex A02) · P0

- **Problema:** si una página de 20 trae una fila que `leerPublicacion` descarta, llegan 19 y `ListaFeed` decide `fin = true`, así que el resto del feed queda inaccesible. Además, el cursor es `creada < p_antes` sin desempate, y dos filas con la misma `creada` en el límite podrían saltarse.
- **Qué hacer:**
  1. `Social.feed`, `publicacionesDe` y `publicacionesComunidad` devuelven `{ items, cursor, hayMas }`, calculados sobre las filas **crudas**: `hayMas = filas.length === POR_PAGINA` y `cursor` = la última fila cruda.
  2. Cursor compuesto (`creada`, `id`): en las RPC `feed`, `publicaciones_de` y `publicaciones_comunidad`, añadir `p_antes_id uuid` con orden `creada desc, id desc` y la condición `(creada, id) < (p_antes, p_antes_id)`. Conservar la firma anterior para los clientes antiguos.
  3. Si una página entera se descarta, seguir con el cursor y no mostrar el vacío.
  4. Opcional: «Algunas publicaciones necesitan una versión más reciente de AppFit», solo si hubo descartes.
- **Archivos:** `ListaFeed.tsx`, `data/social.ts`, `data/socialSupabase.ts`, `lib/feed.ts`, migración `0009`, `supabase-falso.mjs`.
- **Tests:** puros de paginación (página con una fila inválida, página entera inválida, empate de `creada`); SQL del orden y del cursor compuesto.
- **Aceptación:** con filas ilegibles, «Cargar más» sigue disponible hasta el final real.
- **Bloquea:** F1-4, F1-5 y cualquier formato nuevo.

### F0-3 · Comentarios: total y paginación (Codex A02) · P0

- **Problema:** `comentarios_de` devuelve como mucho 200 (`0005` l. 178) y la hoja sustituye el recuento por `cs.length`. Con más de 200, los nuevos no se ven y el número baja.
- **Qué hacer:**
  - Cursor (`creado`, `id`) y «Ver comentarios anteriores» o «más recientes», según el orden elegido.
  - El total sale del servidor o del recuento de la publicación, nunca de lo cargado.
- **Aceptación:** con 250 comentarios, el número del pie sigue siendo 250 y se puede llegar a todos.

### F0-4 · Validación por campos en el servidor (Codex § 4.1) · P0

- **Problema:** `social_publicar` (`0006` l. 94–112) no valida campo a campo los tipos `entreno` y `actividad`: acepta cualquier objeto de hasta 8 KB.
- **Qué hacer:** en la migración `0009`, validar para entreno y actividad:
  - Lista de claves permitidas (las de v1, más las nuevas opcionales de F1-4 y F1-5).
  - Tipos y longitudes: título 1–60; cifras ≥ 0; listas con su máximo; mapa con 12 zonas y niveles 0–5.
  - Nota: hasta 280 caracteres, ver F1-5.
  - `records` con hasta 6 elementos y sus campos estructurados opcionales.
  - `recordsTotal`: entero ≥ número de elementos.
- **Compatibilidad:** todo resumen v1 que genera hoy la app debe seguir siendo válido. La suite lo prueba con los fixtures de `lib/publicacion.test.ts`.
- **Aceptación:** la suite SQL rechaza claves desconocidas y longitudes excesivas, y acepta los resúmenes actuales.

### F0-5 · Avisos: error distinto de vacío (Codex A08) · P1

- **Problema:** si falla la consulta de avisos, `SocialTab` pasa `lista={avisos.datos?.lista ?? []}` y la hoja muestra «Aquí verás quién comenta…» como si no hubiera nada. `AvisoAmigos` (Inicio) también desaparece en silencio.
- **Qué hacer:** pasar el estado de la consulta a `AvisosSheet` y distinguir:
  - «No se pudo cargar» con `ErrorState` y «Reintentar».
  - «Necesita conexión».
  - Vacío real.
- **Aceptación:** sin red, la hoja dice que no pudo cargar, no que no hay avisos.

### F0-6 · No perder el texto al cerrar el editor (Codex A09) · P1

- **Problema:** `CrearPublicacion` se cierra (botón, Escape, gesto, Atrás) aunque haya texto escrito, y lo pierde.
- **Qué hacer:** si hay texto o cambios, preguntar «Seguir escribiendo / Descartar» dentro de la misma capa, para todas las salidas. Sin diálogo si está vacío. El texto se conserva al ir y volver de la vista previa y al fallar el envío (esto último ya ocurre).
- **Aceptación:** no se pierde texto por un toque accidental fuera del Sheet.

## Fase 1 · Claridad y calor

Casi todo en el cliente.

### F1-1 · Hora de publicación relativa y fecha del entreno como contexto · P0

- **Problema:** el feed se ordena por `creada`, pero la tarjeta muestra `fecha` (inicio del entreno). Un entreno de hace dos semanas compartido hoy aparece arriba con una fecha vieja y sin «hace 2 h». Los comentarios y avisos ya usan `haceCuanto`.
- **Qué hacer:**
  - En la línea del autor: `haceCuanto(creada)` dentro de `<time datetime>`, con la fecha completa accesible.
  - Si el entreno o la actividad son de otro día que la publicación, añadir «Entreno del lunes 14».
  - En logros, se mantiene «Conseguido: …».
  - `creada` ya llega en `PublicacionFeed`.
- **Archivos:** `TarjetaPublicacion.tsx` (recibe `creada` opcional; la vista previa no lo lleva), `PublicacionFeed.tsx`. Lógica del texto en `lib/feed.ts` con test.

### F1-2 · Texto sin título «Publicación» y rótulo de tipo · P0

- **Problema:** `resumenTexto` guarda `titulo: 'Publicación'` y la tarjeta lo pinta encima de cada texto. Los cuatro tipos se ven iguales.
- **Qué hacer:**
  - En publicaciones de texto, no pintar el título; el texto manda.
  - Rótulo en versalitas (`text-rotulo`, `fg-muted`): «ENTRENO», «ACTIVIDAD · CORRER», «LOGRO».
  - El campo `titulo` se sigue guardando (lo usan los avisos: «Comentó en …»). En los avisos, para texto, usar el comienzo del texto o «tu publicación».

### F1-3 · Tarjeta compacta con «Ver detalle» (Codex A06) · P0

- **Problema:** una tarjeta de entreno pinta todo: 3 métricas, ejercicios, mapa con dos figuras y niveles, récords, ligas y Vitrina. Supera una pantalla de 375 px y todo pesa lo mismo.
- **Qué hacer:**
  - **Orden:** autor y hora (F1-1) → rótulo y título → nota (F1-5) → 3 métricas (`Metric` como hoy) → récords resumidos (F1-4) → «Ver detalle» (`Disclosure`) con ejercicios, mapa (`MapaPublicacion`), tabla de récords, ligas y Vitrina → texto «Ánimo de …» (F2-3) → pie.
  - Texto largo (hasta 2.000 caracteres): 6 líneas y «Más».
  - **La vista previa antes de publicar se muestra entera**, para que la persona vea todo lo que se envía.
- **Aceptación:** dos entrenos caben en una pantalla de 375 px; a 320 px, sin overflow; las dos figuras del mapa solo aparecen al desplegar.

### F1-4 · Récords resumidos (alternativas A + B) · P0

- **Problema:**
  - `detectarRecords` (`gym/lib/records.ts` l. 62–84) puede dar varios récords del mismo ejercicio: peso máximo, 1RM estimado y uno de repeticiones por cada peso mejorado. Cada uno es una frase larga (`textoRecord`, l. 103–113): «Peso máximo: 85 kg (antes 82,5)».
  - El mismo ejercicio se repite hasta en 4 líneas.
  - `resumenEntreno` corta a 6 sin guardar el total, así que el 7.º se pierde sin aviso.
  - `texto()` recorta cada línea a 60 caracteres con «…».
  - Como se guarda texto ya formateado, la app no puede elegir el principal ni acortar sin datos estructurados.
- **Presentación recomendada:**
  - **1 récord:** una línea «Press banca · 85 kg · +2,5 kg».
  - **2–3 ejercicios con récord:** lista A, una línea por ejercicio con su récord principal y la mejora: nombre a la izquierda, valor y diferencia en columnas tabulares; diferencia en `accent-strong`.
  - **Más de 3:** cabecera B «7 récords en 4 ejercicios», la primera línea y el resto en «Ver detalle», como tabla Ejercicio · Ahora · Antes.
  - **Récord principal de cada ejercicio, en este orden:**
    1. Peso máximo, o lastre máximo.
    2. Repeticiones con el peso más alto.
    3. Menos asistencia.
    4. 1RM estimado.
  - **Formato corto:**
    - Peso: «85 kg · +2,5 kg».
    - Repeticiones: «10 × 60 kg · +2 reps».
    - Corporal: «12 reps · +2».
    - Lastre: «+20 kg · +5 kg».
    - Asistencia: «20 kg de asistencia · −5 kg».
    - Decimales con coma (`formatNumber`).
- **Datos** (opcionales en v1; ver F0-4):
  - En cada elemento de `records`, además de `{ ejercicio, texto }`: `tipo` (`'peso' | '1rm' | 'reps' | 'asistencia'`), `modo` (`ModoCarga`), `valor`, `anterior`, `peso?` y `variante?`.
  - En el resumen, `recordsTotal` y `recordsEjercicios`, calculados antes de cortar a 6.
  - Elegir **qué 6 se guardan con el principal de cada ejercicio primero**, y después el resto, para que el corte nunca pierda un ejercicio entero si cabe.
  - `texto` se sigue rellenando como hoy, para las apps antiguas.
- **Lectura:**
  - `leerResumen` valida los campos nuevos si están.
  - Publicaciones antiguas sin campos: agrupar por `ejercicio`, mostrar la primera línea de cada uno y «+N récords».
- **Archivos:**
  - `social/lib/publicacion.ts`: tipos, `resumenEntreno`, `leerResumen`.
  - Lógica nueva y pura en `social/lib/records.ts`: elegir principal, agrupar, formatear y ordenar el corte, con su test.
  - `gym/components/PublicarEntreno.tsx`: pasar el `RecordEjercicio` además del texto.
  - `TarjetaPublicacion.tsx`: sustituir `Lineas` para récords.
- **Tests:** un ejercicio con 4 récords → 1 línea + «+3»; 7 récords → total 7 aunque se guarden 6; publicación antigua sin campos; modos corporal, lastre y asistencia; decimales con coma.
- **[DECIDIR]:**
  - ¿El 1RM estimado sale en Social o se queda en Progreso? Es un cálculo (Epley), no una serie levantada.
  - ¿Se publican los récords de repeticiones con pesos más bajos o solo el del peso más alto?
- **Más adelante:** que el autor elija en la vista previa qué récords destacar, con el principal de cada ejercicio por defecto. Va con F2-4.

### F1-5 · Nota personal al compartir · P0

- **Problema:** los tipos `entreno`, `actividad` y `logro` no tienen texto. No se puede contar cómo fue, y los comentarios no tienen de qué partir.
- **Qué hacer:**
  - Campo opcional «¿Cómo ha ido?» en la vista previa del bloque «Compartir» (`Publicar.tsx`) y en `CrearPublicacion` cuando hay adjunto: hoy el `Textarea` solo aparece sin adjunto.
  - Nuevo campo opcional `nota` (1–280 caracteres) en los resúmenes v1 de entreno, actividad y logro. Validar en servidor (F0-4) y en `leerResumen`.
  - En la tarjeta, la nota va tras el título, en `text-body`, con «Más» si pasa de 4 líneas.
- **Moderación:** se denuncia con el flujo de denunciar publicación que ya existe.
- **Depende de:** F0-2 y F0-4.
- **[DECIDIR]:** longitud (propuesta: 280), si se puede editar tras publicar (propuesta: no en esta fase) y si va también en las copias de comunidad (propuesta: sí, cada copia con su nota).

### F1-6 · Refrescar el feed sin perder la posición (Codex A07) · P0

- **Problema:** solo se relee tras crear una publicación o al volver a montar la pestaña.
- **Qué hacer:**
  - «Actualizar» discreto bajo las pestañas.
  - Al volver a la app (`visibilitychange`), comprobar la primera página como mucho una vez por minuto.
  - Si hay novedades, «N publicaciones nuevas» encima de la lista, que las incorpora al tocarlo, sin saltos de scroll.
  - Lo mismo para avisos.
  - Sin tiempo real ni sondeo continuo (plan gratuito de Supabase).
- **Archivos:** `ListaFeed.tsx`, `hooks/useConsulta.ts`, `SocialTab.tsx`.

### F1-7 · Menú «…» para acciones secundarias · P0

- **Problema:** «Borrar publicación» está en el pie al nivel de ánimo y comentarios. «Denunciar la publicación» solo existe dentro de la hoja de comentarios.
- **Qué hacer:**
  - Botón «…» (`IconButton`, 44 px, etiqueta «Más acciones») en la línea del autor.
  - Abre un `Sheet` de acciones: en lo mío, «Borrar publicación» con `ConfirmacionDestructiva`; en lo ajeno, «Denunciar» (`FormDenuncia`) y, cuando exista, «Silenciar» (F2-6).
  - No hay primitive de menú; usar `Sheet`, sin wrappers nuevos por feature.
  - Quitar «Borrar» del pie.

### F1-8 · «Ánimo» con texto visible (Codex A05) · P1

- **Problema:** en lo ajeno se ve una llama y un número; la acción solo está en el `aria-label`.
- **Qué hacer:** «Ánimo · 4» y, activo, «Animado · 4», con el icono y el `aria-pressed` actuales. Textos en `lib/reaccion.ts`, porque el nombre es provisional (ADR 040). Comprobar a 320 px.

### F1-9 · Primera visita y vacíos con una siguiente acción (Codex A04) · P1

- **Problema:** el feed vacío solo ofrece «Buscar a alguien», y encontrar a alguien exige su alias exacto o su código (ADR 040).
- **Qué hacer:** card de primeros pasos con tres acciones reales:
  1. «Comparte tu código» (abre Amigos › Añadir).
  2. «Únete a una comunidad» (abre Comunidades › Descubrir).
  3. «Comparte tu último entreno» (abre su detalle; si no hay entrenos, lleva a Entreno).
  
  Cada paso se marca al cumplirse; la card se puede cerrar (preferencia local en Ajustes) y no vuelve. Sin publicaciones ni personas inventadas.
- **Crear perfil sin desvío:** hoy Social sin perfil manda a Amigos. Ofrecer `CrearPerfil` en el mismo sitio y volver a Social.

### F1-10 · Cabecera clara y nombres sin choques (Codex A03, A10) · P1

- **Problema:**
  - Tres botones secundarios iguales en la cabecera.
  - «Siguiendo» es a la vez el feed de Social y la lista de personas de Amigos.
  - El perfil social se abre con un icono de ajustes dentro de Amigos.
- **Qué hacer:**
  - Avisos y solicitudes en una banda única («3 novedades · 1 solicitud ›») que abre la hoja de avisos, con las solicitudes arriba.
  - «Crear publicación» como acción de pantalla en neutro (regla del acento de `DESIGN.md`).
  - En Amigos, «Sigues» y «Te siguen».
  - Acceso visible a «Tu perfil» desde Social.
  - En la tarjeta, cuando haga falta, rótulo de audiencia («En Testers»).
- **[DECIDIR]:** nombres finales de las pestañas.

### F1-11 · Una sola entrada a cada persona y volver al origen (Codex A03) · P1

- **Problema:**
  - Desde el feed, el nombre abre sus publicaciones; desde Amigos, una hoja de relación.
  - En comunidades, el autor no se puede tocar (`ListaFeed` sin `onAbrirPersona`).
  - `PublicacionesPersona` cierra con «Amigos» aunque se abra desde Social.
- **Qué hacer:**
  - Una misma vista de persona en todas partes, que muestre solo lo que su relación permite. Desde una comunidad, alias, nombre y sus publicaciones **de esa comunidad**, nunca su feed de seguidores.
  - La etiqueta de cerrar dice el origen real.
  - Al volver, conservar la pestaña y el scroll.

## Fase 2 · Conversación, control e identidad

Necesita migraciones y suites SQL.

### F2-1 · Avisos ampliados · P1

- **Problema:** `avisos()` solo cubre ánimos y comentarios en lo mío (30 últimos) y el número de solicitudes.
- **Qué hacer:** añadir:
  - Respuesta a mi comentario (con F2-2).
  - Solicitud aceptada.
  - Publicación nueva en una comunidad de «solo publica el creador» de la que soy miembro.
  
  Agrupar por publicación («Lucía y 2 más comentaron en Torso A»). Contar «nuevos» sin el tope de la lista de 30.
- **Archivos:** migración, `lib/feed.ts` (`leerAvisos`, `textoAviso`), `AvisosSheet.tsx`.

### F2-2 · Responder a un comentario (Codex B07) · P1

- **Qué hacer:**
  - `comentarios.respuesta_a uuid null` (un solo nivel), «Responder a Lucía» en la hoja.
  - Aviso a quien recibe la respuesta.
  - Sin @menciones libres en esta fase.
  - Opción «Dejar de seguir la conversación» si se añaden avisos de hilo.
  - Respetar las cuotas, los bloqueos y la salida de comunidad.
- **Riesgos:** más texto que moderar; mantener el límite de 100 comentarios al día.

### F2-3 · Ver quién te dio ánimo · P1

- **Qué hacer:**
  - En lo mío, «Ánimo de Lucía y 3 personas más» encima del pie; al tocarlo, la lista (RPC nueva, solo para el autor).
  - En lo ajeno, solo el recuento.
- **[DECIDIR]:** ¿solo el autor ve quién reaccionó? (propuesta: sí).

### F2-4 · Elegir qué se comparte (compositor único, Codex B03) · P1

- **Problema:** compartir es todo o nada, y publicar a seguidores y a comunidad usa caminos distintos.
- **Qué hacer:**
  - Un solo compositor para entreno, actividad, logro y texto, con destinatario, nota (F1-5) y «Mostrar en este resumen».
  - Interruptores para mapa, ejercicios, récords (con el destacado elegido), ligas y piezas de Vitrina.
  - En la vista previa: «Los cambios en tu diario no actualizan esta publicación».
- **Datos:** `mapa` ya es opcional y las listas pueden ir vacías, así que eso no cambia el formato. Ocultar volumen o duración sí lo cambia: hacerlos opcionales en v1, validar en servidor y en `leerResumen` (el omitido no se pinta, **nunca como 0**).
- **Riesgos:** copias en dos destinos; mostrar cada copia y su borrado por separado.

### F2-5 · Comunidades en el feed principal y silenciar comunidad · P1

- **Problema:** `feed` excluye `comunidad is not null`. Hay que entrar en cada comunidad para ver si hay algo, y la lista va por nombre, sin señal de actividad.
- **Qué hacer:**
  - **Opción mínima:** «N nuevas» en «Mis comunidades», con la última visita guardada en el servidor.
  - **Opción completa:** incluir en Siguiendo las publicaciones de mis comunidades con su etiqueta «En …», y «Silenciar comunidad» para que no entren.
  - Comentar y reaccionar sigue aplicando las reglas de la comunidad.
- **[DECIDIR]:** mínima o completa. Depende del tamaño previsto de las comunidades.

### F2-6 · Silenciar a una persona · P2

- **Qué hacer:** «Silenciar» en el menú «…» y en la hoja de la persona. Deja de aparecer en mi feed sin dejar de seguirla y sin avisarla; se deshace en «Tu perfil». Textos que lo diferencien de bloquear.
- **Datos:** tabla `silencios` con RLS y sin acceso directo; filtro en `feed`.

### F2-7 · Perfil deportivo elegido (Codex B01) · P2

- **Qué hacer:**
  - Monograma con iniciales o una insignia de la propia Vitrina como avatar. **Sin fotos.**
  - Biografía breve (≤ 160) y disciplinas.
  - 1–3 piezas de Vitrina fijadas.
  - Vista «Así lo ven».
  - Nada del Perfil corporal (peso, medidas, nutrición).
  - Si hay cifras, decir que son «publicadas», no «realizadas»: el servidor solo conoce lo publicado.
- **Datos:** campos nuevos en `perfiles`, RPC y moderación (la bio se denuncia como el perfil).
- **Roadmap:** sustituye a «Mejorar el perfil» en `docs/roadmap.md`.

### F2-8 · Moderación mínima antes de abrir a desconocidos · P1 si se abre

- **Qué hacer:**
  - Ocultar de forma provisional el contenido con denuncias de N personas distintas, hasta que Víctor lo revise.
  - Consultas guardadas para revisar la cola (hoy, `select` a mano en el SQL Editor).
  - No avisar a la persona denunciada.
- **Depende de:** la fase 6 legal (`docs/roadmap.md`).
- **[DECIDIR]:** umbral N y capacidad de revisión.

### F2-9 · Gobierno de comunidades (Codex B09) · P2; P1 antes de abrirlas

- **Problema:** una comunidad depende de su creador. Si borra el perfil, desaparece con todo su contenido; si alguien bloquea al creador, deja de verla.
- **Qué hacer:**
  - Transferir la propiedad.
  - Moderadores delegados.
  - Retirar contenido y expulsar miembros.
  - Reglas breves y propósito visibles antes de unirse (Codex B08); publicación fijada de bienvenida.
  - Explicar las consecuencias antes de borrar el perfil.
- **[DECIDIR]:** qué pasa con la comunidad al borrar el perfil del creador, y si bloquear al creador debe seguir ocultándola.

### F2-10 · Filtros por tipo · P2

- `FilterChips` «Todo · Entrenos · Actividades · Logros · Texto», con filtro en la RPC.
- Solo si hay volumen suficiente: medirlo antes.

## Fase 3 · Apuestas a validar

Solo tras las fases anteriores y con un piloto.

### F3-1 · Semana en compañía (Codex C01) · P2, piloto

- **Idea:** dos personas aceptan una semana; cada una cuenta contra su propio plan (Ritmo). Cumplimiento = `100 × min(sesiones que cuentan / objetivo acordado, 1)`: 2/2 y 4/4 valen lo mismo y entrenar de más no da ventaja.
- **Reglas:**
  - Aceptar antes de participar.
  - Pausa y salida sin reproche y sin penalizar al otro.
  - Objetivo 0 o pausa: estado neutro, sin porcentaje.
  - Sin premios ni puntos por publicar o reaccionar.
- **Datos:** el servidor no conoce el plan ni los entrenos. Hace falta un agregado mínimo calculado en el móvil y compartido a propósito (sesiones que cuentan / objetivo, por semana). Es autodeclarado: vale para un piloto amistoso, no para premios.
- **Necesita un ADR:** cambia lo que sale del móvil.
- **Validación:** 3–4 semanas con parejas de niveles distintos: ¿quieren repetir?, ¿hubo presión?
- **[DECIDIR]:** qué sesión cuenta, cómo se fija el objetivo y la zona horaria.

### F3-2 · Rutina reutilizable (Codex B05) · P2

- **Idea:** compartir la estructura de una rutina (ejercicios, series y rangos, descansos); quien la recibe la revisa y la guarda en sus rutinas con sus cargas. Nunca se copian marcas ajenas.
- **Bloqueo:** hoy el resumen solo lleva nombres de ejercicio. Hacen falta ids estables del catálogo (no los numéricos locales) y un tratamiento para los ejercicios personalizados (sin equivalente: elegir uno al revisar).
- **Encaje:** escribir la copia local pasa por los repos de `gym/data`.

### F3-3 · Compartir la semana de Ritmo o «estoy retomando» (Codex B02, C04) · P2

- **Idea:** nuevo tipo de resumen «semana»: días entrenados frente al plan e hilo de semanas, sin kcal ni peso. Opción «Estoy retomando» o «En pausa» sin motivo.
- **Reglas:** nunca automático y sin «semana fallida».
- **Formato:** tipo nuevo en v1. Las apps antiguas lo descartarían, así que requiere F0-2 y desplegar antes el lector.

### F3-4 · Invitación por enlace o QR (Codex B04) · P3

- **Idea:** enlace revocable que propone «Pedir seguir»; QR para el gimnasio; el código se mantiene.
- **Bloqueo:** la app no tiene rutas por URL (`src/app/App.tsx`, router con `useState`). Hay que resolver el enlace al abrir y probar Safari frente a la PWA instalada.

### F3-5 · Metas o expediciones de comunidad (Codex C02) · P3

- **Idea:** meta colectiva («300 km entre todos en noviembre», una ruta de Caminos compartida) que suma lo que cada miembro aporta a propósito. Barra común, sin ranking, con aportación limitada por persona.
- **Condición:** solo si F3-1 funciona.

### F3-6 · Notificaciones push (Codex D04) · P3

- **Idea:** solo para respuestas y solicitudes, desactivadas por defecto, con el permiso pedido en contexto. Sin contenido corporal en la pantalla bloqueada.
- **Requisitos:** un servicio de envío (nuevo servicio externo: **[DECIDIR]** según `CLAUDE.md`) y revisar el ADR 040, que las descartó.

## No hacer, por ahora

- Clasificaciones entre personas, ELO, temporadas competitivas o comparación de fuerza.
- Feed algorítmico «Para ti».
- Sugerencias de desconocidos y descubrimiento abierto.
- Fotos y vídeo: espacio, tráfico y moderación de imágenes.
- Recorridos GPS sin zona privada.
- Mensajes privados.
- Puntos o XP por publicar, reaccionar o comentar.
- Contadores de racha en cada tarjeta.

Chocan con el ADR 040, con la regla «sin castigos» de `DESIGN.md` o con la capacidad de moderación actual. Más detalle en Codex § 3.3 y D01–D06.

## Decisiones pendientes de Víctor

| Decisión | Afecta a | Propuesta |
|---|---|---|
| Para qué es Social: apoyo y constancia, o también rendimiento | Todo | Apoyo y constancia |
| A quién se abre primero | F2-8, F2-9 | Amistades y grupos pequeños |
| ¿1RM estimado en Social? ¿Récords de reps con pesos bajos? | F1-4 | 1RM fuera; solo el récord principal de cada ejercicio a la vista |
| Nota: longitud, edición y copias de comunidad | F1-5 | 280; sin edición; sí en cada copia |
| Nombres de pestañas y de la reacción | F1-8, F1-10 | Mantener «Ánimo»; «Sigues / Te siguen» en Amigos |
| Quién ve quién reaccionó | F2-3 | Solo el autor |
| Comunidades en el feed: mínima o completa | F2-5 | Empezar por la mínima |
| Umbral de ocultación por denuncias y capacidad de revisión | F2-8 | Por definir |
| Comunidad sin creador | F2-9 | Transferir antes de borrar el perfil |
| Qué cuenta en la semana en compañía | F3-1 | Sesiones confirmadas del plan semanal de Ritmo |
| Push y su servicio de envío | F3-6 | Después de F2-1 y F2-2 |
| Cómo medir sin analítica | Validación | Recuentos agregados en el SQL Editor y entrevistas |
| Liga con descenso frente al «sin castigos» de `DESIGN.md`; `PRODUCT.md` aún dice «sin backend ni cuentas» | Coherencia de docs | Decidir y corregir el documento que no refleje la intención |

## Validación

- **Por bloque:** tests puros, suite SQL con rollback, `scripts/ui/validar-social.cjs` ampliado con `supabase-falso.mjs` (320/375/430 px, claro y oscuro, texto largo, cifras grandes) y prueba con dos cuentas reales y en iPhone físico antes de dar por cerrado.
- **Tareas de uso** (antes de la fase 2), con 6–8 personas, incluidas principiantes y alguien que no quiera Social: crear perfil sin exponer medidas, invitar, aprobar, publicar a una audiencia, explicar qué se envía, dar ánimo, volver desde una persona y corregir un error.
- **Indicadores**, con recuentos agregados en el servidor, sin datos personales ni analítica en el cliente:

  | Indicador | Qué mide |
  |---|---|
  | Reciprocidad | Publicaciones con un ánimo o comentario de otra persona en 48 h |
  | Tiempo hasta el primer apoyo | Desde la primera publicación de alguien hasta la primera interacción de otra persona |
  | Conversación | Hilos con más de un participante, tras F2-2 |
  | Activación | Perfiles que en 7 días siguen a alguien o se unen a una comunidad, y publican |
  | Uso de la nota | Porcentaje de entrenos compartidos con nota, tras F1-5 |
  | Salud | Denuncias, bloqueos y silencios por cada 100 publicaciones |

  La constancia (Ritmo) vive en el móvil: solo se mide con un agregado compartido a propósito o en entrevistas.
- **Evitar como objetivo:** número de publicaciones, tiempo en pantalla, ánimos totales o seguidores.
