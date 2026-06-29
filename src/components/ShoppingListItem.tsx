'use client'

type ShoppingItem = {
  id: string
  name: string
  quantity: string | null
  checked: boolean
  reason: string | null
  product: { unitPrice: number | null; category: string } | null
}

type ShoppingListItemProps = {
  item: ShoppingItem
  onToggle: (id: string) => void
  onDelete: (id: string) => void
}

export default function ShoppingListItem({ item, onToggle, onDelete }: ShoppingListItemProps) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
      item.checked ? 'opacity-50' : 'bg-gray-900'
    }`}>
      <button
        onClick={() => onToggle(item.id)}
        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
          item.checked
            ? 'bg-green-600 border-green-600'
            : 'border-gray-600 hover:border-green-500'
        }`}
      >
        {item.checked && <span className="text-white text-xs">✓</span>}
      </button>

      <div className="flex-1 min-w-0">
        <div className={`font-medium text-sm ${item.checked ? 'line-through text-gray-500' : ''}`}>
          {item.name}
        </div>
        <div className="text-xs text-gray-500 flex gap-2">
          {item.quantity && <span>{item.quantity}</span>}
          {item.product?.unitPrice && <span>{item.product.unitPrice.toFixed(2)}€</span>}
          {item.reason && <span className="truncate">{item.reason}</span>}
        </div>
      </div>

      <button
        onClick={() => onDelete(item.id)}
        className="text-gray-700 hover:text-red-500 transition-colors text-lg flex-shrink-0"
      >
        ×
      </button>
    </div>
  )
}
