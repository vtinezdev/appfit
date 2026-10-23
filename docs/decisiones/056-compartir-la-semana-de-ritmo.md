# 056 · Compartir tu semana de Ritmo

2026-10-23 · Aceptada. Víctor aprueba en la página de previews de los cinco siguientes compartir la semana con la opción «Estoy retomando» y hacerlo antes de A14 (paso A18 del [carril A](../plan-evolucion/carril-a.md), plan F3-3 de [`social-mejoras.md`](../social-mejoras.md)).

En el compositor de Social, «Tu semana» con su línea de Ritmo («2 de 3 entrenos») y «Compartir», que deja elegir entre tres cosas y abre el editor de siempre (destinatarios, nota y vista previa, [ADR 040](040-parte-social.md)). Nunca es automático.

## Qué sale del móvil

Un resumen nuevo `tipo: 'semana'` (`v: 1`) con el lunes de la semana y uno de tres estados:

- **semana**: los siete días (si hubo un entreno que cuenta para Ritmo), entrenos hechos, entrenos del plan de esa semana e hilo de semanas. Título «Semana cumplida» o «2 de 3 entrenos».
- **retomando**: «Estoy retomando» y, como mucho, los entrenos de la semana.
- **pausa**: «En pausa», sin motivo ni cifras.

Nunca kcal, peso, medidas ni días con comida registrada (aunque Ritmo los use), ni «semana fallida»: lo que no llega al plan es «2 de 3». Con la gamificación oculta no se ofrecen las cifras de Ritmo, solo «Estoy retomando» y «En pausa». Todo se calcula en el móvil con Ritmo, sin modificarlo.

## Despliegue

Como el de la rutina ([ADR 055](055-rutina-compartida.md)): lector antes que escritor. `0023_social_semana_ritmo.sql` amplía `publicaciones_tipo_check` y `social_resumen_valido` (claves cerradas, cifras enteras y acotadas, cada estado con sus campos) y añade `semanaRitmo` a `social_capacidades`. La app solo ofrece compartir la semana cuando el servidor lo anuncia: desplegar y después ejecutar 0023.

## Alternativas descartadas

- Compartir también los días registrados de comida: es nutrición, que Social no publica nunca.
- Publicar la semana sola al cerrarse: Social es siempre a propósito.
- Un botón en Ritmo: Ritmo es del carril B; el compositor de Social ya es donde se comparte lo propio.
