import type { ReactNode } from 'react'
import type { Avatar, DisciplinaAvatar, PaisajeAvatar, TonoAvatar } from '../lib/avatar'

/**
 * Arte de los avatares de catálogo (disciplinas y paisajes), en la paleta fija de la Vitrina: se ve igual en los dos
 * temas, como las insignias. Coordenadas 40 × 40; el recorte circular lo pone el contenedor (`Avatar`). Decorativo.
 */
const c = (nombre: string) => `rgb(var(--c-expedicion-${nombre}))`

/** Trazo de 24 × 24, como el de los iconos de la app (Icon), centrado en el círculo. */
const TRAZOS: Record<DisciplinaAvatar, string> = {
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
}

/** Las curvas de nivel de las insignias (InsigniaExpedicion), a escala del avatar. */
const CURVAS = 'M-8 27C14 30 12 4 31 4S46 34 69 26 86 4 108 13M-7 35C18 39 17 10 30 11S44 43 72 33 89 14 108 21M-8 45C22 51 22 19 30 20S44 53 74 42 93 24 109 31M-9 67C12 44 28 64 35 76S52 107 78 82 99 74 111 85M-7 78C10 56 21 73 28 84S49 118 82 91M-5 92C11 71 20 88 25 95M40-8C53 3 41 10 52 19S71 15 81-2M47-9C60 2 50 8 57 12S68 8 72-3M78 55C84 48 91 50 103 44M75 62C84 53 92 59 109 51'

function Disciplina({ disciplina, tono }: { disciplina: DisciplinaAvatar; tono: TonoAvatar }) {
  const tinta = c(tono === 'oro' ? 'bosque' : 'marfil')
  return <>
    <rect width="40" height="40" fill={c(tono)} />
    <path d={CURVAS} transform="scale(.4)" fill="none" stroke={tinta} strokeWidth="2" opacity=".22" />
    <path d={TRAZOS[disciplina]} transform="translate(9 9) scale(.9167)" fill="none" stroke={tinta} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
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
}

export default function ArteAvatar({ avatar }: { avatar: Exclude<Avatar, { tipo: 'logro' }> }) {
  return <svg viewBox="0 0 40 40" aria-hidden="true" focusable="false" className="block h-full w-full">
    {avatar.tipo === 'disciplina' ? <Disciplina disciplina={avatar.disciplina} tono={avatar.tono} /> : PAISAJES[avatar.paisaje]}
  </svg>
}
