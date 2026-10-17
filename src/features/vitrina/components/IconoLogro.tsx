import type { ReactNode } from 'react'
import InsigniaExpedicion, { type FormaInsignia, type TamanoInsignia, type TonoInsignia } from '../../../shared/components/InsigniaExpedicion'
import { conseguido, type GrupoLogro, type IdLogro, type Logro } from '../lib/logros'

const FORMAS: Record<GrupoLogro, FormaInsignia> = {
  entreno: 'escudo', constancia: 'circulo', cumbres: 'triangulo', caminos: 'placa', nutricion: 'cuadrado', oculto: 'rombo',
}
const CANDADO = <><path d="M20 27V20a12 12 0 0 1 24 0v7" fill="none" stroke="currentColor" strokeWidth="6" /><rect x="13" y="26" width="38" height="30" rx="6" /><path d="M32 38v9" stroke="rgb(var(--c-expedicion-bosque))" strokeWidth="5" strokeLinecap="round" /></>
const MONTANA = <><path d="M3 57 17 40 23 45 34 23 47 42 53 38 63 57Z" /><path d="M17 40 23 45 34 23 47 42 53 38 63 57 45 50 36 39 28 51Z" fill="rgb(var(--c-expedicion-salvia))" /><path d="M34 23V9" fill="none" stroke="currentColor" strokeWidth="3" /><path d="M35 9 49 13 35 18Z" fill="rgb(var(--c-expedicion-arcilla))" /></>
const PIE = <><path d="M20 27Q19 14 32 14Q45 14 44 28Q43 37 42 46Q41 58 32 58Q23 58 23 47Q23 37 20 27Z" /><circle cx="22" cy="7" r="5" /><circle cx="31" cy="5" r="3.5" /><circle cx="38" cy="6" r="3" /><circle cx="44" cy="9" r="2.6" /><circle cx="48" cy="14" r="2.2" /></>
const GLOBO = <g fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="32" cy="25" r="21" /><ellipse cx="32" cy="25" rx="10" ry="21" /><path d="M11 25H53M15 13Q32 24 49 13M15 37Q32 26 49 37" /></g>

/** Pictogramas propios de los 58 logros actuales, en coordenadas vectoriales compartidas. */
const SIMBOLOS: Record<IdLogro, { tono?: TonoInsignia; dibujo: ReactNode }> = {
  series: { dibujo: <><path d="M8 12H43V20H8ZM8 28H37V36H8ZM8 44H30V52H8Z" /><path d="M39 44 45 50 58 33" fill="none" stroke="currentColor" strokeWidth="5" /></> },
  toneladas: { tono: 'arcilla', dibujo: <><path d="M23 21V15a9 9 0 0 1 18 0v6" fill="none" stroke="currentColor" strokeWidth="5" /><path d="M19 23H45L54 53Q54 57 48 57H16Q10 57 10 53Z" /><path d="M22 39H42M32 30V48" stroke="rgb(var(--c-expedicion-arcilla))" strokeWidth="4" /></> },
  'records-batidos': { tono: 'arcilla', dibujo: <path d="M36 4 11 34H28L24 60 53 25H36Z" /> },
  dominados: { dibujo: <><path d="M32 5 40 20 58 23 45 36 48 55 32 46 16 55 19 36 6 23 24 20Z" /><path d="M22 30 29 37 43 22" fill="none" stroke="rgb(var(--c-expedicion-bosque))" strokeWidth="4" /></> },
  ligas: { dibujo: <><path d="M7 56V43H20V30H33V17H46V8H57V56Z" /><path d="M13 34 45 3M34 3H45V14" fill="none" stroke="currentColor" strokeWidth="4" /></> },
  racha: { tono: 'arcilla', dibujo: <><path d="M31 4Q44 17 40 30L48 21Q63 43 49 54T18 54Q1 38 19 19L19 35Q32 28 31 4Z" /><path d="M31 31Q43 43 36 51T23 48Q21 40 31 31Z" fill="rgb(var(--c-expedicion-arcilla))" /></> },
  montanas: { dibujo: <><path d="M2 55 15 24 28 55ZM20 55 38 9 58 55Z" /><path d="M15 24 21 38H9ZM38 9 47 30 38 24 30 30Z" fill="rgb(var(--c-expedicion-salvia))" /></> },
  repetir: { tono: 'salvia', dibujo: <><path d="M17 54 33 29 49 54Z" /><path d="M12 31A23 23 0 1 1 56 37M12 19V32H25" fill="none" stroke="currentColor" strokeWidth="4" /></> },
  alpes: { dibujo: <><path d="M2 57 19 31 30 44 43 23 63 57Z" /><path d="M24 10H44M34 1V19M27 3 41 17M27 17 41 3" fill="none" stroke="currentColor" strokeWidth="2.5" /></> },
  volcanes: { tono: 'arcilla', dibujo: <><path d="M4 57 25 28H39L60 57ZM25 28 32 42 39 28Z" /><path d="M22 17 17 8M32 19V3M42 17 49 8" fill="none" stroke="currentColor" strokeWidth="4" /></> },
  'cinco-mas-altos': { dibujo: <path d="M1 56 9 35 17 44 24 23 31 33 39 8 47 32 53 24 64 56Z" /> },
  km: { dibujo: <><path d="M11 50C54 55 8 25 48 14" fill="none" stroke="currentColor" strokeWidth="5" /><circle cx="11" cy="50" r="6" /><circle cx="48" cy="14" r="6" /></> },
  'km-corriendo': { tono: 'salvia', dibujo: <><circle cx="37" cy="12" r="6" /><path d="M15 29 26 18 38 25 48 22M31 24 27 38 44 42 48 55M28 37 18 49H7" fill="none" stroke="currentColor" strokeWidth="5" /></> },
  desnivel: { dibujo: <><path d="M4 53 20 31 32 43 45 18 61 53Z" /><path d="M10 26V7M3 14 10 7 17 14" fill="none" stroke="currentColor" strokeWidth="4" /></> },
  horas: { tono: 'salvia', dibujo: <><circle cx="32" cy="28" r="20" fill="none" stroke="currentColor" strokeWidth="4" /><path d="M32 15V28L42 34M7 56H23M29 56H45M51 56H58" fill="none" stroke="currentColor" strokeWidth="4" /></> },
  distancia: { dibujo: <><path d="M7 46C24 8 39 58 57 16" fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray="6 4" /><path d="M7 35V55M1 42 7 35 14 42M57 7V29M50 22 57 29 63 22" fill="none" stroke="currentColor" strokeWidth="3" /></> },
  salidas: { tono: 'salvia', dibujo: <><ellipse cx="21" cy="37" rx="7" ry="12" transform="rotate(-25 21 37)" /><ellipse cx="43" cy="23" rx="7" ry="12" transform="rotate(25 43 23)" /><circle cx="12" cy="19" r="5" /><circle cx="52" cy="6" r="5" /></> },
  rutas: { dibujo: <><path d="M10 55C55 51 12 25 47 20M10 55V39M47 20V4" fill="none" stroke="currentColor" strokeWidth="4" /><path d="M48 4 62 9 48 15ZM11 39 24 43 11 49Z" /></> },
  compostela: { dibujo: <><path d="M9 26Q9 7 32 7T55 26L38 51H26Z" /><path d="M32 48V11M28 46 18 15M36 46 46 15M24 42 12 25M40 42 52 25" stroke="rgb(var(--c-expedicion-bosque))" strokeWidth="2.5" /></> },
  'todos-santiago': { tono: 'salvia', dibujo: <><path d="M32 32 7 10M32 32 7 32M32 32 7 54M32 32 57 10M32 32 57 32M32 32 57 54" fill="none" stroke="currentColor" strokeWidth="3" /><circle cx="32" cy="32" r="9" /><circle cx="7" cy="10" r="4" /><circle cx="7" cy="32" r="4" /><circle cx="7" cy="54" r="4" /><circle cx="57" cy="10" r="4" /><circle cx="57" cy="32" r="4" /><circle cx="57" cy="54" r="4" /></> },
  'rutas-mundo': { dibujo: <>{GLOBO}<path d="M7 58Q32 37 57 58" fill="none" stroke="currentColor" strokeWidth="4" /><circle cx="7" cy="58" r="4" /><circle cx="57" cy="58" r="4" /></> },
  'viajes-libro': { tono: 'salvia', dibujo: <><path d="M5 15Q19 9 32 18Q45 9 59 15V50Q45 45 32 54Q19 45 5 50ZM32 18V54" fill="none" stroke="currentColor" strokeWidth="4" /><path d="M13 25Q20 20 27 25M37 25Q44 20 51 25M13 35H25M39 35H51" stroke="currentColor" strokeWidth="3" /></> },
  pasos: { tono: 'salvia', dibujo: PIE },
  'dias-pasos': { dibujo: <><path d="M32 6A26 26 0 1 1 11 17" fill="none" stroke="currentColor" strokeWidth="5" /><path d="M5 9 12 18 21 12" fill="none" stroke="currentColor" strokeWidth="4" /><g transform="translate(32 33) scale(0.5) translate(-32 -32)">{PIE}</g></> },
  'treinta-mil': { tono: 'arcilla', dibujo: <><ellipse cx="13" cy="51" rx="5" ry="8" transform="rotate(-30 13 51)" /><ellipse cx="29" cy="45" rx="5" ry="8" transform="rotate(-30 29 45)" /><ellipse cx="29" cy="28" rx="5" ry="8" transform="rotate(-30 29 28)" /><ellipse cx="45" cy="22" rx="5" ry="8" transform="rotate(-30 45 22)" /><ellipse cx="47" cy="6" rx="4" ry="6" transform="rotate(-30 47 6)" /><path d="M4 62Q30 50 60 4" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="3 5" /></> },
  fantasia: { dibujo: <><path d="M9 56V24L17 12 25 24V31H39V24L47 12 55 24V56ZM25 8 32 1 39 8 32 15Z" /><path d="M28 56V44a4 4 0 0 1 8 0V56" fill="rgb(var(--c-expedicion-bosque))" /></> },
  'semanas-enteras': { tono: 'arcilla', dibujo: <><path d="M10 10H54V55H10Z" /><path d="M10 23H54M21 5V15M43 5V15" stroke="rgb(var(--c-expedicion-arcilla))" strokeWidth="4" /><path d="M19 32H22M30 32H33M41 32H44M19 43H22M30 43H33M41 43H44" stroke="rgb(var(--c-expedicion-arcilla))" strokeWidth="5" /></> },
  plantas: { tono: 'salvia', dibujo: <><path d="M30 56V28M30 43 16 31M30 37 47 23" stroke="currentColor" strokeWidth="3" /><path d="M31 30Q13 16 32 3Q50 17 31 30ZM19 34Q2 36 4 16Q24 15 19 34ZM43 28Q35 11 57 9Q61 30 43 28Z" /></> },
  'mas-rapido': { tono: 'arcilla', dibujo: <><circle cx="36" cy="34" r="20" fill="none" stroke="currentColor" strokeWidth="4" /><path d="M29 6H43M36 6V14M36 34 44 23M2 25H13M4 35H14M2 45H14" fill="none" stroke="currentColor" strokeWidth="4" /></> },
  'montana-salvaje': { dibujo: <><path d="M4 58 32 19 60 58Z" /><path d="M19 3 23 12M31 2 32 12M44 3 40 12" stroke="currentColor" strokeWidth="3" /><path d="M24 45 32 29 40 45 33 41Z" fill="rgb(var(--c-expedicion-bosque))" /></> },
  'fin-del-mundo': { tono: 'arcilla', dibujo: <><path d="M25 48 28 17H36L39 48ZM22 17H42L32 6Z" /><path d="M4 55Q12 48 20 55T36 55T52 55M18 26 3 21M46 26 61 21" fill="none" stroke="currentColor" strokeWidth="3" /></> },
  maraton: { dibujo: <><path d="M11 8V57M53 8V57M11 12H53V31H11Z" fill="none" stroke="currentColor" strokeWidth="4" /><path d="M13 14H22V23H13ZM31 14H40V23H31ZM22 23H31V30H22ZM40 23H51V30H40Z" /><path d="M24 48 32 38 40 48" fill="none" stroke="currentColor" strokeWidth="4" /></> },
  'km-vertical': { dibujo: <><path d="M4 58 29 26 55 58Z" /><path d="M46 31V4M37 13 46 4 55 13" fill="none" stroke="currentColor" strokeWidth="4" /></> },
  noctambulo: { tono: 'salvia', dibujo: <><path d="M37 7A22 22 0 1 0 57 34 22 22 0 0 1 37 7Z" /><path d="M48 6 50 12 56 14 50 16 48 22 46 16 40 14 46 12Z" /></> },
  comodin: { dibujo: <><path d="M9 17H55L51 51H13Z" fill="none" stroke="currentColor" strokeWidth="4" /><path d="M17 17 21 51M27 17 29 51M37 17 35 51M47 17 43 51M12 29H52M13 40H51" stroke="currentColor" strokeWidth="2" /><path d="M32 2 38 8 32 14 26 8Z" /></> },
  'dia-records': { tono: 'arcilla', dibujo: <><path d="M18 23H46V34Q46 44 35 46V51H44V57H20V51H29V46Q18 44 18 34Z" /><path d="M18 27H9V32Q9 40 21 40M46 27H55V32Q55 40 43 40" fill="none" stroke="currentColor" strokeWidth="3" /><path d="M12 4 15 10 21 11 16 15 17 21 12 18 7 21 8 15 3 11 9 10ZM32 2 35 8 41 9 36 13 37 19 32 16 27 19 28 13 23 9 29 8ZM52 4 55 10 61 11 56 15 57 21 52 18 47 21 48 15 43 11 49 10Z" /></> },
  'dia-redondo': { tono: 'salvia', dibujo: <><circle cx="32" cy="15" r="10" fill="none" stroke="currentColor" strokeWidth="3" /><circle cx="17" cy="42" r="10" fill="none" stroke="currentColor" strokeWidth="3" /><circle cx="47" cy="42" r="10" fill="none" stroke="currentColor" strokeWidth="3" /><path d="M27 15 31 19 37 11M12 42 16 46 22 38M42 42 46 46 52 38" fill="none" stroke="currentColor" strokeWidth="3" /></> },
  'ano-nuevo': { tono: 'arcilla', dibujo: <><path d="M32 7 36 23 52 19 41 32 52 45 36 41 32 57 28 41 12 45 23 32 12 19 28 23Z" /><circle cx="32" cy="32" r="6" fill="rgb(var(--c-expedicion-arcilla))" /></> },
  aniversario: { dibujo: <><path d="M17 22H47V49H17Z" fill="none" stroke="currentColor" strokeWidth="3" /><path d="M22 17V27M42 17V27M26 36 31 41 40 31" stroke="currentColor" strokeWidth="3" fill="none" /><path d="M6 27A27 27 0 1 1 8 46M6 14V28H19" fill="none" stroke="currentColor" strokeWidth="3" /></> },
  jardin: { tono: 'salvia', dibujo: <><path d="M32 58V29" stroke="currentColor" strokeWidth="3" /><circle cx="32" cy="20" r="6" fill="none" stroke="currentColor" strokeWidth="3" /><circle cx="32" cy="8" r="6" /><circle cx="20" cy="20" r="6" /><circle cx="44" cy="20" r="6" /><path d="M30 44Q10 44 10 31Q28 29 30 44ZM34 53Q35 36 54 38Q54 52 34 53Z" /></> },
  entrenos: { dibujo: <><rect x="5" y="21" width="8" height="22" rx="2" /><rect x="15" y="15" width="9" height="34" rx="2" /><rect x="24" y="28" width="16" height="8" /><rect x="40" y="15" width="9" height="34" rx="2" /><rect x="51" y="21" width="8" height="22" rx="2" /></> },
  records: { tono: 'arcilla', dibujo: <><path d="M18 10H46V28Q46 39 35 42V49H45V55H19V49H29V42Q18 39 18 28Z" /><path d="M18 15H8V22Q8 35 21 35M46 15H56V22Q56 35 43 35" fill="none" stroke="currentColor" strokeWidth="4" /><path d="M25 31 39 17M30 17H39V26" fill="none" stroke="rgb(var(--c-expedicion-arcilla))" strokeWidth="4" /></> },
  ciclos: { dibujo: <><path d="M13 24A21 21 0 0 1 49 15M51 40A21 21 0 0 1 15 49" fill="none" stroke="currentColor" strokeWidth="7" /><path d="M51 6V25L34 18ZM13 58V39L30 46ZM32 23 35 29 42 30 37 35 38 42 32 38 26 42 27 35 22 30 29 29Z" /></> },
  atlas: { tono: 'arcilla', dibujo: <><rect x="26" y="3" width="12" height="15" rx="6" /><path d="M25 20 16 23 10 33 6 48 13 52 19 37 22 57H42L45 37 51 52 58 48 54 33 48 23 39 20 32 25Z" /><path d="M22 29Q27 34 32 29Q37 34 42 29M32 26V54M24 39H40M25 46H39" fill="none" stroke="rgb(var(--c-expedicion-arcilla))" strokeWidth="2.5" /></> },
  semanas: { dibujo: <><rect x="10" y="13" width="44" height="40" rx="5" /><path d="M21 7V18M43 7V18" stroke="currentColor" strokeWidth="5" strokeLinecap="round" /><path d="M15 26H49V48H15Z" fill="rgb(var(--c-expedicion-bosque))" /><path d="M23 36 29 42 42 30" fill="none" stroke="currentColor" strokeWidth="5" strokeLinejoin="round" /></> },
  hilo: { tono: 'salvia', dibujo: <g fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round"><path d="M27 38 23 42a11 11 0 0 1-16-16L21 12a11 11 0 0 1 16 0M37 26 41 22a11 11 0 0 1 16 16L43 52a11 11 0 0 1-16 0M23 41 41 23" /></g> },
  cumbres: { dibujo: MONTANA },
  metros: { tono: 'arcilla', dibujo: <><path d="M2 59 14 45 20 48 34 12 48 44 54 42 63 59Z" fill="rgb(var(--c-expedicion-bosque))" /><path d="M22 60C12 48 45 52 37 41S21 36 34 26" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" /><path d="M34 12V3M35 3 46 7 35 11Z" /></> },
  'techo-espana': { tono: 'arcilla', dibujo: <><path d="M1 55 14 29 24 41 34 15 48 39 54 29 64 55Z" /><path d="M1 55 14 40 24 52 34 28 48 50 54 40 64 55Z" fill="rgb(var(--c-expedicion-bosque))" /><path d="M34 15V3M35 3 48 7 35 12Z" /></> },
  'siete-cumbres': { dibujo: <>{GLOBO}<path d="M2 60 21 41 31 51 42 28 62 60Z" fill="rgb(var(--c-expedicion-bosque))" />{MONTANA}</> },
  dias: { tono: 'arcilla', dibujo: <><circle cx="32" cy="33" r="17" fill="none" stroke="currentColor" strokeWidth="4" /><path d="M24 33 30 39 41 27M6 10V27M11 10V27M2 10V22Q2 28 7 28V54M58 10Q52 19 52 33H58V54" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" /></> },
  proteina: { dibujo: <><path d="M32 13V31L13 46M32 31 51 46" fill="none" stroke="currentColor" strokeWidth="4" /><circle cx="32" cy="12" r="8" /><circle cx="12" cy="47" r="8" /><circle cx="52" cy="47" r="8" /><circle cx="32" cy="32" r="10" /><circle cx="32" cy="32" r="6" fill="rgb(var(--c-expedicion-arcilla))" /></> },
  herbario: { tono: 'salvia', dibujo: <><path d="M32 60V24" stroke="currentColor" strokeWidth="3" /><path d="M33 31Q26 9 54 3Q54 25 33 31ZM29 44Q7 45 6 23Q28 23 29 44ZM34 52Q34 33 58 34Q52 53 34 52Z" /><path d="M32 45 17 33M33 30 45 14M33 53 47 43" fill="none" stroke="rgb(var(--c-expedicion-bosque))" strokeWidth="2" /></> },
  'techo-mundo': { tono: 'arcilla', dibujo: <>{GLOBO}<path d="M2 60 32 29 62 60Z" fill="rgb(var(--c-expedicion-bosque))" /><path d="M2 60 32 29 62 60 44 50 37 48 32 39 23 51 16 49Z" /></> },
  'paso-firme': { dibujo: <><path d="M24 8H42L45 33 55 38Q59 40 58 47L6 51V43Q6 37 19 33L23 22Z" /><path d="M8 54 57 50M25 18H32M23 25H30M21 32H28" fill="none" stroke="currentColor" strokeWidth="4" /><path d="M27 57Q42 59 28 64" fill="none" stroke="currentColor" strokeWidth="3" /></> },
  madrugador: { tono: 'salvia', dibujo: <><path d="M13 47a19 19 0 0 1 38 0" fill="rgb(var(--c-expedicion-arcilla))" stroke="currentColor" strokeWidth="4" /><path d="M32 7V17M11 15 17 23M2 33 10 36M53 15 47 23M62 33 54 36M8 49H56" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" /></> },
  vuelta: { dibujo: <><path d="M22 17H38a16 16 0 0 1 0 32H32" fill="none" stroke="currentColor" strokeWidth="7" /><path d="M26 5 9 17 26 29Z" /><path d="M12 58C5 49 30 56 22 46" fill="none" stroke="currentColor" strokeWidth="3" /></> },
  descanso: { dibujo: <><path d="M38 5A14 14 0 1 0 51 24 14 14 0 0 1 38 5Z" /><path d="M9 56 29 29 50 56Z" /><path d="M23 56 29 38 37 56Z" fill="rgb(var(--c-expedicion-bosque))" /><path d="M52 36 59 53H45Z" fill="rgb(var(--c-expedicion-salvia))" /></> },
}

export default function IconoLogro({ logro, tamano = 'md' }: { logro: Logro; tamano?: TamanoInsignia }) {
  const hecho = conseguido(logro)
  // No montar el símbolo ni un identificador específico de un oculto sin conseguir: tampoco filtra pistas en el DOM.
  const oculto = logro.oculto && !hecho
  const simbolo = oculto ? undefined : SIMBOLOS[logro.id]
  return <InsigniaExpedicion forma={FORMAS[logro.grupo]} tamano={tamano} tono={simbolo?.tono} pendiente={!hecho} relieve={!oculto}>
    <g strokeLinejoin="round" strokeLinecap="round">{oculto ? CANDADO : simbolo?.dibujo ?? CANDADO}</g>
  </InsigniaExpedicion>
}
