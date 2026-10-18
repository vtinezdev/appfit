import { formatInt } from '../../../shared/lib/format'
import { leerResumen } from '../lib/publicacion'
import { nombreVisible } from '../lib/relacion'
import { useConsulta } from '../hooks/useConsulta'
import { cargarSocial } from '../servicio'
import type { PerfilDeportivo as Datos } from '../data/social'
import IconoLogro from '../../vitrina/components/IconoLogro'
import { ErrorState } from '../../../shared/components/StateMessage'
import Button from '../../../shared/components/Button'

export const DISCIPLINAS = { fuerza: 'Fuerza', caminar: 'Caminar', correr: 'Correr', senderismo: 'Senderismo' }
export function DatosPerfilDeportivo({ perfil }: { perfil: Datos }) {
  const avatar = leerResumen(perfil.avatar)
  return <div className="space-y-2">
    {avatar?.tipo === 'logro' ? <IconoLogro alcanzado logro={{ id: avatar.logroId, grupo: avatar.grupo, nombre: avatar.titulo, descripcion: avatar.descripcion, niveles: [] }} /> : <p aria-label="Monograma" className="font-numeric text-title text-fg">{nombreVisible(perfil).replace(/^@/, '').slice(0,2).toLocaleUpperCase('es')}</p>}
    {perfil.bio && <p className="whitespace-pre-wrap break-words text-body-sm text-fg">{perfil.bio}</p>}
    {perfil.disciplinas.length > 0 && <p className="text-caption text-fg-muted">{perfil.disciplinas.map(d => DISCIPLINAS[d as keyof typeof DISCIPLINAS]).filter(Boolean).join(' · ')}</p>}
    <p className="text-caption text-fg-muted">{formatInt(perfil.publicadas)} publicaciones compartidas</p>
    {perfil.destacados.length > 0 && <ul aria-label="Logros destacados" className="space-y-1">{perfil.destacados.map(p => { const r=leerResumen(p.resumen); return r?.tipo === 'logro' ? <li key={p.id} className="break-words text-body-sm text-fg"><span className="font-semibold">{r.titulo}</span> · {r.descripcion}</li> : null })}</ul>}
  </div>
}
export default function PerfilDeportivo({ alias, comunidad }: { alias: string; comunidad?: string }) {
  const consulta = useConsulta(async () => (await cargarSocial()).perfilDeportivo(alias, comunidad), `${alias}-${comunidad}`)
  if(consulta.estado === 'error') return <div className="space-y-2"><ErrorState>{consulta.error}</ErrorState><Button variant="secondary" size="sm" onClick={consulta.recargar}>Reintentar perfil</Button></div>
  return consulta.datos ? <DatosPerfilDeportivo perfil={consulta.datos} /> : null
}
