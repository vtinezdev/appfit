# 067 — App de tienda: sin instalar desde la web y con actualizaciones solas en Android

Fecha: 2026-11-06. Estado: vigente. Sustituye en parte al [ADR 042](042-actualizaciones-pwa-visibles.md) (en la app de Google Play no hay aviso de versión nueva) y retira el traslado de Safari a la pantalla de inicio de [`datos.md`](../datos.md).

## Contexto

La app nació como PWA que cada persona añade a la pantalla de inicio desde Safari o Chrome, y lo explicaba dentro: «Añade Cumbra Fit a tu pantalla de inicio», un botón «Instalar Cumbra Fit», cómo llevar los registros de Safari al icono nuevo, «Guardados en este navegador», «Este navegador no da la ubicación»… Al publicarla en Google Play, quien la descargue de la tienda no entendería esos mensajes. Víctor revisó la lista el 2026-11-06 y decidió quitarlos **para todos**, también en iPhone, donde se sigue instalando desde la web: allí lo explica la web de la app (`/conoce`).

## Decisión

- **Fuera la instalación y el traslado**: `InstalarApp`, `shared/pwa/instalacion.ts` (`beforeinstallprompt`), el aviso `app/TrasladarDatos` de Inicio y, en Ajustes, la tarjeta de instalación y «¿Ya registraste comidas en Safari?». Lo que quedaba («Ayuda para registrar un entreno» y «Volver a ver las pistas») pasa a la sección «Ayuda y pistas» (antes «Primeros pasos»). `IconoApp`, que solo usaban esas dos piezas, se retira.
- **Textos neutros**: GPS, cámara y almacenamiento hablan del móvil, no del navegador ni de «Ajustes del iPhone» («Dáselo en los ajustes del móvil», «Guardados en este móvil»). Los textos legales y la web de la app siguen nombrando el navegador donde es exacto.
- **Actualizaciones solas en la app de Android.** `shared/pwa/entorno` reconoce la TWA por `document.referrer` (`android-app://app.cumbrafit`) y lo recuerda en la sesión. Allí no se ven el aviso de Inicio ni la sección Actualizaciones, y `aplicarSola` aplica la versión nueva al abrir la app o al volver tras 30 minutos fuera, nunca mientras se usa. En iPhone y la web sigue el aviso del ADR 042.
- **Medidas de pantalla** dejan Ajustes › Actualizaciones y van en el informe de «Comunicar un problema», con cómo se abrió la app (Google Play, instalada desde la web o navegador).

## Consecuencias

- En iPhone nadie avisa, dentro de la app, de que Safari y el icono pueden guardar los registros por separado. La web de la app explica cómo instalarla; la cuenta (la copia se trae al entrar) y las copias de seguridad siguen siendo el camino si alguien cambia de acceso.
- Si la TWA se abriera sin referrer (otra versión de Chrome), la app se comportaría como la web: con el aviso de actualización, que sigue funcionando.
- Una versión nueva en Android puede recargar la app nada más abrirla, una vez; lo que esté guardado no se pierde.
