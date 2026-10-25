# 017 — Paleta Cobalto y composición respirada

Fecha: 2026-10-06. Estado: paleta y regla de sombras sustituidas por [020](020-acento-naranja-y-superficies-suaves.md); la composición sigue vigente. Sustituye la paleta de [012](012-identidad-enfocada-energica.md) (grafito + blanco + naranja) y el tono cálido de las luces de [013](013-atmosferas-fotograficas.md).

## Contexto

Una auditoría con las skills impeccable y UI/UX Pro Max encontró que el contraste ya era AA en todo, pero había problemas de distinción y de ruido. El naranja hacía a la vez de acción y de kcal y aparecía unas diez veces por pantalla. Proteína, carbohidratos y grasa casi no se distinguían (ΔE 1,8 con protanopia), y en claro «acción» y «borrar» eran casi el mismo color (ΔE 3,5). Además, cada comida eran tres cajas apiladas. Víctor comparó cinco direcciones de color con la pantalla de Nutrición en claro y oscuro, eligió Cobalto y pidió un diseño más minimalista y respirado. Debía mantener la información, la jerarquía y las funciones, y tener menos colores con una jerarquía cromática clara.

## Decisión

Jerarquía cromática de cuatro niveles, todos en OKLCH:

1. **Grafito frío** (tono 258, croma bajo) en fondos, superficies, texto y bordes. Es lo que domina.
2. **Cobalto** para actuar: botón principal, foco, selección, pestaña activa, menú y enlaces de acción.
3. **Ámbar** solo para la energía: barra y cifra de kcal del día. Acción y energía dejan de compartir color.
4. **Primos atenuados** de esas dos familias para los datos: proteína índigo y carbohidratos turquesa (vecinos del cobalto), grasa arcilla (vecina del ámbar). El aviso pasa a la familia ámbar y el mapa muscular a una rampa de cobalto. Rojo (borrar) y verde (serie hecha) quedan como únicos colores semánticos fuera de las familias.

Composición: el color se reserva a la acción principal y al total del día. Las cabeceras de comida son títulos sobre la página, sin placa grafito, sin icono en círculo, sin divisor vertical y con kcal neutras. Cada comida es una sola superficie con filas planas y «Añadir a…» en tono neutro (variante `subtle` de `Button`). Las pestañas pierden el carril y conservan el indicador; el navegador de día pierde su línea y su caja. El velo de lectura de la cabecera es una franja que se desvanece, no una caja por elemento. El panel del Diario no repite el título «Nutrición · hoy». La pestaña pasa a llamarse «Diario» y «Carbohidr.» pasa a «Hidratos». Se quita la marca «AF/» de la barra inferior.

## Consecuencias

- Tests nuevos en `contrast.test.ts` exigen distancia perceptual entre macros (ΔE ≥ 10), entre acción textual y borrar (≥ 15) y entre kcal y acción (≥ 15), además del contraste AA existente.
- Las luces de ambiente pasan a pizarra/niebla (Inicio), arena/pizarra (Nutrición) y cobalto/acero (Gym). Las fotografías no cambian.
- Se elimina el contexto `data-surface="meal-header"`. `meal-accent` queda solo para el cobalto legible sobre grafito de `.training-surface`.
- Se descarta ocultar las kcal de un registro único (solapaban con la cabecera) porque esa cifra lleva la marca «≈» de los registros aproximados. Las acciones de fila (papelera frente a «…») se mantienen: borrar un alimento suelto en un toque, con Deshacer, prima la velocidad de registro.
- Implementación: [DESIGN-SYSTEM](../DESIGN-SYSTEM.md) § Tokens. Intención: [DESIGN.md](../../DESIGN.md) § Colors.
