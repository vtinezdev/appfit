# 057 · Semana en compañía

2026-10-23 · Aceptada. Víctor la aprueba en la página de previews de los cinco siguientes, con sus decisiones D11 (paso A14 del [carril A](../plan-evolucion/carril-a.md), plan F3-1 de [`social-mejoras.md`](../social-mejoras.md)). Antes de abrirla a más gente, Víctor organiza un piloto de 3–4 semanas con parejas.

Dos o tres personas se acompañan semana tras semana, cada una contra su propio plan de Ritmo. En Social, arriba de Siguiendo, cada grupo enseña a sus miembros con cómo va su semana («Laura · 2 de 3», «Semana cumplida», «En pausa») y un «Ánimo» por persona y semana. Sin ranking, porcentajes ni castigos.

## Decisiones de Víctor (D11)

- **Objetivo:** el plan de Ritmo de cada uno para esa semana, no uno acordado. Cuentan los entrenos que cuentan para Ritmo, como en la semana compartida ([ADR 056](056-compartir-la-semana-de-ritmo.md)). Hacer más que el plan no da ventaja: 4 de 3 es «Semana cumplida».
- **Semana:** de lunes a domingo en la hora local de cada uno. El móvil envía su lunes; a los demás solo se les enseña tu semana si es la suya (si no, «Sin datos esta semana»).
- **A quién:** solo a personas que os seguís mutuamente, con todas las que ya están en el grupo. Grupos de 2 o 3 personas.
- **Duración:** continua, semana tras semana, hasta que alguien pausa o sale.

## Qué sale del móvil

Solo el agregado de tu semana: el lunes, los entrenos que cuentan (0–7) y los entrenos de tu plan (0–7). Se calcula en el móvil con Ritmo, sin modificarlo, y se sube al abrir Social si cambió. Solo se guarda mientras estás dentro de algún grupo (el servidor lo rechaza si no lo estás): una fila por persona, que se sobrescribe y se borra al salir del último grupo. Solo lo ven los miembros del grupo y solo mientras estás activo; en pausa no se enseña. Con la gamificación oculta no hay Ritmo y no se sube nada. Nunca kcal, peso, medidas, días registrados ni el hilo.

## Reglas

- Aceptar antes de participar. La invitación se acepta o se rechaza; rechazar no avisa a nadie.
- Pausa y salida sin reproche y sin avisos. En pausa sigues en el grupo con un estado neutro y sin cifras. Si al salir queda una sola persona, o nadie que haya aceptado, el grupo se cierra.
- Plan sin entrenos: estado neutro («Sin entrenos en su plan»), sin cifras.
- «Ánimo»: uno por persona y semana, que solo ve el grupo. No hay avisos nuevos: las invitaciones y los ánimos se ven al abrir Social.
- Límites: 5 grupos por persona y 20 invitaciones al día. Bloquear a alguien te saca de los grupos que compartís; borrar el perfil, de todos.
- Sin premios ni puntos.

## Despliegue

Lector antes que escritor, como [055](055-rutina-compartida.md) y [056](056-compartir-la-semana-de-ritmo.md). `0024_social_semana_compania.sql` crea `companias`, `companeros`, `companeros_semana` y `companeros_animos` con RLS y sin acceso directo, y las RPC `companias`, `invitar_compania`, `responder_compania`, `pausar_compania`, `salir_compania`, `subir_semana_compania` y `animar_companero`. También añade `semanaCompania` a `social_capacidades`. La app solo lo enseña cuando el servidor lo anuncia: desplegar y después ejecutar 0024.

## Piloto

3–4 semanas con parejas de niveles distintos, organizado por Víctor. Preguntas: ¿queréis repetir?, ¿hubo presión?, ¿se entiende «2 de 3»? Se mide con recuentos agregados en el SQL Editor y entrevistas, sin analítica (`social-mejoras.md` § Validación). A15 (expediciones de comunidad) espera a que el piloto funcione.

## Alternativas descartadas

- Un objetivo acordado entre todos, la semana de quien crea el grupo, invitar a cualquiera que sigas o grupos de hasta 4, y semanas sueltas que se renuevan: Víctor eligió las opciones de arriba.
- Porcentaje, ranking o «semana fallida»: van contra «sin castigos» (`DESIGN.md`).
- Subir la semana en segundo plano o desde Inicio: no hay sondeo ni tareas en segundo plano, e Inicio es del carril B. Basta con abrir Social.
- Avisos de invitación y de ánimo: amplían `social_eventos` y el contador de avisos. Se deciden con el piloto.
