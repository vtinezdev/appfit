import Sheet from '../../../shared/components/Sheet'
import type { Exercise, Routine } from '../../../shared/db/types'
import type { Alternativa } from '../lib/alternativas'
import { esBasico } from '../lib/basicos'
import type { LigaEjercicio } from '../lib/liga'
import ComoFuncionaLiga from './ComoFuncionaLiga'
import DetalleLiga from './DetalleLiga'
import VariarElite from './VariarElite'

/** La liga de un ejercicio durante el entreno (desde el aviso de Élite o el menú del ejercicio). */
export default function LigaSheet({ open, liga, ejercicio, hoy, alternativas, mantenido, sinRecords, rutinas, onClose }: { open: boolean; liga: LigaEjercicio; ejercicio: Exercise; hoy: string; alternativas: Alternativa[]; mantenido: boolean; sinRecords: number; rutinas: Routine[]; onClose: () => void }) {
  return <Sheet open={open} onClose={onClose} title={`Liga · ${ejercicio.nombre}`}>
    <div className="space-y-3">
      <DetalleLiga liga={liga} ejercicio={ejercicio} hoy={hoy} mantenido={mantenido} sinRecords={sinRecords} />
      <p className="text-caption text-fg-muted">Este entreno cuenta al terminarlo.</p>
      {liga.division.elite && <VariarElite exerciseId={ejercicio.id} nombre={ejercicio.nombre} alternativas={alternativas} basico={esBasico(ejercicio)} mantenido={mantenido}
        rutinas={rutinas} notaRutina="Este entreno no cambia." />}
      <ComoFuncionaLiga />
    </div>
  </Sheet>
}
