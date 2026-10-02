# Desarrollo: tests, pruebas en navegador, Git y despliegue

Los comandos de todos los días están en `CLAUDE.md` § Comandos. Los scripts, en `package.json`.

## Requisitos

- Node.js compatible con Vite 8 (`^20.19` o `>= 22.12`) y npm. Los scripts del catálogo (`scripts/catalogo/*.ts`) se ejecutan con el *type stripping* nativo de Node, sin compilar: se usan con Node 24.
- `npm install` para empezar; `npm run preview` sirve el build de `dist/`.
- Sin variables de entorno ni backend: la configuración se hace dentro de la app (Ajustes).

## Tests (Vitest)

- Entorno `node` con `fake-indexeddb` (`src/test/setup-db.ts`, `setupFiles` en `vite.config.ts`): se prueban la lógica pura y los repositorios contra una IndexedDB real en memoria. No hay tests de componentes.
- Colocados junto al código (`*.test.ts`); también los de `scripts/catalogo/`.
- Fixtures: `src/test/fixtures/backup-v1.json` (backup antiguo para las migraciones) y `ciqual-2025-es1-muestra.json` (compatibilidad de ids entre versiones del paquete).
- Tests que vigilan reglas del proyecto (si fallan, no se «arreglan» relajándolos):

| Test | Vigila |
|---|---|
| `shared/db/acceso.test.ts` | en `features/`, solo `data/*Repo.ts` importa `db` |
| `shared/db/db.test.ts` | toda tabla está en `TABLAS_USUARIO` o `TABLAS_CATALOGO`; migraciones v1→actual y v2→actual |
| `shared/design/guard.test.ts` | nada de paleta de Tailwind, hex, emojis, tamaños, radios, cifras sin formato ni valores arbitrarios (DESIGN-SYSTEM.md § Guard) |
| `shared/design/contrast.test.ts` | contraste WCAG de los tokens en claro, oscuro e `ink` |
| `lib/escaner/detector.test.ts` | `zxing-wasm` fijado a la versión que pide `barcode-detector` |
| `lib/catalogo/paquete.test.ts`, `scripts/catalogo/calidad.test.ts` | los paquetes publicados en `public/catalogo/` son válidos |

- Varios tests usan el paquete real de `public/catalogo/` (ranking, emparejado, erratas, compatibilidad): **regenerar el catálogo puede romperlos**, y eso es intencionado.
- En fake-indexeddb, construir el vocabulario del catálogo tarda unos 3,5 s: los tests de erratas son lentos a propósito.

## Pruebas en navegador

- `npm run dev` (o la configuración `appfit-dev` de `.claude/launch.json`) y abrir **`http://appfit-test.localhost:5173`**. `localhost:5173` tiene los datos reales de Víctor: nunca se prueba ahí. Cada origen tiene su propia IndexedDB; para probar un upgrade desde cero se puede usar otro subdominio (`appfit-upgrade.localhost`).
- Vista 375×812, en claro y oscuro. Sin scroll horizontal: `document.documentElement.scrollWidth === innerWidth`. Sin errores en consola.
- **Open Food Facts se simula** sustituyendo `fetch` solo para `world.openfoodfacts.org` (producto completo, incompleto, 404, sin red). Nunca se llama a la API real en las pruebas.
- Un backup se importa por el input real de archivo (`DataTransfer` + evento `change`) y el export se captura interceptando `URL.createObjectURL`.
- En el iPhone, la cámara del escáner necesita HTTPS: solo se puede probar tras desplegar.
- Lo que solo se confirma en un iPhone real (WebKit): safe areas, teclado, tacto, rendimiento de la importación y de la búsqueda. Pendientes en `roadmap.md`.

### Regresión de conservación de datos

Probar con una build de producción (`npm run preview -- --host 0.0.0.0 --port 5173 --strictPort`) y el origen `appfit-test.localhost`, con un perfil de navegador persistente (no crear un contexto vacío en cada reapertura):

1. Importar una copia de prueba con datos de todas las tablas de usuario y registrar una comida desde la UI. Exportar el resultado como referencia.
2. Recargar, cerrar completamente el navegador y reabrir con el mismo perfil y dirección. Comparar todas las tablas del export, ignorando solo `exportedAt`.
3. Compilar la nueva build, actualizar el service worker y recargar. Repetir la comparación y la reapertura. Mantener el mismo nombre de BD y origen.
4. Para el primer traslado, usar otro contexto aislado, importar la copia con la confirmación y comprobar que cancelar/elegir un archivo inválido conserva los datos. Probar también sin conexión y a 375×812 en claro/oscuro.

Emular `navigator.standalone` y el user agent de iPhone permite verificar la guía y la UI, pero no reproduce el aislamiento real de WebKit. El traslado real Safari → pantalla de inicio se valida en el iPhone.

## Git y pull requests

Reglas (commits, ramas, mensajes): `CLAUDE.md` § Forma de trabajar. Antes de proponer una PR:
  1. `npm run test` y `npm run build` en verde.
  2. Si cambia la UI: prueba en el origen de pruebas (arriba).
  3. Documentación actualizada según la tabla de `CLAUDE.md` § Documentación, más la entrada de `docs/PROCESO.md`.
  4. Si cambia el esquema o el backup: checklist de `datos.md`.

## Despliegue (Cloudflare Workers)

`wrangler.jsonc` sirve `dist/` como estáticos, sin código de Worker (`not_found_handling: single-page-application`).

```bash
npx wrangler login      # una vez
npm run build
npx wrangler deploy
```

- El service worker se actualiza solo (`autoUpdate`): la app instalada toma la versión nueva tras abrirla.
- Instalar en el iPhone: abrir la URL en Safari → Compartir → «Añadir a pantalla de inicio».
- Hacer un backup desde Ajustes antes de desplegar un cambio de esquema.

## Mantener la documentación

- Qué documento es fuente de verdad de qué, y cuándo se actualiza: `CLAUDE.md` § Documentación. No se copia información entre documentos: se enlaza.
- Solo se documenta lo que ya existe en el código, con la implementación terminada y validada.
- `docs/PROCESO.md`: una sección `## N.` nueva al final por cambio relevante: qué se hizo y **por qué**, con enlaces a los documentos vivos en lugar de repetir su contenido. Nunca se reescriben las secciones antiguas.
- Una decisión duradera (de las que alguien podría querer revertir sin saber por qué se tomó) va en `docs/decisiones/NNN-titulo.md` con Contexto, Decisión y Consecuencias.

## Claude Code

| Archivo | Qué es |
|---|---|
| `CLAUDE.md` | contexto global y reglas; se carga en cada sesión |
| `.claude/settings.json` | modelo de la sesión principal |
| `.claude/launch.json` | servidor de desarrollo para las pruebas en navegador |
| `.claude/agents/architecture-auditor.md` | auditor técnico (datos, Dexie, build, tests) |
| `.claude/agents/product-ux-auditor.md` | auditor de flujos, UX y design system |
| `.claude/agents/documentation-agent.md` | cierre documental |

La regla de uso de agentes está en `CLAUDE.md` § Forma de trabajar. Lo que no dice:
- Por qué no se usan por defecto: cada subagente arranca sin contexto y tiene que volver a leer el código; en este proyecto no ha compensado (Víctor lo decidió el 2026-09-30).
- Si Víctor nombra un agente, se le da un encargo mínimo (objetivo, alcance o `git diff`, pregunta concreta) y se traslada su informe tal cual, sin revisiones después.
- Si la sesión está en modo plan, hay que salir antes de lanzar un agente (Shift+Tab): el agente hereda el modo plan y no podría editar.
- Los alias `opus`/`sonnet` apuntan siempre al modelo más reciente de cada familia. `/model` en una sesión manda sobre `.claude/settings.json`; `/agents` muestra y edita los subagentes.
