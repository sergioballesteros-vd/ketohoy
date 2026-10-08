'use client'

import Image from 'next/image'
import { useState } from 'react'
import { ChefHat } from 'lucide-react'
import { reviewedRecipeImage } from '@/lib/recipeImages'

type RecipeImageProps = {
  title: string
  className: string
  sizes: string
  priority?: boolean
}

export function RecipeImage({ title, className, sizes, priority }: RecipeImageProps) {
  const [failed, setFailed] = useState(false)
  const image = reviewedRecipeImage(title)

  return (
    <div className={`relative overflow-hidden bg-forest-800 ${className}`}>
      {image && !failed ? (
        <>
          <Image src={image.url} alt="" fill sizes={sizes} priority={priority} onError={() => setFailed(true)} className="object-cover" />
          {image.illustrative && <span className="absolute top-2 left-2 rounded bg-forest-950/85 px-2 py-1 text-[10px] text-forest-50">Imagen ilustrativa</span>}
        </>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-forest-400" role="img" aria-label={failed ? 'Foto no disponible' : 'Sin foto revisada'}>
          <ChefHat size={32} strokeWidth={1.5} aria-hidden="true" />
          <span className="text-xs">{failed ? 'Foto no disponible' : 'Sin foto revisada'}</span>
        </div>
      )}
    </div>
  )
}

export function RecipeImageAttribution({ title }: { title: string }) {
  const image = reviewedRecipeImage(title)
  if (!image) return null

  return (
    <p className="mt-1 text-[10px] text-forest-400">
      Foto de <a className="underline" href={image.photographerUrl} target="_blank" rel="noreferrer">{image.photographer}</a> en <a className="underline" href={image.photoUrl} target="_blank" rel="noreferrer">Unsplash</a>
    </p>
  )
}
