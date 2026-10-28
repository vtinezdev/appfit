import Button from '../../../shared/components/Button'
import Sheet from '../../../shared/components/Sheet'
import { nombreConNivel, type NuevoLogro } from '../lib/logros'
import IconoLogro from './IconoLogro'

/**
 * Celebración de las piezas nuevas de la Vitrina: una hoja con cada una (insignia grande, nombre y requisito). Con una
 * sola, la insignia va centrada; con varias, en lista. No guarda nada: la abre `CelebracionLogros`.
 */
export default function NuevosLogrosSheet({ nuevos, open, onClose, onExited }: { nuevos: NuevoLogro[]; open: boolean; onClose: () => void; onExited?: () => void }) {
  const titulo = nuevos.length === 1 ? '¡Nuevo logro!' : `¡${nuevos.length} logros nuevos!`
  const texto = ({ logro, nivel }: NuevoLogro) => nivel !== null && logro.umbrales && logro.textoNivel ? logro.textoNivel(logro.umbrales[nivel - 1]) : logro.descripcion
  return <Sheet open={open} onClose={onClose} onExited={onExited} title={titulo} footer={<Button block size="lg" onClick={onClose}>Genial</Button>}>
    {nuevos.length === 1
      ? <div className="flex flex-col items-center gap-3 py-2 text-center">
          <IconoLogro logro={nuevos[0].logro} tamano="lg" alcanzado />
          <p className="break-words text-title text-fg">{nombreConNivel(nuevos[0])}</p>
          <p className="break-words text-body-sm text-fg-muted">{texto(nuevos[0])}</p>
        </div>
      : <ul className="divide-y divide-line">
          {nuevos.map((n) => <li key={`${n.logro.id}-${n.nivel ?? 'vez'}`} className="flex items-center gap-3 py-3">
            <IconoLogro logro={n.logro} alcanzado />
            <span className="min-w-0">
              <span className="block break-words text-body font-semibold text-fg">{nombreConNivel(n)}</span>
              <span className="block break-words text-body-sm text-fg-muted">{texto(n)}</span>
            </span>
          </li>)}
        </ul>}
  </Sheet>
}
