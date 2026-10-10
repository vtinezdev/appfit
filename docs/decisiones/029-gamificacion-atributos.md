# 029 — Gamificación: Atributos, Ritmo, Vitrina y sus principios

Fecha: 2026-10-10 (ampliado el mismo día con Ritmo y Vitrina). Estado: vigente. Revisa, solo en lo que dicen de rachas y de estética gaming, `DESIGN.md` (Do's and Don'ts), `PRODUCT.md` y [ADR 021](021-inicio-minimalista-rueda-energia.md).

## Contexto

Tras una exploración de apps, juegos y estudios (plan y decisiones en `gaming.md`, en la raíz), Víctor eligió Atributos, Ritmo y Vitrina, y dejó Liga por ejercicio y Cumbres para más adelante. Pidió empezar solo por **Atributos** e implementar lo que necesite de Ritmo y, en la misma jornada, **Ritmo** y **Vitrina**. También autorizó rachas cuando una función las necesite, aunque los documentos de identidad decían «no inventar rachas» y «sin estética gaming».

## Decisión

- **Atributos**: nivel y experiencia (XP) de RPG con tres atributos que nunca bajan por inactividad: Fuerza (entrenos y récords), Nutrición (días registrados y proteína) y Constancia (semanas cumplidas). Reglas y curva en [features/atributos.md](../features/atributos.md).
- **Ritmo** ([features/ritmo.md](../features/ritmo.md)), el motor semanal:
  - plan (entrenos 2–6 y días con comidas 3–7; por defecto 3 y 5);
  - estado de cada semana: cumplida, parcial, presente o vacía;
  - hilo, una racha **semanal** de presencia;
  - comodines (uno por cada 4 semanas cumplidas, máximo 2), vueltas e hitos;
  - pausas declaradas (total o solo de entreno), que congelan el hilo.

  Atributos toma de Ritmo la semana cumplida.
- **Vitrina** ([features/vitrina.md](../features/vitrina.md)): 27 piezas de logros (con niveles, repetibles y ocultos), el muro de récords y las colecciones Herbario y Atlas. Es retroactiva, con la fecha real de cada pieza. «Nuevo en la Vitrina» al terminar un entreno y Herbario en Nutrición › Resumen.
- **Progreso derivado, no acumulado**: la XP se recalcula a partir de los registros con funciones puras. No hay tabla ni migración, va en el backup sin cambios, respeta la edición retroactiva y borrar y volver a crear no da nada. Solo se guardan decisiones del usuario como campos opcionales de `Settings`:
  - el plan, por tramos con su lunes de inicio, para que cambiarlo no reescriba semanas pasadas;
  - las pausas;
  - dos interruptores (`gamificacionVisible` y `gamificacionConNutricion`), que valen para los tres sistemas.
- **Rachas autorizadas** cuando una función las necesite, siempre a partir de registros reales (no inventadas). Para el entreno, mejor semanales que diarias. El hilo de Ritmo es la única racha, y es semanal; la racha diaria de registro de Nutrición ya existía.
- **Salvaguardas** para todo lo que venga:
  - Nada se gana ni se pierde por kcal, peso o déficit.
  - Hay un techo en el plan: entrenar o registrar de más no suma (como mucho los entrenos del plan por semana y uno por día). El usuario se marca el plan y la XP de entreno llega hasta cumplirlo.
  - Revisado el mismo día en que se publicó: el descanso ya no multiplica la XP (antes ×1,5 con un día y ×2 con dos o más) y el tope pasa de plan + 1 a plan. Víctor prefiere que el plan mande. Los entrenos cortos dan XP proporcional a sus series (100 desde 6) y cuentan para el plan desde 5.
  - Sin castigos: ni vidas, ni rojo, ni cuentas atrás.
  - Interruptores en Ajustes para ocultarlo todo y para excluir la nutrición.
  - Cada punto se explica con su porqué.
- **Identidad intacta**: tokens y primitives, la XP en grafito (`bg-fg`) y no en naranja, cifras inmediatas, sin confeti ni contadores animados. «Sin estética gaming» pasa a significar sin ornamento de videojuego. Los conceptos de juego (nivel, XP, títulos) se presentan con la gramática visual de siempre.

## Consecuencias

- Tres destinos nuevos en Más: Atributos, Ritmo y Vitrina. Se añaden las tarjetas «Tu semana» y «Nivel» al final del mosaico de Inicio, los bloques «Experiencia» y «Nuevo en la Vitrina» al terminar un entreno, el sello de Ritmo en la revisión semanal y el Herbario en el Resumen. Si se oculta la gamificación, desaparece todo.
- La primera vez que se elige un plan vale para todo el historial; después, cada cambio vale desde la semana en curso.
- Si las reglas cambian, `VERSION_REGLAS` sube y las semanas cerradas deben conservar la XP que dieron. Hoy no hace falta guardar nada para cumplirlo.
- Recalcular todo el historial en Inicio es asumible: unos 70 ms con tres años de datos densos en escritorio (con la Vitrina, unos 150 ms, solo en su página). Para eso, `gym/lib/records` agrupa las series sin copiar arrays y expone `acumularComparables`/`recordsFrenteA`.
