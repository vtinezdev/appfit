# Sesión 01 — Qué hicimos y por qué

## El punto de partida

Solo había un documento, `PLAN.md`, con la idea completa de AppFit: una app privada para llevar tu nutrición (comidas, macros) y tus entrenos de gimnasio, pensada para tu iPhone, sin gastar dinero y sin que tus datos salgan del móvil. Como aún no tenías ni la API key de Gemini ni la cuenta de Cloudflare, el objetivo de esta sesión fue **dejar toda la app construida y probada**, para que lo único que faltara al final fuera meter esas dos credenciales.

## Qué se construyó

Se hizo la app entera, siguiendo el plan al pie de la letra:

- **La parte de nutrición**: puedes escribir "200 g de arroz con pollo" (o grabarte diciéndolo) y una IA (Gemini) lo interpreta y calcula las calorías y macros. Después puedes revisar y corregir esos números antes de guardar. También hay un modo "añadido rápido" para comidas que ya tienes guardadas, que funciona sin internet. Y una pantalla de "Hoy" con barras de progreso hacia tus objetivos diarios, más un resumen semanal/mensual con gráficas.
- **La parte de gimnasio**: puedes empezar un entreno vacío o desde una rutina guardada, ir añadiendo ejercicios y series (con el peso/reps de la última vez ya puestos, para no tener que escribirlo de cero), y el entreno se queda guardado aunque cierres la app a mitad. Luego puedes ver el historial de entrenos pasados y gráficas de progreso (peso máximo, fuerza estimada, volumen total) por ejercicio.
- **Ajustes**: donde pones tu API key de Gemini, tus objetivos diarios de calorías/macros, y desde donde puedes exportar o importar toda tu información en un archivo, o borrarla si quieres empezar de cero.
- Se preparó también todo lo necesario para que, en tu iPhone, puedas "Añadir a pantalla de inicio" y que se comporte como una app normal, con su icono y funcionando aunque no tengas cobertura (salvo, claro, la parte que necesita a Gemini).

## Cómo se comprobó que funcionaba

No me quedé solo con que "compilara". Levanté la app en un navegador con vista de móvil y fui probando cada cosa a mano: crear un alimento, añadirlo rápido a una comida, ver que las barras de macros se actualizaban bien, crear una rutina de gimnasio, empezar un entreno desde ella, apuntar series, terminarlo, revisar el historial y ver la gráfica de progreso. También escribí 26 pruebas automáticas para los cálculos importantes (macros, fórmula de fuerza, validación de lo que responde la IA), para que si en el futuro se toca algo, salte un aviso si se rompe algo.

En el camino salieron dos fallos reales que arreglé:
- La app fallaba al arrancar la primera vez (un problema técnico de cómo se guardaban los ajustes por defecto).
- En el entreno activo, los números de repeticiones y peso no se veían bien en pantallas pequeñas (se solapaban). Se ajustó el tamaño para que se vean claros.

## El aviso del modelo de Gemini (404)

Ya con tu API key real probaste la app y te dio un error: el modelo `gemini-2.5-flash` ya no está disponible para cuentas nuevas, y Google indicaba en el propio mensaje que usaras `gemini-3.8-flash`. Esto, en realidad, ya lo habíamos anticipado en el plan original (Google cambia estos nombres de vez en cuando).

Cambié el modelo por defecto en el código, y aproveché que ya tenías la key puesta en el entorno de pruebas para comprobarlo con una llamada real: escribí "2 huevos fritos y una tostada con aceite", Gemini lo interpretó bien, pude revisar los datos, guardarlos, y vi que los totales del día se sumaban correctamente. Después borré esa comida de prueba para no dejar datos falsos.

**Lo único que tienes que hacer tú**: entrar en Ajustes y cambiar el campo "Modelo" a `gemini-3.8-flash` (es un campo de texto normal, no hace falta reinstalar nada).

## Qué queda para más adelante

Solo dos cosas, y las dos dependen de ti:
1. Crear/usar tu cuenta de Cloudflare para publicar la app en una dirección propia.
2. Una vez publicada, probarla en tu iPhone de verdad: el micrófono, añadirla a la pantalla de inicio, y que funcione en modo avión.

En cuanto tengas la cuenta de Cloudflare, seguimos con eso.
