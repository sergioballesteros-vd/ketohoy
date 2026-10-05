const STOPWORDS = new Set(['con', 'de', 'del', 'al', 'a', 'la', 'el', 'en', 'y', 'sin', 'directas'])

// Unsplash photo identity is the path of its URL (query params change per request).
export const photoId = (url: string) => new URL(url).pathname

// Long, specific titles often return nothing, so fall back to shorter queries.
function queriesFor(title: string) {
  const main = title
    .toLowerCase()
    .split(/\s+/)
    .filter(w => !STOPWORDS.has(w))
    .slice(0, 2)
    .join(' ')
  return [`${title} food`, title, `${main} food`]
}

/** `exclude` holds photoIds already used by other recipes; those results are skipped. */
export async function fetchRecipeImage(recipeTitle: string, exclude: Set<string> = new Set()): Promise<string | null> {
  const key = process.env.UNSPLASH_ACCESS_KEY
  if (!key) return null
  for (const query of queriesFor(recipeTitle)) {
    try {
      const res = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape`,
        { headers: { Authorization: `Client-ID ${key}` } }
      )
      if (!res.ok) return null // rate limit or auth: retrying other queries would only burn quota
      const data = await res.json()
      const urls: string[] = (data.results ?? []).map((r: { urls?: { regular?: string } }) => r.urls?.regular).filter(Boolean)
      const fresh = urls.find(u => !exclude.has(photoId(u)))
      if (fresh) return fresh
    } catch {
      return null
    }
  }
  return null
}
