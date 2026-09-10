function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Fills `size` slots from a ranked id list, maximizing variety: cycles through
// a shuffled pass of all ids before repeating any one, and never repeats the
// immediately preceding slot when a different id is available.
export function extendedPool(ids: string[], size: number): string[] {
  if (ids.length === 0) return []
  const result: string[] = []
  while (result.length < size) {
    const pass = shuffle(ids)
    if (result.length > 0 && pass[0] === result[result.length - 1] && pass.length > 1) {
      ;[pass[0], pass[1]] = [pass[1], pass[0]]
    }
    result.push(...pass)
  }
  return result.slice(0, size)
}
