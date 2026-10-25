/** Solo describe lo que dice el nombre; nunca convierte gramos ni deduce una preparación ausente. */
export function preparacionAlimento(nombre: string): string | null {
  const n = nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  const crudo = /\b(crud[oa]s?|sin cocer|sin cocinar)\b/.test(n)
  const cocinado = /\b(cocid[oa]s?|cocinad[oa]s?|hervid[oa]s?|asad[oa]s?|frit[oa]s?|a la plancha|al horno|al vapor)\b/.test(n)
  if (crudo && cocinado) return 'Preparación por comprobar'
  if (crudo) return 'En crudo'
  if (cocinado) return 'Ya cocinado'
  return null
}
