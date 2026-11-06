# 066 — Bienvenida y sin objetivos por defecto

Fecha: 2026-11-05. Estado: vigente. Cumple § Trabajo pendiente, punto 1, de [`despliegue.md`](../despliegue.md) y el § 6 de [`mejoras.md`](../mejoras.md) (uso por otras personas).

## Contexto

La app nació para Víctor: una instalación nueva abría Inicio sin explicar nada y con unos objetivos de 2.200 kcal y 150 g de proteína que nadie había elegido, que además daban XP de proteína y entraban en la adherencia y los logros. Para abrirla a otras personas, Víctor eligió (2026-11-05): una bienvenida por pasos cortos que se pueden saltar, una pantalla que explique Cumbres, Ritmo y Liga y, si se salta el perfil, ningún objetivo hasta tenerlo.

## Decisión

- **Solo en instalaciones nuevas.** `ensureSettings`, al crear los ajustes por primera vez, pone `Settings.bienvenidaPendiente` y `Settings.sinObjetivos`. Una instalación existente, un backup importado o una copia de la nube traen sus propios ajustes, sin estas marcas: nada cambia para quien ya usa la app.
- **Bienvenida** (`app/Bienvenida`, lógica en `app/bienvenida.ts`), una `ModalPage` encima de Inicio con cuatro pasos: entrada (qué es, 16 años o más y aceptar las condiciones y la privacidad, [ADR 065](065-textos-legales-y-edad-minima.md)), lo que vas a usar (`ModulosAjustes` sin ordenar Inicio), tu objetivo diario (`PerfilTab` en modo bienvenida; sin Nutrición no se pide) y Cumbres, Ritmo y Liga (una frase por sistema y `GamificacionAjustes`, con el plan semanal). Cada paso guarda al tocarlo, con los mismos controles que Ajustes y Perfil, sin formularios duplicados. El perfil se puede pasar con «Ahora no»; la entrada no, y «Volver» lleva al paso anterior. Al terminar se quita la marca y se guarda `textosLegalesAceptados` con la versión de los textos.
- **Sin objetivo** mientras haya `sinObjetivos` y el perfil no dé kcal: `objetivosVigentes` devuelve cero con origen `ninguno`. Toda la app ya trataba un objetivo de cero como «sin objetivo»: sin «Quedan», sin metas en las barras ni en los anillos, sin XP de proteína, sin adherencia ni logros de kcal. Los días que se congelan en ese estado guardan cero, que es lo que hubo. Inicio dice «Sin objetivo diario» y ofrece «Calcular mi objetivo» (Perfil); Ajustes › Objetivos enseña los valores de ejemplo con el aviso, y guardar uno quita la marca; Referencias dice «Sin objetivo».
- Alternativas descartadas: una sola pantalla con pistas después (el objetivo genérico seguiría ahí) y el perfil obligatorio (cuesta más empezar).

## Consecuencias

- Los recorridos de navegador arrancan de cero y ven la bienvenida: `scripts/ui/bienvenida.cjs` (cargado por `navegar.cjs`) la pasa como una persona, así que quedan sin objetivo salvo que importen un backup con ajustes. `APPFIT_UI_CON_BIENVENIDA=1` lo desactiva.
- `DEFAULT_OBJETIVOS` sigue siendo el punto de partida de los objetivos manuales y lo que tienen las instalaciones anteriores.
- Si cambian las condiciones o la privacidad de forma importante, `VERSION_TEXTOS_LEGALES` permite saber quién aceptó la versión anterior y pedir la nueva.
