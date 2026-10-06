---
name: APPFIT
description: "Enfocada y enérgica: grafito, contraste y naranja de rendimiento para un registro móvil preciso."
colors:
  bg: "rgb(244 244 241)"
  dark-bg: "rgb(10 10 11)"
  surface: "rgb(255 255 255)"
  dark-surface: "rgb(22 22 24)"
  surface-elevated: "rgb(255 255 255)"
  dark-surface-elevated: "rgb(29 29 32)"
  surface-muted: "rgb(232 232 228)"
  dark-surface-muted: "rgb(35 35 38)"
  overlay: "rgb(10 10 11)"
  dark-overlay: "rgb(0 0 0)"
  text-primary: "rgb(22 22 24)"
  dark-text-primary: "rgb(248 248 245)"
  text-secondary: "rgb(77 77 74)"
  dark-text-secondary: "rgb(189 189 188)"
  text-tertiary: "rgb(96 96 91)"
  dark-text-tertiary: "rgb(157 158 160)"
  border: "rgb(216 216 210)"
  dark-border: "rgb(50 50 54)"
  border-strong: "rgb(121 121 116)"
  dark-border-strong: "rgb(118 118 122)"
  accent: "rgb(255 108 28)"
  dark-accent: "rgb(255 108 28)"
  kcal: "rgb(231 86 17)"
  dark-kcal: "rgb(255 108 28)"
  on-accent: "rgb(10 10 11)"
  accent-strong: "rgb(163 56 7)"
  dark-accent-strong: "rgb(255 134 66)"
  accent-subtle: "rgb(255 234 216)"
  dark-accent-subtle: "rgb(58 31 18)"
  selected: "rgb(255 255 255)"
  dark-selected: "rgb(64 64 68)"
  on-selected: "rgb(22 22 24)"
  dark-on-selected: "rgb(248 248 245)"
  success: "rgb(24 111 73)"
  dark-success: "rgb(105 207 157)"
  on-success: "rgb(255 255 255)"
  dark-on-success: "rgb(10 10 11)"
  success-subtle: "rgb(230 244 236)"
  dark-success-subtle: "rgb(25 55 44)"
  warning: "rgb(137 84 9)"
  dark-warning: "rgb(235 193 97)"
  destructive: "rgb(175 49 38)"
  dark-destructive: "rgb(255 148 135)"
  on-destructive: "rgb(255 255 255)"
  dark-on-destructive: "rgb(20 20 18)"
  protein: "rgb(66 90 112)"
  dark-protein: "rgb(153 181 200)"
  carbs: "rgb(84 96 50)"
  dark-carbs: "rgb(181 189 130)"
  fat: "rgb(119 82 101)"
  dark-fat: "rgb(194 161 184)"
  training: "rgb(20 20 22)"
  dark-training: "rgb(20 20 22)"
  on-training: "rgb(248 248 245)"
  training-muted: "rgb(189 189 188)"
  training-track: "rgb(58 58 63)"
  meal-accent: "rgb(255 134 66)"
typography:
  hero:
    fontFamily: "'Barlow Condensed', 'Manrope', ui-sans-serif, system-ui, sans-serif"
    fontSize: "3.25rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.02em"
  display:
    fontFamily: "'Barlow Condensed', 'Manrope', ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.375rem"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.01em"
  metric:
    fontFamily: "'Barlow Condensed', 'Manrope', ui-sans-serif, system-ui, sans-serif"
    fontSize: "2rem"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.01em"
  heading:
    fontFamily: "'Barlow Condensed', 'Manrope', ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  title:
    fontFamily: "'Manrope', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: "-0.01em"
  body:
    fontFamily: "'Manrope', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  body-sm:
    fontFamily: "'Manrope', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "'Manrope', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.04em"
  caption:
    fontFamily: "'Manrope', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
rounded:
  sm: "0.375rem"
  md: "0.625rem"
  lg: "0.875rem"
  sheet: "1.25rem"
  pill: "9999px"
spacing:
  "1": "0.25rem"
  "2": "0.5rem"
  page: "1.25rem"
  section: "1.5rem"
  card: "1rem"
  stack: "0.75rem"
  touch: "2.75rem"
  touch-lg: "3rem"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.md}"
    padding: "8px 20px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "8px 20px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.accent-strong}"
    rounded: "{rounded.md}"
    padding: "8px 20px"
  button-destructive:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.destructive}"
    rounded: "{rounded.md}"
    padding: "8px 20px"
  button-danger:
    backgroundColor: "{colors.destructive}"
    textColor: "{colors.on-destructive}"
    rounded: "{rounded.md}"
    padding: "8px 20px"
  input:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.text-primary}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0 12px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.lg}"
    padding: "{spacing.card}"
  card-muted:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.lg}"
    padding: "{spacing.card}"
  food-record:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0"
  meal-header:
    backgroundColor: "{colors.training}"
    textColor: "{colors.on-training}"
    rounded: "{rounded.lg}"
    padding: "12px"
  badge-neutral:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.sm}"
    padding: "2px 8px"
  segmented-control:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.md}"
    padding: "4px"
  menu-trigger:
    backgroundColor: "{colors.surface-elevated}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    width: "124px"
    height: "48px"
  menu-target:
    backgroundColor: "{colors.surface-elevated}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "8px"
    width: "5.25rem"
    height: "4.25rem"
  series-completed:
    backgroundColor: "{colors.success}"
    textColor: "{colors.on-success}"
    rounded: "10px"
---

# Design System: APPFIT

## Overview

**Creative North Star: "Enfocada y enérgica"**

La opción 3 aportada por el usuario fija la dirección artística: negro/grafito, blanco, naranja intenso y tipografía deportiva. AppFit sigue siendo un registro personal de alimentación, peso y entrenamiento. No se incorporan datos, rachas, retos, planificación o promesas del mockup.

La identidad nace de títulos condensados, cifras tabulares y superficies compactas; el abanico que emerge del botón Menú sigue siendo el gesto distintivo. Energía mediante contraste y jerarquía, sin neones, degradados decorativos, glassmorphism, imágenes genéricas ni movimiento constante. La implementación directa fue solicitada por el usuario.

La preview de tres pantallas aprobada incorpora atmósferas fotográficas: bienestar/fitness/nutrición en Inicio, meal prep en Nutrición y pesas/esfuerzo en Gym. Son imágenes generadas con acabado fotográfico, específicas de esta dirección. Texto, controles y datos siguen siendo interfaz real. Los degradados se permiten como integración de la foto, sin convertirse en decoración de componentes.

PRODUCT.md conserva la verdad de producto; src/shared/design/tokens.css los valores; tailwind.config.js sus clases; docs/DESIGN-SYSTEM.md los patrones. Este frontmatter y .impeccable/design.json documentan el código. La superficie appfit mantiene el encargo.

## Colors

Oscuro es la referencia artística: fondo casi negro 10/10/11, contenido grafito 22/22/24, capas 29/29/32 y campos 35/35/38. Blanco cálido para contenido principal y dos grises legibles para contexto y metadatos. Claro conserva fondo neutro cálido, jerarquía y acento; Sistema/Claro/Oscuro siguen disponibles y las preferencias guardadas se respetan.

Naranja intenso para acción principal y kcal; el naranja de texto tiene contraste propio por tema. En claro la barra kcal es más oscura para superar 3:1. P/C/G conservan sus roles azul/oliva/ciruela, moderados. Estados de éxito/error/advertencia acompañan texto o iconos. Entrenamiento y cabeceras usan grafito legible en ambos temas; Toast utiliza su contexto inverso.

**The Acento Rule.** El naranja orienta acciones y kcal; no sustituye superficies, texto o jerarquía.

## Typography

Barlow Condensed Bold 700 local para títulos de pantalla, títulos operativos y métricas; Manrope variable local para nombres, lectura, etiquetas, botones y campos. Licencias OFL, precarga y precache; la app no pide fuentes a terceros.

Display 38, hero 52, metric 32 y heading 24 px. Title 18, body 16, body-sm 14, label 13 y caption 12 px. Display en mayúsculas; secciones y ejercicios en caja natural. Tracking entre −0,01 y −0,02 em para la voz condensada. Cifras completas e inmediatas; unidades visibles y ancho tabular.

Alimentos e ingredientes conservan Manrope para reconocimiento. Reps/kg editables en Manrope de 18 px; todos los campos tienen al menos 16 px. No se reduce la letra para encajar contenido y no se simula una fuente deportiva con Impact.

**The Dos voces Rule.** Barlow expresa títulos y métricas; Manrope conserva lectura y edición.

## Layout

Columna móvil centrada de máximo 512 px; margen 20 px (16 bajo 360 px), sección 24 px, padding de contenido 16 px. Radios sm/md/lg/sheet de 6/10/14/20 px. Targets reales de 44 px y acciones principales de 48 px.

Sin alturas rígidas: nombres/cifras envuelven. PageHeader redistribuye la acción con texto ampliado. Las container queries de comidas/registros mantienen la jerarquía y apilan detalles/kcal cuando falta espacio. Shell 100dvh, scroll en main, navegación 72 px más safe area. Las capas siguen visualViewport y mantienen acciones persistentes fuera del scroll.

La escena ocupa una capa decorativa fuera del flujo, dentro de la columna de producto, con altura de 42 rem y scroll natural. No añade espacio ni cambia el acceso a series. En desktop no se expande una fotografía móvil a toda la pantalla. Navegación y capas temporales conservan su fondo de control.

## Elevation & Depth

Las superficies se diferencian por tono. Card conserva un borde transparente para su geometría; campos, controles y registros mantienen límites reconocibles. Sin sombras en cards/nav; la sombra compartida pertenece a capas y avisos.

**The Plano por defecto Rule.** Tono y espacio separan contenido; la sombra indica una capa temporal.

## Shapes

Radios contenidos de la escala compartida, sin pastillas grandes ni halos. Cabeceras de comida con contorno neutro e icono/kcal naranja; registros compactos con el mismo contenedor para plato y alimento. Iconografía SVG existente, con trazo consistente.

## Components

### Inicio

Saludo/fecha y firma AppFit, con «Entrena. Registra. Avanza.». Entrenamiento protagonista: continuar la sesión activa o ir a entrenar. Si existe un último entreno, su duración/ejercicios/volumen reales aparecen subordinados a la acción en el mismo bloque.

Nutrición se integra en el fondo de página: kcal, objetivo, diferencia y P/C/G, Ver día y Registrar comida. Esta última acción es secundaria para no competir con entrenar. Peso mantiene registro, historial y variación neutral. Accesos rápidos Nutrición/Entreno cierran la página.

### Nutrición y Referencias

El diario conserva su panel de kcal/macros, el selector de detalle y la navegación de días. Comidas, platos e ingredientes se distinguen por título, icono, escala y alineación. Platos y alimentos individuales son registros equivalentes; grupo con chevrón/conteo y acciones en «…». Ingredientes interiores planos y asa de arrastre al desplegar; editar/añadir/mover/copiar/borrar conservan sus flujos y Deshacer.

Nutrición muestra qué está consumiendo el usuario y cómo va. Referencias explica por qué AppFit utiliza esos valores y de dónde proceden. Extras con consumo/barra/cobertura; info abre criterio y fuente, compartidos con Referencias. No cambian objetivos ni cálculos; recomendaciones sin fuente definida permanecen vacías.

### Entrenamiento, progreso y estadísticas

Rutina/estado, tiempo, volumen y series marcadas sobre grafito compacto. Ejercicios con título condensado y reps/kg en campos más oscuros. Completar conserva check, fondo de éxito y feedback; editar desmarca. Descanso opcional, confirmación de fin y Deshacer siguen disponibles.

Cierre con datos realmente guardados. Progreso/estadísticas con cifras condensadas, gráficas con leyenda/unidades, huecos honestos y alternativas textuales. Inicio no afirma porcentajes semanales o récords no definidos.

### Controles, capas y estados

Buttons con radio contenido y target táctil; naranja sólido reservado a la acción principal. Inputs/selects/textarea con superficie secundaria, límite reconocible y foco naranja. Badges son metadatos; ViewTabs navega y SegmentedControl elige un valor con indicador neutro.

Sheet y ModalPage comparten títulos condensados, portal, aislamiento/foco, Escape/Atrás y retorno de foco. Tareas encadenadas esperan onExited. EmptyState explica qué falta y cómo continuar; LoadingState localizado; errores dentro de la tarea. Caret, selección de texto, scrollbars y foco usan la paleta.

### Atmósferas de sección

Una sola capa del shell selecciona una WebP local según sección y tema resuelto. Tres escenas oscuras y tres fotografías distintas para claro, de 960×1440 px y menos de 400 KB en conjunto, precacheadas para uso offline. Imagen decorativa con alt vacío, oculta a tecnología asistiva y sin eventos de puntero. Overlay del tema, saturación moderada y fade vertical hacia el fondo de página; no parallax ni animación de fotografía. La descarga/decodificación no desplaza contenido.

Cabeceras/tabs tienen protección de lectura; paneles mantienen opacidad 96% en oscuro y 98% en claro, entrenamiento 96%. Referencias y Ajustes reutilizan las escenas del tema con intensidad mínima; no introducen otras fotos. Claro tiene escenas propias de luz natural, piedra/cerámica clara y gimnasio luminoso: no es una foto oscura blanqueada. Su velo marfil y desvanecimiento más rápido conservan lectura y presencia fotográfica. La preferencia Claro/Oscuro prevalece sobre el sistema; Sistema actualiza escena y tokens a la vez. Forced Colors oculta la decoración. Si no carga una imagen, permanece el tema y todas las acciones.

### Navegación y motion

Menú cerrado neutro con borde de control; abierto, naranja conecta origen y destino actual. Cinco destinos de 84×68 px en abanico, órbita hasta 120 px y elevación 160 px. Check y nombres visibles; texto ampliado o poca altura activa rejilla de dos columnas. Destinos futuros se paginan.

Feedback 120 ms, estados 200, overlays/abanico 280 y salida 180 ms. Fin de sesión conserva confirmación de 420 ms. CSS/Web Animations, curvas desaceleradas sin rebote; ninguna dependencia nueva. Reduce Motion elimina desplazamientos, escala, FLIP y stagger, preservando texto/check y fundido de 80 ms. Cifras y gráficas no cuentan desde cero.

Haptics opcionales según navegador: Safari/iOS no ofrece Vibration API; Android depende del soporte. No se simulan con audio. Marcas/descanso de entreno son estado de presentación en sessionStorage; no cambian IndexedDB ni backups.

## Do's and Don'ts

- Contraste AA en ambos temas; campos ≥16 px, controles ≥44 px.
- Datos y unidades completos, estados honestos cuando falta información.
- Sistema común; ninguna paleta o familia exclusiva por pantalla.
- Superficies compactas y separación entre tareas; profundidad solo para capas.
- Naranja orienta y confirma; no domina el contenido.
- Teclado, foco, Atrás, safe areas y Reduce Motion forman parte del producto.
- Sigue siendo una PWA; emulación no acredita hardware físico iOS/Android.

Evitar paletas por pantalla, neones, degradados decorativos, glassmorphism y fotografías genéricas. No reducir tipografía/targets ni ocultar contenido para encajar. No inventar rachas, récords, planificación o referencias de salud.
