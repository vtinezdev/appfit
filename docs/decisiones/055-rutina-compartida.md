# 055 · Compartir una rutina para guardarla

2026-10-23 · Aceptada. Víctor aprueba en la página de previews A10–A14 hacerlo ya, con este ADR y la migración 0022 (paso A13 del [carril A](../plan-evolucion/carril-a.md), plan F3-2 de [`social-mejoras.md`](../social-mejoras.md)).

Desde la ficha de una rutina, «Compartir rutina» publica su **estructura** en Social con el mismo editor, destinatarios y vista previa que un entreno ([ADR 040](040-parte-social.md), [053](053-compartir-todo-o-nada.md)). Quien la ve pulsa «Guardar en mis rutinas», revisa nombre y ejercicios y la guarda como rutina nueva suya.

## Qué sale del móvil

Un resumen nuevo `tipo: 'rutina'` (`v: 1`): el nombre de la rutina, una nota opcional y de 1 a 15 ejercicios en orden. De cada ejercicio, su nombre, el id del catálogo de la app (`appfit:…`) o `null` si es propio, y, si la rutina tiene objetivo para él, series, rango de repeticiones y, opcionales, descanso y calentamientos. Nada más: **nunca cargas**, marcas, historial, gimnasio, agarre, notas ni ids locales. Como en el resto de Social, se publica entero o no se publica.

## Al guardarla

Se guarda con `routinesRepo.guardarCompartida` en una transacción: cada ejercicio del catálogo pasa a ser el de quien guarda (reutilizando el suyo si ya lo tiene), y los propios de quien la compartió (o los de un catálogo más nuevo) se eligen en el buscador o se quitan. Los objetivos vuelven a los límites de la app (`sanearObjetivo`); el nombre se hace libre frente a las rutinas existentes. No se copia ninguna serie: las cargas las pone cada uno al entrenar.

## Despliegue

Lector antes que escritor, como en [ADR 044](044-control-social-y-compatibilidad.md): la app nueva lee y pinta el tipo, y las anteriores lo descartan sin romper la paginación. `0022_social_rutina_compartida.sql` amplía `publicaciones_tipo_check` y `social_resumen_valido`, y añade `rutinaCompartida` a `social_capacidades`. La app solo ofrece compartir cuando el servidor anuncia esa capacidad, así que el orden es desplegar la app y después ejecutar la migración.

## Alternativas descartadas

- Copiar también las cargas de quien la comparte: son datos de su cuerpo y su historial, y no sirven a otra persona.
- Un enlace para importar fuera de Social: la app no tiene rutas por URL (F3-4 sigue pendiente).
- Ampliar `OrigenActividad` o marcar la rutina como «compartida» en el diario: haría falta una versión de Dexie y no aporta nada a quien la guarda.
