import { addDays } from '../../../shared/lib/dates'

const LETRAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

interface Props {
  lunes: string
  hoy: string
  diasEntreno: ReadonlySet<string>
  /** `null` si la nutrición no cuenta (sin fila de registro). */
  diasRegistro: ReadonlySet<string> | null
}

/**
 * Los 7 días de la semana: un cuadro relleno el día con un entreno que cuenta y un punto relleno el día con comidas.
 * Decorativo (`aria-hidden`): quien lo usa da las mismas cifras en texto. Hoy va subrayado; los días futuros, atenuados.
 */
export default function DiasSemana({ lunes, hoy, diasEntreno, diasRegistro }: Props) {
  return (
    <span aria-hidden className="grid grid-cols-7 gap-1">
      {LETRAS.map((letra, i) => {
        const f = addDays(lunes, i)
        const futuro = f > hoy
        return <span key={f} className={`flex flex-col items-center gap-1 ${futuro ? 'opacity-40' : ''}`}>
          <span className={`text-caption ${f === hoy ? 'font-bold text-fg underline underline-offset-4' : 'text-fg-muted'}`}>{letra}</span>
          <span className={`block h-4 w-4 rounded-sm border ${diasEntreno.has(f) ? 'border-fg bg-fg' : 'border-line-strong'}`} />
          {diasRegistro && <span className={`block h-2 w-2 rounded-pill border ${diasRegistro.has(f) ? 'border-fg-muted bg-fg-muted' : 'border-line-strong'}`} />}
        </span>
      })}
    </span>
  )
}
