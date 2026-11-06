# Ficha de Google Play

Textos y gráficos para Play Console › Presencia en Google Play › Ficha principal. Los textos están listos para copiar y pegar; sus límites de caracteres están comprobados. Las respuestas de los formularios de «Contenido de la app» están en [`formularios.md`](formularios.md). Plan y estado general: [`../despliegue.md`](../despliegue.md).

Pendiente antes de pegarla: el correo de contacto (`[CORREO DE CONTACTO]`) y el dominio `cumbrafit.app`, del que salen las URLs.

## Datos de la app

| Campo | Valor |
|---|---|
| Nombre de la app (30) | `Cumbra Fit: gym y nutrición` (27 caracteres, [ADR 063](../decisiones/063-nombre-cumbra.md)) |
| Idioma predeterminado | Español (España) – es-ES |
| App o juego | App |
| Gratis o de pago | Gratis. Ojo: una app publicada como gratuita no puede pasar a ser de pago después. |
| Categoría | Salud y bienestar |
| Etiquetas | Nutrición, Fitness, Seguimiento de entrenamientos, Contador de calorías (las que Play ofrezca más parecidas) |
| Correo electrónico | `[CORREO DE CONTACTO]` (obligatorio y público) |
| Sitio web | `https://cumbrafit.app/conoce` |
| Teléfono | Vacío (es opcional) |
| Política de privacidad | `https://cumbrafit.app/privacidad` (va en «Contenido de la app», [`formularios.md`](formularios.md)) |
| Países | España, para empezar ([`../despliegue.md`](../despliegue.md): el catálogo es de España) |

## Descripción breve (80)

```
Registra comidas, entrenos y actividades. Sin anuncios y tus datos en tu móvil.
```

79 caracteres. Sin «gratis», «mejor» ni «n.º 1»: Play no quiere precios ni reclamos en los textos más visibles.

## Descripción completa (4.000)

```
Cumbra Fit reúne en una sola app tu nutrición, tu gimnasio y tus actividades. Sin anuncios, sin suscripción y sin cuenta obligatoria: todo se guarda en tu móvil y funciona sin conexión, también en el gimnasio.

NUTRICIÓN
• Escribe lo que has comido («150 g de pollo con arroz») o escanea el código de barras.
• Más de 8.000 alimentos, productos de marca y platos de España.
• Recetas propias, comidas habituales, plan de comidas y lista de la compra.
• Calorías, proteína, hidratos, grasa y más nutrientes, día a día y por semanas.

GIMNASIO
• Rutinas con series, repeticiones, peso, RIR y descansos con aviso.
• Más de 250 ejercicios con imagen, y los tuyos propios.
• Récords, progresión y el mapa de los músculos que trabajas.
• Un creador de rutinas según tus días, tu material y tu objetivo.

ACTIVIDADES
• Caminar, correr y senderismo: graba con el GPS o importa un GPX de tu reloj.
• Distancia, ritmo y desnivel, con el recorrido dibujado sin mapas ni servicios externos.

TU OBJETIVO
• Calcula las calorías y la proteína que te tocan a partir de tu perfil.
• Si quieres, las ajusta según cómo cambia tu peso de verdad.
• Peso con media de 7 días, medidas corporales, agua, pasos y creatina.

MOTIVACIÓN SIN TRAMPAS
• Cumbres: lo que haces se convierte en metros para subir montañas reales.
• Ritmo: las semanas en que cumples tu plan, con el descanso dentro y pausas para vacaciones o lesiones.
• Una liga por ejercicio y más de 150 logros en tu Vitrina.
• Nunca te empuja con tu peso ni te castiga por descansar.

SOCIAL, SI QUIERES
• Comparte entrenos, actividades, logros y rutinas con quien elijas, o en comunidades.
• Tus comidas, tu peso, tus medidas y tus recorridos nunca se publican.

TUS DATOS SON TUYOS
• Sin anuncios, sin analítica y sin inteligencia artificial que lea lo que comes.
• La cuenta es opcional. Con ella, la copia de tus datos se cifra en tu móvil antes de salir: nadie más puede leerla.
• Exporta tus registros en una copia de seguridad o en CSV cuando quieras.

Cumbra Fit es una herramienta para llevar tus registros, no un consejo médico. Si tienes una enfermedad, una lesión o un trastorno de la conducta alimentaria, consulta con un profesional antes de cambiar tu alimentación o tu entrenamiento.

Cumbra Fit es gratis y está hecha en España.
```

2.283 caracteres: queda margen. Las cifras salen del código a 2026-11-06 (3.323 alimentos de CIQUAL, 3.000 productos de Open Food Facts y 1.975 platos típicos; 268 ejercicios con imagen; 152 piezas en la Vitrina). Si cambian mucho, se actualizan aquí.

## Gráficos

Todos en [`graficos/`](graficos/), en PNG sin transparencia, como pide Play.

| Recurso | Archivo | Requisito de Play |
|---|---|---|
| Icono de la app | [`public/icon-512.png`](../../public/icon-512.png) | 512 × 512, PNG, hasta 1 MB |
| Gráfico destacado | [`graficos/destacado-1024x500.png`](graficos/destacado-1024x500.png) | 1024 × 500, JPG o PNG sin transparencia; obligatorio |
| Capturas de teléfono, en este orden | [`captura-1-inicio`](graficos/captura-1-inicio.png), [`2-nutricion`](graficos/captura-2-nutricion.png), [`3-entreno`](graficos/captura-3-entreno.png), [`4-cumbres`](graficos/captura-4-cumbres.png), [`5-semana`](graficos/captura-5-semana.png), [`6-vitrina`](graficos/captura-6-vitrina.png) | De 2 a 8, 9:16; con 4 o más de 1080 px o más, la app puede salir en las recomendaciones |

Las capturas son de la app real con datos inventados, como la ve quien la descarga de Play (sin el aviso de actualizaciones, [ADR 067](../decisiones/067-app-de-tienda-sin-instalar-desde-la-web.md)). Para rehacerlas, con Vite en 5173:

```bash
node scripts/web/capturas-conoce.cjs --play
```

```bash
node scripts/play/grafico-destacado.mjs
```

Sin tablet: Play no exige capturas de tablet para publicar.
