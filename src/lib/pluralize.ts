// Simple Spanish pluralization for the fixed vocabulary this app needs
// ("producto"/"productos"). Not a general i18n solution.
export function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural
}

export function productosCount(count: number): string {
  return `${count} ${pluralize(count, 'producto', 'productos')}`
}
