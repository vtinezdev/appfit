import InsigniaExpedicion, { type TamanoInsignia } from '../../../shared/components/InsigniaExpedicion'
import type { Division } from '../lib/liga'

const ESTRELLA = 'M32 5 39 23 59 24 43 37 48 57 32 46 16 57 21 37 5 24 25 23Z'

/** Un símbolo por liga; el nombre y las semanas permanecen en texto. */
export default function IconoLiga({ liga, tamano = 'sm' }: { liga: Division['liga']; tamano?: TamanoInsignia }) {
  if (!liga) return null
  const ribete = liga === 'Bronce' || liga === 'Élite' ? 'bronce' : liga === 'Oro' ? 'oro' : liga === 'Rubí' ? 'rubi' : liga === 'Zafiro' ? 'zafiro' : 'plata'
  return <InsigniaExpedicion forma="hexagono" tamano={tamano} ribete={ribete} relieve={false}>
    <g fill={`rgb(var(--c-expedicion-${liga === 'Élite' ? 'marfil' : ribete}))`}>
      {liga === 'Bronce' && <path d="M7 34 32 13 57 34V49L32 28 7 49Z" />}
      {liga === 'Plata' && <path d="M7 25 32 7 57 25V36L32 18 7 36ZM7 44 32 26 57 44V55L32 37 7 55Z" />}
      {liga === 'Oro' && <><path d={ESTRELLA} /><path d="M32 5V32L48 57 43 37 59 24 32 32 16 57 21 37 5 24 32 32Z" fill="rgb(var(--c-expedicion-marfil))" opacity="0.25" /></>}
      {liga === 'Zafiro' && <>
        <path d="M2 18 22 27 19 34 4 28ZM4 34 20 40 18 46 7 42ZM8 46 18 50 16 56 11 53ZM62 18 42 27 45 34 60 28ZM60 34 44 40 46 46 57 42ZM56 46 46 50 48 56 53 53Z" />
        <path d={ESTRELLA} transform="translate(32 32) scale(0.64) translate(-32 -32)" />
      </>}
      {liga === 'Rubí' && <>
        <path d="M16 10H48L60 26 32 59 4 26Z" />
        <path d="M4 26H60M16 10 24 26 32 59 40 26 48 10M24 26 32 10 40 26" fill="none" stroke="rgb(var(--c-expedicion-bosque))" strokeWidth="2.5" />
      </>}
      {liga === 'Élite' && <>
        <path d="M6 23 20 33 32 17 44 33 58 23 51 48H13ZM14 52H50V58H14Z" />
        <path d="M32 4 37 12 32 20 27 12Z" fill="rgb(var(--c-expedicion-bronce))" />
      </>}
    </g>
  </InsigniaExpedicion>
}
