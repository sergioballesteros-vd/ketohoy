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
  onQuantityChange?: (id: string, delta: number) => void
}

export default function ShoppingListItem({ item, onToggle, onDelete, onQuantityChange }: ShoppingListItemProps) {
  const numericQuantity = item.quantity ? Number(item.quantity) : null
  const canStep = onQuantityChange && numericQuantity != null && Number.isFinite(numericQuantity)

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-xl transition-all"
      style={{
        background: item.checked ? 'transparent' : '#142514',
        border: `1px solid ${item.checked ? '#1c321d' : '#1c321d'}`,
        opacity: item.checked ? 0.5 : 1,
      }}
    >
      <button
        onClick={() => onToggle(item.id)}
        className="w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
        style={item.checked
          ? { background: '#a3e635', borderColor: '#a3e635' }
          : { background: 'transparent', borderColor: '#3b5e3c' }
        }
      >
        {item.checked && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4L3.5 6.5L9 1" stroke="#060e07" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div
          className="font-medium text-sm"
          style={{
            color: item.checked ? '#3b5e3c' : '#ecf5e0',
            textDecoration: item.checked ? 'line-through' : 'none',
          }}
        >
          {item.name}
        </div>
        <div className="text-xs flex flex-wrap gap-2 mt-0.5" style={{ color: '#3b5e3c' }}>
          {item.quantity && <span>{item.quantity}</span>}
          {item.product?.unitPrice && (
            <span style={{ color: '#f59e0b' }}>{item.product.unitPrice.toFixed(2)}€</span>
          )}
          {item.reason && <span className="truncate">{item.reason}</span>}
          {item.checked && item.product && (
            <span className="font-semibold" style={{ color: '#a3e635' }}>En despensa</span>
          )}
        </div>
      </div>

      {canStep && (
        <div className="flex items-center gap-1 rounded-xl p-1" style={{ background: '#1c321d' }}>
          <button
            onClick={() => onQuantityChange(item.id, -1)}
            className="w-8 h-8 rounded-lg font-bold"
            style={{ color: '#ecf5e0' }}
            aria-label="Reducir cantidad"
          >
            −
          </button>
          <span className="min-w-6 text-center text-sm font-semibold" style={{ color: '#ecf5e0' }}>
            {item.quantity}
          </span>
          <button
            onClick={() => onQuantityChange(item.id, 1)}
            className="w-8 h-8 rounded-lg font-bold"
            style={{ color: '#a3e635' }}
            aria-label="Aumentar cantidad"
          >
            +
          </button>
        </div>
      )}

      <button
        onClick={() => onDelete(item.id)}
        className="text-lg flex-shrink-0 transition-colors pl-1 hover:text-red-500"
        style={{ color: '#264227' }}
      >
        ×
      </button>
    </div>
  )
}
