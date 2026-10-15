# 040 — Parte social: seguir, publicar y comentar

- **Estado**: aceptada el 2026-10-15, en implementación (plan y fases en [`../social.md`](../social.md)). Matiza el [ADR 039](039-cuentas-y-copia-cifrada.md): la cuenta deja de ir unida a la copia cifrada.
- **Historia**: conversación del 2026-10-15 (opciones, coste en Supabase y límites del plan gratuito).

## Contexto

Víctor quiere un componente social al estilo de Strava: tener tu cuenta, seguir a otras personas y ver e interactuar con lo que hacen. Hasta ahora la cuenta solo guarda una copia cifrada en el móvil que nadie más puede leer (ADR 039). Lo social exige lo contrario: que otras personas lean algo tuyo. Además, tiene que costar 0 € mientras la app sea gratis.

## Decisión

- **Privado por defecto, publicar a propósito.** Los registros siguen en el móvil y en la copia cifrada, sin cambios. Al terminar un entreno o una actividad, la app propone publicar un **resumen**, hecho por una función pura con los datos del registro. La persona ve la vista previa y lo confirma; si no, no sale nada. Solo ese resumen sube en claro.
- **Qué se puede publicar:** entrenos de gimnasio (duración, volumen, ejercicios, récords y ascensos de liga), actividades **sin el recorrido GPS** (tipo, distancia, tiempo, ritmo y desnivel), y logros y ligas (Vitrina, ciclos de Élite, cumbres). **Nunca** nutrición, peso, medidas ni perfil.
- **Quién lo ve:** solo los **seguidores que la persona aprueba**. No hay perfiles ni publicaciones públicas.
- **Interacción:** una reacción y comentarios de texto. La reacción se llama **«Ánimo» de forma provisional**: en el código y en la base de datos es `reacciones`, así que cambiar el nombre solo toca los textos.
- **Encontrar a alguien:** por su **alias exacto** o con su **código de invitación**. No hay buscador por nombre ni sugerencias.
- **La cuenta es independiente de la copia cifrada.** Entrar con email y código basta para lo social; la copia (con su contraseña) sigue siendo opcional y aparte.
- **Edad mínima: 16 años**, con aceptación expresa al activar lo social. Pendiente de confirmar con alguien de legal.
- **Infraestructura gratuita:** el mismo proyecto de Supabase (plan gratuito). Todo lo social va por funciones de Postgres con `security definer`, sin acceso directo a las tablas desde la app. Solo texto y cifras: sin fotos, sin recorridos y sin tiempo real.
- **Los datos sociales viven en el servidor.** No entran en Dexie ni en el backup; el registro local solo guarda, como mucho, el id de su publicación.
- **Ahorro de espacio:** la copia anterior (`datos_anterior`) se guarda 7 días, y las cuentas sin actividad durante 12 meses se borran con todo lo suyo. La app lo explica en Ajustes y en la política de privacidad.

## Alternativas descartadas

- **Supabase Pro desde el principio** (25 $ al mes): no hace falta mientras quepa en el plan gratuito. Se cambia desde el panel, sin tocar código.
- **Cloudflare Workers + D1**: no se pausa, pero obliga a escribir y proteger una API propia sin la RLS de Supabase.
- **Copias cifradas en Cloudflare R2**: multiplica el espacio, pero es un servicio nuevo. Queda como siguiente paso si el plan gratuito se queda corto.
- **Perfiles públicos y buscador abierto**: más alcance, pero más moderación y más exposición.
- **Publicar automáticamente**: es fácil compartir algo sin querer.
- **Recorridos GPS**: revelan dónde vive o entrena la persona. Si algún día se publican, será con una zona privada que recorte el principio y el final.
- **Fotos**: gastan el espacio y el tráfico del plan gratuito y exigen moderar imágenes.
- **Notificaciones push**: necesitan un servicio de envío; de momento, avisos dentro de la app.

## Consecuencias

- **Sale texto en claro del móvil**, aunque solo lo que la persona publica y solo para sus seguidores. Cambian la regla de red de `CLAUDE.md`, el README, la política de privacidad y la ficha de datos de Google Play. También cambia el mensaje de `despliegue.md` («sin cuentas, sin nube»): la app sigue funcionando entera sin cuenta.
- **Lo social funciona solo con conexión.** El resto de la app, igual que antes.
- **Moderación:** alias y comentarios los escriben las personas. Hay que poder bloquear y denunciar desde el primer día, y Víctor revisa las denuncias.
- **Legal:** se tratan datos personales y probablemente de salud (actividad física) de terceros, con consentimiento expreso, edad mínima, derecho a borrar y a llevarse los datos.
- **Plan gratuito:** 500 MB de base de datos (el límite real son las copias cifradas: medidas el 2026-10-15, la mayor ocupa 20 kB, así que caben miles de personas aunque crezcan varias veces), 5 GB de tráfico al mes, **sin copias de seguridad** de lo social y pausa tras 7 días sin actividad. Se amplía en este orden: ahorrar espacio, copias en R2, Supabase Pro.
- **Borrar la cuenta** borra todo lo social en cascada. Borrar una publicación borra sus reacciones y comentarios.
