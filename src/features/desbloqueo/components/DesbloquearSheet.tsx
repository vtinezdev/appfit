import Button from '../../../shared/components/Button'
import Icon from '../../../shared/components/Icon'
import Sheet from '../../../shared/components/Sheet'
import { PRECIO_DESBLOQUEO, type Acceso } from '../../../shared/lib/acceso'
import { formatDiaMes, parseISODate } from '../../../shared/lib/dates'

const INCLUYE = [
  'Nutrición: el diario, las recetas, el plan y la lista de la compra',
  'Perfil, con tu gasto y tu objetivo de calorías',
  'La copia en la nube',
  'Las comidas en Cumbres, Ritmo y Vitrina',
]

function subtitulo(acceso: Acceso | undefined): string | undefined {
  if (acceso?.tipo === 'terminada') return 'Tu mes de prueba ha terminado'
  if (acceso?.tipo === 'prueba') return acceso.quedan === 1 ? 'Hoy es tu último día de prueba' : `Te quedan ${acceso.quedan} días de prueba`
  if (acceso?.tipo === 'desbloqueado') return 'Ya la tienes desbloqueada'
  return undefined
}

/** ADR 068: qué es gratis, qué se desbloquea y cuánto cuesta. El pago llega con Play Billing (parte 3). */
export default function DesbloquearSheet({ open, acceso, onClose }: { open: boolean; acceso: Acceso | undefined; onClose: () => void }) {
  const desbloqueada = acceso?.tipo === 'desbloqueado'
  return (
    <Sheet open={open} onClose={onClose} title="Cumbra Fit completa" subtitle={subtitulo(acceso)}
      footer={!desbloqueada && <div className="space-y-2">
        <Button block disabled><Icon name="sparkles" size={18} />Desbloquear · {PRECIO_DESBLOQUEO}</Button>
        <p className="text-center text-caption text-fg-muted">Muy pronto podrás desbloquearla desde aquí.</p>
      </div>}>
      <div className="space-y-5">
        <p className="text-body text-fg">Entreno, Actividades, Liga, Social y tu cuenta son gratis siempre.</p>
        <div className="space-y-2">
          <p className="text-body text-fg">Con un pago único de <span className="tabular font-semibold">{PRECIO_DESBLOQUEO}</span> desbloqueas para siempre:</p>
          <ul className="space-y-2">
            {INCLUYE.map((t) => (
              <li key={t} className="flex items-start gap-2 text-body-sm text-fg"><Icon name="check" size={18} className="mt-0.5 shrink-0 text-accent-strong" /><span className="min-w-0">{t}</span></li>
            ))}
          </ul>
        </div>
        {acceso?.tipo === 'prueba' && <p className="text-body-sm text-fg-muted">La prueba dura hasta el {formatDiaMes(parseISODate(acceso.ultimoDia).getTime())}. Después, lo que hayas apuntado se sigue viendo.</p>}
        {acceso?.tipo === 'terminada' && <p className="text-body-sm text-fg-muted">Lo que apuntaste no se pierde: lo puedes ver y exportar desde Ajustes.</p>}
      </div>
    </Sheet>
  )
}
