import Anillo from '../../../shared/components/Anillo'
import Icon from '../../../shared/components/Icon'
import { addDays } from '../../../shared/lib/dates'

const LETRAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

interface Props {
  lunes: string
  hoy: string
  diasEntreno: ReadonlySet<string>
  /** `null` si la nutrición no cuenta (sin fila de registro). */
  diasRegistro: ReadonlySet<string> | null
  /**
   * Con esto, cada día es un anillo de sus kcal frente al objetivo (0–1) con una pesa dentro si hubo entreno que cuenta,
   * en vez del cuadro y el punto (tarjeta «Tu semana» de Inicio).
   */
  anillos?: ReadonlyMap<string, number>
}

/**
 * Los 7 días de la semana: un cuadro relleno el día con un entreno que cuenta y un punto relleno el día con comidas
 * (o, con `anillos`, el anillo de kcal del día con la pesa del entreno). Decorativo (`aria-hidden`): quien lo usa da las
 * mismas cifras en texto. Hoy va subrayado; los días futuros, atenuados.
 */
export default function DiasSemana({ lunes, hoy, diasEntreno, diasRegistro, anillos }: Props) {
  return (
    <span aria-hidden className="grid grid-cols-7 gap-1">
      {LETRAS.map((letra, i) => {
        const f = addDays(lunes, i)
        const futuro = f > hoy
        return <span key={f} className={`flex flex-col items-center gap-1 ${futuro ? 'opacity-40' : ''}`}>
          <span className={`text-caption ${f === hoy ? 'font-bold text-fg underline underline-offset-4' : 'text-fg-muted'}`}>{letra}</span>
          {anillos ? <Anillo fraccion={futuro ? 0 : anillos.get(f) ?? 0} className="h-8 w-8" trazo="stroke-kcal" carril="stroke-line">
            {diasEntreno.has(f) ? <Icon name="dumbbell" size={14} className="block text-fg" /> : undefined}
          </Anillo> : <span className={`block h-4 w-4 rounded-sm border ${diasEntreno.has(f) ? 'border-fg bg-fg' : 'border-line-strong'}`} />}
          {diasRegistro && !anillos && <span className={`block h-2 w-2 rounded-pill border ${diasRegistro.has(f) ? 'border-fg-muted bg-fg-muted' : 'border-line-strong'}`} />}
        </span>
      })}
    </span>
  )
}
