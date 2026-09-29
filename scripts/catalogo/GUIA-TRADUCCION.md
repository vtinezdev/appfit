# Guía de traducción CIQUAL → español (España)

Entrada: `scripts/catalogo/ciqual/nombres.csv` (`code;nombre_fr;nombre_en;grupo`, UTF-8, `;`). Usa FR como fuente principal y EN como apoyo; `grupo` es contexto.

Salida: CSV UTF-8 con cabecera exacta `code;nombre_es;alias`, una fila por código de tu rango, mismo orden.
- NO uses `;` ni `"` dentro de nombre_es ni alias (así no hace falta entrecomillar). Usa comas.
- `alias`: vacío casi siempre. Solo para alimentos cotidianos con sinónimo real en español que no comparta palabra con el nombre (p. ej. Plátano → `banana`; Judías verdes → `vainas`; no inventes regionalismos dudosos). Varios alias separados por `|`. Como mucho ~1 de cada 15 filas.

Estilo del nombre:
- Español de España: patata, zumo, melocotón, albaricoque, judías, gambas, nata, calabacín, maíz, yogur, requesón, atún, bonito, piña, fresa, aguacate, pimiento, champiñón, ternera (veau) / vacuno o buey (bœuf, usa «ternera» si es el término habitual en España para esa pieza), cerdo, pavo, pollo.
- Estructura como CIQUAL: sustantivo principal primero y descriptores separados por comas: «Pechuga de pollo, sin piel, asada». Empieza con mayúscula, resto en minúscula salvo nombres propios.
- Estados y preparaciones: cru → crudo/a; cuit → cocido/a; cuit à l'eau / bouilli → hervido/a; rôti / au four → asado/a / al horno; grillé → a la plancha (carnes/pescados) o tostado/a (frutos secos, pan); frit → frito/a; poêlé → a la sartén; à la vapeur → al vapor; braisé → estofado/a; surgelé → congelado/a; appertisé → en conserva; égoutté → escurrido/a; préemballé → envasado/a; déshydraté → deshidratado/a; sans sel ajouté → sin sal añadida; allégé → light / reducido en grasa (según el caso); entier → entero/a; demi-écrémé → semidesnatado/a; écrémé → desnatado/a; aliment moyen → (promedio); à reconstituer → para reconstituir; prêt à consommer → listo para consumir.
- Conserva TODA la información que cambie los nutrientes (crudo/cocido, con/sin piel, % grasa, con sal, etc.). Puedes quitar redundancias que no aporten.
- Platos franceses sin equivalente: nombre francés conocido + breve explicación si hace falta («Quiche lorraine», «Croque-monsieur (sándwich de jamón y queso gratinado)», «Blanquette de ternera»). Si hay equivalente español claro, úsalo.
- Pescados/mariscos y especies: nombre común español correcto (cabillaud/morue → bacalao; lieu noir → carbonero; colin/merlu → merluza; lotte → rape; sole → lenguado; bar → lubina; dorade → dorada; maquereau → caballa; hareng → arenque; saumon → salmón; crevette → gamba/langostino; moule → mejillón; coquille Saint-Jacques → vieira; seiche → sepia; encornet/calmar → calamar; poulpe → pulpo).
- Longitud: intenta ≤ 80 caracteres; si el original es muy largo, condensa sin perder lo nutricionalmente relevante.
- Unidades y números tal cual (p. ej. «20% MG» → «20 % MG» o «20 % de grasa»).
