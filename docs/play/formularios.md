# Formularios de Play Console

Respuestas para Play Console › Política › Contenido de la app, a partir de lo que hace hoy el código ([`../seguridad.md`](../seguridad.md), [`../features/cuenta.md`](../features/cuenta.md), [`../features/social.md`](../features/social.md), [ADR 061](../decisiones/061-mensajes-al-creador.md)) y de la política de privacidad ([`public/privacidad.html`](../../public/privacidad.html)). Los nombres de los campos son los de Play en español a 2026-11-06 y pueden variar un poco. La ficha está en [`ficha.md`](ficha.md).

Si cambia lo que sale del móvil, hay que actualizar a la vez este documento, la política de privacidad y el formulario de Seguridad de los datos.

## Decisiones (Víctor, 2026-11-06)

1. **Acceso a la app para la revisión.** La cuenta entra con un código que llega por correo, así que el revisor de Google no puede entrar con un usuario y contraseña fijos. Se explica que la app funciona entera sin cuenta y que la cuenta se crea con cualquier email (§ Acceso a la app). Si Play lo rechaza, la alternativa es darle un buzón de prueba.
2. **Clasificación de contenido y alcohol.** El catálogo permite registrar bebidas alcohólicas como cualquier alimento. Se contesta que hay referencias al alcohol, sin fomentar su consumo. Puede subir la clasificación (PEGI 12 o similar), lo que no importa en una app para 16 años o más.

## Política de privacidad

- URL: `https://cumbrafit.app/privacidad`

## Acceso a la app

- Opción: **Toda la funcionalidad, o parte de ella, está restringida**.
- Instrucciones (copiar):

```
Cumbra Fit funciona entera sin cuenta: nutrición, gimnasio, actividades y progreso se usan al abrirla, sin registrarse.
La cuenta es opcional y solo hace falta para la copia en la nube y para Social. Se crea con cualquier email desde Ajustes › Cuenta › Entrar o crear cuenta: llega un código de 6 cifras por correo, sin contraseña ni invitación. La parte de Social está en el menú de secciones › Social.
```

## Anuncios

- ¿La app contiene anuncios? **No**.

## Clasificación de contenido

- Correo para la clasificación: `[CORREO DE CONTACTO]`.
- Categoría: **Todos los demás tipos de apps** (no es un juego ni una app de noticias o redes sociales en sentido estricto; Social es una parte opcional).
- Respuestas:

| Pregunta | Respuesta |
|---|---|
| Violencia, miedo, contenido sexual, lenguaje malsonante | No |
| Sustancias controladas (alcohol, tabaco, drogas) | Referencias, sin fomentar su consumo: se pueden registrar bebidas alcohólicas como alimento (decisión 2) |
| Juegos de azar o apuestas | No |
| ¿Los usuarios pueden interactuar o intercambiar contenido? | **Sí**: publicaciones, comentarios, ánimos y comunidades (Social, opcional y con cuenta) |
| ¿Se comparte la ubicación del usuario con otros? | No (el recorrido GPS nunca se publica) |
| ¿Se pueden comprar bienes digitales? | No |
| ¿Hay moderación? | Sí: denunciar perfiles, publicaciones, comentarios y comunidades, bloquear y silenciar; revisión manual de las denuncias ([`../features/social.md`](../features/social.md)) |

## Público objetivo y contenido

- Franjas de edad: **16-17** y **18 o más** (16 años o más para toda la app, [ADR 065](../decisiones/065-textos-legales-y-edad-minima.md)).
- ¿Puede atraer a niños por error? **No**.
- Con esto la app queda fuera del programa para familias.

## Apps de noticias, de salud pública (COVID-19) y gubernamentales

- No, no y no.

## Funciones financieras

- Ninguna.

## Apps de salud

Play pide esta declaración a las apps de la categoría Salud y bienestar.

- Funciones: **actividad física y ejercicio**, **nutrición y control del peso**, y **registro de datos de salud** (peso, medidas, agua) para la propia persona.
- ¿Es un dispositivo médico o da diagnósticos o tratamientos? **No**. Las estimaciones son orientativas y las condiciones lo dicen ([`public/condiciones.html`](../../public/condiciones.html) § 3).
- ¿Usa Health Connect? **No**.

## Seguridad de los datos

### Resumen

| Pregunta | Respuesta |
|---|---|
| ¿La app recoge o comparte alguno de los tipos de datos de usuario obligatorios? | **Sí** (solo con cuenta, y Social o «Comunicar un problema» si se usan) |
| ¿Todos los datos de usuario recogidos se cifran en tránsito? | **Sí** (HTTPS) |
| ¿Ofreces una forma de solicitar que se eliminen los datos? | **Sí**: en la app y en `https://cumbrafit.app/borrar-cuenta` |

**Lo que no se declara, y por qué:**
- **Los registros del móvil** (comidas, entrenos, actividades y recorridos GPS, peso, medidas): no salen del dispositivo.
- **La copia de la cuenta**: va cifrada de extremo a extremo con una clave que solo tiene la persona. Play exime de declarar los datos que nadie más que el emisor y el receptor puede leer, y aquí son la misma persona. Ni el desarrollador ni Supabase pueden leerla ([`../features/cuenta.md`](../features/cuenta.md) § Reglas).
- **El código de barras que se consulta en Open Food Facts**: es el número de un producto, no un dato de la persona, y lo pide el propio móvil.
- **La dirección IP** que ven Cloudflare (al servir la app) y Open Food Facts: no se usa para ubicar a nadie ni se guarda como dato de la persona.
- **Social**: lo que la persona publica para sus seguidores o una comunidad lo comparte ella a propósito. Play no lo cuenta como «compartido» con terceros. Supabase y Brevo tratan los datos por encargo del desarrollador, así que tampoco cuentan como compartidos.

### Tipos de datos

Todos son **recogidos**, **no compartidos**, **no efímeros** y **opcionales** (sin cuenta no se recogen). Ninguno se usa para publicidad, personalización ni analítica de terceros.

| Categoría › tipo | Qué es en Cumbra Fit | Finalidades |
|---|---|---|
| Información personal › Dirección de correo electrónico | El email de la cuenta | Funcionalidad de la app, gestión de la cuenta |
| Información personal › Nombre | El nombre opcional del perfil de Social | Funcionalidad de la app |
| Información personal › ID de usuario | El alias de Social | Funcionalidad de la app, gestión de la cuenta |
| Salud y forma física › Información sobre forma física | Entrenos, actividades (sin recorrido), logros, rutinas y semana que la persona publica en Social, y el resumen de la semana en compañía | Funcionalidad de la app |
| Mensajes › Otros mensajes en la aplicación | Comentarios en Social | Funcionalidad de la app |
| Actividad en la aplicación › Interacciones con la aplicación | Ánimos, seguimientos y el último día de uso (para borrar las cuentas sin uso en 12 meses) | Funcionalidad de la app, gestión de la cuenta |
| Actividad en la aplicación › Otro contenido generado por el usuario | Textos publicados, biografía, comunidades, denuncias y mensajes de «Comunicar un problema» y «Proponer un alimento» | Funcionalidad de la app; las denuncias, también prevención de fraude, seguridad y cumplimiento |
| Información y rendimiento de la aplicación › Diagnóstico | Los datos técnicos del informe de «Comunicar un problema» (versión, navegador, pantalla, conexión, último error), solo al enviarlo | Analíticas (para corregir errores) |

**No se marcan:** ubicación (aproximada y precisa: el GPS es local), información de salud (peso, medidas y nutrición solo salen en la copia cifrada), información financiera, fotos y vídeos, audio, archivos, calendario, contactos, historial web, apps instaladas, historial de búsqueda e identificadores del dispositivo.

### Prácticas de seguridad

- Cifrado en tránsito: **Sí**.
- Borrado: en la app (Ajustes › Cuenta › Gestionar la cuenta › Borrar la cuenta) y con la URL de abajo.
- Revisión de seguridad independiente: **No**.
- Cumple la política de familias: no aplica (público de 16 años o más).

## Eliminación de la cuenta

- URL para solicitar la eliminación: `https://cumbrafit.app/borrar-cuenta`.
- ¿Se pueden eliminar datos sin eliminar la cuenta? **Sí**: publicaciones, comentarios y el perfil de Social desde la app; la copia de la nube, por correo ([`public/borrar-cuenta.html`](../../public/borrar-cuenta.html)).

## Permisos

- **Ubicación precisa**: solo con la app en primer plano, mientras se graba una actividad (la TWA delega la ubicación, `android/twa-manifest.json`). No hay ubicación en segundo plano, así que no hace falta la declaración de ubicación.
- **Cámara**: la pide la página para el escáner a través del navegador que hay dentro de la app; no hay permiso propio de Android.
- **Notificaciones**: no se piden (`enableNotifications: false`).

## Estado de comerciante (normativa europea)

- **No soy comerciante**: la app es gratuita y no genera ingresos ([`../despliegue.md`](../despliegue.md) § Situación legal y fiscal). Si algún día los genera, se cambia aquí y se consulta antes con un gestor.

## Prueba cerrada

- Requisito de las cuentas personales nuevas: **12 testers o más durante 14 días seguidos** antes de pasar a producción. Si baja de 12, el contador vuelve a empezar. Mejor reunir 15 o más.
- Lista de testers por correo (cuentas de Google) en Play Console › Pruebas › Prueba cerrada.
