# Sesión 16 — Qué hicimos y por qué

Empezamos con dos retoques que pediste con una captura y acabamos preparando la app para publicarla en Google Play.

## Qué notarás

- **Progreso › Semana:** las barras de «Semanas» van en rayitas. Arriba, una por cada entreno de tu plan, y abajo, una por cada día con comidas, así que cuentas de un vistazo cuántos llevas.
- **iPhone:** el botón redondo de las secciones ya no debería salir cortado por abajo. Iba cortado porque iOS a veces le dice a la app que la pantalla es más baja de lo que es. Compruébalo en tu iPhone, porque desde aquí no lo pude probar.
- **Tres fallos con las fechas, corregidos:**
  - del 1 al 3 de enero, el calendario de Semanas salía vacío;
  - la copia de seguridad hecha pasada la medianoche llevaba la fecha de ayer;
  - una publicación de un entreno de madrugada podía marcar el día anterior.

## Seguridad para publicar

La app ya partía bien, porque tus datos viven en el móvil y la copia en la nube va cifrada. Ahora, además:
- **El navegador solo ejecuta el código de la propia app** y solo deja conectar con Open Food Facts y Supabase. Si alguien colara algo, no podría ejecutarse ni mandar tus datos fuera.
- **Solo se pueden pedir la cámara (escáner) y la ubicación (actividades).**
- **Las revisiones automáticas** avisan si una librería tiene un fallo de seguridad conocido o si alguien debilita estas protecciones.
- **Supabase está bien atado:** cada persona solo ve lo suyo.

## Lo que queda

- **Elegir nombre y logo**, en otra sesión en la que se puedan comprobar los dominios. Tus candidatos: Cota (mi favorito), Brío, Vértice, Racha, Hito y Ascenso.
- **Lo que te toca en tus cuentas** (verificación en dos pasos, Supabase, correo de la app y cuenta de Play), paso a paso en `docs/despliegue.md` § Preparación para Google Play.
