# 019 — Perfil y estimación energética

Fecha: 2026-10-06. Estado: aceptada.

## Contexto

Las kcal objetivo se tecleaban a mano en Ajustes (por defecto 2.200 kcal, sin fuente clínica). Víctor quiere una sección principal que estime su gasto y su objetivo energético a partir de datos personales, con fórmulas citadas, transparente y solo en el dispositivo.

## Decisión

**Gasto en reposo (TMB)**: media de Mifflin-St Jeor (1990) y Harris-Benedict revisada por Roza y Shizgal (1984). Ninguna publicación valida esa media como ecuación propia, así que se presenta como **criterio de AppFit** apoyado en dos ecuaciones citadas, no como método publicado. Mifflin es la ecuación que la revisión sistemática de Frankenfield (2005) señala como más fiable; Roza-Shizgal corrige la sobreestimación de Harris-Benedict (1918–1919), que no se implementa. Henry/Oxford (poblacional, EFSA) y Cunningham/Katch-McArdle (requieren masa magra) se descartan para no pedir ni guardar composición corporal. Arquitectura: registro `ECUACIONES` + constante `METODO_TMB`; cambiar de método es tocar esa constante.

**Factor de actividad** («¿Cuánto deporte haces?»): 1,2 · 1,375 · 1,55 · 1,725 · 1,9. Se atribuyen a McArdle, Katch y Katch (*Exercise Physiology*, 1996) y se presentan como **convención de uso extendido**: no se ha podido verificar la edición del manual ni localizar una derivación experimental. Contexto oficial: PAL de FAO/OMS/UNU 2004 y EFSA 2013; un PAL < 1,40 solo es propio de personas encamadas, por lo que el factor mide el deporte y no el resto del día.

**Ajuste por objetivo**: definición −200…−600 kcal, volumen +200…+600 kcal, en pasos de 100 y por defecto 400, elegido por el usuario (`intensidadKcal`, se guarda porque no es derivable); mantenimiento sin ajuste. El rango lo fija AppFit; NICE, Helms 2014, Garthe 2011, Slater 2019 e Iraki 2019 son solo contexto. Si en definición el ritmo aproximado (kcal × 7 / 7.700) supera el 1 % del peso por semana se avisa sin bloquear (Hall 2008: 7.700 kcal/kg es una aproximación).

**Límites de prudencia**: IMC < 18,5 bloquea el déficit (se muestra mantenimiento con explicación); el objetivo nunca baja de max(TMB, 800 kcal), criterio de AppFit (800 kcal = umbral de dietas de muy bajo valor calórico que NICE no recomienda sin supervisión); solo adultos de 18 a 100 años, con aviso por encima de 78 (fuera de la muestra de Mifflin). Los rangos de entrada (altura 120–230 cm, peso 20–300 kg) son controles de plausibilidad, no afirmaciones clínicas. El objetivo se redondea a 10 kcal (error típico de la ecuación ±10 %).

**Derivar frente a guardar**: se guardan solo los datos fuente en `Settings.perfil` (sexo, **fecha de nacimiento**, altura, actividad, objetivo, intensidad). Peso = último pesaje ≤ hoy de `pesos`. Edad, IMC, TMB, GET, ajuste y kcal objetivo se derivan al leer: cumplir años o registrar un peso cambia el objetivo al instante, sin migraciones ni valores obsoletos. Con perfil completo y objetivo elegido **manda el perfil** (kcal del perfil, macros reescalados con `reajustarObjetivos` conservando el reparto en %); si no, mandan los objetivos manuales de Ajustes.

**`settings` frente a tabla nueva**: es un registro único, `conDefaults` admite campos opcionales sin `upgrade()`, viaja en el backup y se borra con «Borrar todos los datos». Sin Dexie v7 y sin subir `BACKUP_VERSION`. `updateSettings` pasa a ser transaccional porque ahora escriben dos pantallas.

## Consecuencias

- Todas las pantallas que muestran objetivos leen `perfilRepo.objetivosVigentes(hoy)`; no hay histórico de objetivos (los días pasados usan el vigente).
- Al escalar por reparto, la proteína baja en definición. Pendiente (roadmap): proteína por g/kg y TDEE adaptativo con pesos y kcal registradas.
- El backup JSON contiene la fecha de nacimiento (dato más sensible, elección de Víctor); se avisa en Perfil y Referencias.
- Estimación orientativa, no prescripción médica; no apta para menores, embarazo/lactancia, enfermedades que alteran el metabolismo ni trastornos de la conducta alimentaria.
- Sin red nueva ni dependencias. Metodología y fuentes en Referencias › Energía y objetivo (registro `fuentesEnergia.ts`).
