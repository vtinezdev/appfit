# ADR 007 — Un sistema visual pequeño para toda la aplicación

Estado: base arquitectónica conservada; la dirección de neutrales cálidos se sustituye por tinta/mineral en [ADR 009](009-identidad-y-motion-impeccable.md). El texto siguiente registra la decisión original.

## Contexto

El diseño anterior repetía métricas, imponía superficies oscuras, superponía la barra al contenido y comprimía controles con demasiadas variantes. Las features compartían tokens pero no jerarquía. El rediseño permite sustituir esas decisiones preservando la app local-first.

## Decisión

Precisión deportiva y calma ([DESIGN.md](../../DESIGN.md)), neutrales cálidos, un acento naranja funcional y una fuente local. Tokens → Tailwind → pocos componentes; composición de dominio en las features.

Nav con espacio propio y scroll explícito. Pestañas y selectores de valor separados. Sheets/tareas comparten portal, aislamiento y foco. Formularios frecuentes priorizan dato/cantidad/acción; detalles bajo demanda. Gym usa campos directos grandes. Listas planas y paneles por unidad real; métricas inmediatas y gráficas con datos textuales, sin tendencia ficticia de una sesión. Fuente OFL en caché; ninguna nueva librería visual ni llamada externa.

## Consecuencias

Se retiran anillo, contador, ink/contrast, campos compactos y decoración global. El guard protege el lenguaje nuevo. No requiere migración de IndexedDB/backup ni cambios de repositorios.

El scroll es del shell: saltos sobre su contenedor/elemento, no sobre window. Las capas pasan por Sheet/ModalPage. Teclado y safe areas de WebKit necesitan dispositivo además de la automatización de Chromium.
