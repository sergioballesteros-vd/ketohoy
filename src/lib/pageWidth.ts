// One table for page width by route, used by PageShell (content) and Navigation (tab bar) so they always align.
//   narrow (42rem) reading / detail / forms · medium (48rem) Home, Despensa, Lista · wide (72rem) catalogs and grids
// Screens not listed keep the narrow column.
const WIDTHS = {
  narrow: 'max-w-2xl',
  medium: 'max-w-3xl',
  wide: 'max-w-6xl',
} as const

const ROUTE_WIDTH: Record<string, keyof typeof WIDTHS> = {
  '/': 'medium',
  '/explore': 'wide',
  '/meals': 'wide',
  '/weekly-plan': 'wide',
  '/inventory': 'medium',
  '/shopping-list': 'medium',
}

export const pageWidthClass = (pathname: string) => WIDTHS[ROUTE_WIDTH[pathname] ?? 'narrow']
