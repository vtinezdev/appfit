# Seguridad y endurecimiento

Qué protege a AppFit y a quien la usa, dónde vive cada protección y qué queda por hacer fuera del código. Es la fuente de verdad del endurecimiento («hardening»: quitar a la app todo lo que no necesita para que, si algo falla o alguien lo intenta, el daño posible sea el mínimo). La red permitida se decide en `CLAUDE.md` § Reglas críticas y `arquitectura.md` § Visión general; el cifrado de la copia, en `features/cuenta.md`.

## Punto de partida

La mayor protección es el diseño: los datos viven en el móvil (IndexedDB), no hay servidor propio con datos en claro y la cuenta es opcional. Con cuenta, la copia sale **ya cifrada** del móvil (AES-GCM 256, clave derivada de la contraseña con PBKDF2 de 600 000 iteraciones) y el servidor no puede leerla. Social solo guarda lo que la persona publica a propósito.

## Cabeceras de seguridad (`public/_headers`)

Cloudflare las añade a cada respuesta. `npm run preview` aplica las mismas (`vite.config.ts`, `cabecerasDeProduccion`), así que los recorridos de navegador sobre la build las prueban.

| Cabecera | Qué hace, en llano |
|---|---|
| `Content-Security-Policy` (CSP) | Lista blanca de lo que la página puede cargar y ejecutar. Si alguien consiguiera colar código en la app (p. ej. con un texto de Social mal escapado), el navegador no lo ejecutaría ni dejaría que enviara datos fuera. Scripts: solo del propio origen y WebAssembly (el lector de códigos); nada de `eval` ni scripts en línea. Red fuera del origen: solo Open Food Facts y Supabase. Nadie puede meter la app dentro de otra web (`frame-ancestors 'none'`). |
| `Strict-Transport-Security` (HSTS) | El navegador recuerda durante un año que esta web solo va por HTTPS: nadie en la wifi del gimnasio puede forzar una conexión sin cifrar. Sin `includeSubDomains` ni `preload` hasta tener dominio propio. |
| `X-Content-Type-Options: nosniff` | El navegador no «adivina» el tipo de un archivo: un JSON nunca se ejecuta como script. |
| `X-Frame-Options: DENY` | Lo mismo que `frame-ancestors`, para navegadores antiguos (evita el *clickjacking*: una web que te enseña AppFit invisible debajo para que pulses donde no quieres). |
| `Referrer-Policy: no-referrer` | Al abrir un enlace externo (las fuentes de Referencias) o consultar Open Food Facts, no se dice desde qué página. |
| `Cross-Origin-Opener-Policy: same-origin` | Una ventana abierta desde otra web no puede tocar la de AppFit. |
| `Permissions-Policy` | Qué sensores puede pedir la página: cámara (escáner) y ubicación (actividades) solo la propia app; micrófono, pagos, USB, Bluetooth y el resto, nadie. |

Para que la CSP no tenga que permitir scripts en línea, el tema inicial va en `public/tema-inicial.js` (no dentro de `index.html`).

**Al cambiar algo que toque la red o los permisos** (un servicio nuevo, que además hay que preguntar a Víctor; un sensor nuevo; un script en `index.html`): actualizar `_headers`. Lo vigilan:

- `src/shared/seguridad/cabeceras.test.ts`: que estén todas las cabeceras, que la CSP no se abra (`script-src`, `connect-src`…), que cada origen al que el código hace `fetch` esté permitido y que `index.html` no tenga scripts en línea.
- `scripts/ui/validar-seguridad.cjs` (CI, trabajo `navegador`): sobre la build, abre todos los destinos sin una sola violación de la CSP, compila el WebAssembly del escáner, comprueba que Open Food Facts y Supabase están permitidos y que cualquier otro origen queda bloqueado.

## Supabase

Revisado el 2026-11-03 sobre `supabase/migrations/` (0001–0028); 0029 (2026-11-04) solo amplía `comentar_respuesta` y `social_capacidades`, con las mismas comprobaciones de sesión, publicación visible y bloqueo; 0030 (2026-11-06) añade `borrar_caducados` (sin permiso para `public`, `anon` ni `authenticated`; la ejecuta solo la tarea programada):

- Las 21 tablas tienen RLS activada (seguridad por fila: cada persona solo ve lo suyo o lo que le corresponde ver) y se les quitan los permisos directos a `anon` y `authenticated`: todo pasa por funciones.
- Las funciones `security definer` fijan `search_path` (evita que alguien las engañe con una tabla falsa del mismo nombre) y comprueban la sesión; las que solo usa la cuenta revocan la ejecución a `public` y `anon`.
- Sin sesión solo se puede enviar un mensaje al creador, con freno por cuenta (5 por hora) y global (300 por hora).
- En la app solo viajan la URL y la clave **publicable** (`VITE_SUPABASE_*`); la *secret key* nunca está en el repositorio ni en el build.

Un cambio del servidor sigue yendo en un SQL nuevo de `supabase/migrations/`, con su prueba en `supabase/pruebas/` (`desarrollo.md`).

## Dependencias

- `npm audit --omit=dev --audit-level=high` en la CI (trabajo `pruebas-y-build`): una dependencia que llega al móvil con una vulnerabilidad conocida alta o crítica no deja pasar la PR. Las de desarrollo (Vite, Vitest…) no llegan al móvil.
- El escáner carga su `.wasm` del propio origen, no de un CDN, y su versión está fijada (`nutricion/lib/escaner/zxing.ts`).

## Pendiente fuera del código (lo hace Víctor)

Pasos detallados en `despliegue.md` § Preparación para Google Play.

- **Cuentas del creador:** verificación en dos pasos (2FA) en GitHub, Cloudflare, Supabase, Google (Play Console) y el correo de la app. Es lo más importante: quien entre en una de ellas puede publicar una versión maliciosa de la app.
- **Supabase › Advisors › Security Advisor:** ejecutarlo y revisar los avisos.
- **Supabase › Authentication:** acortar la caducidad del código del email de 3600 s a 600 s y revisar los límites de envío de correos.
- **Clave de firma de Android:** usar *Play App Signing* (Google guarda la clave de la app) y guardar la clave de subida y su contraseña en un gestor de contraseñas, con una copia fuera del ordenador.
- **Dominio propio** (cuando estén el nombre y el logo): después, `assetlinks.json`, HSTS con `includeSubDomains` y la CSP si cambia la URL de Supabase.
