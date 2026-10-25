# 021 — Inicio minimalista con rueda de energía

Fecha: 2026-10-07. Estado: vigente. Retira la regla «sin anillo» de las métricas ([007](007-sistema-visual-movil.md), CLAUDE.md, DESIGN.md) y sustituye la composición de Inicio de [017](017-paleta-cobalto-y-composicion-respirada.md) y [020](020-acento-naranja-y-superficies-suaves.md). Paleta, tipografía y fotografías no cambian.

## Contexto

A Víctor no le acababa de gustar Inicio: saludo, firma y lema; tarjeta grafito de entreno con tres métricas; kcal, barra y tres barras de macros con dos botones; tarjeta de peso con gráfica; y dos accesos rápidos que repetían destinos. Pidió algo más minimalista. Se compararon tres bocetos en un lienzo (poda, lista del día, una cifra protagonista) en ambos temas. Eligió el tercero, pero con las kcal como otra tarjeta pequeña, algo mayor que las demás, en forma de rueda. Comparó rueda ancha frente a alta, negro frente a gris para lo que falta, y tres formas de mostrar el exceso; eligió rueda ancha, negro y segunda vuelta. Sobre la regla que prohibía los anillos: «me gustan los anillos, no hace falta esa regla».

## Decisión

- **Inicio** es «Hoy» con la fecha, una tarjeta ancha de energía, dos tarjetas pequeñas (Entreno y Peso) y «Registrar comida» como acción principal. Sin saludo, firma, lema, gráfica de peso ni accesos rápidos. Se irán añadiendo tarjetas cuando haya funciones nuevas.
- **Rueda de energía**: el anillo exterior se llena con lo consumido hasta el objetivo, repartido en los colores de proteína, hidratos y grasa según las kcal de cada uno (4/4/9); lo que falta va en negro (`kcal-rest`: grafito en claro, negro en oscuro). Las kcal sin desglose (kcal rápidas) forman un tramo en el naranja de la energía. Si te pasas, el exceso da una segunda vuelta en un anillo interior fino, en el naranja de la energía, hasta una vuelta completa. El exceso se cuenta con el mismo tono que quedarse corto, sin rojo.
- Cada tarjeta entera es un acceso: energía abre el día, entreno abre Gym, peso abre el historial y su «+» registra el peso.

## Consecuencias

- La métrica sigue siendo inmediata: cifra completa en el centro, objetivo, «Quedan…» y gramos en texto; la rueda es decorativa para el lector de pantalla. Sin animación de llenado ni contador.
- Inicio deja de usar `TarjetaEntreno destacado`, `ResumenNutricional integrado`, `PesoCard`, `BrandMark` y la mini gráfica de peso; se retiran. El diario de Nutrición conserva su panel con barras.
- El negro de lo que falta en oscuro (negro sobre superficie 22/23/26) es sutil a propósito: lo que debe leerse es lo consumido, que mantiene su contraste.
- Implementación: [features/inicio.md](../features/inicio.md) y [DESIGN-SYSTEM](../DESIGN-SYSTEM.md) § Patrones de producto. Intención: [DESIGN.md](../../DESIGN.md) § Components › Inicio.

## Actualización (2026-10-09, rediseño visual v2)

La rueda de energía se queda como está (Víctor la prefiere a la de la maqueta). Inicio pasa a mosaico de tarjetas con dato propio: Peso con minigráfica, Agua con un vaso que se llena y el Último entreno ancho con el mapa muscular en miniatura y lo más trabajado en texto. Se quita el botón ancho «Registrar comida»: registrar está en el «+» central de la barra ([ADR 028](028-barra-de-pestanas-y-registrar.md)). Sigue sin haber saludo, rachas ni accesos que repitan destinos (el 10 de octubre, [ADR 029](029-gamificacion-atributos.md) añade al final la tarjeta «Nivel» de Atributos y autoriza rachas si una función las necesita).
