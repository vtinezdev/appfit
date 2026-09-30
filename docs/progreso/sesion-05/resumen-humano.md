# Sesión 05 — Qué hicimos y por qué

Con el catálogo de alimentos ya dentro del móvil (sesión 04), esta sesión lo aprovecha para dos cosas: apuntar comidas escribiendo o dictando **sin Gemini**, y **escanear códigos de barras**.

## Qué notarás al usar la app

- **«Interpretar» sin IA:** escribe o dicta con el micrófono del teclado del iPhone algo como «200 g de arroz, 2 huevos y un plátano». La app lo entiende sola, sin conexión:
  - Separa los alimentos y entiende cantidades («medio litro», «un par de», «2 rebanadas», «una lata de atún»…).
  - Si no dices los gramos, usa el peso típico (un huevo, 60 g; un plátano, 120 g). Si no lo sabe, pone 100 g y te avisa.
  - Si tienes ese alimento guardado en «Alimentos», usa el tuyo; si no, el del catálogo.
- **En la revisión** cada alimento lleva una etiqueta (Tuyo, CIQUAL o Estimado) y un botón **«Cambiar»** con otras opciones y un buscador. Si no encuentra algo («arroz con pollo»), te lo dice y puedes buscarlo o escribir los valores.
- **«Con IA»** sigue ahí como botón secundario, junto a la grabación de voz, pero solo si tienes la API key puesta.
- **Escanear:** hay un botón con un código de barras al lado del buscador de «Añadir comida».
  - Apuntas al envase y busca el producto en Open Food Facts, una base de datos abierta. **Solo se envía el número del código de barras.**
  - Si está completo, eliges los gramos y listo; queda guardado en el móvil y la próxima vez funciona sin conexión.
  - Si le faltan datos, te deja completarlos a mano. Si no existe, puedes escribir los valores o usar «Kcal rápidas».
  - Siempre puedes teclear el código si la cámara no va.
- **Ajustes → «Catálogo de alimentos»** muestra también cuántos productos has escaneado (con la atribución a Open Food Facts).

## Pendiente

- **Revisarlo en el navegador** en el origen de pruebas (no pude probarlo en pantalla en esta sesión).
- **En el iPhone, tras subirlo:** escanear 3 productos reales (la cámara necesita HTTPS).
- **Próximas fases (con tu permiso):** Gemini como respaldo del intérprete (Fase 6) y la base de datos USDA (Fase 7).
