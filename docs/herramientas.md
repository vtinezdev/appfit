# 🧰 Herramientas y tecnologías de AppFit

Explicación sencilla de cada pieza que usa el proyecto y **por qué** se eligió. Todas son **gratuitas**.

---

## 📱 La app en sí

| Herramienta | ¿Qué es? | ¿Por qué se usa? |
|---|---|---|
| **Vite** | El motor que construye la app (junta el código, lo optimiza y genera los archivos finales). | Es rapidísimo en desarrollo y genera un `dist/` pequeño y optimizado, ideal para hosting gratuito. |
| **React** | Librería para construir la interfaz (pantallas, botones, listas...). | Es el estándar más usado, con muchísima documentación, y encaja perfecto con Vite. |
| **TypeScript** | Una versión de JavaScript que revisa tipos de datos antes de ejecutar nada. | Evita errores tontos (como sumar un texto con un número) y hace el código más fácil de mantener con el tiempo. |
| **Tailwind CSS** | Sistema de estilos mediante "clases" cortas (`bg-slate-900`, `rounded-xl`...). | Permite maquetar rápido y de forma consistente sin escribir CSS a mano, ideal para una sola persona construyendo la UI. |

## 💾 Guardar los datos (sin servidor)

| Herramienta | ¿Qué es? | ¿Por qué se usa? |
|---|---|---|
| **IndexedDB** | Base de datos que existe dentro del propio navegador/móvil. | Permite guardar comidas, entrenos, etc. **sin backend ni servidor**, todo se queda en tu iPhone. |
| **Dexie.js** | Una capa que hace mucho más fácil trabajar con IndexedDB. | IndexedDB "a pelo" es muy incómoda de usar; Dexie la convierte en algo simple, parecido a una base de datos normal. |
| **dexie-react-hooks** | Conecta Dexie con React (`useLiveQuery`). | Hace que la pantalla se actualice sola en cuanto cambian los datos (por ejemplo, al añadir una comida), sin código extra. |

## 🤖 Inteligencia artificial

La app ya **no usa IA**. Al principio interpretaba las comidas con la API de Gemini, pero estaba saturada a menudo; se retiró cuando el intérprete local (texto o dictado del teclado + catálogo CIQUAL + Open Food Facts) cubrió ese uso sin conexión. Ver `docs/PROCESO.md` §37.

## 📊 Gráficas

| Herramienta | ¿Qué es? | ¿Por qué se usa? |
|---|---|---|
| **Recharts** | Librería de gráficas para React. | Permite dibujar las barras de macros semanales/mensuales y las líneas de progreso de peso/1RM con poco código. |

## 📲 Que funcione como una app de verdad (PWA)

| Herramienta | ¿Qué es? | ¿Por qué se usa? |
|---|---|---|
| **PWA** (Progressive Web App) | Una web que se puede "instalar" en el móvil y abrir como una app normal, con icono propio. | Como es un iPhone, no vale un `.apk`; la PWA es la forma de tener una app instalable en iOS sin pasar por la App Store. |
| **vite-plugin-pwa** | Plugin que genera automáticamente el `manifest` y el *service worker*. | Sin él habría que escribir a mano toda la configuración de PWA; con él se genera solo al hacer `build`. |
| **Workbox** (viene dentro del plugin anterior) | Motor que gestiona la caché de archivos para que la app funcione sin internet. | Permite abrir la app y ver el gimnasio/añadido rápido aunque no haya cobertura o esté en modo avión. |

## ✅ Calidad del código

| Herramienta | ¿Qué es? | ¿Por qué se usa? |
|---|---|---|
| **Vitest** | Framework para escribir tests automáticos. | Comprueba que los cálculos importantes (macros, 1RM, intérprete de comidas) sigan siendo correctos aunque se cambie el código más adelante. |

## ☁️ Publicar la app

| Herramienta | ¿Qué es? | ¿Por qué se usa? |
|---|---|---|
| **Cloudflare Workers** (static assets) | Servicio gratuito de Cloudflare que puede servir webs estáticas sin backend. | Aloja los archivos generados (`dist/`) en una URL propia con HTTPS, necesario para la cámara del escáner y la instalación como PWA. La configuración está en `wrangler.jsonc`. |
| **Wrangler** | Herramienta de línea de comandos de Cloudflare. | Permite subir la app a Cloudflare con un solo comando (`npm run build && npx wrangler deploy`). |

> ⏳ **Pendiente de configurar**: hace falta tu cuenta gratuita de Cloudflare para poder desplegar.

## 🛠️ Herramientas de desarrollo (no viajan al móvil)

| Herramienta | ¿Qué es? | ¿Por qué se usa? |
|---|---|---|
| **Node.js / npm** | Entorno para ejecutar herramientas de desarrollo e instalar paquetes. | Es lo que permite ejecutar `npm run dev`, `npm run build`, etc. No forma parte de la app final. |
| **Git** | Control de versiones. | Permite guardar el historial de cambios del proyecto (inicializado, listo para hacer commits cuando quieras). |

---

### Resumen en una frase
Una **web hecha con React** que se instala como app en el iPhone (**PWA**), guarda todo **en el propio móvil** (Dexie/IndexedDB), interpreta las comidas por texto **en el propio móvil**, dibuja gráficas con **Recharts**, y se aloja gratis en **Cloudflare Workers**.
