# 004 — Alimentos identificados por nombre y entradas con snapshot

- **Estado**: vigente
- **Historia**: `PROCESO.md` §17 (P4, P5, P11, P12), §31 y §33 (referencias al catálogo). Reglas actuales: `../datos.md` § Invariantes.

## Contexto

Guardar una comida reutilizaba o sobrescribía alimentos de forma inesperada: todo acababa marcado como «manual», editar una entrada sobrescribía el alimento global con valores reconstruidos y renombrar dejaba la clave única desfasada. Después llegó el catálogo, con alimentos que no son del usuario.

## Decisión

- **Un alimento propio es su nombre normalizado** (`nombreNorm`, único). Renombrar en la revisión produce otro alimento; nunca se renombra uno guardado por accidente.
- **Las entradas guardan un snapshot** de gramos y macros. **Editar una entrada solo cambia esa entrada** (decisión de Víctor); corregir el alimento es una casilla explícita.
- **Referencias blandas**: una entrada o ítem apunta como mucho a un `foodId` o a un `catalogId`. Añadir desde el catálogo **no crea un alimento propio**.

## Consecuencias

- Los datos históricos no cambian si se edita o se borra un alimento, o si el catálogo se actualiza.
- Las variantes de nombre («pollo, pechuga» / «pechuga de pollo») son alimentos distintos; fusionar duplicados está en `../roadmap.md`.
- Los ids del catálogo deben ser estables entre versiones del paquete (la tubería lo comprueba).
