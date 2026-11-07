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
- **Las claves de la copia no tenían tope** (confirmado: `subir_copia` guardaba 20 MB en `claves` con una copia de 3 bytes, saltándose el tope de 30 MB, que solo mide `datos`). `0032_copias_tope_de_claves.sql` limita `claves` a un objeto de 2 KB (las reales ocupan unos 400 bytes) y hace que `tamano` cuente bytes. Prueba: `supabase/pruebas/copias.sql` (falla sin 0032). **Víctor tiene que ejecutar 0032** en el SQL Editor.

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

Revisadas las 10 áreas. Arreglado en la PR: el tope de las claves de la copia (0032, que tienes que ejecutar), el atasco cuando otro móvil empieza de cero, las actividades de más de 35 horas, los valores imposibles de Open Food Facts, la CSP con el proyecto de Supabase exacto, las dependencias de desarrollo vulnerables, un test que dependía de la zona horaria y el mensaje de una copia demasiado grande. Nuevas pruebas: la suite SQL de la copia, la prueba de 40 000 publicaciones hostiles y las de actividades largas.

## Segunda ronda (2026-11-06)

Después de fusionar `master` (gratis y de pago, ADR 068). **La migración del tope de las claves pasa a ser la 0032**, porque la 0031 ya es la de desbloqueos y está ejecutada en el proyecto real.

| # | Área | Estado |
|---|---|---|
| 11 | Gratis y de pago: prueba, bloqueo, desbloqueos | Revisada |
| 12 | Privacidad de Social en el servidor: solicitudes, seguidores quitados, comunidades | Revisada |
| 13 | Copia en la nube con dos versiones de la app | Revisada |
| 14 | Configuración de Android (TWA) y Play Billing | Revisada |
| 15 | Textos legales frente a lo que hace el código | Revisada |
| 16 | Importar un backup con registros mal formados | Revisada |
| 17 | Caracteres invisibles en nombres y textos de Social | Revisada |
| 18 | Exportar a CSV y parámetros de la dirección | Revisada |
| 19 | Contraseña de la copia y carreras entre móviles | Revisada |
| 20 | El bloqueo de pago cubre todas las formas de escribir | Revisada |

### Tercera ronda (2026-11-07)

| # | Área | Estado |
|---|---|---|
| 21 | Guardados que fallan sin avisar | Revisada |
| 22 | Rendimiento con años de datos | Revisada |
| 23 | Entreno en curso cuando el sistema cierra la app | Revisada |

### 11. Gratis y de pago

Comprobado sin problemas: `mi_desbloqueo` solo mira la fila de quien llama, `admin_desbloquear` y `admin_desbloqueados` exigen administrador (`social_admin_yo`) y la tabla `desbloqueos` está cerrada (RLS sin políticas ni permisos). Un desbloqueo por compra no se puede quitar desde la administración.

Visto y aceptado: el bloqueo vive en el móvil, así que quien sepa abrir las herramientas de Chrome en la app puede saltárselo (poniendo `appfit-desbloqueo` en `localStorage`, o borrando los registros para reiniciar la prueba). Pasa con cualquier bloqueo local, y la parte 3 (Play Billing) lo hará con la compra de Play.

### 12. Privacidad de Social en el servidor

Comprobado en PGlite, con tres cuentas: con la solicitud pendiente no se ve ni el feed ni las publicaciones, ni se puede comentar, dar ánimo o denunciar. Al quitar a un seguidor, pierde el acceso al momento. Quien no es miembro de una comunidad no ve sus publicaciones ni sus comentarios, y el expulsado tampoco. Las cuotas diarias documentadas (publicaciones, comentarios, solicitudes, denuncias, comunidades, invitaciones) están en cada función.

### 13. Copia en la nube con dos versiones de la app

Arreglado (confirmado con dos móviles en `copiaNube.test.ts` y en `backup.test.ts`): las tablas nuevas del backup se añaden sin subir `BACKUP_VERSION` (`variantesReceta`, el 27 de octubre), e importar ignora las que no conoce. Un móvil con la app sin actualizar (algo habitual en el iPhone, que actualiza cuando la persona acepta) traía la copia de la nube y perdía esas tablas. Al guardar el siguiente cambio, las borraba también de la nube y, de ahí, del otro móvil. Ahora una copia de un esquema más nuevo (`dbVersion`) no se trae ni se sustituye: sale «Actualiza la app en este móvil». Vale también para importar un archivo a mano.

### 14. Android (TWA) y Play Billing

Comprobado sin problemas: la clave de subida no puede entrar en el repositorio (`*.jks`, `*.keystore` y todo `android/` salvo `twa-manifest.json` y el README están en `.gitignore`) y nunca ha estado en el historial. Sin notificaciones, con ubicación solo delegada en primer plano y Play Billing activado para la parte 3. Sigue pendiente `assetlinks.json`, que espera al dominio (ya apuntado en `seguridad.md`).

### 15. Textos legales frente al código

Arreglado: la tabla `desbloqueos` (0031, ya ejecutada) guarda de una cuenta que está desbloqueada, desde cuándo y quién lo hizo, y la política de privacidad no lo decía. Ahora lo dice (§ 3.2, la base legal y el plazo), y «Borrar la cuenta» dice que también se borra. Las condiciones, la ficha de Play, `/conoce` y el formulario siguen diciendo que la app es gratis. Eso es verdad mientras el cobro esté apagado, y el ADR 068 lo cambia en la parte 3.

### 16. Backup con registros mal formados

Visto y aceptado: importar comprueba el formato del archivo y que cada tabla sea una lista, no cada registro. Unos ajustes con tipos raros no rompen el arranque (como mucho, una cifra sale «NaN»). Solo afecta a un archivo propio editado a mano, y la importación es de todo o nada. La copia de la nube no se puede manipular por el camino: va cifrada y autenticada (AES-GCM).

### 17. Caracteres invisibles en Social

Arreglado (confirmado en PGlite y en `socialSupabase.test.ts`): el servidor guardaba un nombre con U+202E (invierte el texto que sigue) y espacios de ancho cero. En la lista de avisos, «Ana · comentó tu publicación», un nombre así da la vuelta al resto de la línea, y con espacios invisibles se puede imitar el nombre de otra persona. Ahora la app quita esos caracteres de todo lo que llega de Social (`shared/lib/text.limpiarTextosRecibidos`, en `socialSupabase.ts`). Conserva los que necesitan los emojis compuestos y otros alfabetos.

### 18. CSV y parámetros de la dirección

Comprobado sin problemas: el CSV exportado pone un apóstrofo delante de los textos que empiezan por `=`, `+`, `-`, `@` o tabulador, así que un nombre de Open Food Facts como `=HIPERVINCULO(…)` no se ejecuta como fórmula al abrirlo en Excel. La app solo lee un parámetro de la dirección, `?preview=cobro` (para Víctor, punto 13).

### 19. Contraseña de la copia y carreras entre móviles

Visto y aceptado:
- **Carrera muy improbable.** Si en un móvil se cambia la contraseña justo mientras otro hace «Empezar de cero», `actualizar_claves` (sin revisión) puede dejar en la nube unas claves de la clave anterior junto a una copia cifrada con la nueva. Los datos no se pierden (el móvil que empezó de cero los tiene y sigue subiéndolos), pero un móvil nuevo no podría abrir la copia hasta repetir «Empezar de cero». Arreglarlo pide una migración que compruebe la revisión. Con una ventana de segundos y dos acciones raras a la vez, no compensa ahora.
- **Contraseñas débiles**, para Víctor (punto 14).

### 20. Cobertura del bloqueo de pago

Comprobado sin problemas: busqué en Nutrición, Perfil e Inicio los componentes que escriben en la base sin usar `useDePago`. Los que deberían estar protegidos (acciones de comida, comidas típicas, recetas y Añadir comida) se abren siempre desde botones que pasan por `proteger(...)`, en `Hoy.tsx`, `Alimentos.tsx` y las cabeceras. Los que quedan sin guarda son los que el ADR 068 deja libres: peso, medidas, agua, pasos y creatina. Ojo: agua, pasos y creatina no salen en la tabla del ADR. Si deben ser de pago, hay que decidirlo antes de encender el cobro.

### 21. Guardados que fallan sin avisar

Comprobado sin problemas: «Deshacer» avisa si falla (`useAviso`). Las series del entreno se guardan en cola por serie, con aviso de error, y borrar espera a que termine la escritura pendiente. Publicar en Social usa un id determinista (`idPara`), así que reintentar no duplica, y un fallo al apuntar la publicación en el entreno sale en la hoja.

### 22. Rendimiento con años de datos

Medido con tres años de uso intenso generados en la base de pruebas (16 425 comidas, 471 entrenos, 13 188 series, 274 actividades): el cálculo de la gamificación (`leerVitrina`) tardaba unos 1 150 ms. Es síncrono, en el hilo principal, y se repite con cada cambio de datos en casi toda la app, porque `CelebracionLogros` lo tiene suscrito siempre (salvo con un entreno abierto). Con un año, unos 350 ms.

Arreglado: el perfil de CPU señalaba `gym/lib/selectorEjercicios.catalogoDeLocal`. Para cada serie de un ejercicio antiguo sin `catalogId` (los de antes del catálogo, como los tuyos) recorría el catálogo entero normalizando cada nombre y alias. Ahora usa un índice que se construye una vez, con el mismo resultado: hay un test que lo compara con la búsqueda de antes para cada nombre y alias, y otro que comprueba que 20 000 búsquedas tardan menos de 200 ms (antes, 1,8 s). Con tres años de datos, de unos 1 150 a unos 850 ms. Lo que queda es casi todo leer la base de pruebas (fake-indexeddb, más lenta que la real). El cálculo de la app ya ronda los 30 ms.

Visto: el cálculo sigue repitiéndose con cada escritura (una comida, un vaso de agua). Para quien lleve años, conviene medirlo en un móvil real (punto 15).

### 23. Entreno en curso al cerrarse la app

Comprobado sin problemas: cada serie se guarda en la base al momento, y si está hecha va en la propia serie (`realizada`), así que sobrevive a que el sistema cierre la app o a quitarla de recientes. En `sessionStorage` solo va lo secundario (la cuenta atrás del descanso), que es lo único que se pierde.

## Para Víctor

1. **Ejecutar `supabase/migrations/0032_copias_tope_de_claves.sql`** en el SQL Editor del proyecto (después de 0031, la de desbloqueos). La app no cambia.
2. **Espacio por cuenta (decisión).** Cada cuenta puede ocupar hasta 60 MB en la base de datos (la copia, hasta 30 MB, y la anterior, otros 30 MB, que se borra cuando la copia lleva 7 días sin cambiar), y las cuentas se crean con cualquier email. Con el plan gratuito de Supabase (500 MB de base de datos) bastan unas pocas cuentas hechas a propósito para llenarla. Opciones: bajar el tope de la copia (por ejemplo, a 10 MB, si las copias reales quedan muy por debajo; la tuya se puede ver en Table Editor › `copias` › `tamano`), activar CAPTCHA en Authentication › Attack Protection (pide un cambio en la app y un servicio externo nuevo en la CSP), o vigilar el uso en el panel. Dime cuál prefieres.
3. **Panel de Supabase › Authentication › Rate Limits:** revisar los límites de envío de correos y de verificación del código (ya estaba en `seguridad.md` junto a la caducidad de 600 s).
4. **Suspendidos que vuelven con el mismo email (decisión).** Una suspensión de Social (`vetados`) se borra con la cuenta. Así, quien está suspendido puede borrar su cuenta, crearla otra vez con el mismo email y hacerse un perfil nuevo. Para impedirlo habría que guardar, tras borrar la cuenta, una huella (hash) del email de quien fue suspendido, y decirlo en la política de privacidad. Con otro email podría volver igualmente. ¿Lo hago, o lo dejas así?
5. **Cerrar la sesión en todos los dispositivos (propuesta).** Si te roban el móvil, ahora no hay forma de cerrar la sesión que quedó abierta en él. Supabase lo permite (`signOut` global); sería un botón en Gestionar la cuenta. ¿Lo añado?
6. **Pantalla de fallo sin salida (propuesta).** Si una pantalla falla, `FalloAplicacion` solo ofrece «Recargar». Si el fallo se repite en cada arranque, no hay forma de llegar a Ajustes para exportar o importar una copia. Propongo añadir en esa pantalla «Exportar una copia de seguridad», que no toca nada. ¿Lo añado?
7. **Comprobar la CSP tras el próximo despliegue.** Abre la app publicada, entra en la cuenta y mira que la copia se guarda. Si algo falla con «Content Security Policy» en la consola, avísame: querría decir que Cloudflare no pasa `VITE_SUPABASE_URL` a la build como espero.
8. **Corrección: la migración que tienes que ejecutar es `0032_copias_tope_de_claves.sql`**, no la 0031 que te dije: `master` ya tenía su 0031 (desbloqueos), ya ejecutada. Ejecútala después de esa.
9. **Perfil visible con solo pedir seguir (decisión).** Comprobado: si alguien te pide seguirte, ve tu biografía, disciplinas y logros destacados aunque no aceptes; quien no lo pide no los ve. La documentación dice «relación», y el código cuenta como relación una solicitud pendiente. Como cualquiera puede pedirte seguirte si sabe tu alias, la solicitud es casi un pase libre al perfil (hasta 50 al día). ¿Lo dejo así, o el perfil solo se ve tras aceptar? Si lo cambio, quien recibe la solicitud seguiría viendo el perfil de quien la pide.
10. **Expulsar de una comunidad no impide volver (propuesta).** Hoy la persona expulsada vuelve a unirse al momento (es lo que decidió el ADR 044, y la pantalla lo avisa). Contra el acoso dentro de una comunidad, propongo una lista de expulsados: no podrían volver a unirse salvo que un moderador los readmita. ¿Lo hago?
11. **Para la parte 3 (Play Billing):** el desbloqueo recordado se olvida en cuanto la cuenta pasa a «sin sesión», también si la sesión caduca sola y no solo al cerrar sesión a propósito. Con el cobro encendido, alguien que pagó vería el bloqueo hasta volver a entrar. Lo arreglará el desbloqueo por compra de Play; lo dejo apuntado para entonces.
12. **Antes de encender el cobro (parte 3), además de lo que dice el ADR 068:** en Play Console › Estado de comerciante tendrás que declararte comerciante, porque vender dentro de la app genera ingresos (la normativa europea). Play publica entonces en la ficha tu nombre, dirección y teléfono o email de contacto. Si no quieres que salga tu domicilio, conviene resolverlo antes (por ejemplo, con una dirección profesional), y consultarlo con un gestor, como ya dice `formularios.md`. En Seguridad de los datos habrá que marcar el historial de compras.
13. **`?preview=cobro` en producción (decisión).** Hoy cualquier enlace como `cumbrafit.app/?preview=cobro` enciende el bloqueo de pago en esa pestaña: quien lo abra ve su nutrición «bloqueada» y «Desbloquear 9,99 €» en la web, donde no se puede pagar. Es un buen anzuelo para un engaño («págame y te lo desbloqueo»). Las pruebas usan el servidor de desarrollo, así que puedo limitarlo a desarrollo sin romper nada; solo perderías probar el bloqueo en la web publicada (en la app de Play lo verías con `COBRO_ACTIVO`). ¿Lo limito?
14. **Contraseñas débiles para la copia (decisión).** Basta con 8 caracteres, y se acepta «12345678». La copia va cifrada, pero si alguien robara la base de datos de Supabase podría probar contraseñas contra las claves sin límite: las comunes caen enseguida, aunque PBKDF2 con 600 000 iteraciones las haga lentas. Propongo rechazar las contraseñas más comunes (una lista de unas 1000, dentro de la app, sin servicios externos) o pedir 10 caracteres. ¿Cuál prefieres, o lo dejamos?
15. **Medir en tu móvil (propuesta).** Con tus datos reales, abre Inicio y apunta un vaso de agua: si notas un tirón de más de medio segundo, dímelo. La solución sería recalcular el progreso con menos frecuencia (por ejemplo, una vez cuando paras de escribir) o fuera del hilo principal. Es un cambio de arquitectura y prefiero no hacerlo a ciegas.
