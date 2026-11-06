# 065 — Textos legales y edad mínima

Fecha: 2026-11-05. Estado: vigente (los textos, pendientes de revisión por alguien que sepa de protección de datos y del correo de contacto). Cumple la fase 6 de [`social.md`](../social.md) en lo que toca a condiciones y privacidad, y § 5 de [`despliegue.md`](../despliegue.md).

## Contexto

Google Play exige una política de privacidad y una página para pedir el borrado de la cuenta, las dos con URL pública. Abrir Social a desconocidos exige además unas condiciones de uso con normas de conducta. Hasta ahora la app no tenía ningún texto legal; Social pedía confirmar 16 años solo al crear el perfil.

## Decisión

- **Tres páginas estáticas** en `public/`: `privacidad.html`, `condiciones.html` y `borrar-cuenta.html`, servidas en `/privacidad`, `/condiciones` y `/borrar-cuenta`. HTML sin JavaScript de la app (solo `tema-inicial.js`), con `legal.css` (colores de los tokens y Saira local): cualquiera las lee sin instalar nada y valen después para la web de la app. Alternativa descartada: pantallas de React en Ajustes, que habrían exigido además una copia pública para Play.
- **El service worker no las sustituye por la app** (`navigateFallbackDenylist` desde `shared/lib/legal.ts`); van en el precache, así que se leen también sin conexión.
- **Responsable: Victor Martinez**, persona física en España. El correo de contacto queda como `[CORREO DE CONTACTO]` hasta crear el buzón de la app; `legal.test.ts` vigila que las tres páginas digan el mismo.
- **16 años o más para toda la app** (`EDAD_MINIMA`), no solo para Social: una regla en todas partes, y en Play un público objetivo fuera de las normas para menores. Se confirma al crear la cuenta (aviso en el paso del email) y al crear el perfil de Social (casilla); la bienvenida la pedirá al empezar.
- **Bases legales:** ejecución de las condiciones para la cuenta, la copia y Social; consentimiento explícito (art. 9.2.a RGPD) para los datos de salud y forma física que la persona publica; interés legítimo para moderación y seguridad. La copia cifrada no la puede leer nadie más que la persona.
- **Enlaces en la app** con `shared/components/EnlacesLegales` (se abren aparte, `_blank`): pie de Ajustes (las tres), Entrar o crear cuenta y Crear perfil de Social (condiciones y privacidad).

## Consecuencias

- Antes de publicar: rellenar el correo, cambiar a las URLs del dominio en la ficha de Play y pasar los textos por alguien que sepa de protección de datos.
- Las denuncias y los mensajes al creador no tienen hoy un plazo de borrado automático; los textos dicen «el tiempo necesario». Si se fija un plazo (p. ej. una tarea de pg_cron), hay que actualizar la política.
- Borrar solo la copia de la nube, sin borrar la cuenta, se pide por correo: la app no lo ofrece.
- Cambiar un flujo de datos (algo nuevo que sale del móvil, un proveedor, un plazo) obliga a actualizar `privacidad.html` y su fecha.
