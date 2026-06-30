export async function fetchRecipeImage(recipeTitle: string): Promise<string | null> {
  const key = process.env.UNSPLASH_ACCESS_KEY
  if (!key) return null
  try {
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(recipeTitle + ' food keto')}&per_page=1&orientation=landscape`,
      { headers: { Authorization: `Client-ID ${key}` } }
    )
    if (!res.ok) return null
    const data = await res.json()
    return data.results?.[0]?.urls?.regular ?? null
  } catch {
    return null
  }
}
