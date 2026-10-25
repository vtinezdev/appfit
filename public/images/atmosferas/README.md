# Atmósferas de AppFit

Imágenes generadas con acabado fotográfico para la preview aprobada por Víctor el 2026-10-05. Decoración, no fotografías documentales de usuarios ni información nutricional. Referencia aprobada: `/workspace/generated_images/exec-22bc6273-7a5b-4550-b148-caf70875b471.png` en la sesión de diseño. Se producen placas sin texto/interfaz, no recortes de sus pantallas.

| Archivo | Escena | Tamaño | SHA-256 |
|---|---|---|---|
| inicio.webp | Mancuernas/botella y alimentación saludable | 48.926 bytes | d87b756519bcc6e25f800c5a611e5aa44d63df69b31afec60b94af927b5d67b5 |
| nutricion.webp | Cocina premium y meal prep | 49.124 bytes | 125fb66a879bb2887dc12a4e518045320a0f418558446834306ae130d9813747 |
| gym.webp | Pesas/rack y esfuerzo | 77.662 bytes | 97e5871cee95c25aa09f6b316b040dd834fe65724e3ce4faf492c3dcd61deb75 |
| inicio-claro.webp | Bienestar, mancuernas/botella y desayuno con luz natural | 39.370 bytes | 20e9cad04773fd3abe17cf1524f911122e49ed57022efc578ba1591ef2e51082 |
| nutricion-claro.webp | Meal prep en cocina clara con cerámica y piedra | 59.378 bytes | b2c345a3a10f13eb305b0d0bb00d65d4f8c8a9501565fb45162aacd9b818529a |
| gym-claro.webp | Pesas/rack en gimnasio iluminado por ventanas | 58.044 bytes | 55e092a5891b35b5135ddc014dc2a380af492a3d676d4cd7c68490ceb2327447 |

Origen: herramienta image_gen, con la preview aprobada como referencia. Cada `.webp.json` conserva el prompt exacto y fecha de producción mediante `impeccable embed-prompt` (sidecar para WebP). Placas originales PNG de 1024×1536, exportadas con ImageMagick a 960×1440, WebP calidad 76/método 6. No se altera la foto con trazado SVG o texto rasterizado. La saturación, overlay y fade corresponden a CSS, no al archivo.

Las tres escenas claras se generan el 2026-10-06 después de que Víctor pida imágenes nuevas que encajen con claro, mediante image_gen sin utilizar la foto oscura como referencia. Mismo formato/exportación/procedencia; son escenas nuevas de luz natural, no versiones blanqueadas de las anteriores.

Presupuesto conjunto: 332.504 bytes (~325 KiB), seis escenas; el juego claro añade 156.792 bytes (~153 KiB). Sin dependencias ni host externo. Carga decorativa fuera del flujo, una sola imagen visible según sección/tema, fallback y precache. Al sustituir una placa, conservar procedencia, comprobar contraste/crop móvil y mantener el presupuesto de tests.
