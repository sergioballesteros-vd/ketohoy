export function parseShoppingQuantity(value: unknown, fallback = 1): number {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export function formatShoppingQuantity(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, '')
}

export function mergeShoppingQuantity(current: string | null | undefined, delta: number): string {
  const currentValue = parseShoppingQuantity(current, 0)
  return formatShoppingQuantity(Math.max(0, currentValue + delta))
}
