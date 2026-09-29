# AppFit

App personal de nutrición y gimnasio para iPhone, instalable como PWA. Registra comidas por texto o voz (interpretadas por IA), lleva el control de tus entrenos, y guarda absolutamente todo **solo en tu propio móvil**: no hay backend, no hay cuentas, no hay servidor que vea tus datos.

> Proyecto personal de uso individual — no está pensado para múltiples usuarios ni para publicarse en tiendas de apps.

## Índice

- [Características](#características)
- [Stack técnico](#stack-técnico)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Empezar](#empezar)
- [Configuración](#configuración)
- [Despliegue](#despliegue)
- [Privacidad](#privacidad)
- [Estado del proyecto](#estado-del-proyecto)
- [Licencia](#licencia)

## Características

**Nutrición**
- Añadir comidas por texto libre o por voz; una IA (Gemini) interpreta lo comido y estima gramos y macros.
- Pantalla de revisión editable antes de guardar — nunca se guarda nada sin poder corregirlo.
- Añadido rápido sin IA para alimentos ya conocidos (funciona sin conexión).
- Resumen diario, semanal y mensual con gráficas de macros frente a tus objetivos.
- Base de datos personal de alimentos, editable a mano.

**Gimnasio**
- Entrenos desde cero o desde una rutina guardada, con progreso persistente aunque cierres la app a mitad.
- Series con reps y peso, precargadas con los valores de la última vez que hiciste ese ejercicio.
- Rutinas reutilizables, historial de entrenos completados, y gráficas de progreso (peso máximo, 1RM estimado, volumen) por ejercicio.

**General**
- Instalable en iOS como PWA ("Añadir a pantalla de inicio"), con icono propio y funcionamiento offline salvo la interpretación por IA.
- Copia de seguridad exportable/importable en un único archivo JSON.
- Coste de infraestructura: **0 €**.

## Stack técnico

Vite + React 19 + TypeScript + Tailwind CSS, datos en IndexedDB vía Dexie, gráficas con Recharts, PWA con `vite-plugin-pwa`, tests con Vitest, IA con la API REST de Gemini, y despliegue estático gratuito en Cloudflare Pages.

Explicación de cada pieza y por qué se eligió: [`docs/herramientas.md`](docs/herramientas.md).

## Estructura del proyecto

```
appfit/
├── docs/                 # documentación del proyecto (plan, decisiones, progreso por sesión)
├── public/                # iconos y assets estáticos de la PWA
├── src/
│   ├── app/                 # App (navegación), BottomNav, Ajustes
│   ├── shared/              # db (esquema Dexie), lib (fechas, backup…), ai (Gemini), design (tokens), components, hooks
│   └── features/            # nutricion/ y gym/, cada una con pages/, data/ (repositorios) y lib/ (lógica pura)
├── package.json
└── vite.config.ts
```

## Empezar

Requisitos: Node.js 20+ y npm.

```bash
npm install       # instalar dependencias
npm run dev        # servidor de desarrollo en http://localhost:5173
npm run test        # tests unitarios (Vitest)
npm run build        # build de producción en dist/
npm run preview       # previsualizar el build de producción
```

## Configuración

La app no necesita variables de entorno ni backend propio. Toda la configuración se hace **dentro de la app**, en la pestaña Ajustes:

- **API key de Gemini**: gratuita, se obtiene en [Google AI Studio](https://aistudio.google.com/). Se guarda solo en el dispositivo (IndexedDB), nunca se envía a ningún servidor propio.
- **Modelo de Gemini**: configurable por si Google cambia el nombre del modelo disponible en el futuro.
- **Objetivos diarios** de calorías y macros.

## Despliegue

El proyecto se despliega como sitio estático en [Cloudflare Pages](https://pages.cloudflare.com/) (capa gratuita):

```bash
npx wrangler login
npm run build
npx wrangler pages deploy dist
```

Una vez desplegado, abre la URL en Safari (iOS) y usa "Compartir → Añadir a pantalla de inicio" para instalarla como app. El micrófono para el registro por voz requiere HTTPS, por lo que esa parte solo se puede probar ya desplegada, no en local.

## Privacidad

No existe backend. Todos los datos (comidas, entrenos, alimentos, ajustes, y la propia API key de Gemini) se guardan exclusivamente en el `IndexedDB` del navegador/dispositivo donde se use la app. Cloudflare Pages solo sirve los archivos estáticos de la aplicación; no aloja ni tiene acceso a ningún dato personal.

## Estado del proyecto

Consulta [`docs/PROCESO.md`](docs/PROCESO.md) para la bitácora técnica completa de decisiones, y [`docs/progreso/`](docs/progreso/) para el resumen sesión a sesión de en qué se ha trabajado.

El desarrollo se hace con un equipo de agentes de Claude Code (coordinador + auditor técnico + auditor de UX + documentación): ver [`docs/AGENTES.md`](docs/AGENTES.md).

## Licencia

Distribuido bajo licencia MIT — ver [`LICENSE`](LICENSE). El código es público a modo de portfolio; no se esperan ni gestionan contribuciones externas.
