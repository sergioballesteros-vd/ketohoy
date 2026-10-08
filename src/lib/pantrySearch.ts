export function normalizePantrySearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
}

export function filterPantryItems<T extends { product: { name: string } }>(items: T[], query: string): T[] {
  const normalizedQuery = normalizePantrySearch(query)
  return normalizedQuery ? items.filter(item => normalizePantrySearch(item.product.name).includes(normalizedQuery)) : items
}
