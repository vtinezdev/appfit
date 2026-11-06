# Auditoría de seguridad y bugs (noviembre de 2026)

Revisión por áreas antes de publicar en Google Play. Cada área se revisa leyendo el código y trazando un camino concreto de ataque o de fallo; solo cuenta lo que se confirma con un test o una prueba. Lo pequeño se arregla en la PR de la auditoría; lo que depende de Víctor o de sus paneles queda abajo, en «Para Víctor». Histórico de la auditoría: este archivo y `docs/PROCESO.md` § 331 en adelante.

## Áreas

| # | Área | Estado |
|---|---|---|
| 1 | Supabase: RLS, funciones `security definer`, permisos, entradas de las RPC y frenos | Revisada (2026-11-06) |
| 2 | Cuenta: cifrado de la copia, PBKDF2, sesión, código OTP, borrado | Revisada (2026-11-06) |
| 3 | Validación de entradas: importar backup, GPX/FIT, Open Food Facts, datos de Social | Revisada (2026-11-06) |
| 4 | XSS y renderizado de contenido de terceros | Revisada (2026-11-06) |
| 5 | Cabeceras y CSP | Revisada (2026-11-06) |
| 6 | Dependencias (npm audit, versiones) | Revisada (2026-11-06) |
| 7 | Service worker y caché | Revisada (2026-11-06) |
| 8 | Almacenamiento local y datos sensibles | Revisada (2026-11-06) |
| 9 | Lógica de negocio: fechas, cálculos, casos límite | Revisada (2026-11-06) |
| 10 | Recorridos de error | Revisada (2026-11-06) |

## 1. Supabase

Método: las 31 migraciones cargadas en PGlite (PostgreSQL 17 en WASM) y consultas al catálogo (`pg_class`, `pg_policies`, `pg_proc`, `pg_constraint`), más lectura de las 79 funciones que la app puede ejecutar.

Comprobado sin problemas:
- Las 21 tablas tienen RLS. La app solo puede leer directamente `copias` (su fila, por la política «cada usuario lee su copia») y no escribe directamente en ninguna.
- Ninguna función `security definer` deja el `search_path` sin fijar.
- Sin sesión solo se ejecuta `enviar_mensaje_creador`, con freno por cuenta y global.
- Toda función que la app puede ejecutar mira la sesión, directamente o a través de `social_yo`, `social_admin_yo` o `social_publicar`. Las dos que no (`crear_comunidad` de 3 argumentos y `feed` de 2) solo llaman a su versión completa, que sí la mira.
- Textos y JSON de Social tienen tope en la tabla (perfil, publicaciones 8 KB, comentarios, comunidades, denuncias, mensajes). Las listas que llegan como array se recortan (60 alias, 30 publicaciones) y las páginas, a 30 filas.
- Frenos por día: 30 publicaciones, 5 comunidades, 20 denuncias, 20 invitaciones a compañía; mensajes al creador, 5 por hora y 300 en total.

Arreglado:
- **Las claves de la copia no tenían tope** (confirmado: `subir_copia` guardaba 20 MB en `claves` con una copia de 3 bytes, saltándose el tope de 30 MB, que solo mide `datos`). `0031_copias_tope_de_claves.sql` limita `claves` a un objeto de 2 KB (las reales ocupan unos 400 bytes) y hace que `tamano` cuente bytes. Prueba: `supabase/pruebas/copias.sql` (falla sin 0031). **Víctor tiene que ejecutar 0031** en el SQL Editor.

## 2. Cuenta

Comprobado sin problemas:
- Cifrado con Web Crypto: clave de datos AES-GCM de 256 bits por cuenta, IV aleatorio de 12 bytes en cada copia, envolturas con PBKDF2-SHA256 de 600 000 iteraciones y sal propia. AES-GCM autentica la copia y las envolturas: una copia o unas claves cambiadas en el servidor no se abren, fallan.
- Clave de recuperación de 100 bits sin sesgo (32 símbolos con bytes de 0 a 255). La clave de datos se guarda en el móvil como no exportable y no entra en el backup.
- Cerrar sesión revoca la sesión de ese móvil en Supabase y borra el vínculo. Borrar la cuenta borra `auth.users`, y todas las tablas con datos de la persona se borran en cascada; las denuncias y los mensajes quedan sin vínculo, como dicen los textos legales.

Arreglado:
- **Otro móvil empieza de cero y este se quedaba atascado** (confirmado con dos móviles en `copiaNube.test.ts`). Con la cuenta abierta en el móvil A, «Empezar de cero» en el B vuelve a cifrar la copia con una clave nueva. A no podía abrirla y se quedaba en «La copia de la nube no se puede leer con esta clave» en cada intento, en vez de pedir volver a entrar. Además, en un conflicto, `resolverConflicto('subir')` habría subido lo de A con la clave vieja, y la nube habría quedado con una copia que la contraseña nueva no abre (la pantalla lo impedía de rebote, porque fallaba antes al leer los resúmenes). Ahora A pasa a «perdida» («Vuelve a entrar») y nunca sube con una clave que ya no abre la copia.

Visto y aceptado: con una contraseña de 8 caracteres, quien robara la base de datos podría probar contraseñas contra las claves sin límite (600 000 iteraciones lo hacen lento, no imposible). Es el precio de no guardar nada legible en el servidor.

## 3. Validación de entradas

Comprobado sin problemas:
- **Social:** todo lo que llega de otras personas pasa por lectores que rechazan o normalizan (`social/lib/feed.ts`, `publicacion.leerResumen`). Nueva prueba `publicacion.hostil.test.ts`: 40 000 resúmenes válidos con un campo cambiado por un valor hostil (`null`, `NaN`, textos de 5000 caracteres, `__proto__`…). Ninguno hace fallar la lectura ni la presentación, y lo que se acepta tiene cifras finitas.
- **FIT:** el lector binario no lee fuera del archivo (un archivo cortado da «El FIT está cortado») y siempre avanza, así que no se queda en un bucle.
- **Open Food Facts:** solo se envía el código de barras normalizado (solo cifras), con un tiempo máximo de 10 s.

Arreglado:
- **Actividades muy largas** (confirmado con GPX, TCX y FIT de 150 000 puntos, unos 14 MB, por debajo del tope de 25 MB). `Math.max(...lista)` desbordaba la pila con más de unos 120 000 puntos: el archivo daba «No se ha podido leer». El mismo fallo estaba en el dibujo del recorrido, que también usa la grabación en curso sin simplificar (una grabación de más de 35 horas acababa en la pantalla de fallo). Ahora `geo.extremos` lo hace con un bucle.
- **Valores imposibles de Open Food Facts.** OFF lo edita cualquiera y trae erratas (kJ escritos como kcal, una cifra de más). Un producto con 1628 kcal por 100 g se guardaba solo y se sumaba al día. Ahora un valor imposible cuenta como desconocido, con los mismos límites que el catálogo empaquetado: el producto pasa a revisión y la persona escribe esa cifra. Los nombres y las marcas se recortan a 120 caracteres.

Visto y aceptado: importar un backup comprueba que sea de Cumbra Fit y que cada tabla sea una lista, pero no revisa la forma de cada registro. Un archivo editado a mano con registros rotos podría romper alguna pantalla. Solo afecta a los archivos de la propia persona, y la importación es de todo o nada.

## 4. XSS y contenido de terceros

Comprobado sin problemas:
- No hay `dangerouslySetInnerHTML`, `eval`, `new Function` ni `document.write`. El único `innerHTML` lee un SVG propio ya pintado, para el póster.
- Los textos de la persona en los pósteres (SVG a PNG) se escapan con `escaparXml`, y un SVG cargado como imagen no ejecuta scripts.
- De Social no llega ninguna URL: avatares e imágenes de comunidades salen de una lista cerrada de recursos de la app. El alias solo admite `a-z 0-9 . _`. Los enlaces externos son fijos (fuentes de Referencias), con `rel="noopener noreferrer"`.
- Ni la app ni las páginas estáticas tienen scripts en línea. El tema inicial es un archivo propio.

Visto y aceptado: el nombre visible de Social (de 1 a 40 caracteres) admite cualquier texto, así que alguien podría ponerse «Cumbra Fit». Para eso están la denuncia por suplantación y la moderación.

## 5. Cabeceras y CSP

Comprobado sin problemas: CSP con `default-src 'self'` y sin scripts en línea ni `eval` (solo `'wasm-unsafe-eval'`, para el escáner), `object-src 'none'`, `frame-ancestors 'none'`, `base-uri` y `form-action` en `'self'`, HSTS, `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, COOP y `Permissions-Policy`, con la cámara y la ubicación solo para la app. Lo vigilan `cabeceras.test.ts` y, en la CI, `validar-seguridad.cjs`.

Endurecido: `connect-src` permitía cualquier proyecto de Supabase (`*.supabase.co`). Si alguna vez se colara un script, podría enviar datos a un proyecto de otra persona. Ahora la build lo cambia por el proyecto de `VITE_SUPABASE_URL` (`shared/seguridad/cspSupabase.ts` y el plugin `appfit-csp-supabase`). Comprobado con `vite build`: sin la variable queda el comodín y con ella, el proyecto exacto.

## 6. Dependencias

Comprobado sin problemas: `npm audit --omit=dev` (lo que llega al móvil) no da ninguna vulnerabilidad, y la CI lo vigila.

Arreglado (herramientas de desarrollo): había 2 vulnerabilidades altas y 11 más.
- **vite 8.3.1 → 8.3.5:** `launch-editor` podía ejecutar órdenes en Windows al abrir un archivo desde el error del servidor de desarrollo. Te afecta porque trabajas en Windows.
- **vitest 5.0.2 → 5.0.5:** inyección de código en `@vitest/mocker`.
- **source-map-js, fast-uri, postcss-selector-parser y serialize-javascript**, versiones nuevas.

Todas las versiones elegidas se publicaron hace más de dos semanas. Las más recientes (vite 8.3.6, vitest 5.1.0) tenían de 1 a 4 días y quedan para más adelante. Quedan 6 vulnerabilidades moderadas o bajas de `workbox-build` (por `vite-plugin-pwa`), que solo procesan nuestros archivos al construir. `vite` y `vitest` van fijados a una versión exacta por un fallo de npm 10 al actualizarlos (`seguridad.md` § Dependencias).

## 7. Service worker y caché

Comprobado sin problemas: solo se precachean archivos propios (209, unos 4 MB). Las imágenes de ejercicios, los lugares y el `.wasm` del escáner se guardan al usarlos. Ninguna respuesta de Supabase ni de Open Food Facts pasa por la caché, y `version.json` se pide con `no-store`. Una versión nueva solo se aplica cuando la persona la acepta (`registerType: 'prompt'`); en Android, sola al volver a abrir la app.

## 8. Almacenamiento local y datos sensibles

Comprobado sin problemas: en `localStorage` solo están la sesión de Supabase (lo normal en supabase-js), el tema, el fondo y el descanso habitual. La clave de datos está en una base aparte, como no exportable: no sale ni en el backup ni en «Borrar registros». Cerrar sesión borra la sesión y el vínculo, y las cachés en memoria de Social (avatares y si eres administrador) se reinician al entrar en Social o Amigos, por si cambió la cuenta. No hay cookies.

## 9. Lógica de negocio

Comprobado sin problemas:
- Los 3.223 tests pasan en UTC, Europe/Madrid, Atlantic/Canary, America/Los_Angeles, Pacific/Pago_Pago (UTC−11) y Pacific/Kiritimati (UTC+14).
- Una prueba de propiedades sobre todos los días de 2019 a 2031 (sumar días, inicio de semana en lunes, semanas y meses seguidos) pasa en Madrid, en São Paulo (cambio de hora a medianoche) y en UTC+14. Las cuentas de días usan `Math.round` o tiempo transcurrido, así que no les afecta el cambio de hora.
- Energía: suelo de kcal (el mayor entre el gasto en reposo y el mínimo), límites de edad, altura y peso, sin déficit con un IMC bajo y aviso de ritmo alto. Récords, progresión y cargas comprueban las listas vacías antes de `Math.max`.

Arreglado: un test dependía de la zona horaria (`feed.test.ts`, una hora en UTC que en UTC+14 ya es otro día). La app estaba bien: muestra el día local.

Visto y aceptado: las ecuaciones de energía son para 18 años o más y la app para 16 o más. Entre 16 y 17 la app funciona, pero no calcula objetivos (lo dice en pantalla).

## 10. Recorridos de error

Comprobado sin problemas:
- Arranque: si la base de datos no abre, sale «No se han podido abrir tus registros» con Reintentar. Un fallo al pintar sale en la pantalla de fallo, con Recargar.
- Errores sueltos y promesas sin capturar se anotan para el informe de «Comunicar un problema», sin mensajes ni datos.
- El catálogo se descarga y se valida antes de importarlo, fuera de las transacciones: un fallo a medias no deja un catálogo roto.
- El GPS y la cámara sin permiso dan un mensaje que dice qué hacer. Open Food Facts lento corta a los 10 s. Los errores de Supabase se traducen: sin conexión, servidor caído, sesión caducada, demasiados códigos.

Arreglado: una copia por encima del tope del servidor (30 MB cifrada) daba «No se ha podido conectar con tu cuenta. Inténtalo de nuevo», y reintentar no servía nunca. Ahora dice que es demasiado grande y que se guarde una copia en el móvil (`nubeSupabase.traducir`, con test).

Visto y aceptado: con la app abierta en dos pestañas del navegador, si una se actualiza y cambia la base de datos, la otra acaba en la pantalla de fallo y se arregla con «Recargar». En la app de Android hay una sola ventana.

## Resumen

Revisadas las 10 áreas. Arreglado en la PR: el tope de las claves de la copia (0031, que tienes que ejecutar), el atasco cuando otro móvil empieza de cero, las actividades de más de 35 horas, los valores imposibles de Open Food Facts, la CSP con el proyecto de Supabase exacto, las dependencias de desarrollo vulnerables, un test que dependía de la zona horaria y el mensaje de una copia demasiado grande. Nuevas pruebas: la suite SQL de la copia, la prueba de 40 000 publicaciones hostiles y las de actividades largas.

## Para Víctor

1. **Ejecutar `supabase/migrations/0031_copias_tope_de_claves.sql`** en el SQL Editor del proyecto (después de 0030). La app no cambia.
2. **Espacio por cuenta (decisión).** Cada cuenta puede ocupar hasta 60 MB en la base de datos (la copia, hasta 30 MB, y la anterior, otros 30 MB, que se borra cuando la copia lleva 7 días sin cambiar), y las cuentas se crean con cualquier email. Con el plan gratuito de Supabase (500 MB de base de datos) bastan unas pocas cuentas hechas a propósito para llenarla. Opciones: bajar el tope de la copia (por ejemplo, a 10 MB, si las copias reales quedan muy por debajo; la tuya se puede ver en Table Editor › `copias` › `tamano`), activar CAPTCHA en Authentication › Attack Protection (pide un cambio en la app y un servicio externo nuevo en la CSP), o vigilar el uso en el panel. Dime cuál prefieres.
3. **Panel de Supabase › Authentication › Rate Limits:** revisar los límites de envío de correos y de verificación del código (ya estaba en `seguridad.md` junto a la caducidad de 600 s).
4. **Suspendidos que vuelven con el mismo email (decisión).** Una suspensión de Social (`vetados`) se borra con la cuenta. Así, quien está suspendido puede borrar su cuenta, crearla otra vez con el mismo email y hacerse un perfil nuevo. Para impedirlo habría que guardar, tras borrar la cuenta, una huella (hash) del email de quien fue suspendido, y decirlo en la política de privacidad. Con otro email podría volver igualmente. ¿Lo hago, o lo dejas así?
5. **Cerrar la sesión en todos los dispositivos (propuesta).** Si te roban el móvil, ahora no hay forma de cerrar la sesión que quedó abierta en él. Supabase lo permite (`signOut` global); sería un botón en Gestionar la cuenta. ¿Lo añado?
6. **Pantalla de fallo sin salida (propuesta).** Si una pantalla falla, `FalloAplicacion` solo ofrece «Recargar». Si el fallo se repite en cada arranque, no hay forma de llegar a Ajustes para exportar o importar una copia. Propongo añadir en esa pantalla «Exportar una copia de seguridad», que no toca nada. ¿Lo añado?
7. **Comprobar la CSP tras el próximo despliegue.** Abre la app publicada, entra en la cuenta y mira que la copia se guarda. Si algo falla con «Content Security Policy» en la consola, avísame: querría decir que Cloudflare no pasa `VITE_SUPABASE_URL` a la build como espero.
