# 006 — Sin IA: intérprete local de comidas

- **Estado**: vigente (desde §37; sustituye al uso de Gemini de las sesiones 01–05)
- **Historia**: `PROCESO.md` §4, §12, §21, §34 y §37. Funcionamiento actual: `../features/nutricion.md` § Intérprete local.

## Contexto

La app interpretaba las comidas con la API gratuita de Gemini (texto y voz). En la práctica estaba saturada a menudo (503), exigía una API key guardada en el móvil y conexión. El intérprete local (§34), junto con el catálogo, ya cubría el uso diario.

## Decisión

- Se retira la IA entera: cliente de Gemini, prompts, grabación de voz y ajustes de API key y modelo.
- Las comidas se interpretan en el dispositivo: texto libre o dictado del teclado de iOS → `parsear` → búsqueda en tus alimentos y en el catálogo → revisión editable.

## Consecuencias

- Todo funciona sin conexión y sin credenciales; nada sale del móvil al interpretar.
- Las frases que el intérprete no entiende se resuelven en la revisión («Cambiar», buscar o escribir los valores); las medidas que faltan se apuntan en «Medidas».
- Se conserva `FuenteAlimento = 'gemini'` para los alimentos creados entonces, y los backups antiguos siguen importando (se descartan `apiKey` y `modelo`).
