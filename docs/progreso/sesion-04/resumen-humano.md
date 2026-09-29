# Sesión 04 — Qué hicimos y por qué

Gemini se satura a menudo, y hasta ahora era la única forma de añadir comida sin tener el alimento guardado. En esta sesión la app pasa a tener **su propia base de datos de alimentos dentro del móvil**. Es gratis, funciona sin conexión y no necesita servidor.

## Qué notarás al usar la app

- **Catálogo de alimentos:** unos 3.300 alimentos genéricos (pollo, arroz, lentejas, yogur…) con sus kcal y macros. Vienen de la tabla oficial francesa CIQUAL y los nombres están traducidos al español. Se descargan solos la primera vez que abres la app con conexión.
- **Ajustes → «Catálogo de alimentos»:** se ve la versión, cuántos alimentos hay y la atribución a ANSES, que la licencia exige. También puedes buscar actualizaciones o borrar el catálogo.
- **Añadir comida:** el buscador está siempre a la vista.
  - Al escribir salen dos bloques: «Tus alimentos» y «Catálogo».
  - Tocas uno, eliges los gramos y listo, sin IA.
  - Entiende plurales («lentejas») y frases como «pechuga de pollo».
- **Frecuentes:** también incluyen los alimentos del catálogo que usas a menudo.
- **Alimentos:** añadir algo del catálogo **no** crea nada allí. La entrada guarda sus valores y queda como está aunque el catálogo se actualice.

Tus datos no cambian. El catálogo no entra en los backups porque se vuelve a descargar solo.

## Pendiente

- **Probarlo en el iPhone** después de subirlo a Cloudflare: cuánto tarda la descarga y la búsqueda.
- **Revisar las traducciones** de los alimentos más habituales, en `scripts/catalogo/raw/revision-habituales.txt`.
- **Próximas fases:**
  - **Fase 4:** escribir o dictar «200 g de arroz y 2 huevos» sin Gemini.
  - **Fase 5:** escanear códigos de barras.
