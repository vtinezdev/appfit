import { useId, type CSSProperties, type ReactNode } from 'react'

export type FormaInsignia = 'hexagono' | 'escudo' | 'circulo' | 'triangulo' | 'cuadrado' | 'rombo' | 'placa'
export type TonoInsignia = 'bosque' | 'arcilla' | 'salvia'
export type TamanoInsignia = 'sm' | 'md' | 'lg'

const FORMAS: Record<FormaInsignia, string> = {
  hexagono: 'M50 4 91 27Q94 29 94 33V67Q94 71 91 73L53 95Q50 97 47 95L9 73Q6 71 6 67V33Q6 29 9 27L47 5Q50 3 50 4Z',
  escudo: 'M20 5H80L94 18V66Q94 72 88 76L54 95Q50 97 46 95L12 76Q6 72 6 66V18Z',
  circulo: 'M50 4a46 46 0 1 1 0 92a46 46 0 1 1 0-92Z',
  triangulo: 'M44 9Q50 0 56 9L94 77Q103 94 85 94H15Q-3 94 6 77Z',
  cuadrado: 'M20 5H80Q95 5 95 20V80Q95 95 80 95H20Q5 95 5 80V20Q5 5 20 5Z',
  rombo: 'M43 7Q50 0 57 7L93 43Q100 50 93 57L57 93Q50 100 43 93L7 57Q0 50 7 43Z',
  placa: 'M15 14H85Q96 14 96 25V75Q96 86 85 86H15Q4 86 4 75V25Q4 14 15 14Z',
}
const COLOR = (nombre: string) => `rgb(var(--c-expedicion-${nombre}))`

interface Props {
  forma: FormaInsignia
  children: ReactNode
  tono?: TonoInsignia
  tamano?: TamanoInsignia
  /** El estado también se expresa con texto junto a la insignia. */
  pendiente?: boolean
  ribete?: 'bronce' | 'plata' | 'oro' | 'zafiro' | 'rubi'
  /** Las ligas conservan solo curvas de nivel, sin las laderas de los logros. */
  relieve?: boolean
}

/** Arte vectorial local de expedición. Siempre decorativo: el nombre y el estado viven en el texto de la fila. */
export default function InsigniaExpedicion({ forma, children, tono = 'bosque', tamano = 'md', pendiente = false, ribete, relieve = true }: Props) {
  const recorte = useId()
  const silueta = FORMAS[forma]
  const fondo = pendiente ? 'rgb(var(--c-surface-muted))' : COLOR(tono)
  const tinta = pendiente ? 'rgb(var(--c-text-tertiary))' : COLOR('marfil')
  const borde = pendiente ? 'rgb(var(--c-border-strong))' : COLOR(ribete ?? 'marfil')
  return <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false" className="app-insignia block shrink-0"
    style={{ width: `var(--insignia-${tamano})`, height: `var(--insignia-${tamano})` }}>
    <defs><clipPath id={recorte}><path d={silueta} /></clipPath></defs>
    <path d={silueta} fill={fondo} stroke={pendiente ? borde : COLOR('bosque')} strokeWidth="2" />
    <g clipPath={`url(#${recorte})`}>
      <g fill="none" stroke={pendiente ? borde : COLOR('salvia')} strokeWidth="0.8" opacity="0.45">
        <path d="M-8 27C14 30 12 4 31 4S46 34 69 26 86 4 108 13M-7 35C18 39 17 10 30 11S44 43 72 33 89 14 108 21M-8 45C22 51 22 19 30 20S44 53 74 42 93 24 109 31" />
        <path d="M-9 67C12 44 28 64 35 76S52 107 78 82 99 74 111 85M-7 78C10 56 21 73 28 84S49 118 82 91M-5 92C11 71 20 88 25 95" />
        <path d="M40-8C53 3 41 10 52 19S71 15 81-2M47-9C60 2 50 8 57 12S68 8 72-3M78 55C84 48 91 50 103 44M75 62C84 53 92 59 109 51" />
      </g>
      {relieve && !pendiente && <g>
        <path d="M0 86 19 75 29 80 46 69 68 84 82 73 100 84V100H0Z" fill={COLOR(tono === 'bosque' ? 'arcilla' : 'salvia')} />
        <path d="M0 99 22 86 34 94 51 81 66 93 80 85 100 96V102H0Z" fill={COLOR('bosque')} />
      </g>}
      <svg x={forma === 'triangulo' ? 22 : 18} y={forma === 'triangulo' ? 30 : 18} width={forma === 'triangulo' ? 56 : 64} height={forma === 'triangulo' ? 56 : 64} viewBox="0 0 64 64" fill={tinta} color={tinta}
        style={pendiente ? { '--c-expedicion-bosque': 'var(--c-surface-muted)', '--c-expedicion-arcilla': 'var(--c-surface-muted)', '--c-expedicion-salvia': 'var(--c-surface-muted)' } as CSSProperties : undefined}>
        {children}
      </svg>
    </g>
    <path d={silueta} transform="translate(50 50) scale(0.91) translate(-50 -50)" fill="none" stroke={borde} strokeWidth={ribete ? 3.5 : 1.8} />
  </svg>
}
