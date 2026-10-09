# 028 — Barra de pestañas con «+» central

Fecha: 2026-10-09. Estado: vigente. Sustituye [ADR 008](008-menu-radial.md) (navegación bajo demanda en una rueda) y [ADR 018](018-menu-de-seis-destinos.md) (abanico de seis destinos). Parte del rediseño visual v2.

## Contexto

El botón Menú escondía las secciones de uso diario detrás de un toque más y obligaba a Inicio a llevar un botón ancho «Registrar comida» como atajo. Víctor comparó propuestas con capturas de la versión actual y aprobó una barra de pestañas fija con una acción central para registrar, como en las apps de nutrición y gimnasio que usa.

## Decisión

- **Barra fija**: Inicio · Nutrición · [+] · Entreno · Más, con safe area inferior. Pestañas con icono y nombre (≥48 px de alto); la actual en texto principal con el icono en naranja y `aria-current="page"`.
- **«+» central** naranja (`--tab-plus-size`, cápsula con significado): abre la hoja «Registrar» con Registrar comida, Empezar entreno (vacío o desde una rutina; «Volver al entreno» si hay uno activo), Registrar peso y Añadir agua. Reutiliza los flujos de siempre (Añadir comida, `workoutsRepo.empezar`, `RegistrarPesoSheet`, `AguaSheet`); la acción elegida se ejecuta al terminar de cerrarse la hoja, sin apilar capas.
- **Más** es una hoja con Perfil, Referencias y Ajustes; la pestaña Más queda marcada cuando la sección actual es una de ellas.
- **Una sola acción naranja sólida por vista**: el «+» siempre está a la vista, así que las acciones naranjas de cada pantalla pasan a neutro (el «+» de la cabecera de Nutrición, «Nueva rutina», empezar en Entreno, Terminar, Continuar, Listo, Exportar ahora). Sheets y páginas modales tapan la barra y conservan su acción principal naranja.
- Inicio pierde el botón ancho «Registrar comida».

## Consecuencias

- Desaparecen `RuedaNavegacion`, `shared/design/rueda.ts`, los tokens `--menu-*` y el CSS del abanico; `scripts/ui/validar-menu-radial.cjs` se retira y `scripts/ui/navegar.cjs` recorre la barra y «Más».
- `data-nav-trigger` pasa al «+»: si el disparador de una capa desaparece, el foco vuelve a la pestaña actual o al «+».
- Añadir una sección nueva es añadirla a `DESTINOS` y a `EN_MAS` (o, si es diaria, decidir con Víctor si merece pestaña).
