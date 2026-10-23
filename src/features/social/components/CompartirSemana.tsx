import { useState } from 'react'
import Button from '../../../shared/components/Button'
import Icon from '../../../shared/components/Icon'
import SegmentedControl from '../../../shared/components/SegmentedControl'
import Sheet from '../../../shared/components/Sheet'
import { startOfWeek, todayISO } from '../../../shared/lib/dates'
import { useVitrina } from '../../vitrina/hooks/useVitrina'
import { useConsulta } from '../hooks/useConsulta'
import { resumenSemana, type EstadoSemanaPublicada, type ResumenSemana } from '../lib/publicacion'
import { opcionesSemana } from '../lib/semana'
import { cargarSocial } from '../servicio'
import CrearPublicacion from './CrearPublicacion'
import TarjetaPublicacion from './TarjetaPublicacion'

/**
 * En el compositor de Social: «Tu semana» con su línea de Ritmo y «Compartir», que deja elegir entre la semana con sus
 * cifras, «Estoy retomando» o «En pausa» (ADR 056) y abre el editor de siempre. Solo si el servidor ya acepta semanas
 * (`semanaRitmo`, 0023). Con la gamificación oculta no se ofrecen las cifras de Ritmo.
 */
export default function CompartirSemana({ onPublicada }: { onPublicada: () => void }) {
  const capacidades = useConsulta(async () => (await cargarSocial()).capacidades(), 0)
  if (!capacidades.datos?.semanaRitmo) return null
  return <ConRitmo onPublicada={onPublicada} />
}

function ConRitmo({ onPublicada }: { onPublicada: () => void }) {
  const [hoy] = useState(todayISO)
  const estado = useVitrina(hoy)
  const [eligiendo, setEligiendo] = useState(false)
  const [elegido, setElegido] = useState<EstadoSemanaPublicada | null>(null)
  const [editor, setEditor] = useState<{ resumen: ResumenSemana; fecha: number } | null>(null)
  if (!estado) return null
  // Con la gamificación oculta no hay Ritmo: solo «Estoy retomando» sin cifras y «En pausa».
  const opciones = 'resultado' in estado ? opcionesSemana(estado.resultado.ritmo, estado.resultado.diasEntreno, estado.resultado.ritmo.actual.lunes) : opcionesSemana(null, new Set(), startOfWeek(hoy))
  const resumenes: Partial<Record<EstadoSemanaPublicada, ResumenSemana>> = {
    ...(opciones.semana ? { semana: resumenSemana(opciones.semana) } : {}),
    retomando: resumenSemana(opciones.retomando),
    pausa: resumenSemana(opciones.pausa),
  }
  const valor = elegido && resumenes[elegido] ? elegido : opciones.semana ? 'semana' : 'retomando'
  const elegida = resumenes[valor]!

  return <div className="flex flex-wrap items-center gap-3 border-t border-line pt-3">
    <span aria-hidden className="flex h-touch w-touch shrink-0 items-center justify-center rounded-md bg-surface-muted text-fg-muted"><Icon name="calendar" size={20} /></span>
    <p className="min-w-0 flex-1 basis-28">
      <span className="block break-words text-body-sm font-semibold text-fg">Tu semana</span>
      <span className="block tabular break-words text-caption text-fg-muted">{resumenes.semana?.titulo ?? 'Cuenta cómo vas, sin cifras'}</span>
    </p>
    <Button variant="secondary" size="sm" className="ml-auto" aria-haspopup="dialog" onClick={() => setEligiendo(true)}>Compartir</Button>
    <Sheet open={eligiendo} onClose={() => setEligiendo(false)} title="Compartir tu semana"
      footer={<Button block onClick={() => { setEligiendo(false); setEditor({ resumen: elegida, fecha: Date.now() }) }}>Continuar</Button>}>
      <div className="space-y-stack">
        <SegmentedControl<EstadoSemanaPublicada> label="Qué compartir" variante="vertical" valor={valor} onChange={setElegido}
          opciones={[
            ...(resumenes.semana ? [{ valor: 'semana' as const, label: 'Mi semana', descripcion: `${resumenes.semana.titulo} · los días entrenados y tu hilo` }] : []),
            { valor: 'retomando', label: 'Estoy retomando', descripcion: 'Sin cifras de plan ni semanas fallidas' },
            { valor: 'pausa', label: 'En pausa', descripcion: 'Sin motivo ni cifras' },
          ]} />
        <TarjetaPublicacion resumen={elegida} fecha={Date.now()} />
        <p className="text-caption text-fg-muted">Nunca se comparten kcal, peso ni lo que registras de comida. Antes de publicar podrás añadir una nota y elegir para quién.</p>
      </div>
    </Sheet>
    {editor && <CrearPublicacion adjunto={editor} onClose={() => setEditor(null)} onPublicada={() => onPublicada()} />}
  </div>
}
