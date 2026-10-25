# 039 — Cuentas opcionales con copia cifrada en la nube

- **Estado**: vigente (desde el 2026-10-13). Sustituye al [ADR 001](001-pwa-local-sin-backend.md) en lo de «sin backend ni cuentas». Lo matiza el [ADR 040](040-parte-social.md) (parte social, en implementación): la cuenta deja de ir unida a la copia, y se borran las cuentas inactivas y la copia anterior tras 7 días.
- **Historia**: `PROCESO.md` §128 y §129; plan en `../cuentas.md`.

## Contexto

La app se abre a otras personas (Google Play y PWA en iPhone, `../despliegue.md`). Con los datos solo en el dispositivo, quien cambia de móvil sin exportar el JSON lo pierde todo, y en iPhone hasta pasar de Safari a la PWA instalada exige exportar e importar. Víctor quiere poder registrarse con una cuenta y olvidarse de las copias a mano.

## Decisión

- **Cuenta opcional en Supabase** (Auth + Postgres, región UE: Irlanda, eu-west-1, plan gratuito). Sin cuenta, la app sigue igual.
- **Copia, no sincronización.** Los datos siguen en IndexedDB; la app sube sola el backup completo (el mismo de `shared/lib/backup.ts`) y lo trae en otro dispositivo. Una revisión atómica en el servidor detecta si dos dispositivos subieron copias distintas, y la persona elige.
- **Cifrado en el dispositivo** con una contraseña (PBKDF2 + AES-GCM, clave de datos envuelta) y una clave de recuperación. El servidor solo guarda datos ilegibles: datos de salud de terceros que ni Víctor ni Supabase pueden leer.
- **Entrar con email y código de 6 cifras**, escrito dentro de la app: un enlace o una redirección se abrirían en Safari, que en iPhone tiene otro almacenamiento.

## Consecuencias

- Se añade un servicio externo (Supabase) y una dependencia (`@supabase/supabase-js`, cargada solo si se usa la cuenta). La red ya no es solo el catálogo y Open Food Facts.
- Contraseña y clave de recuperación perdidas = copia de la nube perdida (los datos del dispositivo no se tocan). Se explica en el alta.
- Pensada para un dispositivo a la vez: usar dos a la vez da conflictos que hay que resolver eligiendo una copia. La sincronización registro a registro sigue descartada: exigiría pasar los ids autoincrementales a UUID.
- El backup JSON manual se mantiene, y es el formato de la copia: cambiar el backup cambia la copia (`migrarBackup` también la migra).
- El código llega por un SMTP propio, **Brevo** (otro servicio externo: recibe el email y el código, nada de los datos), porque sin él Supabase no deja editar las plantillas. Hoy sale desde un Gmail sin DKIM/DMARC propios y puede caer en spam; antes de publicar, un dominio autenticado (solo para el correo: la app no cambia de origen). También hay que actualizar la política de privacidad y la ficha de datos de Play.
- El plan gratuito pausa el proyecto tras una semana sin actividad: la app sigue en local y solo falla la subida.
