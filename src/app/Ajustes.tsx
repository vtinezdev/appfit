import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { getSettings, updateSettings } from '../shared/db/settings'
import { borrarTodosLosDatos, descargarBackup, exportarBackup, importarBackup, migrarBackup } from '../shared/lib/backup'
import { hayDatosGuardados } from '../shared/db/estadoDatos'
import { formatInt } from '../shared/lib/format'
import CatalogoAjustes from '../features/nutricion/components/CatalogoAjustes'
import ObjetivosAjustes from '../features/nutricion/components/ObjetivosAjustes'
import { ErrorState, LoadingState } from '../shared/components/StateMessage'
import Button from '../shared/components/Button'
import Card from '../shared/components/Card'
import ConfirmacionDestructiva from '../shared/components/ConfirmacionDestructiva'
import PageHeader from '../shared/components/PageHeader'
import SectionHeader from '../shared/components/SectionHeader'
import AlmacenamientoAjustes from './AlmacenamientoAjustes'

function irASeccion(seccion: HTMLElement | null) {
  seccion?.scrollIntoView({ block: 'start' })
  seccion?.focus({ preventScroll: true })
}

export default function Ajustes({ abrirGuia = false }: { abrirGuia?: boolean }) {
  const settings = useLiveQuery(() => getSettings(), [])
  const hayDatos = useLiveQuery(hayDatosGuardados, [])
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [errorBackup, setErrorBackup] = useState<string | null>(null)
  const [backupPendiente, setBackupPendiente] = useState<{ texto: string; comidas: number } | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [confirmandoBorrado, setConfirmandoBorrado] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const guiaRef = useRef<HTMLElement>(null)
  const backupRef = useRef<HTMLElement>(null)
  const cargados = settings !== undefined

  useEffect(() => {
    if (abrirGuia && cargados) irASeccion(guiaRef.current)
  }, [abrirGuia, cargados])

  if (!settings) return <LoadingState />

  async function exportar() {
    setErrorBackup(null)
    setOcupado(true)
    try {
      descargarBackup(await exportarBackup())
    } catch {
      setErrorBackup('No se ha podido exportar la copia. Vuelve a intentarlo antes de cambiar de acceso.')
    } finally {
      setOcupado(false)
    }
  }

  async function importar(file: File) {
    setMensaje(null)
    setErrorBackup(null)
    setBackupPendiente(null)
    setOcupado(true)
    try {
      const texto = await file.text()
      const backup = migrarBackup(JSON.parse(texto))
      // Elegir un archivo solo lo valida; no sustituye ningún registro hasta confirmar.
      setBackupPendiente({ texto, comidas: backup.entries.length })
    } catch (e) {
      setErrorBackup(e instanceof SyntaxError ? 'El archivo no es un JSON válido.' : e instanceof Error ? e.message : 'Error leyendo el backup.')
    } finally {
      setOcupado(false)
    }
  }

  async function confirmarImportacion() {
    if (!backupPendiente || ocupado) return
    setOcupado(true)
    setErrorBackup(null)
    try {
      await importarBackup(backupPendiente.texto)
      setBackupPendiente(null)
      setMensaje('Backup importado correctamente.')
    } catch (e) {
      setErrorBackup(e instanceof Error ? e.message : 'Error importando el backup.')
    } finally {
      setOcupado(false)
    }
  }

  async function confirmarBorrado() {
    await borrarTodosLosDatos()
    setConfirmandoBorrado(false)
    setMensaje('Todos los datos han sido borrados.')
  }

  return (
    <div className="space-y-section px-page pt-6">
      <PageHeader title="Ajustes" />

      <section ref={guiaRef} tabIndex={-1} aria-label="Primera vez en AppFit" className="scroll-mt-6 space-y-stack">
        <SectionHeader variant="section">Primera vez en AppFit</SectionHeader>
        <Card className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-body font-semibold">Añade la app a tu pantalla de inicio</h3>
            <p className="text-body-sm text-fg-muted">Si ya registraste comidas en Safari, exporta primero una copia desde Ajustes.</p>
            <ol className="list-decimal space-y-2 pl-5 text-body-sm text-fg-muted">
              <li>Abre el enlace de AppFit en Safari.</li>
              <li>Pulsa «Compartir» y elige «Añadir a pantalla de inicio».</li>
              <li>Abre AppFit desde el nuevo acceso de tu pantalla de inicio.</li>
            </ol>
          </div>
          <div className="space-y-2">
            <h3 className="text-body font-semibold">¿Ya registraste comidas en Safari?</h3>
            <p className="text-body-sm text-fg-muted">En iPhone, los registros de Safari pueden guardarse por separado. Lleva una copia al nuevo acceso:</p>
            <ol className="list-decimal space-y-2 pl-5 text-body-sm text-fg-muted">
              <li>En Safari, abre el enlace original y entra en Ajustes.</li>
              <li>Pulsa «Exportar» y guarda el archivo. Si todavía no has añadido el acceso, haz esta copia primero.</li>
              <li>Abre AppFit desde la pantalla de inicio y entra en Ajustes.</li>
              <li>Pulsa «Importar», elige el archivo y confirma «Importar copia».</li>
            </ol>
          </div>
          <p className="text-body-sm font-medium">Después, abre siempre AppFit desde el mismo acceso de la pantalla de inicio.</p>
          <Button variant="secondary" block onClick={() => irASeccion(backupRef.current)}>Ir a Exportar / Importar</Button>
        </Card>
      </section>

      <ObjetivosAjustes objetivos={settings.objetivos} onGuardar={(objetivos) => updateSettings({ objetivos })} />

      <AlmacenamientoAjustes />

      <section ref={backupRef} tabIndex={-1} aria-label="Backup" className="scroll-mt-6 space-y-stack">
        <SectionHeader variant="section">Backup</SectionHeader>
        <Card className="space-y-3">
          <p className="text-body-sm text-fg-muted">Tus datos viven solo en este móvil. Exporta un JSON de vez en cuando por si acaso.</p>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={exportar} disabled={ocupado} className="flex-1">
              Exportar
            </Button>
            <Button variant="secondary" onClick={() => fileRef.current?.click()} disabled={ocupado} className="flex-1">
              Importar
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hidden"
              disabled={ocupado}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) importar(file)
                e.target.value = ''
              }}
            />
          </div>
          {backupPendiente && (
            <div role="group" aria-label="Confirmar importación" className="space-y-3">
              <p className="text-body-sm text-fg-muted">La copia contiene {formatInt(backupPendiente.comidas)} registros de comida, además de sus alimentos, entrenos y ajustes.</p>
              {hayDatos && <p className="text-body-sm text-destructive">La importación sustituirá los registros de este acceso. Exporta primero una copia si quieres conservarlos.</p>}
              <div className="flex gap-2">
                <Button variant="secondary" className="flex-1" disabled={ocupado} onClick={() => setBackupPendiente(null)}>Cancelar</Button>
                <Button variant={hayDatos ? 'danger' : 'primary'} className="flex-1" loading={ocupado} disabled={hayDatos === undefined} onClick={confirmarImportacion}>Importar copia</Button>
              </div>
            </div>
          )}
          {errorBackup && <ErrorState>{errorBackup}</ErrorState>}
          {mensaje && (
            <p role="status" className="text-body-sm text-accent-strong">
              {mensaje}
            </p>
          )}
        </Card>
      </section>

      <CatalogoAjustes />

      <section aria-label="Zona peligrosa" className="space-y-stack">
        <SectionHeader variant="section" tone="destructive">
          Zona peligrosa
        </SectionHeader>
        <Card>
          {!confirmandoBorrado ? (
            <Button variant="destructive" block onClick={() => setConfirmandoBorrado(true)}>
              Borrar todos los datos
            </Button>
          ) : (
            <ConfirmacionDestructiva
              mensaje="¿Seguro? Esto borra nutrición, gym y ajustes de este móvil. No se puede deshacer."
              confirmar="Sí, borrar"
              onConfirmar={confirmarBorrado}
              onCancelar={() => setConfirmandoBorrado(false)}
            />
          )}
        </Card>
      </section>
    </div>
  )
}
