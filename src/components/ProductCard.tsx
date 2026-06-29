'use client'

type Product = {
  id: string
  name: string
  brand: string | null
  category: string
  ketoScore: number
  source: string
  unitPrice: number | null
  imageUrl: string | null
  tags: string
}

type ProductCardProps = {
  product: Product
  inPantry: boolean
  pantryItemId?: string
  onToggle: (productId: string, pantryItemId?: string) => void
}

const categoryEmoji: Record<string, string> = {
  meat: '🥩', fish: '🐟', eggs: '🥚', dairy: '🧀',
  vegetables: '🥦', fruit: '🍓', nuts: '🌰', oils: '🫒',
  sauces: '🥫', drinks: '🥤', other: '🍽️',
}

const ketoScoreColor = [
  '#ef4444', // 0 - no keto
  '#f97316', // 1
  '#f59e0b', // 2
  '#eab308', // 3
  '#a3e635', // 4
  '#a3e635', // 5
]

export default function ProductCard({ product, inPantry, pantryItemId, onToggle }: ProductCardProps) {
  return (
    <button
      onClick={() => onToggle(product.id, pantryItemId)}
      className="w-full text-left rounded-xl p-3 transition-all"
      style={inPantry
        ? { background: 'rgba(163,230,53,0.08)', border: '1px solid rgba(163,230,53,0.25)' }
        : { background: '#142514', border: '1px solid #1c321d' }
      }
    >
      <div className="flex items-start gap-2">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl}
            alt={product.name}
            width={48}
            height={48}
            className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
            style={{ background: '#1c321d' }}
          />
        ) : (
          <span
            className="w-12 h-12 flex items-center justify-center text-2xl flex-shrink-0 rounded-xl"
            style={{ background: '#1c321d' }}
          >
            {categoryEmoji[product.category] ?? '🍽️'}
          </span>
        )}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm truncate" style={{ color: '#ecf5e0' }}>{product.name}</div>
          {product.brand && <div className="text-xs truncate" style={{ color: '#547856' }}>{product.brand}</div>}
          <div className="flex items-center gap-1.5 mt-1">
            <div
              className="w-2 h-2 rounded-full"
              style={{ background: ketoScoreColor[product.ketoScore] ?? '#547856' }}
            />
            <span className="text-xs" style={{ color: '#547856' }}>keto {product.ketoScore}/5</span>
            {product.unitPrice && (
              <span className="text-xs ml-1" style={{ color: '#f59e0b' }}>{product.unitPrice.toFixed(2)}€</span>
            )}
          </div>
        </div>
        {inPantry && (
          <span className="text-sm flex-shrink-0 font-bold" style={{ color: '#a3e635' }}>✓</span>
        )}
      </div>
    </button>
  )
}
