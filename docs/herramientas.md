# Herramientas y tecnologías de AppFit

Explicación sencilla de cada pieza del proyecto y de **por qué** se eligió. Todas son gratuitas. Las versiones exactas están en `package.json`.

En una frase: una **web hecha con React** que se instala como app en el iPhone (**PWA**), guarda todo **en el propio móvil** (Dexie/IndexedDB), entiende las comidas escritas o dictadas **sin IA y sin conexión**, dibuja gráficas con **Recharts** y se aloja gratis en **Cloudflare Workers**.

## La app

| Herramienta | Qué es | Por qué se usa |
|---|---|---|
| **Vite** | El motor que construye la app (junta el código, lo optimiza y genera los archivos finales). | Es muy rápido en desarrollo y genera un `dist/` pequeño, ideal para un hosting estático gratuito. |
| **React** | Librería para construir la interfaz (pantallas, botones, listas…). | Es el estándar más usado, con mucha documentación, y encaja con Vite. |
| **TypeScript** | JavaScript con tipos que se revisan antes de ejecutar nada. | Evita errores tontos y hace el código más fácil de mantener. |
| **Tailwind CSS** | Estilos mediante clases cortas (`bg-surface`, `rounded-lg`…). | Maquetar rápido y de forma consistente. En AppFit las clases solo nombran los tokens del diseño (ver `DESIGN-SYSTEM.md`). |

## Guardar los datos (sin servidor)

| Herramienta | Qué es | Por qué se usa |
|---|---|---|
| **IndexedDB** | Base de datos que existe dentro del propio navegador o móvil. | Guarda comidas, entrenos, pesos… **sin backend**: todo se queda en el iPhone. |
| **Dexie.js** | Una capa que simplifica mucho IndexedDB. | IndexedDB «a pelo» es muy incómoda; Dexie la hace parecida a una base de datos normal, con versiones del esquema. |
| **dexie-react-hooks** | Conecta Dexie con React (`useLiveQuery`). | La pantalla se actualiza sola cuando cambian los datos. |

## Comidas sin IA

La app no usa IA: al principio interpretaba las comidas con Gemini, pero se retiró (motivos en `decisiones/006-sin-ia-interprete-local.md`). Ahora un intérprete propio, escrito en TypeScript, entiende frases como «200 g de arroz y 2 huevos» y busca cada alimento en tus alimentos y en un catálogo descargado en el móvil (CIQUAL y Open Food Facts; ver `scripts/catalogo/README.md`). No necesita ninguna librería.

## Escanear códigos de barras

| Herramienta | Qué es | Por qué se usa |
|---|---|---|
| **barcode-detector** | Implementa la API estándar `BarcodeDetector` en navegadores que no la tienen. | Safari en iOS no trae un lector de códigos de barras. |
| **zxing-wasm** | El lector de códigos que usa por dentro (compilado a WebAssembly). | Es rápido y fiable. Solo se descarga al abrir el escáner, así que no hace más pesada la app. |

## Gráficas

| Herramienta | Qué es | Por qué se usa |
|---|---|---|
| **Recharts** | Librería de gráficas para React. | Dibuja las barras semanales o mensuales del Resumen y las líneas de progreso del Gym con poco código. Se carga solo al abrir esas pantallas. |

## Que funcione como una app de verdad (PWA)

| Herramienta | Qué es | Por qué se usa |
|---|---|---|
| **PWA** (Progressive Web App) | Una web que se «instala» en el móvil y se abre como una app, con icono propio. | En iPhone no vale un `.apk`; la PWA permite tener una app instalable sin pasar por la App Store. |
| **vite-plugin-pwa** | Plugin que genera el `manifest` y el *service worker*. | Sin él habría que escribir a mano toda la configuración de la PWA. |
| **Workbox** (dentro del plugin anterior) | Gestiona la caché de archivos. | La app se abre y funciona sin cobertura o en modo avión. |

## Calidad del código

| Herramienta | Qué es | Por qué se usa |
|---|---|---|
| **Vitest** | Framework de tests automáticos. | Comprueba que los cálculos y reglas importantes (macros, 1RM, intérprete, backups…) siguen bien aunque cambie el código. |
| **fake-indexeddb** | Una IndexedDB en memoria para los tests. | Permite probar el guardado de datos y las migraciones sin abrir un navegador. No llega a la app. |

## Publicar la app

| Herramienta | Qué es | Por qué se usa |
|---|---|---|
| **Cloudflare Workers** (static assets) | Servicio gratuito de Cloudflare que sirve webs estáticas. | Aloja `dist/` en una URL con HTTPS, que hace falta para instalar la PWA y usar la cámara. Configuración en `wrangler.jsonc`. |
| **Wrangler** | La herramienta de línea de comandos de Cloudflare. | Sube la app con un solo comando (ver `desarrollo.md` § Despliegue). |

## Herramientas de desarrollo (no viajan al móvil)

| Herramienta | Qué es | Por qué se usa |
|---|---|---|
| **Node.js / npm** | Entorno para ejecutar las herramientas e instalar paquetes. | Permite `npm run dev`, `npm run build`, los tests y los scripts que generan el catálogo. |
| **Git + GitHub** | Control de versiones y alojamiento del código. | Guarda el historial de cambios del proyecto. |
