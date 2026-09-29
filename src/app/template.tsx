// Re-mounts on every navigation (layouts, and so the tab bar, persist): a short opacity fade, nothing else.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-in">{children}</div>
}
