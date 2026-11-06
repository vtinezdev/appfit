# Android (Google Play)

Cumbra Fit llega a Google Play como **TWA** (Trusted Web Activity): un paquete Android que abre la PWA del dominio a
pantalla completa, sin barra de direcciones. Las actualizaciones de la app llegan con cada despliegue en Cloudflare; solo
hay que subir un `.aab` nuevo a Play cuando cambia este envoltorio. Plan y estado: [`docs/despliegue.md`](../docs/despliegue.md)
§ Preparación para Google Play.

## Qué hay aquí

- `twa-manifest.json`: la configuración que lee [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap). Nombre,
  colores, orientación e iconos repiten los del manifest de la PWA (`src/shared/pwa/manifest.ts`), y
  `src/shared/pwa/manifest.test.ts` vigila que no se separen. El paquete `app.cumbrafit` es definitivo: Play no deja
  cambiarlo una vez publicado.
- Nada más se guarda en Git: el proyecto Gradle que genera Bubblewrap se rehace a partir de `twa-manifest.json`, y la
  clave de subida (`*.jks`) no puede entrar en el repositorio (`.gitignore`).

## Pendiente del dominio

`host` y las direcciones ya apuntan a `cumbrafit.app`, que todavía no está comprado. Hasta que la PWA se sirva ahí,
Bubblewrap no puede generar el proyecto. Con el dominio:

1. Generar el proyecto (pide JDK 17 y el SDK de Android; `bubblewrap doctor` los instala):

   ```bash
   cd android && npx @bubblewrap/cli update && npx @bubblewrap/cli build
   ```

   La primera vez crea la clave de subida `cumbrafit-subida.jks`. Esa clave y su contraseña van al gestor de
   contraseñas, con una copia fuera del ordenador. Con *Play App Signing*, Google guarda la clave de firma definitiva.
2. Servir `public/.well-known/assetlinks.json` con la huella SHA-256 de la clave de firma de Play (Play Console ›
   Configuración › Integridad de la app) y ponerla también en `fingerprints`. Sin ese archivo, la app se abre con la barra
   de Chrome.
3. Cada versión del envoltorio sube `appVersionCode` (entero, siempre mayor) y `appVersionName`/`appVersion`.

## Decisiones del envoltorio

- `locationDelegation`: el GPS de Actividades pide el permiso de ubicación de Android, no el de Chrome. Igual que en la
  PWA, solo graba con la pantalla encendida.
- Sin notificaciones ni Play Billing: la app no envía avisos ni cobra.
- `orientation: portrait`, como la PWA, que está pensada para el móvil en vertical.
