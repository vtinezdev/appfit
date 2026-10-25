# 024 — Precisión silenciosa: pulido visual tras la auditoría

Fecha: 2026-10-08. Estado: vigente. Complementa [020](020-acento-naranja-y-superficies-suaves.md) (paleta y superficies) y [021](021-inicio-minimalista-rueda-energia.md) (Inicio y rueda); renombra el destino «Gym» de [018](018-menu-de-seis-destinos.md). La paleta, la tipografía, las fotografías y la navegación no cambian.

## Contexto

Víctor pidió una auditoría visual para evolucionar AppFit sin rediseñarla. La conclusión fue que la identidad funciona y que lo que restaba calidad era ruido acumulado en pocos días de cambios rápidos: marcas redundantes en cada barra, cuatro maneras de titular una card, cifras y unidades escritas de varias formas, nombres de plato desalineados en el diario, el naranja usado en datos y, en oscuro, una tarjeta de entreno más hundida que las demás desde el ajuste de cards de ese mismo día. Comparó cada propuesta (actual frente a variantes, con los tokens reales y capturas de la app) en un laboratorio visual y aprobó las quince.

## Decisión

Una dirección, «precisión silenciosa»: restar antes de sumar y una sola gramática para cada dato.

- **Barras de progreso**: el final del carril es el objetivo; la marca solo aparece al pasarse (cuando cae dentro). El carril usa el token `line` para leerse sin la marca.
- **Rueda de energía**: lo que falta sigue en negro (ADR 021), pero en un carril de 6 frente a 12 de lo consumido. A 20 rem o menos de tarjeta, la rueda se centra y el texto pasa debajo.
- **Diario**: el chevrón del plato ocupa la columna del icono de categoría, así todos los nombres se alinean; las kcal de la cabecera van en una línea; Repetir muestra el número como texto, sin la pastilla del 8 de octubre (se leía como un aviso).
- **Cards**: el título de una sección va sobre la card, no dentro (Perfil, Progreso, «Último entreno»). Un desplegable no repite la línea de la lista que lo precede ni deja una al final de la card.
- **Entreno en oscuro**: la superficie es más clara que las cards (50 51 56) con borde `training-border` y carril 76 78 84; sigue siendo grafito y la tarjeta principal, como en claro.
- **Naranja**: en Inicio queda para «Registrar comida» y la sección actual; las acciones de tarjeta (peso, agua) van en neutro y la barra del agua en grafito. Una acción naranja sólida por vista («Nuevo» y «Nueva receta» pasan a secundarios) y el primario deshabilitado es neutro.
- **Cifras**: las de filas van rectas; la unidad nunca hereda la cursiva; coma decimal también en «Última vez»; macros siempre «P 11 · C 57 · G 7» (`resumenMacros`); fechas cortas con un único formato («3 oct · 08:21»).
- **Resumen**: la media diaria usa el mismo panel que el Diario, y su navegador pierde la línea (como pidió ADR 017).
- **Progreso**: las líneas ciñen el eje a los datos con un paso redondo (`escalaAjustada`), rejilla tenue, último valor rotulado y una nota cuando el eje no empieza en 0. Las barras conservan el cero.
- **Nombre**: la sección se llama «Entreno» en toda la interfaz y su primera vista «Empezar» («Inicio» se confundía con el destino Inicio). La clave interna sigue siendo `gym`.

## Consecuencias

- Sin cambios de datos, esquema, backup ni repositorios (salvo una lectura nueva de rutinas y series en Historial, por los repos existentes).
- `tramosCarril` gana `marca`; `chart.ts` gana `chartGrid` y `escalaAjustada`; `dates.ts` gana `formatDiaMes`, `formatFechaHora` y `formatFechaHoraConDia`; `workout.ts` gana `detalleSesion`; `agua.ts` gana `partesAgua`. Todos con tests.
- Los scripts de `scripts/ui/` navegan a «Entreno» y pulsan «Empezar».
- Implementación: [DESIGN-SYSTEM](../DESIGN-SYSTEM.md) § Tokens, Primitives, Patrones y Gráficas. Intención: [DESIGN.md](../../DESIGN.md).
