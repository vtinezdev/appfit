import Avatar from '../../../shared/components/Avatar'
import IconoLogro from '../../vitrina/components/IconoLogro'
import type { Avatar as AvatarElegido } from '../lib/avatar'
import { nombreVisible } from '../lib/relacion'
import ArteAvatar from './ArteAvatar'
import { imagenAvatarExclusivo } from '../lib/imagenAvatarExclusivo'

interface Props {
  persona: { alias: string; nombre: string | null }
  /** El avatar que eligió, si se puede ver (`useAvatares`); sin él, su monograma. */
  avatar?: AvatarElegido | null
  tamano?: 'sm' | 'md' | 'lg'
}

/** Cara de una persona en Social: disciplina, paisaje, insignia de un logro o su monograma. Decorativa; el nombre va siempre al lado. */
export default function AvatarPersona({ persona, avatar, tamano = 'md' }: Props) {
  const imagen = avatar?.tipo === 'exclusivo' ? imagenAvatarExclusivo(avatar) : undefined
  return <Avatar nombre={nombreVisible(persona)} tamano={tamano}
    arte={imagen ? <img src={imagen} alt="" className="h-full w-full object-cover" />
      : avatar && (avatar.tipo === 'disciplina' || avatar.tipo === 'paisaje') ? <ArteAvatar avatar={avatar} /> : undefined}
    insignia={avatar?.tipo === 'logro'
      ? <IconoLogro alcanzado tamano={tamano === 'lg' ? 'lg' : 'sm'} logro={{ id: avatar.logro, grupo: avatar.grupo, nombre: '', descripcion: '', niveles: [] }} />
      : undefined} />
}
