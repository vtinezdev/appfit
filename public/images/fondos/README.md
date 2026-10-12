# Fondos dibujados

| Archivo | Uso | Origen |
|---|---|---|
| curvas.svg | Máscara del fondo «Curvas» (Ajustes › Apariencia): curvas de nivel de un macizo visto desde arriba | Generado con `node scripts/fondos/curvas.cjs` (determinista, sin datos ni servicios externos) |

El trazo es blanco porque solo se usa como máscara: el color y la opacidad vienen de los tokens (`accent-strong`, `--atmosphere-contour-opacity`). Decisión en [ADR 036](../../../docs/decisiones/036-fondos-dibujados.md); implementación en `docs/DESIGN-SYSTEM.md` › Fondo fotográfico.
