# Plan: imagen de cada comunidad (punto 23)

Handoff para la sesión que añade los avatares de comunidad que ha creado Víctor. Estado al escribirlo (2026-10-28): el interior de una comunidad ya está rediseñado (punto 22, PROCESO §286) y todas las comunidades se pintan con su monograma en un cuadrado invertido. Lee antes `CLAUDE.md`, [Social](features/social.md) (§ Comunidades y § Avatar) y el [ADR 047](decisiones/047-avatares-de-catalogo.md).

## Qué hay hoy

- El escudo de una comunidad es `<Avatar nombre={c.nombre} forma="cuadrado" />`. Se usa en `src/features/social/components/Comunidades.tsx`, en la lista (tamaño `md`) y en la portada del detalle (`lg`). Busca `forma="cuadrado"` por si aparece en algún sitio más.
- El primitive `shared/components/Avatar.tsx` acepta `arte` (un dibujo que se recorta en **círculo**, `rounded-pill`) e `insignia`. Para una comunidad tiene que seguir siendo **cuadrado** (`rounded-md`), para no confundirla con una persona.
- El patrón a copiar es el del avatar exclusivo de Víctor: una imagen empaquetada con la app (`social/assets/avatares/tinez.webp`), leída con `import.meta.glob` en `social/lib/imagenAvatarExclusivo.ts`. Si falta el archivo, se pinta el monograma. Nunca es una URL de usuario.
- El servidor solo guarda identificadores con formato validado, nunca imágenes (0015, `perfiles.avatar`). Un identificador que la app no conozca se pinta como monograma.
- `Comunidad` (`social/lib/comunidad.ts`, `leerComunidad`) no tiene campo de imagen. La RPC `comunidades(p_busqueda, p_solo_mias)` vigente está en `supabase/migrations/0007_comunidades_solo_creador.sql`. Comprueba si alguna migración posterior la toca antes de redefinirla.

## Propuesta (confírmala con Víctor antes de programar)

Un **catálogo cerrado** de imágenes que vienen con la app, como los avatares de perfil, sin subir fotos: así no hace falta almacenamiento, moderación de imágenes ni revisión legal. El servidor guarda solo `comunidad.<id>`.

Preguntas para Víctor:
1. ¿Quién la cambia? Propuesta: solo quien la creó, como la descripción.
2. ¿Se elige al crear la comunidad, después desde «Más acciones», o en los dos sitios? Propuesta: en los dos.
3. ¿Hay algún avatar bloqueado o especial, o están todos disponibles? Propuesta: todos disponibles.
4. ¿La que no elija ninguna sigue con el monograma? Propuesta: sí.

## Pasos

1. **Imágenes.** Pásalas a `.webp` cuadrado de unos 256 px, en `src/features/social/assets/comunidades/<id>.webp`, con ids en minúsculas y guiones (`[a-z0-9-]+`). Fíjate en el peso: todas viajan en el bundle.
2. **Catálogo puro.** `src/features/social/lib/avatarComunidad.ts`, con su test al lado:
   - la lista de ids y nombres en español;
   - `leerAvatarComunidad(id)`, que devuelve `null` si el id no es válido o no se conoce;
   - la URL de cada imagen, por glob como en `imagenAvatarExclusivo.ts`.
3. **Migración `supabase/migrations/0028_comunidades_avatar.sql`.** Comprueba antes que el número 0028 sigue libre. Debe ser aditiva y en un `begin; … commit;`:
   - `alter table public.comunidades add column avatar text check (avatar is null or (char_length(avatar) <= 64 and avatar ~ '^comunidad\.[a-z0-9-]+$'))`;
   - `editar_avatar_comunidad(p_id uuid, p_avatar text)`: `security definer`, `search_path = ''`, solo el creador, como `editar_descripcion_comunidad` en 0008; `null` vuelve al monograma;
   - `comunidades(...)` redefinida para devolver también `avatar`. Lo mismo donde se lea una comunidad para pintarla, si hay más RPC;
   - `revoke` y `grant` como en 0008.
4. **Pruebas SQL.** Crea `supabase/pruebas/comunidades_avatar.sql`: el creador cambia y quita la imagen, otro miembro no puede, y un id con mal formato da error. Añádela a `scripts/sql/validar-social.mjs`.
5. **Cliente.**
   - En `Comunidad`, `avatar?: string`; `leerComunidad` acepta una cadena de 64 caracteres como mucho o `null`.
   - `editarAvatarComunidad` en `data/socialSupabase.ts` y en la interfaz de `servicio.ts`, con test de contrato en `socialSupabase.test.ts`.
   - Imitar la RPC en `scripts/ui/supabase-falso.mjs`.
6. **UI.**
   - El escudo pinta la imagen si `leerAvatarComunidad` la reconoce y, si no, el monograma. En el primitive `Avatar`, `arte` tiene que respetar `forma="cuadrado"` (sin `rounded-pill`).
   - Para elegir, una Sheet «Imagen de la comunidad» con una rejilla de botones `aria-pressed`, como `ElegirAvatar`, y «Sin imagen» para volver al monograma.
   - Se abre desde «Crear comunidad» y desde «Más acciones» › «Cambiar imagen» (solo el creador; la tarea se abre en `onExited`, como las demás).
   - Reglas de UI de `CLAUDE.md`: tokens y primitives, controles de 44 px, 320/375/430 px y los dos temas.
7. **Documentos.**
   - ADR nuevo `docs/decisiones/062-imagen-de-comunidad.md`, que cambia la frase del ADR 047 «Las comunidades conservan su monograma».
   - `features/social.md`: Comunidades, Avatar y la tabla de migraciones con 0028.
   - `DESIGN-SYSTEM.md`: el Avatar de las comunidades.
   - `roadmap.md`: quitar el punto 23.
   - Una entrada en `PROCESO.md` (siguiente número tras §286).
8. **Validación.**
   - `npm run test` y `npm run build` en verde.
   - Navegador solo en `http://appfit-test.localhost:5174`, con `node scripts/ui/supabase-falso.mjs` y `VITE_SUPABASE_URL=http://127.0.0.1:54329 VITE_SUPABASE_PUBLISHABLE_KEY=falsa npx vite --port 5174 --strictPort --host 127.0.0.1`.
   - Enseñar a Víctor capturas de la lista, la portada, la hoja de elegir y «Crear comunidad», antes de cerrar.
   - Víctor ejecuta 0028 a mano en el SQL Editor del proyecto real. Hasta entonces, el cliente nuevo tiene que funcionar sin la columna: sin `avatar`, monograma.

## Avisos

- `scripts/ui/validar-social.cjs` se queda al empezar en la hoja de bienvenida de la app («Genial»), que no cierra. Arréglalo o pruébalo a mano.
- Rama `feat/avatares-comunidades` desde `master`, PR a `master` y commits en inglés con estilo convencional.
