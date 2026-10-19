import type { ReactNode } from 'react'
import type { Avatar, DisciplinaAvatar, PaisajeAvatar, TonoAvatar } from '../lib/avatar'

/**
 * Arte de los avatares de catálogo (disciplinas y paisajes), en la paleta fija de la Vitrina: se ve igual en los dos
 * temas, como las insignias. Coordenadas 40 × 40; el recorte circular lo pone el contenedor (`Avatar`). Decorativo.
 */
const c = (nombre: string) => `rgb(var(--c-expedicion-${nombre}))`

type DisciplinaConFigura = 'calistenia' | 'esqui' | 'snowboard' | 'remo'

/** Trazo de 24 × 24, como el de los iconos de la app (Icon), centrado en el círculo. */
const TRAZOS: Record<Exclude<DisciplinaAvatar, DisciplinaConFigura>, string> = {
  pesas: 'M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11',
  kettlebell: 'M6.5 15a5.5 5.5 0 1 0 11 0a5.5 5.5 0 1 0-11 0M8.7 10.6V7.5a3.3 3.3 0 0 1 6.6 0v3.1',
  carrera: 'M13.2 4.5a1.8 1.8 0 1 0 3.6 0a1.8 1.8 0 1 0-3.6 0M13.5 8l-2 5.5M13.5 8l-4 2-2.5-.5M13.5 8l2.5 2.5 2.5-1.5M11.5 13.5l3 2.5-1 4.5M11.5 13.5l-2 3-4 .5',
  caminar: 'M4.6 14.2c-.9-2.4-1.5-4.2-1.4-6.4C3.4 5 4.8 3 6.6 3s2.9 1.9 2.7 4.3c-.2 2.3-1.2 4.4-1.4 6.9zM4.9 16.4h3.1v.5a1.55 1.55 0 0 1-3.1 0zM15.1 18.2c-.9-2.4-1.5-4.2-1.4-6.4.2-2.8 1.6-4.8 3.4-4.8s2.9 1.9 2.7 4.3c-.2 2.3-1.2 4.4-1.4 6.9zM15.4 20.4h3.1v.5a1.55 1.55 0 0 1-3.1 0z',
  montana: 'M2.5 19.5L9.5 7l4 7 2.5-4 5.5 9.5zM7.2 11.2l1.6 1.4 1.4-1.6 1.3 1.2',
  bici: 'M2 16a4 4 0 1 0 8 0a4 4 0 1 0-8 0M14 16a4 4 0 1 0 8 0a4 4 0 1 0-8 0M6 16l4-7h6l2 7M6 16h6l4-7M10 9l2 7M8.5 8h3M16 9l-.6-2.5h2.1',
  natacion: 'M3 15.5c1.5 0 1.5 1.5 3 1.5s1.5-1.5 3-1.5 1.5 1.5 3 1.5 1.5-1.5 3-1.5 1.5 1.5 3 1.5 1.5-1.5 3-1.5M3 20c1.5 0 1.5 1.5 3 1.5s1.5-1.5 3-1.5 1.5 1.5 3 1.5 1.5-1.5 3-1.5 1.5 1.5 3 1.5 1.5-1.5 3-1.5M14 7a2 2 0 1 0 4 0a2 2 0 1 0-4 0M4.5 12.5l5-4 3.5 3.5',
  padel: 'M8.5 9a5.5 5.5 0 1 0 11 0a5.5 5.5 0 1 0-11 0M10.1 12.9L5 19M4 18l2 2M12.5 7.5v.01M15.5 7.5v.01M14 10.5v.01',
  futbol: 'M3 12a9 9 0 1 0 18 0a9 9 0 1 0-18 0M12 8l3.3 2.4-1.3 3.9h-4l-1.3-3.9zM12 3v5M15.3 10.4l5-1.5M14 14.3l3 4.2M10 14.3l-3 4.2M8.7 10.4l-5-1.5',
  ruta: 'M3.5 18.5a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0M15.5 5.5a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0M8.5 18.5h8a3 3 0 0 0 0-6h-9a3 3 0 0 1 0-6h8',
  yoga: 'M10 4.5a2 2 0 1 0 4 0a2 2 0 1 0-4 0M4 14q3 0 3.5-3a4.5 4.5 0 0 1 9 0q.5 3 3.5 3M9 14v2l7 4q5 1 4-2-1-2-5-1l-7 3q-5 1-4-2 1-2 5-1M15 14v2',
  pilates: 'M1.5 16.5a1.8 1.8 0 1 0 3.6 0a1.8 1.8 0 1 0-3.6 0M6.7 17l.3-2 8.8-4.4q1.7-.9 2.2 1.1l2.1 6.3H22M7 17.5h6M1 21h22',
  boxeo: 'M8.5 20v-4.2C5 14 3.8 11 4.8 9.5q.8-1.3 2.5 0l1.2 2V6q0-3 3-3H16q4 0 4 4v4q0 4-4 6v3zM8.5 17H16',
  escalada: 'M7 8a1.7 1.7 0 1 0 3.4 0a1.7 1.7 0 1 0-3.4 0M9 11l-2.5 3-3-1M9 11l4-2 3-6M9 11l2 5M11 16l4-3 2.5 4M11 16l-3 6M15 2l3-1 1 3-2 1M1.5 12l2-.8 1 2-1.7 1.1zM16 17l3-1 1 2.5-3 1zM6 22l3-.7.8 1.7M16 10l2-.7.7 1.8-1.8.8M5 4l2-.7.6 1.7-2 .8',
  tenis: 'M10 5c3-4 7-3 9 0s0 7-3 9-6 1-7-2 0-5 1-7zM9.5 13.5L4 20M3 19l2 2M12 5l5 5M10 8l5 5M11 11l5-6M19 18a2 2 0 1 0 4 0a2 2 0 1 0-4 0',
  baloncesto: 'M3 12a9 9 0 1 0 18 0a9 9 0 1 0-18 0M3 12h18M12 3v18M6 5C10 9 10 15 6 19M18 5C14 9 14 15 18 19',
  surf: 'M9 3q-5 7-4 15h8Q14 9 9 3zM9 3v15M2 20q3-2 6 0t6 0M12 18q4-9 9-6-5 1-2 5 3 4-2 5M4 23q2-2 4 0t4 0',
  baile: 'M12 4a1.8 1.8 0 1 0 3.6 0a1.8 1.8 0 1 0-3.6 0M13 8l-2 6M13 8l-6 1-4-2M13 8l4-3 2-4M11 14l-5 2 4 3M11 14l3 3-1 6',
  comba: 'M10.4 7a1.6 1.6 0 1 0 3.2 0a1.6 1.6 0 1 0-3.2 0M12 10v5M12 10l-4 4-3-1M12 10l4 4 3-1M12 15l-3 3 1 2M12 15l3 3-1 3M5 13C0-4 24-4 19 13M4.7 12.5v2M19.3 12.5v2M9 23h6',
}

/**
 * Figuras en 100 × 100: sus piezas separadas conservan postura y equipo al reducirlas.
 * El relleno del grupo es el fondo elegido, para que botas, cuerpo y tabla no se crucen entre sí.
 */
const FIGURAS: Record<DisciplinaConFigura, ReactNode> = {
  calistenia: <g fill="none">
    <path d="M27 79V25M73 79V25M27 29H73" />
    <circle cx="50" cy="39" r="4.5" />
    <path d="M35 29L40 45Q50 57 60 45L65 29" />
    <path d="M44 52V72Q44 80 50 80T56 72V52M50 65V79" />
  </g>,
  esqui: <g transform="translate(4 -1) scale(.92)">
    <g fill="none" strokeWidth="2.2">
      <path d="M29 55L13 64M25 56L28 62M73 51L59 83" />
      <path d="M21 78L73 85Q79 86 82 81M14 83L70 91Q77 92 81 87" strokeWidth="3" />
    </g>
    <circle cx="64" cy="29" r="5" />
    <path d="M46 37Q49 34 53 38L62 44 73 48 71 52 59 49 51 44 45 52 54 58Q58 61 54 66L41 81 33 79 44 64 35 57Q31 53 35 48Z" />
    <path d="M37 56L28 64 21 77 28 78 39 65M39 44L32 54 28 57" fill="none" />
  </g>,
  snowboard: <>
    <path d="M8 60L84 88" fill="none" strokeWidth="2" />
    <path d="M24 60Q20 58 21 63Q21 67 27 70L74 85Q80 87 83 81L81 78 76 80 30 65Q28 61 24 60Z" />
    <path d="M59 40L49 38 35 38 27 42Q24 43 25 46L28 49 42 45 48 46 41 54Q39 57 42 60L51 66 48 70 54 72 61 64Q63 61 60 59L53 54 64 57 67 72 74 74 73 54 64 46 74 49 80 52Q84 53 85 49L83 46 68 40Z" />
    <path d="M59 28Q58 21 65 21Q73 21 75 28L74 34Q74 40 68 42Q62 41 60 35Z" />
    <path d="M59 28L74 32M60 32L64 33 66 37 71 37 74 33" fill="none" strokeWidth="2.2" />
    <path d="M47 66L45 71Q44 73 47 74L55 77 58 73 55 68ZM66 69L64 76 74 80 77 76 74 71Z" />
    <path d="M47 71L54 73M67 74L74 76" fill="none" strokeWidth="2" />
    <path d="M17 53L19 56M13 59L15 60M21 48L22 49" fill="none" strokeWidth="2.2" />
  </>,
  remo: <>
    <circle cx="50" cy="28" r="5.5" />
    <path d="M46 39Q50 37 54 39L57 52H43Z" />
    <path d="M46 40L39 46 32 48M54 40L61 46 68 48" fill="none" />
    <path d="M27 53H73L65 63Q50 68 35 63Z" />
    <path d="M38 44L19 65M62 44L81 65" fill="none" strokeWidth="2.8" />
    <path d="M12 65L18 59 25 66 19 73ZM75 66L82 59 88 65 81 73Z" fill="currentColor" stroke="none" />
    <path d="M22 76Q27 72 32 76T42 76 52 76 62 76 72 76 82 76M29 83Q34 79 39 83T49 83 59 83 69 83" fill="none" strokeWidth="2.2" />
  </>,
}

function tieneFigura(disciplina: DisciplinaAvatar): disciplina is DisciplinaConFigura {
  return Object.hasOwn(FIGURAS, disciplina)
}

/** Las curvas de nivel de las insignias (InsigniaExpedicion), a escala del avatar. */
const CURVAS = 'M-8 27C14 30 12 4 31 4S46 34 69 26 86 4 108 13M-7 35C18 39 17 10 30 11S44 43 72 33 89 14 108 21M-8 45C22 51 22 19 30 20S44 53 74 42 93 24 109 31M-9 67C12 44 28 64 35 76S52 107 78 82 99 74 111 85M-7 78C10 56 21 73 28 84S49 118 82 91M-5 92C11 71 20 88 25 95M40-8C53 3 41 10 52 19S71 15 81-2M47-9C60 2 50 8 57 12S68 8 72-3M78 55C84 48 91 50 103 44M75 62C84 53 92 59 109 51'

function Disciplina({ disciplina, tono }: { disciplina: DisciplinaAvatar; tono: TonoAvatar }) {
  const tinta = c(tono === 'oro' ? 'bosque' : 'marfil')
  // Las figuras con equipo necesitan más espacio que los pictogramas originales.
  const detallada = ['pilates', 'escalada', 'comba'].includes(disciplina)
  return <>
    <rect width="40" height="40" fill={c(tono)} />
    {disciplina === 'escalada' && <g fill={tinta}>
      <path d="M27 0H40V40H24L30 17Z" opacity=".07" />
      <path d="M30 17L40 27V40H24Z" opacity=".06" />
    </g>}
    <path d={CURVAS} transform="scale(.4)" fill="none" stroke={tinta} strokeWidth="2" opacity=".22" />
    {tieneFigura(disciplina)
      ? <svg width="40" height="40" viewBox="0 0 100 100" fill={c(tono)} stroke={tinta} color={tinta} strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round">
        {FIGURAS[disciplina]}
      </svg>
      : <path d={TRAZOS[disciplina]} transform={detallada ? 'translate(6 6) scale(1.1667)' : 'translate(9 9) scale(.9167)'} fill="none" stroke={tinta} strokeWidth={detallada ? 1.6 : 2.2} strokeLinecap="round" strokeLinejoin="round" />}
  </>
}

const PAISAJES: Record<PaisajeAvatar, ReactNode> = {
  cumbre: <>
    <rect width="40" height="40" fill={c('zafiro')} /><circle cx="29" cy="11" r="4" fill={c('oro')} />
    <path d="M-2 34L15 12 24 24 29 18 42 34Z" fill={c('bosque')} /><path d="M15 12L11.1 17 13.6 16.2 15.6 18.2 18.3 15.7Z" fill={c('marfil')} />
    <path d="M-2 40V32Q20 27 42 32V40Z" fill={c('salvia')} />
  </>,
  volcan: <>
    <rect width="40" height="40" fill={c('rubi')} />
    <circle cx="17.5" cy="12" r="3" fill={c('plata')} /><circle cx="22.5" cy="8.5" r="3.6" fill={c('plata')} /><circle cx="28" cy="5.5" r="3" fill={c('plata')} />
    <path d="M-2 40L14 18H26L42 40Z" fill={c('arcilla')} /><path d="M14 18H26L24 21.5 21.5 19.5 18.5 22.5 16.2 20.2Z" fill={c('oro')} />
  </>,
  noche: <>
    <rect width="40" height="40" fill={c('bosque')} />
    <circle cx="27" cy="13" r="5.5" fill={c('marfil')} /><circle cx="29.8" cy="11.2" r="4.6" fill={c('bosque')} />
    <circle cx="10" cy="10" r=".9" fill={c('marfil')} /><circle cx="16" cy="16" r=".75" fill={c('marfil')} />
    <circle cx="8" cy="19" r=".65" fill={c('marfil')} /><circle cx="19" cy="7" r=".65" fill={c('marfil')} />
    <path d="M-2 40V28Q10 20 22 28T46 26V40Z" fill={c('salvia')} />
  </>,
  pista: <>
    <rect width="40" height="40" fill={c('arcilla')} />
    <rect x="4" y="11.5" width="32" height="17" rx="8.5" fill="none" stroke={c('marfil')} strokeWidth="1.2" />
    <rect x="7.5" y="14.5" width="25" height="11" rx="5.5" fill="none" stroke={c('marfil')} strokeWidth="1.2" />
    <rect x="11" y="17.5" width="18" height="5" rx="2.5" fill={c('salvia')} />
  </>,
  bosque: <>
    <rect width="40" height="40" fill={c('marfil')} />
    <path d="M10 12L3 31H17Z" fill={c('salvia')} /><path d="M30 12L23 31H37Z" fill={c('salvia')} />
    <path d="M20 5L11 32H29Z" fill={c('bosque')} /><rect y="31" width="40" height="9" fill={c('bronce')} />
  </>,
  lago: <>
    <rect width="40" height="40" fill={c('plata')} /><path d="M-2 26Q8 13 18 22Q26 11 42 24V40H-2Z" fill={c('salvia')} />
    <rect y="26" width="40" height="14" fill={c('zafiro')} />
    <path d="M8 31h10M22 34.5h8" stroke={c('marfil')} strokeWidth="1.3" strokeLinecap="round" />
  </>,
  dunas: <>
    <rect width="40" height="40" fill={c('oro')} /><circle cx="12" cy="12" r="4.5" fill={c('marfil')} />
    <path d="M-2 27Q12 18 26 26T54 26V40H-2Z" fill={c('bronce')} /><path d="M-2 33Q16 25 30 31T60 30V40H-2Z" fill={c('arcilla')} />
  </>,
  mar: <>
    <rect width="40" height="40" fill={c('bronce')} /><circle cx="20" cy="24" r="8.5" fill={c('oro')} />
    <rect y="24" width="40" height="16" fill={c('cobalto')} />
    <path d="M7 29h8M23 29h10M11 33.5h6M21 33.5h8" stroke={c('marfil')} strokeWidth="1.3" strokeLinecap="round" />
  </>,
  cascada: <>
    <rect width="40" height="40" fill={c('plata')} />
    <path d="M0 8L10 11 16 17V40H0ZM40 8L30 11 24 17V40H40Z" fill={c('bosque')} />
    <path d="M10 11L16 17V31L10 27ZM30 11L24 17V31L30 27Z" fill={c('salvia')} />
    <path d="M16 17H24V31L40 35V40H0V35L16 31Z" fill={c('zafiro')} />
    <path d="M10 35h6M22 37h6" stroke={c('marfil')} strokeWidth="1.3" strokeLinecap="round" />
  </>,
  acantilado: <>
    <rect width="40" height="40" fill={c('zafiro')} /><rect y="23" width="40" height="17" fill={c('cobalto')} />
    <path d="M0 9L13 12 15 20 20 26 24 40H0Z" fill={c('arcilla')} />
    <path d="M0 9L11 11 13 25 19 40H0Z" fill={c('bronce')} />
    <path d="M28 28h4M31 32h4" stroke={c('marfil')} strokeWidth="1.3" strokeLinecap="round" />
  </>,
  glaciar: <>
    <rect width="40" height="40" fill={c('plata')} />
    <path d="M0 19L8 14 15 16 21 9 28 16 32 14 40 20V29H0Z" fill={c('marfil')} />
    <path d="M0 22L8 17 15 20 21 14 28 21 32 18 40 23V31H0Z" fill={c('zafiro')} />
    <path d="M8 17L10 29H16L15 20ZM28 21L30 29H35L32 18Z" fill={c('marfil')} opacity=".3" />
    <rect y="29" width="40" height="11" fill={c('cobalto')} />
    <path d="M5 33h6M23 36h7" stroke={c('marfil')} strokeWidth="1.3" strokeLinecap="round" />
  </>,
  aurora: <>
    <rect width="40" height="40" fill={c('bosque')} />
    <path d="M12-2H19Q17 7 26 14T29 27Q37 17 28 8T26-2Z" fill={c('salvia')} />
    <path d="M-2 9Q10 15 17 15T22 28Q20 22 13 22T-2 17Z" fill={c('oro')} />
    <path d="M5 9h.01M29 5h.01M34 16h.01M9 27h.01" stroke={c('marfil')} strokeWidth="1.1" strokeLinecap="round" />
    <path d="M-2 40V33Q8 36 19 31T42 33V40Z" fill={c('marfil')} />
  </>,
  amanecer: <>
    <rect width="40" height="40" fill={c('rubi')} /><circle cx="22" cy="21" r="8" fill={c('oro')} />
    <path d="M-2 28L10 20 18 25 29 19 42 26V40H-2Z" fill={c('salvia')} />
    <path d="M-2 34Q19 27 42 34V40H-2Z" fill={c('bosque')} />
  </>,
  valle: <>
    <rect width="40" height="40" fill={c('zafiro')} />
    <path d="M14 20L18 17 20 17.7 23 14.5 28 19 25 18.5 23 19.5 21 18.2 19 19.5 17.5 19Z" fill={c('marfil')} />
    <path d="M-2 7L8 12 11 19 20 28 29 17 33 12 42 7V40H-2Z" fill={c('salvia')} />
    <path d="M-2 10L4 15 9 27 14 31 0 36ZM42 10L36 15 32 27 26 31 40 36Z" fill={c('bosque')} />
    <path d="M-2 40V34Q20 25 42 34V40Z" fill={c('salvia')} />
    <path d="M20 28Q24 29 22 31Q20 32 25 34L34 40H24Q29 37 23 34T20 31Q23 29 20 28Z" fill={c('cobalto')} />
    <path d="M26 37h3" stroke={c('marfil')} strokeWidth="1.2" strokeLinecap="round" />
  </>,
  canon: <>
    <rect width="40" height="40" fill={c('oro')} />
    <path d="M0 5L12 9 14 19 17 25 18 40H0ZM40 5L30 9 27 19 24 25 23 40H40Z" fill={c('bronce')} />
    <path d="M0 5L10 8 12 20 15 26 14 40H0ZM40 5L32 9 30 20 27 25 27 40H40Z" fill={c('arcilla')} />
    <path d="M18 29H23L22 32 24 35 27 40H13L18 35 20 32Z" fill={c('zafiro')} />
  </>,
  isla: <>
    <rect width="40" height="40" fill={c('zafiro')} /><rect y="28" width="40" height="12" fill={c('cobalto')} />
    <path d="M11 28Q21 20 30 28Z" fill={c('marfil')} />
    <path d="M23 25Q23 19 21 16M21 16Q15 12 13 17Q18 15 21 16Q18 18 18 22Q21 19 21 16Q25 17 28 21Q28 16 21 16Q21 11 26 11Q23 10 21 16" fill={c('bosque')} stroke={c('bosque')} strokeWidth="1.2" strokeLinejoin="round" />
    <path d="M6 32h7M16 35h5M28 33h5" stroke={c('marfil')} strokeWidth="1.3" strokeLinecap="round" />
  </>,
  faro: <>
    <rect width="40" height="40" fill={c('zafiro')} /><rect y="28" width="40" height="12" fill={c('cobalto')} />
    <path d="M0 28L15 24 23 27 28 35 0 39Z" fill={c('bosque')} />
    <path d="M12 25L13 12H19L20 25Z" fill={c('marfil')} /><path d="M11 12L16 7 21 12Z" fill={c('arcilla')} />
    <path d="M15 15h2v3H15Z" fill={c('bosque')} />
    <path d="M29 31h5M16 37h7" stroke={c('marfil')} strokeWidth="1.3" strokeLinecap="round" />
  </>,
  sendero: <>
    <rect width="40" height="40" fill={c('plata')} />
    <path d="M-2 21Q6 17 15 21Q29 9 42 18V40H-2Z" fill={c('salvia')} />
    <path d="M-2 20Q11 16 24 27L42 33V40H-2Z" fill={c('bosque')} />
    <path d="M-2 40V33Q20 24 42 29V40Z" fill={c('salvia')} />
    <path d="M21 21Q31 23 24 26L17 29Q10 32 19 35L25 40H8Q17 37 12 34Q7 30 20 27L25 25Q29 23 21 21Z" fill={c('bronce')} />
  </>,
  lluvia: <>
    <rect width="40" height="40" fill={c('zafiro')} />
    <path d="M12 17a4 4 0 0 1 1-7 5 5 0 0 1 9-2 4 4 0 0 1 5 3 3 3 0 0 1 0 6Z" fill={c('plata')} />
    <path d="M13 21l-3 6M20 21l-3 6M27 21l-3 6" stroke={c('cobalto')} strokeWidth="1.8" strokeLinecap="round" />
    <path d="M-2 40V31Q8 27 19 32Q30 25 42 31V40Z" fill={c('salvia')} />
    <path d="M-2 40V33Q10 28 29 40Z" fill={c('bosque')} />
  </>,
  colinas: <>
    <rect width="40" height="40" fill={c('marfil')} /><circle cx="28" cy="11" r="4.5" fill={c('oro')} />
    <path d="M-2 25Q8 17 21 25Q32 19 42 24V40H-2Z" fill={c('salvia')} />
    <path d="M-2 40V33Q14 19 42 32V40Z" fill={c('bosque')} />
    <path d="M-2 40Q21 26 42 28V40Z" fill={c('arcilla')} />
  </>,
}

export default function ArteAvatar({ avatar }: { avatar: Exclude<Avatar, { tipo: 'logro' }> }) {
  return <svg viewBox="0 0 40 40" aria-hidden="true" focusable="false" className="block h-full w-full">
    {avatar.tipo === 'disciplina' ? <Disciplina disciplina={avatar.disciplina} tono={avatar.tono} /> : PAISAJES[avatar.paisaje]}
  </svg>
}
