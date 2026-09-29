/** Forma canónica de un nombre para comparar y buscar: sin espacios sobrantes, minúsculas y sin tildes. */
export function normalizeName(nombre: string): string {
  return nombre
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}
