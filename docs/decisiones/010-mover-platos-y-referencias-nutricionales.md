# 010 — Movimiento completo de platos y referencias diarias honestas

Fecha: 2026-10-04. Estado: aceptada.

## Contexto

El diario permitía copiar platos o mover un ingrediente editándolo, pero faltaba trasladar el grupo completo por tacto. «Editar plato» ya añadía ingredientes, aunque su nombre no lo explicaba. La vista detallada mostraba gramos sin referencias diarias; el modelo registra azúcares totales, no libres.

## Decisión

Nombrar la tarea «Añadir ingredientes». Mover mediante asa o un selector de destinos accesible, con la misma operación transaccional, guardas de composición y Deshacer que conserva las ediciones posteriores. Usar dnd-kit para contexto/teclado/autoscroll/accesibilidad, con un sensor público de Pointer Events para identificar y cancelar el gesto; cargarlo con Hoy. Sin HTML drag nativo, nuevas capas de navegación, copias encubiertas ni cambios de esquema.

Las referencias describen población adulta y datos realmente disponibles. No son prescripciones personales ni metas nuevas persistidas:

| Nutriente | Marca de la barra | Fuente |
|---|---|---|
| Fibra | Mínimo 25 g, sin máximo general inventado | [OMS, alimentación saludable](https://www.who.int/news-room/fact-sheets/detail/healthy-diet) |
| Sal | Menos de 5 g, sin mínimo recomendado inventado | [OMS, reducción de sal](https://www.who.int/news-room/fact-sheets/detail/salt-reduction) |
| Grasas saturadas | Máximo 10% de kcal objetivo / 9 kcal por gramo | OMS, alimentación saludable; 2.000 kcal si el objetivo no es válido |
| Azúcares totales | Referencia de etiquetado de 90 g para 2.000 kcal; **no máximo recomendado** | [UE 1169/2011, anexo XIII](https://eur-lex.europa.eu/legal-content/ES/TXT/?uri=CELEX:32011R1169) |

La OMS limita los azúcares **libres** a menos del 10% de energía (idealmente menos del 5%). Sin ese dato no se comparan azúcares totales contra ese límite: incluye, por ejemplo, azúcares propios de fruta y leche. El Disclosure explica el alcance y las fuentes. Referencias consultadas en las páginas oficiales actuales; no se infieren rangos que las fuentes no establecen.

## Consecuencias

Preserva históricos, catálogos, nutrientes opcionales y backups. Una composición modificada exige elegir de nuevo el plato; no se resucitan borrados al deshacer. La marca de cada barra conserva su significado, cobertura parcial y alternativa textual, sin poner verde/rojo ni evaluar la salud a partir de datos incompletos. No hay límites diarios en la revisión de una ración individual. No se añade seguimiento de azúcares libres ni personalización clínica; necesitarían otra petición y datos específicos.
