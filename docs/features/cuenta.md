# Cuenta y copia en la nube

`src/features/cuenta/`. Cuenta opcional con copia automática y cifrada de los registros en Supabase. Los datos siguen viviendo en IndexedDB y la app funciona igual sin conexión y sin cuenta. Decisión: [ADR 039](../decisiones/039-cuentas-y-copia-cifrada.md). Es una **copia** de todo el backup, no una sincronización registro a registro: pensada para un dispositivo a la vez, con detección de conflictos.

## Dónde está cada cosa

| Pieza | Archivo | Datos |
|---|---|---|
| Cifrado | `lib/cifrado.ts`: `crearClaves`, `envolver`/`desenvolver`, `cifrarCopia`/`descifrarCopia`, `sinExportar`, código de recuperación, `validarContrasena` | — (puro, Web Crypto) |
| Huella de la copia | `lib/huella.ts`: `huellaBackup` (SHA-256 del backup sin `exportedAt`) | — (puro) |
| Decisiones | `lib/decision.ts`: `decidirVinculo` (crear/traer/elegir al entrar) y `decidirCopia` (nada/subir/traer/conflicto/perdida) | — (puro) |
| Textos y avisos | `lib/estado.ts`: `lineaEstado`, `haceCuanto`, `cuentaEnUso`, `avisoCuenta` | — (puro) |
| Disparo | `lib/disparo.ts`: espera de subida (15 s), intervalo de comprobación (30 s), `afectaALaCopia` | — (puro) |
| Nube | `data/nube.ts` (interfaz `Nube`, `NubeError`) y `data/nubeSupabase.ts` (supabase-js, diferido) | proyecto de Supabase |
| Estado del dispositivo | `data/dispositivoRepo.ts`: base IndexedDB aparte `appfit-dispositivo` (DEK, revisión, huella, conflicto) | no es `db` |
| Escrituras de la app | `data/cambiosRepo.ts`: `alCambiarDatos` (Dexie `storagemutated` filtrado a `TABLAS_USUARIO`) | `db` (solo escucha) |
| Orquestación | `copiaNube.ts`: clase `CopiaNube` con todo inyectado; `servicio.ts`: instancia de la app, `cuentaDisponible` e `iniciarCopiaNube` (disparadores) | backup (`shared/lib/backup`) |
| UI | `useCuenta` (`useSyncExternalStore`), `components/CuentaAjustes` (sección de Ajustes), `EntrarSheet`, `ElegirCopia`, `GestionarCuenta` | — |
| Aviso en Inicio | `inicio/components/AvisoBackup` (con cuenta en uso avisa por la copia de la nube) | — |
| Servidor | `supabase/migrations/0001_copias.sql`: tabla `copias`, RLS, `subir_copia`, `actualizar_claves`, `borrar_cuenta` | Postgres |

## Reglas

- **Configuración**: `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` en `.env` (plantilla en `.env.example`; `.env` no va a git) y en las variables de build de Cloudflare (`desarrollo.md` § Despliegue). Son públicas: protegen la RLS y el cifrado. Sin ellas `cuentaDisponible` es falso, la sección Cuenta no aparece y todo funciona como antes.
- **Errores** (`traducir` en `nubeSupabase.ts`): sin respuesta del servidor → «sin conexión»; un 5xx (auth-js también lo da como `AuthRetryableFetchError`, con status ≥ 500) → «inténtalo más tarde» («No se ha podido enviar el código» al pedirlo, p. ej. si falla el SMTP), nunca «sin conexión».
- **Cifrado**: una DEK AES-GCM 256 aleatoria por cuenta cifra la copia (`gzip` → AES-GCM, formato `1.<iv>.<datos>` en base64). La contraseña y el código de recuperación derivan con PBKDF2-SHA256 (600 000 iteraciones, sal propia) una clave que envuelve la DEK; la nube guarda las dos envolturas en `claves`. Cambiar la contraseña o el código solo vuelve a envolver. En el dispositivo, la DEK se guarda **no exportable**.
- **Nunca sube un dispositivo sin vincular.** Al entrar: sin copia en la nube → crear contraseña y subir; con copia y sin datos aquí → traer; con datos en los dos lados → la persona elige (`ElegirCopia`, con resúmenes y `ConfirmacionDestructiva`). Al traer, primero se importa y después se vincula.
- **Revisión atómica**: `subir_copia(revision_base, …)` solo escribe si la nube sigue en esa revisión y guarda la anterior en `datos_anterior`. Si no, devuelve null → conflicto.
- **Sincronización** (`decidirCopia`): huella distinta de la guardada = cambios aquí; revisión remota distinta = otro dispositivo subió. Solo cambios → subir; solo remota nueva → traer sola; las dos → conflicto (se marca en el dispositivo y no se sube nada hasta elegir); sin copia remota → «perdida» (volver a entrar).
- **Disparadores** (`iniciarCopiaNube`): cada escritura en tablas de usuario marca «pendiente» y sube tras 15 s sin escrituras; al pasar a segundo plano se sube lo pendiente; al volver (como mucho cada 30 s) y al recuperar la red se comprueba la nube. Una operación a la vez (cola y Web Locks entre pestañas). Sin sesión guardada no se descarga supabase-js.
- **Sesión**: email + código de 6 cifras (`signInWithOtp`/`verifyOtp`), escrito dentro de la PWA, sin enlaces ni redirecciones. La sesión vive en localStorage (`appfit-cuenta`). Si caduca con el dispositivo vinculado, Ajustes e Inicio piden volver a entrar; al entrar con la misma cuenta no se pide la contraseña.
- **Contraseña olvidada**: se abre con la clave de recuperación y se elige otra. Sin ninguna de las dos, «Empezar de cero» sustituye la copia de la nube por la del dispositivo con claves nuevas.
- **Cerrar sesión** borra el vínculo del dispositivo; los datos se quedan salvo que se elija borrarlos. **Borrar la cuenta** (`borrar_cuenta`) borra el usuario y su copia; los datos del dispositivo se quedan.
- **Inicio**: con la cuenta en uso, el recordatorio de exportar mide los días desde la última copia en la nube; conflicto, copia perdida o sesión caducada se avisan sin «Más tarde».

## Servidor y correo

Proyecto de Supabase **AppFit** (ref `hygkysnhcpsezcfeoxwo`, Irlanda, eu-west-1, plan gratuito). Se configura a mano en su panel:

- **SQL**: `supabase/migrations/0001_copias.sql` ejecutado en el SQL Editor el 2026-10-13 (el alta crea la fila en `public.copias` con revisión 1). Un cambio posterior va en un archivo nuevo.
- **Auth › Email**: proveedor activo, *Confirm email* activo, código (*Email OTP length*) de 6 cifras, caduca a los 3600 s.
- **Plantillas** «Confirm sign up» y «Magic link or OTP»: asunto «Tu código de AppFit» y cuerpo con `{{ .Token }}` (el código, no un enlace).
- **URL Configuration**: Site URL `https://appfit.vtinez-dev.workers.dev`; Redirect URLs `http://appfit-test.localhost:5173`. La app no usa redirecciones, pero Supabase las pide.
- **SMTP propio: Brevo** (servicio externo; sin SMTP propio Supabase no deja editar las plantillas). `smtp-relay.brevo.com:587`, usuario el login SMTP de Brevo (`…@smtp-brevo.com`), contraseña la *SMTP key* de Brevo, remitente `AppFit <vtinez.dev@gmail.com>` (verificado en Brevo). Plan gratis: 300 correos al día. Brevo solo ve el email y el código; la app no habla con Brevo. Sin dominio propio el correo no lleva DKIM/DMARC y puede caer en spam: con un dominio autenticado solo cambian los datos SMTP en Supabase. Por qué Brevo y no Gmail o Resend: [`../cuentas.md`](../cuentas.md) § Riesgos.

## Pruebas

Tests puros al lado de cada `lib/`, `dispositivoRepo.test.ts` y `copiaNube.test.ts` con dos «móviles» sobre `src/test/fixtures/nubeFalsa.ts` (alta, subir solo con cambios, sin conexión, traer, contraseña incorrecta, móvil sin vincular, elegir, recuperación, empezar de cero, conflicto en los dos sentidos, contraseña y clave nuevas, cerrar sesión y borrar cuenta). `data/nubeSupabase.test.ts` cubre la traducción de errores (5xx frente a sin conexión). Recorrido en navegador: `scripts/ui/validar-cuenta.cjs` (Supabase simulado; ver `desarrollo.md`).
