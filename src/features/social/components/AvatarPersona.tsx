import Avatar from '../../../shared/components/Avatar'
import IconoLogro from '../../vitrina/components/IconoLogro'
import type { ResumenLogro } from '../lib/publicacion'
import { nombreVisible } from '../lib/relacion'

interface Props {
  persona: { alias: string; nombre: string | null }
  /** El logro que eligió como avatar, si se puede ver (`useAvatares`); sin él, su monograma. */
  logro?: ResumenLogro
  tamano?: 'sm' | 'md' | 'lg'
}

/** Cara de una persona en Social: su insignia elegida o su monograma. Decorativa; el nombre va siempre al lado. */
export default function AvatarPersona({ persona, logro, tamano = 'md' }: Props) {
  return <Avatar nombre={nombreVisible(persona)} tamano={tamano} insignia={logro
    ? <IconoLogro alcanzado tamano={tamano === 'lg' ? 'lg' : 'sm'} logro={{ id: logro.logroId, grupo: logro.grupo, nombre: logro.titulo, descripcion: logro.descripcion, niveles: [] }} />
    : undefined} />
}
