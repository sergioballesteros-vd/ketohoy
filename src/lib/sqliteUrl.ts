import path from 'node:path'

/** SQLite paths are resolved from the repository cwd, for runtime and seed alike. */
export function resolveSqlitePath(url: string | undefined, required = false): string {
  if (!url) {
    if (required) throw new Error('DATABASE_URL is required; seed refuses to choose a database implicitly')
    return path.resolve('dev.db')
  }
  const filename = url.startsWith('file:') ? url.slice(5) : url
  if (!filename.trim() || /^[a-z][a-z0-9+.-]*:/i.test(filename) || /[?#]/.test(filename)) {
    throw new Error('DATABASE_URL must be a SQLite file path (file:./database.db or an absolute path)')
  }
  return path.resolve(filename)
}
