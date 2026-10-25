import { useState } from 'react'
import Button from '../../../shared/components/Button'
import Campo from '../../../shared/components/Campo'
import Disclosure from '../../../shared/components/Disclosure'
import { Textarea } from '../../../shared/components/Input'
import { ErrorState, LoadingState } from '../../../shared/components/StateMessage'
import { todayISO } from '../../../shared/lib/dates'
import { useVitrina } from '../../vitrina/hooks/useVitrina'
import type { PerfilDeportivo } from '../data/social'
import { useConsulta } from '../hooks/useConsulta'
import { cargarSocial } from '../servicio'
import { olvidarAvatares } from '../hooks/useAvatares'
import { CabeceraPerfil, DISCIPLINAS } from './PerfilDeportivo'
import ElegirDestacados from './ElegirDestacados'
import { destacadosAlDia } from '../lib/destacados'
import ElegirAvatar from './ElegirAvatar'
import { idAvatar, mismoAvatar, type Avatar, type AvatarExclusivo } from '../lib/avatar'

interface Props {
  alias: string
  /** Guardado: quien lo abrió cierra la hoja y vuelve a leer el perfil. */
  onGuardado: () => void
}

/** «Editar perfil»: avatar, biografía, disciplinas y logros destacados, con la vista previa de cómo te ven. */
export default function EditarPerfilDeportivo({ alias, onGuardado }: Props) {
  const consulta = useConsulta(async () => {
    const s=await cargarSocial()
    const [perfil,avatares,exclusivos]=await Promise.all([s.perfilDeportivo(alias),s.avatares([alias]),s.misAvataresExclusivos().catch(() => [])])
    return { perfil,avatar:avatares[alias]??null,exclusivos }
  },alias)
  if(consulta.estado==='error') return <div className="space-y-2"><ErrorState>{consulta.error}</ErrorState><Button variant="secondary" onClick={consulta.recargar}>Reintentar perfil deportivo</Button></div>
  if(!consulta.datos) return <LoadingState />
  return <Formulario key={alias} inicial={consulta.datos.perfil} avatarInicial={consulta.datos.avatar} exclusivos={consulta.datos.exclusivos} onGuardado={onGuardado} />
}
function Formulario({ inicial, avatarInicial, exclusivos, onGuardado }: { inicial: PerfilDeportivo; avatarInicial: Avatar | null; exclusivos: AvatarExclusivo[]; onGuardado: () => void }) {
  const [bio,setBio]=useState(inicial.bio)
  const [disciplinas,setDisciplinas]=useState(inicial.disciplinas)
  const [elegidos,setElegidos]=useState(inicial.logros)
  const [avatar,setAvatar]=useState(avatarInicial)
  const [ocupado,setOcupado]=useState(false)
  const [error,setError]=useState<string|null>(null)
  // Una sola lectura de la Vitrina para el avatar y los destacados; los elegidos se guardan con su nivel de ahora.
  const vitrina=useVitrina(todayISO())
  const logros=destacadosAlDia(elegidos,vitrina?.visible?vitrina.vitrina.logros:[])
  async function guardar() {
    if(ocupado) return
    setOcupado(true); setError(null)
    try {
      // El avatar de catálogo primero: si falla, no se toca nada.
      const s=await cargarSocial()
      if(!mismoAvatar(avatar,avatarInicial)) await s.editarAvatar(avatar?idAvatar(avatar):null)
      await s.guardarPerfilDeportivo(bio,disciplinas,logros); olvidarAvatares(); onGuardado()
    } catch(e) { setError(e instanceof Error ? e.message : 'No se ha podido guardar.'); setOcupado(false) }
  }
  return <form className="space-y-section" aria-label="Perfil deportivo" onSubmit={e => { e.preventDefault(); void guardar() }}>
    <ElegirAvatar persona={inicial} avatar={avatar} onChange={setAvatar} vitrina={vitrina} exclusivos={exclusivos} />
    <Campo etiqueta="Biografía deportiva" ayuda="Hasta 160 caracteres."><Textarea rows={3} maxLength={160} value={bio} onChange={e=>setBio(e.target.value)} /></Campo>
    <fieldset className="space-y-1"><legend className="text-label text-fg-muted">Disciplinas · Hasta tres</legend>{Object.entries(DISCIPLINAS).map(([id,label])=><label key={id} className="flex min-h-touch items-center gap-2 text-body-sm text-fg"><input type="checkbox" className="h-5 w-5 accent-accent" checked={disciplinas.includes(id)} disabled={!disciplinas.includes(id)&&disciplinas.length>=3} onChange={e=>setDisciplinas(ds=>e.target.checked?[...ds,id]:ds.filter(d=>d!==id))}/>{label}</label>)}</fieldset>
    <ElegirDestacados vitrina={vitrina} destacados={logros} onChange={setElegidos} />
    <div className="space-y-stack">
      <Disclosure title="Así te ven"><CabeceraPerfil persona={inicial} perfil={{...inicial,bio,disciplinas,logros}} avatar={avatar} /></Disclosure>
      <p className="text-caption text-fg-muted">Biografía, disciplinas y logros destacados los ven las personas con las que te relacionas en Social y quienes comparten comunidad contigo, aunque no hayas publicado esos logros. Tu nutrición, tus medidas y tu peso corporal siguen en tu diario.</p>
      <Button type="submit" block loading={ocupado}>Guardar perfil</Button>
      {error&&<ErrorState>{error}</ErrorState>}
    </div>
  </form>
}
