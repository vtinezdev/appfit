import { useState } from 'react'
import Button from '../../../shared/components/Button'
import Icon from '../../../shared/components/Icon'
import Sheet from '../../../shared/components/Sheet'
import { ORDENES_BUSQUEDA, type OrdenBusqueda } from '../lib/ordenBusqueda'

/** Un solo botón «Ordenar» con el orden elegido; abre una hoja con las opciones (elegir una la cierra). */
export default function OrdenarBusqueda({ valor, onChange }: { valor: OrdenBusqueda; onChange: (orden: OrdenBusqueda) => void }) {
  const [abierta, setAbierta] = useState(false)
  const actual = ORDENES_BUSQUEDA.find((o) => o.valor === valor)!
  return <>
    <Button variant="secondary" size="sm" aria-haspopup="dialog" onClick={() => setAbierta(true)}>
      <Icon name="ordenar" size={16} />{valor === 'relevancia' ? 'Ordenar' : actual.label}
    </Button>
    <Sheet open={abierta} onClose={() => setAbierta(false)} title="Ordenar resultados">
      <ul role="radiogroup" aria-label="Ordenar resultados" className="divide-y divide-line">
        {ORDENES_BUSQUEDA.map((o) => <li key={o.valor}>
          <button type="button" role="radio" aria-checked={o.valor === valor} onClick={() => { onChange(o.valor); setAbierta(false) }}
            className="app-button flex min-h-touch w-full items-center justify-between gap-3 py-3 text-left text-body text-fg">
            <span className={o.valor === valor ? 'font-semibold' : ''}>{o.label}</span>
            {o.valor === valor && <Icon name="check" size={20} className="shrink-0 text-accent-strong" />}
          </button>
        </li>)}
      </ul>
    </Sheet>
  </>
}
