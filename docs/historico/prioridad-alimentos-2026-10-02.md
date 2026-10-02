# Comparativa de prioridad de alimentos

28 búsquedas sobre CIQUAL 2025-es2 y Open Food Facts España 2026-09-30 (6.323 filas), sin frecuentes personales. Ejecutadas con `buscarCatalogo` y IndexedDB en memoria antes y después del cambio. Se conserva el número de candidatos en las 28 consultas; cambia el primer resultado en 14. No se modifican los paquetes ni los nutrientes.

| Consulta | Primer resultado antes | Primer resultado después |
|---|---|---|
| pollo | Pollo, carne cruda (`ciqual:36003`) | Pollo, pechuga sin piel cruda (`ciqual:36017`) |
| pechuga | Pato, pechuga ahumada (`ciqual:8111`) | Pollo, pechuga sin piel cruda (`ciqual:36017`) |
| pechuga de pollo | Pollo, pechuga sin piel cruda (`ciqual:36017`) | Pollo, pechuga sin piel cruda (`ciqual:36017`) |
| huevo | Huevo, en polvo (`ciqual:22013`) | Huevo crudo (`ciqual:22000`) |
| arroz | Arroz, mezcla de variedades (blanco, integral, rojo, salvaje, etc.), crudo (`ciqual:9121`) | Arroz blanco, crudo (`ciqual:9100`) |
| leche | Leche, 1,2 % MG, UHT, enriquecida en vitaminas (`ciqual:19038`) | Leche semidesnatada (promedio) (`ciqual:19033`) |
| pasta | Pasta de almendra (mazapán), envasada (`ciqual:15201`) | Pasta seca, estándar, cruda (`ciqual:9810`) |
| macarrones | Pasta seca, con huevos, cruda (`ciqual:9821`) | Pasta seca, estándar, cruda (`ciqual:9810`) |
| yogur | Yogur al estilo griego, natural (`ciqual:19860`) | Yogur o leche fermentada, natural (`ciqual:19593`) |
| pan | Pan (promedio) (`ciqual:7000`) | Pan blanco (p. ej. baguette, hogaza) (`ciqual:7001`) |
| atún | Atún, crudo (`ciqual:26053`) | Atún, al natural, en conserva, escurrido (`ciqual:26039`) |
| aceite | Aceite de aguacate (`ciqual:17100`) | Aceite de oliva virgen extra (`ciqual:17270`) |
| tomates | Tomate cereza, crudo (`ciqual:20172`) | Tomate redondo, crudo (`ciqual:20276`) |
| nueces | Nuez, grano, deshidratada (`ciqual:15005`) | Nuez, grano, deshidratada (`ciqual:15005`) |
| café con leche | Café con leche o capuchino, polvo soluble (`ciqual:18160`) | Café con leche o capuchino, instantáneo o no, sin azúcares añadidos, listo para beber (`ciqual:18151`) |
| jamón york | Jamón cocido, superior (`ciqual:28900`) | Jamón cocido, superior (`ciqual:28900`) |
| pechuga de pato | Pato, pechuga ahumada (`ciqual:8111`) | Pato, pechuga ahumada (`ciqual:8111`) |
| pollo con piel | Pollo, carne y piel cruda (`ciqual:36016`) | Pollo, carne y piel cruda (`ciqual:36016`) |
| pechuga de pollo a la plancha | Pollo, pechuga sin piel a la plancha/a la sartén (`ciqual:36018`) | Pollo, pechuga sin piel a la plancha/a la sartén (`ciqual:36018`) |
| huevo frito | Huevo frito, sin grasa (`ciqual:22505`) | Huevo frito, sin grasa (`ciqual:22505`) |
| huevo en polvo | Huevo, en polvo (`ciqual:22013`) | Huevo, en polvo (`ciqual:22013`) |
| arroz cocido | Arroz blanco cocido al vapor, crudo (`ciqual:9101`) | Arroz basmati, cocido, sin sal añadida (`ciqual:9125`) |
| arroz integral | Arroz integral, crudo (`ciqual:9102`) | Arroz integral, crudo (`ciqual:9102`) |
| leche entera | Leche entera, pasterizada (`ciqual:19024`) | Leche entera, pasterizada (`ciqual:19024`) |
| yogur griego | Yogur al estilo griego, natural (`ciqual:19860`) | Yogur al estilo griego, natural (`ciqual:19860`) |
| yogur natural | Yogur al estilo griego, natural (`ciqual:19860`) | Yogur al estilo griego, natural (`ciqual:19860`) |
| yogur hacendado | Yogur natural (`offes:8480000223135`) | Yogur natural (`offes:8480000223135`) |
| pollo ecológico | Pollo, muslo, carne y piel cruda, ecológico (`ciqual:36037`) | Pollo, muslo, carne y piel cruda, ecológico (`ciqual:36037`) |

El cambio de «arroz cocido» relega una entrada cuyo nombre contiene también «crudo». Las variantes específicas y de marca no reciben el básico de una consulta genérica. No se ha intentado normalizar todo el orden de las alternativas: por ejemplo, «yogur natural» mantiene el griego como primera coincidencia; ampliar las preferencias curadas queda para una iteración posterior.
