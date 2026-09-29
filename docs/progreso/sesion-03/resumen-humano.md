# Sesión 03 — Qué hicimos y por qué

Además del rediseño de las pantallas Hoy y Añadir comida (tienes su detalle en los otros dos documentos de esta carpeta), esta sesión terminó de ordenar el código de Gym para que quede igual que el de Nutrición: cada cosa en su carpeta y el acceso a los datos en un único sitio.

## Qué notarás al usar la app

- **Doble toque sin líos**: si tocas dos veces seguidas «Empezar entreno», ya no se crean dos entrenos activos; y dos toques en «Serie» no generan series con el mismo orden.
- **Borrar**: las rutinas y las plantillas piden confirmación («Sí, borrar» / «Cancelar») porque no se pueden recuperar con un toque. Las series, los alimentos y las entradas se borran al instante y aparece «Deshacer» unos segundos.
- **Errores**: si algo falla al guardar en Gym, la app te lo dice en vez de quedarse callada.

Tus datos no cambian: no hay cambios en la base de datos ni en los backups.

## Pendiente que vimos por el camino

En el entreno activo, en pantalla de 375 px, los contadores pequeños de reps y peso no enseñan el número, y en Rutinas pone «1 ejercicios». Ya estaban así; no se han tocado.
