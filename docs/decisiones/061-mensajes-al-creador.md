# 061 — Mensajes al creador

Fecha: 2026-10-28. Estado: vigente. Amplía [ADR 001](001-pwa-local-sin-backend.md) y [ADR 039](039-cuentas-y-copia-cifrada.md) con un dato nuevo que sale del móvil en claro, solo cuando la persona lo envía.

## Contexto

«Comunicar un problema» (Ajustes) preparaba un informe para copiarlo, pero no llegaba a nadie: quien lo escribía tenía que saber adónde mandarlo. Víctor quiere recibirlo y, más adelante, que la gente pueda proponerle alimentos que faltan («Proponer un alimento»). Comparó dos vías: abrir el correo del móvil con el texto ya escrito (sin servicio nuevo, pero con una dirección pública) o enviarlo dentro de la app a Supabase, que ya usa la cuenta. Eligió Supabase.

## Decisión

- **Tabla privada** `mensajes_creador` (migración 0027): tipo (`problema` o `alimento`), texto, datos opcionales (JSON pequeño), versión de la app, usuario si hay sesión y fecha. Sin permisos de lectura ni de escritura para la app: Víctor la lee en el panel de Supabase (Table Editor), y la columna `leido` le sirve para marcar lo visto.
- **Un solo camino de entrada**: la función `enviar_mensaje_creador`, abierta también sin cuenta (rol `anon`), que valida tipo y tamaños (texto hasta 8.000 caracteres, datos hasta 4 KB) y frena abusos: 5 mensajes por cuenta y hora, y 300 en total por hora.
- **Solo lo que se ve**: se envía el texto que la persona ha revisado en pantalla (en un problema, lo que cuenta y los datos técnicos del informe: versión, navegador, pantalla, conexión y último error), y únicamente al pulsar «Enviar». Con sesión, va asociado a la cuenta para poder contestar; lo dice el pie de la pantalla.
- Cliente: `cuenta/mensajes.ts` (`envioDisponible`, `enviarAlCreador`) y `cuenta/data/mensajesSupabase` (cargado al enviar). Sin Supabase configurado, la pantalla vuelve a ofrecer solo copiar.

## Consecuencias

- La regla de red del proyecto incluye este envío: además de la copia cifrada y lo social, sale en claro lo que la persona envía expresamente al creador.
- El freno global de 300 por hora puede bloquear envíos legítimos si alguien satura la tabla; entonces la app dice que se intente más tarde. Si llega a pasar, se revisa.
- Víctor ejecuta 0027 en el SQL Editor; antes, «Enviar» dice que no se ha podido enviar.
