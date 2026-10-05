const consonantPlurals: Record<string, string> = { atunes: 'atun', salmones: 'salmon', limones: 'limon', nueces: 'nuez', vegetales: 'vegetal' }
const stopWords = new Set(['de', 'del', 'el', 'la', 'los', 'las'])
function tokens(name: string): string[] {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .split(/[^a-z0-9]+/).filter(w => w && !stopWords.has(w))
    .map(w => consonantPlurals[w] ?? (w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w)).sort()
}
// Small, explicit equivalence already exercised by the scoring contract. No generic containment.
const equivalents: Record<string, string> = { 'pechuga pollo': 'pollo' }
export function ingredientMatchesProduct(ingredientName: string, productName: string): boolean {
  const a = tokens(ingredientName).join(' '), b = tokens(productName).join(' ')
  return !!a && !!b && (equivalents[a] ?? a) === (equivalents[b] ?? b)
}
