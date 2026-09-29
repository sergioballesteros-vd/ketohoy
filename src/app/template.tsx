import { ViewTransition } from 'react'

// Re-mounts on every navigation. ViewTransition cross-fades old page -> new page (the old one no longer
// vanishes at once); the tab bar has its own view-transition-name so it stays put. See globals.css.
export default function Template({ children }: { children: React.ReactNode }) {
  return <ViewTransition>{children}</ViewTransition>
}
