# Plan de publicación (octubre 2026)

Plan para abrir AppFit a otras personas, acordado con Víctor el 2026-10-12. Es un plan, no la fuente de verdad: lo que se implemente se documenta en su documento vivo y aquí solo cambia el estado. Cuando esté hecho, este archivo pasa a `docs/historico/`. El despliegue técnico actual (Cloudflare Workers) está en `desarrollo.md` § Despliegue; aquí se trata de **publicar** la app para el público.

Orden: primero el rediseño visual y los últimos retoques (sesión aparte); después, este plan. Nada se empieza sin que Víctor lo pida.

## Decisión

- **Gratis y completa.** La app se ofrece gratis, sin anuncios ni pagos, para ganar usuarios con un producto muy completo. Diferencia frente a MyFitnessPal, Yazio, Hevy o Strong: sin cuentas, sin nube, sin IA, sin suscripción, todo en el móvil, en español y con catálogo de España.
- **Android: Google Play.** Se publica en Play como app gratuita.
- **iPhone: la PWA desde la web.** Sin App Store por ahora: la cuenta de Apple cuesta 99 $/año. En iPhone se instala desde Safari con «Añadir a pantalla de inicio», sin coste.
- **Primero ver qué tal funciona.** Si engancha, se valorará la monetización más adelante (ver § Monetización).

## Situación legal y fiscal

- **Autónomo: no hace falta** mientras la app sea gratis y no genere ningún ingreso: ni anuncios, ni compras dentro de la app, ni donaciones, ni enlaces de afiliado. Sin actividad económica no hay alta de autónomo ni IVA. En cuanto entre cualquier ingreso, consultarlo con un gestor antes.
- **Play Console pregunta por el estado de «comerciante»** (normativa europea): sin ingresos, se declara que no.
- **Licencias de datos y recursos, todas compatibles con publicar la app**, también si algún día es de pago:
  - CIQUAL (Licence Ouverte Etalab 2.0): atribución, que ya existe.
  - Open Food Facts (ODbL): atribución, y `public/catalogo/offes-*.json` sigue siendo ODbL.
  - free-exercise-db (Unlicense) y Saira (OFL): sin condiciones relevantes.
  - Ilustraciones de ejercicios generadas con IA: revisar los términos de la herramienta usada.
  - Detalle de las fuentes del catálogo en `scripts/catalogo/README.md`.
- **Código MIT y repo público.** Para una app gratuita no es un problema. Si algún día se cobra, hacer el repo privado o cambiar la licencia en adelante (lo ya publicado con MIT sigue siendo MIT).

## Requisitos de Google Play

- **Cuenta de desarrollador personal:** 25 $ una sola vez y verificación de identidad (DNI, justificante de domicilio y teléfono; el nombre debe coincidir exactamente).
- **Prueba cerrada obligatoria** para las cuentas personales nuevas: al menos **12 testers apuntados durante 14 días seguidos** antes de poder publicar en producción. Si baja de 12 en algún momento, el contador vuelve a cero. Buscar 15 o más (amigos, gente del gimnasio). Sirve además como validación real: ¿siguen usándola a las 2–3 semanas?
- **Fichas de «Contenido de la app» en Play Console:**
  - Seguridad de los datos: con la cuenta se recogen el email y una copia de los datos de salud y fitness **cifrada en el dispositivo** (ilegible para el servidor), solo si la persona crea una cuenta; se puede borrar desde la app. Revisar cómo lo pide declarar Play.
  - Declaración de app de salud: es una app de fitness y nutrición.
  - Política de privacidad con URL pública. Debe incluir la cuenta (email, copia cifrada en Supabase en la UE, borrado desde la app).
  - Borrado de cuenta: Play pide también un enlace web para solicitarlo, no solo la opción de la app.
- **Correo de contacto público** en la ficha: usar uno dedicado a la app.

## Cómo empaquetarla para Android

**TWA (Trusted Web Activity)**, generada con PWABuilder o Bubblewrap: la misma PWA dentro de un paquete Android.
- Un solo código y un solo despliegue en Cloudflare.
- Las actualizaciones llegan sin publicar versión nueva en Play, salvo cambios en el propio envoltorio.
- Requiere servir `/.well-known/assetlinks.json` en el dominio (Digital Asset Links) para que Android confíe en ella.
- Capacitor solo si más adelante hacen falta funciones nativas.

## Trabajo pendiente antes de abrirla

1. **Uso por otras personas** (ya anotado en `mejoras.md` § 6):
   - Quitar valores por defecto pensados para Víctor (perfil, objetivos, rutinas…).
   - Primera pantalla de bienvenida: rellenar el perfil y entender Cumbres, Ritmo y Liga.
   - Actualizar `CLAUDE.md`, `README.md` y `arquitectura.md`, que hoy dicen «único usuario» y «no pensado para tiendas», y añadir un ADR con la decisión.
2. **Probar en Android real.** Todo se ha validado en Safari de iPhone y en Edge emulado. En Chrome de Android revisar:
   - Escáner de códigos de barras y dictado con el teclado.
   - Teclado con Sheets abiertos y safe areas.
   - Vibración, pitido del descanso y descargas de CSV y copia de seguridad.
   - Persistencia del almacenamiento.
3. **Copia de seguridad más fácil.** Sin servidor, quien cambia de móvil sin exportar lo pierde todo. Decidido: cuentas con copia automática y cifrada en Supabase, plan en [`cuentas.md`](cuentas.md).
4. **Página web de la app** en el mismo dominio:
   - Qué hace la app y su privacidad.
   - Cómo instalarla en iPhone (Safari › Compartir › Añadir a pantalla de inicio) y enlace a Play para Android.
   - Política de privacidad: todo se queda en el móvil; solo se envía el código de barras a Open Food Facts al escanear un producto nuevo y, con cuenta, el email y la copia cifrada a Supabase.
   - El código de la cuenta se envía por Brevo (SMTP propio en Supabase, ya configurado) desde un Gmail, y puede caer en spam. Antes de publicar: comprar un dominio **solo para el correo**, autenticarlo en Brevo o Resend y cambiar los datos SMTP en Supabase. La app sigue en `appfit.vtinez-dev.workers.dev`: los datos de IndexedDB van ligados a ese origen. La política de privacidad debe nombrar a Brevo (recibe el email para enviar el código).
5. **Idioma.** Solo español y catálogo de España: el mercado inicial es España.
6. **Infraestructura.** Cloudflare solo sirve estáticos y Open Food Facts recibe una consulta por escaneo desde la IP de cada usuario, así que, en principio, más usuarios no cambian el coste (0 €). Comprobarlo con el plan de Cloudflare si el tráfico crece.

## Monetización (para más adelante, solo si funciona)

Comentado el 2026-10-12, sin decidir:

- **Portfolio.** La vía que más rinde con menos esfuerzo: demo publicada con datos de ejemplo, vídeo corto y README orientado a quien contrata. Se puede hacer ya, en paralelo.
- **Anuncios: desaconsejados.**
  - Con pocos usuarios rinden muy poco (un banner en España se paga a menos de un euro por mil impresiones, aproximadamente).
  - Rompen la promesa de privacidad: rastreo, banner de consentimiento del RGPD y aviso de rastreo de Apple, y la etiqueta «Datos usados para rastrearte».
  - Estorban en los momentos clave: al entrenar o al registrar una comida.
  - Además, son un servicio externo nuevo.
- **Lo que mejor encaja:**
  - Gratis más un desbloqueo «Pro» de pago único (por ejemplo, Cumbres, Liga, Vitrina y el creador de rutinas).
  - Propinas dentro de la app.
  - Enlaces de afiliado discretos y señalados (creatina, material de casa).
  - Cualquiera de estas opciones implica alta de autónomo (consultar con un gestor). En iPhone exigiría App Store con Capacitor y StoreKit; fuera de las tiendas, una plataforma que gestione el IVA (Paddle o Lemon Squeezy).
- **Expectativas.** El mercado de apps de fitness está saturado: unos cientos de euros al mes ya serían un buen resultado para una app indie sin marketing.

## Fuentes

- [Requisito de prueba cerrada de Google Play en 2026 (12 testers, 14 días)](https://extendsclass.com/blog/google-plays-closed-testing-requirement-what-developers-need-to-know-in-2026)
- [The 12 tester tax (experiencia de julio de 2026)](https://levelup.gitconnected.com/the-12-tester-tax-google-plays-closed-testing-rule-is-quietly-killing-solo-devs-2cea83c2e338)
- [Verificación de desarrolladores de Google Play 2026](https://testerbee.com/blog/google-play-developer-verification-2026)
- [Publicar en App Store y Google Play en 2026: costes y requisitos](https://ilab.md/en/articles/publishing-on-the-app-store-and-google-play-in-2026-timelines-costs-and-7-hidden-requirements-that-could-derail-your-launch)
