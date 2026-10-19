import type { AvatarExclusivo } from './avatar'

// Recurso propio servido con la app, nunca una URL de usuario. Sin el archivo (una versión anterior, por ejemplo),
// se conserva el monograma y no se ofrece una opción sin imagen. El permiso lo comprueba el servidor igualmente.
const IMAGENES = import.meta.glob<string>('../assets/avatares/*.webp', { eager: true, query: '?url', import: 'default' })

export const imagenAvatarExclusivo = (avatar: AvatarExclusivo): string | undefined => IMAGENES[`../assets/avatares/${avatar.id}.webp`]
