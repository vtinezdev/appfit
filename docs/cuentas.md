# Plan: cuentas y copia automática en la nube (octubre 2026)

Plan acordado con Víctor el 2026-10-13. Es un plan, no la fuente de verdad: lo implementado se documenta en sus documentos vivos (`arquitectura.md`, `datos.md`, `docs/features/cuenta.md`…) y aquí solo cambia el estado. Cuando esté hecho, este archivo pasa a `docs/historico/`.

## Decisión

Al abrir la app a otras personas cambia la decisión inicial de «sin backend ni cuentas» ([ADR 001](decisiones/001-pwa-local-sin-backend.md)). Lo acordado:

- **Copia automática, no sincronización en tiempo real.** Los datos siguen viviendo en IndexedDB y la app funciona igual sin conexión. Además, cuando cambian, la app sube sola una copia completa a la cuenta. En un móvil nuevo, se entra con la cuenta y se restaura. Está pensada para **un dispositivo a la vez**: si dos suben copias distintas, la app lo detecta y pregunta qué copia vale, sin pisar ninguna en silencio.
- **Supabase** (Auth + Postgres, región UE: Irlanda, eu-west-1, plan gratuito).
- **Entrar con email y código** de 6 dígitos, escrito dentro de la app. Ni enlace mágico ni redirecciones, porque en iPhone se abrirían en Safari, que tiene otro almacenamiento distinto del de la PWA.
- **Cifrado en el móvil con una contraseña** antes de subir. El servidor solo guarda datos ilegibles: ni Supabase ni Víctor pueden leer el peso, las medidas o la dieta de nadie.
- **La cuenta es opcional.** Sin ella, todo sigue como hoy (exportar e importar el JSON también se mantiene).

**Por qué copia y no sincronización.** Todas las tablas usan ids autoincrementales (`++id`) y las series, rutinas y entradas se enlazan por esos números. Sincronizar dos dispositivos obligaría a pasar el esquema a UUID y a resolver conflictos registro a registro. La copia reutiliza `exportarBackup`/`importarBackup`/`migrarBackup` (`shared/lib/backup.ts`), que ya tienen tests y manejan versiones antiguas. Si algún día hace falta la sincronización, se puede llegar a ella desde aquí sin perder datos.

## Cómo funciona

### Cifrado (todo con Web Crypto, sin dependencias)

- **Clave de datos (DEK):** AES-GCM de 256 bits, aleatoria y creada una sola vez por cuenta. Cifra la copia.
- **La contraseña no cifra los datos directamente:** con PBKDF2-SHA256 (600 000 iteraciones y sal aleatoria) se deriva una clave que **envuelve** la DEK. En la nube se guardan la DEK envuelta, la sal y las iteraciones. Así, cambiar la contraseña solo vuelve a envolver la DEK, sin recifrar la copia.
- **Clave de recuperación:** al crear la cuenta se genera un código aleatorio que también envuelve la DEK. Se muestra una sola vez para guardarlo. Si se olvida la contraseña, el código permite recuperar la copia; sin contraseña ni código, la copia de la nube se pierde (los datos del móvil siguen intactos).
- **En el móvil:** la DEK se guarda como `CryptoKey` **no extraíble** en una base IndexedDB propia del dispositivo (ver abajo), así no hay que escribir la contraseña cada vez. Solo se pide al entrar en un dispositivo nuevo.
- **Formato de la copia:** JSON del backup → gzip (`CompressionStream`) → AES-GCM con IV aleatorio → base64. Con cabecera de versión del formato cifrado.

### Datos en Supabase (SQL en `supabase/migrations/`, versionado en el repo)

- **`copias`**: una fila por usuario con `user_id` (clave), `revision` (entero), `actualizada`, `tamano`, `datos` (la copia cifrada), `datos_anterior` (la copia anterior, como red de seguridad), `dek_contrasena`, `dek_recuperacion` y `kdf` (sal e iteraciones).
- **RLS**: cada usuario solo lee y escribe su propia fila (`auth.uid() = user_id`).
- **RPC `subir_copia(revision_base, datos, …)`**: actualiza solo si `revision = revision_base`, sube la revisión, mueve la copia actual a `datos_anterior` y devuelve la revisión nueva. Si otro dispositivo subió antes, devuelve conflicto. Así la comprobación es atómica.
- **RPC `borrar_cuenta()`**: borra la fila y el usuario de Auth (Google Play exige poder borrar la cuenta desde la app).

### Estado del dispositivo (fuera del backup)

Una base Dexie aparte, `appfit-dispositivo`, que no es `db`: no entra en el backup ni en `TABLAS_USUARIO` y no se borra con «Borrar todos los datos». Guarda la DEK, la `revision` de la última copia subida o restaurada, la huella de esa copia, la fecha de la última subida y si el dispositivo está **vinculado**. Tiene que vivir fuera del backup, porque restaurar una copia no debe traer el estado de otro dispositivo. La sesión de Supabase la guarda `supabase-js` en `localStorage`.

### Cuándo se sube

- **Disparadores:** `Dexie.on('storagemutated')` (cualquier escritura) con espera de unos 15 s sin cambios, al pasar la app a segundo plano (`visibilitychange`), al arrancar y al recuperar la conexión (`online`).
- **Huella:** SHA-256 del contenido del backup sin `exportedAt`. Si coincide con la última subida, no se sube nada. Esto cubre también lo que quedó pendiente si iOS cerró la app antes de subir: al volver a abrirla, la huella ha cambiado y se sube.
- **Nunca se sube desde un dispositivo no vinculado.** Así se evita el peor caso: entrar en un móvil vacío y que su copia vacía pise la de la nube.
- `supabase-js` se carga con `import()` solo si hay sesión o al abrir «Cuenta», para no pesar en el arranque de quien no la usa.

### Flujos

1. **Crear cuenta** (Ajustes › Cuenta): email → código → la cuenta no tiene copia → crear contraseña (dos veces, con mínimo de longitud) → mostrar la clave de recuperación («La he guardado») → primera subida. El dispositivo queda vinculado.
2. **Entrar en otro dispositivo:** email → código → contraseña. Si este móvil no tiene datos, se restaura directamente. Si los tiene, se elige entre «Traer la copia de la nube» (reemplaza este móvil) y «Subir los datos de este móvil» (reemplaza la nube). Las dos opciones muestran un resumen de cada lado (fecha, comidas, entrenos) y piden `ConfirmacionDestructiva`.
3. **Uso normal:** automático. En Ajustes, una línea de estado: «Copia guardada hace 3 min», «Pendiente: sin conexión» o «Error al subir · Reintentar», y el botón «Subir ahora».
4. **Conflicto** (la nube tiene una revisión más nueva, por ejemplo de otro móvil): se para la subida automática y se ofrece la misma elección que en el paso 2.
5. **Contraseña olvidada:** entrar con la clave de recuperación y elegir una contraseña nueva. Sin clave: «Empezar de cero en la nube» borra la copia remota y sube la de este móvil.
6. **Cambiar contraseña:** pide la actual y vuelve a envolver la DEK.
7. **Cerrar sesión:** desvincula el dispositivo y borra la DEK local. Los datos del móvil se quedan, con la opción «y borrar los datos de este móvil».
8. **Borrar cuenta:** `ConfirmacionDestructiva` → `borrar_cuenta()`. Los datos del móvil se quedan.

### Lo que cambia en lo existente

- **Aviso de copia de Inicio** (`recordatorioBackup.ts`): con cuenta y una subida reciente no avisa. Si la subida lleva días fallando, avisa de eso.
- **`TrasladarDatos`** (traslado de Safari a la PWA en iPhone): con cuenta, el camino pasa a ser «Entra con tu cuenta» en lugar de exportar e importar.
- **Red:** se añade `*.supabase.co`. El service worker no la cachea: Workbox solo cachea lo que encaja en `runtimeCaching`.

## Código

Feature nueva `src/features/cuenta/`:

| Archivo | Qué hace |
|---|---|
| `lib/cifrado.ts` (+test) | derivar, envolver y desenvolver claves, cifrar y descifrar, gzip, base64 |
| `lib/huella.ts` (+test) | huella estable del backup (sin `exportedAt`) |
| `lib/decision.ts` (+test) | función pura: con el estado local y el remoto decide `nada`, `subir`, `restaurar`, `elegir` o `conflicto` |
| `data/nubeRepo.ts` | interfaz `Nube` + implementación con `supabase-js` (auth OTP, leer copia, `subir_copia`, `borrar_cuenta`); en los tests, una nube falsa en memoria |
| `data/dispositivoRepo.ts` (+test) | base `appfit-dispositivo` (DEK, revisión, huella, vínculo) |
| `sincronizador.ts` (+test con nube falsa) | disparadores, espera, subida y restauración; usa `exportarBackup`/`importarBackup` |
| `components/CuentaAjustes.tsx` | sección de Ajustes: estado, subir ahora, cambiar contraseña, cerrar sesión, borrar cuenta |
| `components/EntrarSheet.tsx` | email → código → contraseña o creación, clave de recuperación |
| `components/ElegirCopia.tsx` | elección entre la nube y este móvil (paso 2 y conflicto) |

Configuración: `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` en `.env` (son públicas: los datos los protegen la RLS y el cifrado) y en las variables de build de Cloudflare. Sin ellas, la sección Cuenta no aparece y la app funciona como hoy, incluidos los tests. Ajustes del proyecto de Supabase y del correo: [`features/cuenta.md`](features/cuenta.md) § Servidor y correo.

Dependencia nueva: `@supabase/supabase-js`.

## Fases

| Fase | Qué | Quién | Estado |
|---|---|---|---|
| 0 | Proyecto de Supabase (en Irlanda, eu-west-1), correo propio por SMTP de Brevo (Gmail falló), plantillas con **código** (`{{ .Token }}`), URL y clave publicable, variables de build en Cloudflare | Víctor | hecha |
| 1 | `cifrado`, `huella` y `decision`, con tests | Claude | hecha |
| 2 | SQL (tabla, RLS, RPC), `nube`/`nubeSupabase`, `dispositivoRepo` y `copiaNube`, con nube falsa | Claude (Víctor ejecuta el SQL en el panel) | hecha; `0001_copias.sql` ejecutado el 2026-10-13 |
| 3 | UI: Ajustes › Cuenta, entrar, elegir copia y estados | Claude | hecha |
| 4 | Integración: aviso de Inicio, guía de traslado de Ajustes y carga diferida | Claude | hecha |
| 5 | Prueba en iPhone real y en Android | Víctor + Claude | pendiente |
| 6 | Documentación (ver abajo) | Claude | hecha |

Una sola rama `feat/cuentas` y un PR. El esquema de Dexie de `db` **no cambia** (la base del dispositivo es aparte) y el formato del backup tampoco.

## Validación

- **Tests:** cifrado de ida y vuelta, contraseña incorrecta (falla de forma limpia), clave de recuperación, huella estable, todas las ramas de `decision` y el sincronizador con la nube falsa: alta, restaurar, conflicto, dispositivo no vinculado que nunca sube y sin conexión.
- **Navegador** (`appfit-test.localhost`, con un email de prueba): alta, cerrar sesión, volver a entrar, conflicto con dos perfiles del navegador y contraseña olvidada. A 320/375/430 px y en ambos temas.
- **iPhone real:**
  - el código se escribe dentro de la PWA y la sesión sigue tras cerrarla;
  - Safari y la PWA instalada funcionan como dos dispositivos: es la prueba natural de restaurar y de conflicto;
  - la subida pendiente al volver tras matar la app.
- `npm run test` y `npm run build` en verde.

## Documentación al cerrar

- ADR nuevo (039) «Cuentas y copia cifrada en la nube», que **sustituye** al 001 (marcar el 001 como sustituido).
- `CLAUDE.md`: la primera línea («sin backend») y la regla de red.
- `arquitectura.md` (arranque, red, PWA), `datos.md` (base del dispositivo y relación con el backup), `docs/features/cuenta.md` nuevo, `README.md` (privacidad), `herramientas.md` (`supabase-js`), `desarrollo.md` (variables, SQL y pruebas con la cuenta).
- `roadmap.md`: «Sincronización entre dispositivos» sigue descartada, pero el motivo pasa a ser la copia. Quitar de `despliegue.md` § Trabajo pendiente el punto 3 (copia más fácil).
- `despliegue.md`: la política de privacidad y la ficha de seguridad de datos de Play cambian (se recoge el email y una copia cifrada que nadie más puede leer).
- Entrada en `PROCESO.md`.

## Riesgos y puntos abiertos

- **Correo (Brevo, servicio externo nuevo):** sin SMTP propio, Supabase no deja editar las plantillas y el correo llega con un enlace en vez del código, así que hizo falta desde el principio. Gmail se descartó (Supabase recibía «535 Username and Password not accepted» con la contraseña de aplicación y Google bloqueó la cuenta un tiempo) y Resend, sin dominio verificado, solo envía al email de su propia cuenta. Se usa **Brevo** (plan gratis, 300 correos al día) con el remitente `AppFit <vtinez.dev@gmail.com>`, probado con un email ajeno. Limitación: es un Gmail enviado desde Brevo, sin DKIM/DMARC propios (Brevo lo marca como «Freemail domain is not recommended»), así que el código puede caer en spam. **Antes de publicar:** comprar un dominio, autenticarlo en Brevo o Resend y cambiar solo los datos SMTP en Supabase, sin tocar la app. El dominio es solo para el correo: la app sigue en `appfit.vtinez-dev.workers.dev`, porque los datos de IndexedDB van ligados a ese origen.
- **Pausa del plan gratuito:** Supabase pausa los proyectos gratuitos tras una semana sin actividad. Con uso diario no pasa, pero si ocurre, la app sigue funcionando en local y solo falla la subida (se reactiva desde el panel).
- **Contraseña y clave de recuperación olvidadas:** la copia de la nube no se puede recuperar. Hay que explicarlo claramente en el alta.
- **iOS puede cerrar la app antes de subir:** por eso se sube con espera corta, al ir a segundo plano y se comprueba la huella al arrancar.
- **Tamaño:** el plan gratuito da 500 MB de base de datos. Una copia comprimida ocupa poco, pero las actividades con GPS son lo que más crece: vigilarlo cuando haya usuarios.
