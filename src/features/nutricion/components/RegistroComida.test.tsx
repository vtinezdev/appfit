import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import RegistroComida from './RegistroComida'
import ComidaSection from './ComidaSection'
import type { Entry } from '../../../shared/db/types'

const noop = () => {}
const base: Entry = { id: 1, fecha: '2026-10-04', comida: 'desayuno', nombre: 'Café', gramos: 40, kcal: 174.4, prot: 11.1, carb: 22.2, grasa: 11.3, createdAt: 1 }

describe('registros de comida de una misma jerarquía', () => {
  it.each(['individual', 'plato', 'ingrediente'] as const)('%s mantiene nombre, cantidad/conteo, kcal y macros consumidos', tipo => {
    const html = renderToStaticMarkup(<RegistroComida tipo={tipo} nombre="Registro" detalle="40 g" macros={base} onClick={noop} accion={null} />)
    expect(html).toContain('40 g')
    expect(html).toContain('>174</span>')
    expect(html).toContain('>kcal</span>')
    expect(html).toContain('P 11 · C 22 · G 11')
    expect(base.kcal).toBe(174.4)
  })

  function seccion(entries: Entry[]) {
    return renderToStaticMarkup(<ComidaSection comida="desayuno" titulo="Desayuno" entries={entries} nombresCortos={new Map()}
      onAcciones={noop} onEditar={noop} onBorrar={noop} onBorrarPlato={noop} onEditarPlato={noop} onAccionesPlato={noop} onMoverPlato={noop}
      moviendo={false} onAnadir={noop} disponiblesAyer={0} onRepetir={noop} ocupado={false} repitiendo={false} />)
  }
  it('plato y alimento permanecen registros independientes y las acciones se consultan bajo demanda', () => {
    const html = seccion([{ ...base, platoId: 'p', nombrePlato: 'Café + Leche' }, { ...base, id: 2, nombre: 'Leche', platoId: 'p' }, { ...base, id: 3, nombre: 'Bizcocho' }])
    expect(html).toContain('data-registro="plato"')
    expect(html).toContain('data-registro="individual"')
    expect(html).toContain('aria-label="Acciones del plato Café + Leche"')
    expect(html).toContain('aria-haspopup="dialog"')
    expect(html).toContain('aria-label="Borrar Bizcocho"')
    expect(html).toContain('>349</span>')
    expect(html).toContain('P 22 · C 44 · G 23')
    for (const accion of ['Añadir ingredientes', 'Copiar plato', 'Borrar plato']) expect(html).not.toContain(accion)
    expect(html).toMatch(/id="[^"]+" hidden="" class="border-t border-line"/)
  })
  it('un plato con un ingrediente conserva su nombre y el acceso contextual', () => {
    const html = seccion([{ ...base, platoId: 'p', nombrePlato: 'Mi desayuno' }])
    expect(html).toContain('Mi desayuno')
    expect(html).toContain('1 alimento')
    expect(html).toContain('aria-label="Acciones del plato Mi desayuno"')
    expect(html).not.toContain('data-registro="individual"')
  })
  it('un registro rápido mantiene aproximación, sin inventar gramos', () => {
    const html = seccion([{ ...base, gramos: 0, rapida: true }])
    expect(html).toContain('Registro rápido')
    expect(html).toContain('≈ 174')
    expect(html).not.toContain('>0 g<')
  })
})
