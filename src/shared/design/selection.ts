/** Teclado común de opciones exclusivas. null = tecla que el control no debe interceptar. */
export function indicePorTecla(key: string, current: number, total: number): number | null {
  if (total < 1) return null
  switch (key) {
    case 'ArrowRight': case 'ArrowDown': return (current + 1) % total
    case 'ArrowLeft': case 'ArrowUp': return (current - 1 + total) % total
    case 'Home': return 0
    case 'End': return total - 1
    default: return null
  }
}
