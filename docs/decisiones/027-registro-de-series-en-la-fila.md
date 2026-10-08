# 027 · Registro de series en la fila

Fecha: 2026-10-08. Estado: vigente. Sustituye la presentación de [026](026-ejecucion-tecnicas-y-progresion-confirmada.md) (pestañas de técnica, RIR con −/+, «Ajustes del ejercicio»); su modelo de datos, cálculos y comparabilidad siguen vigentes.

## Contexto

Las mejoras 2–10 de Entreno llegaron cada una con su propio lenguaje visual: RIR con −/+ apilados que doblaban la altura de la fila, ejecución y agarre en dos sitios (ajustes del ejercicio y «…» de cada serie, que además volvía a pedir reps y kg), negativas como desplegable y dropsets en una hoja con pestañas. En la fila solo quedaba texto gris. Víctor revisó una comparativa con capturas reales y propuestas dibujadas con los tokens de AppFit y eligió las recomendadas, manteniendo el orden Reps · Kg.

## Decisión

Seguir las convenciones de Strong y Hevy, que son las que conoce la mayoría:

- **Una serie, una fila; sus partes, filas hijas.** Fila: tipo/número · Reps · Kg · RIR · ✓. Lados distintos (I/D) y bajadas de dropset (↓) son filas sangradas en la misma rejilla, con sus campos editables. Lo que se ve es lo que se registra.
- **El número dice el tipo de serie.** Tocarlo abre la hoja de la serie: Normal, C · Calentamiento, D · Dropset, N · Negativas (un solo tipo visible; pasar a dropset crea la primera bajada copiando la carga), bajada lenta en segundos, agarre solo de esa serie, discos y borrar. Cada elección se guarda al tocarla. El ✓ pasa al final de la fila.
- **RIR por selector.** Celda del tamaño de reps/kg que abre 0 (al fallo) … 5+ y «Quitar RIR». Se abre sola al marcar una serie efectiva sin RIR; el ajuste `rirAlCompletar` lo desactiva.
- **La variante es del ejercicio.** Botones bajo el título muestran carga, ejecución y agarre; abren hojas con opciones visibles en lugar de desplegables. La ejecución (bilateral, unilateral iguales, cada lado) es del ejercicio en la sesión; por serie solo cambia el agarre.
- **Una sola puerta para las acciones del ejercicio.** «…» de la cabecera: nota, progresión, subir/bajar, quitar. La sugerencia de progresión solo se anuncia en la cabecera cuando hay una propuesta pendiente.

## Consecuencias

La cabecera pasa de unos 250 a unos 100 px y una serie normal de unos 120 a unos 56 px. Desaparecen `TecnicaSerie`, `RirStepper` y `OpcionEjercicio`. Lados y bajadas se escriben con un cambio calculado sobre la serie guardada (`setsRepo.actualizar(id, serie => cambios)`), para que dos campos editados seguidos no se pisen. No cambian tablas, índices, backup ni CSV; el único dato nuevo es el ajuste opcional `rirAlCompletar`. Ya no se puede cambiar la ejecución de una sola serie desde la interfaz (los datos antiguos con ejecución distinta se señalan bajo la serie). Las combinaciones antiguas (calentamiento + negativas, dropset + negativas) se muestran con la letra de mayor peso y una etiqueta con el resto.
