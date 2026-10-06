# 018 — Menú de seis destinos con dianas circulares

Fecha: 2026-10-06. Estado: aceptada. Sustituye en ADR 011 la frase sobre cinco destinos amplios y paginación desde el sexto.

## Contexto

Perfil es la sexta sección principal (Inicio · Nutrición · Gym · Perfil · Referencias · Ajustes). Con rectángulos de 84×68 px, seis destinos no caben en 320 px sin reducir controles.

## Decisión

`OPCIONES_POR_RUEDA = 6`: dos filas de tres, la de arriba primero en el orden de lectura. Cada destino es una **diana circular** de 84 px (`--menu-node-size`, `rounded-pill` con significado de nodo) con icono y etiqueta dentro; la actual con relleno de acento, borde y check. Filas a 0,8 y 1,4 de elevación (128 y 224 px), órbita de 104 px a 320 px: centros a ≥ diámetro + 8 px, dentro de los márgenes de 14 px y por encima del botón Menú (`rueda.test.ts`). La paginación solo aparece con más de seis destinos. El modo compacto (texto ampliado o landscape muy bajo) conserva la rejilla rectangular de dos columnas, para no comprimir etiquetas.

## Consecuencias

Mismos origen, teclado, capas y Reduce Motion de ADR 008. Perfil es un chunk diferido. Geometría pura en `shared/design/rueda.ts`.
