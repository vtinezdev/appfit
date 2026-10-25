# 058 — Un solo destino «Progreso»

Fecha: 2026-10-24. Estado: vigente. Cambia [ADR 043](043-media-luna-de-secciones.md) en dos puntos: Cumbres, Caminos, Ritmo y Vitrina dejan de ser cuatro destinos sueltos que se abren desde Inicio, y la media luna pasa a siete secciones.

## Contexto

Las cuatro secciones de progreso eran páginas separadas, cada una con su «‹ Inicio», y solo se llegaba a ellas por las teselas de Inicio. El plan de evolución (B12, GAM-02) propuso juntarlas en un destino con pestañas como base para las metas (B13) y el calendario (B14). En las previews de B9–B16, Víctor decide implementarlo y que «Progreso» vaya también en la media luna, no solo desde Inicio.

## Decisión

- **Destino `progreso`** (`app/navegacion.ts`), en la media luna entre Entreno y Social: Inicio · Perfil · Nutrición · Entreno · Progreso · Social · Ajustes. `cumbres`, `caminos`, `ritmo` y `vitrina` dejan de ser destinos (`Tab`).
- **`features/progreso/ProgresoTab`** con `ViewTabs` Semana · Cumbres · Caminos · Vitrina. La pestaña Semana reúne lo de esta semana en Cumbres, Caminos y Vitrina y la página de Ritmo, con su calendario, que abre las revisiones (B5). Las páginas de siempre se montan como vistas con `incrustada`: sin márgenes de página, con el título solo para el lector de pantalla (`PageHeader.incrustada`) y con su «Cómo funciona».
- **Desde Inicio**: cada tesela abre Progreso en su pestaña (la de Ritmo, en Semana; `progreso/lib/vistas`) con «‹ Inicio», que vuelve con el foco en esa tesela. Desde la media luna no hay «Volver».
- **Visibilidad**: con Cumbres, Caminos, Ritmo y Vitrina ocultos en Ajustes, Progreso sale de la media luna (`destinosOcultos`); sin Actividades (B9), no hay pestaña Caminos.
- **Media luna de siete**: para que quepan a 320 px, la elevación pasa de 170 a 210 px (`--arco-ry`) y los extremos de 168°/12° a 174°/6° (`app/arco.ts`); `arco.test.ts` comprueba 5, 6 y 7 secciones.

## Consecuencias

- Las teselas de Inicio siguen; abren una pestaña en vez de una página.
- `scripts/ui/navegar.cjs` entra en Cumbres, Caminos, Ritmo y Vitrina por la media luna y su pestaña.
- Un octavo destino en la media luna no cabe con esta geometría: habría que revisar `arco.test.ts` y, probablemente, el diseño.
