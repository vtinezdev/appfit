import { useCallback, useEffect, useState } from 'react'
import Button from '../../../shared/components/Button'
import Sheet from '../../../shared/components/Sheet'
import { ErrorState } from '../../../shared/components/StateMessage'
import { lineaEstado } from '../lib/estado'
import { copiaNube, cuentaDisponible } from '../servicio'
import { useCuenta } from '../useCuenta'
import ElegirCopia from './ElegirCopia'
import EntrarSheet from './EntrarSheet'
import GestionarCuenta from './GestionarCuenta'

const TONO = { normal: 'text-fg-muted', aviso: 'text-warning', error: 'text-destructive' } as const

/** Sección «Cuenta» de Ajustes: entrar, estado de la copia en la nube y gestión. Sin proyecto configurado no aparece. */
export default function CuentaAjustes() {
  if (!cuentaDisponible) return null
  return <Cuenta />
}

/** Estado de la cuenta en una línea, para la fila del índice de Ajustes. */
export function ResumenCuenta() {
  const { fase, email } = useCuenta()
  if (fase === 'cargando') return 'Comprobando…'
  if (fase === 'sin-sesion') return 'Sin cuenta · copia cifrada opcional'
  return email ?? 'Con cuenta'
}

function Cuenta() {
  const estado = useCuenta()
  // `n` vuelve a montar la hoja en cada apertura (empieza en el primer paso); cerrada sigue montada para animar la salida.
  const [entrar, setEntrar] = useState({ open: false, reanudar: false, n: 0 })
  const [conflicto, setConflicto] = useState(false)
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [ahora, setAhora] = useState(() => Date.now())

  // «hace 3 min» se pone al día solo.
  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [])

  const abrirEntrar = (reanudar = false) => {
    setMensaje(null)
    setError(null)
    setEntrar((e) => ({ open: true, reanudar, n: e.n + 1 }))
  }
  const terminado = useCallback((texto: string) => {
    setEntrar((e) => ({ ...e, open: false }))
    setMensaje(texto)
  }, [])
  const cargarConflicto = useCallback(() => copiaNube.resumenesConflicto(), [])
  const resolver = useCallback(async (eleccion: 'traer' | 'subir') => {
    await copiaNube.resolverConflicto(eleccion)
    setConflicto(false)
    setMensaje(eleccion === 'traer' ? 'Listo: este móvil tiene ahora la copia de la nube.' : 'Listo: la nube tiene ahora los datos de este móvil.')
  }, [])

  async function ejecutar(fn: () => Promise<void>) {
    setOcupado(true)
    setError(null)
    try {
      await fn()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se ha podido completar. Inténtalo de nuevo.')
    } finally {
      setOcupado(false)
    }
  }

  const { fase } = estado
  const linea = lineaEstado(estado, ahora)
  const conCuenta = fase !== 'cargando' && fase !== 'sin-sesion' && fase !== 'sin-vincular'

  return (
    <section aria-label="Cuenta" className="space-y-stack">
      <div className="space-y-3">
        {fase === 'cargando' && <p className="text-body-sm text-fg-muted">Comprobando tu cuenta…</p>}

        {fase === 'sin-sesion' && (
          <>
            <p className="text-body-sm text-fg-muted">Con una cuenta, tus registros se guardan solos en la nube, cifrados con una contraseña que solo conoces tú, y los recuperas en cualquier móvil. Es opcional.</p>
            {estado.error && <ErrorState>{estado.error}</ErrorState>}
            <Button variant="primary" block onClick={() => abrirEntrar()}>{estado.email ? 'Volver a entrar' : 'Entrar o crear cuenta'}</Button>
          </>
        )}

        {fase === 'sin-vincular' && (
          <>
            <p className="text-body-sm text-fg-muted">Has empezado a entrar como <span className="font-semibold text-fg">{estado.email}</span>. Termina para que la copia empiece a guardarse.</p>
            <Button variant="primary" block onClick={() => abrirEntrar(true)}>Terminar de entrar</Button>
            <Button variant="ghost" size="sm" disabled={ocupado} onClick={() => void ejecutar(() => copiaNube.cerrarSesion(false))}>Cerrar sesión</Button>
          </>
        )}

        {conCuenta && (
          <>
            <div>
              <p className="break-words text-body-sm font-semibold text-fg">{estado.email}</p>
              <p role="status" className={`text-body-sm ${TONO[linea.tono]}`}>{linea.texto}</p>
            </div>
            {fase === 'conflicto' ? (
              <Button variant="primary" block onClick={() => { setMensaje(null); setConflicto(true) }}>Elegir qué copia se queda</Button>
            ) : fase === 'perdida' ? (
              <Button variant="primary" block loading={ocupado} onClick={() => void ejecutar(async () => { await copiaNube.cerrarSesion(false); abrirEntrar() })}>Volver a entrar</Button>
            ) : (
              <Button variant="secondary" size="sm" loading={fase === 'subiendo'} disabled={ocupado} onClick={() => void copiaNube.sincronizar({ comprobarNube: true })}>Guardar ahora</Button>
            )}
            <GestionarCuenta onMensaje={setMensaje} />
          </>
        )}

        {error && <ErrorState>{error}</ErrorState>}
        {mensaje && <p role="status" className="text-body-sm text-accent-strong">{mensaje}</p>}
      </div>

      <EntrarSheet key={entrar.n} open={entrar.open} reanudar={entrar.open && entrar.reanudar} onClose={() => setEntrar((e) => ({ ...e, open: false }))} onTerminado={terminado} />
      <Sheet open={conflicto} onClose={() => setConflicto(false)} title="¿Qué datos se quedan?">
        {conflicto && <ElegirCopia cargar={cargarConflicto} onElegir={resolver} />}
      </Sheet>
    </section>
  )
}
