# 053 · Un entreno se comparte entero o no se comparte

2026-10-20 · Aceptada. Víctor quita los filtros del editor al compartir: «si quieres compartir un entreno, lo compartes todo o no lo compartes».

El editor de un entreno o una actividad ya no tiene «Mostrar en este resumen» (duración, volumen, mapa, ejercicios, ligas, Vitrina y cada récord). Se publica el resumen tal como lo construye la app: lo que la persona decide es si lo comparte, a quién y con qué nota, y la vista previa sigue enseñando todo lo que se envía. Desaparecen `lib/seleccion.ts` y `components/SeleccionPublicacion`.

El resumen sigue siendo el mismo de los ADR [040](040-parte-social.md) y [044](044-control-social-y-compatibilidad.md): sin nutrición, peso, medidas ni recorrido GPS, y con los límites de siempre (hasta 15 ejercicios y 6 récords, ligas y piezas). Antes solo iba por defecto el récord principal de cada ejercicio; ahora van los que caben, ordenados como en `ordenarRecords`.

Del ADR 044 se mantiene la compatibilidad de lectura: las publicaciones antiguas sin duración o volumen se siguen leyendo, y el servidor conserva `social_configuracion.campos_opcionales`. La app ya no escribe resúmenes con cifras omitidas, así que activar esa opción no cambia nada en el cliente actual.
