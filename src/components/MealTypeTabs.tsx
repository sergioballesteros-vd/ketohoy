'use client'

type Tab = { value: string; label: string; emoji: string }

const TABS: Tab[] = [
  { value: '', label: 'Todas', emoji: '🍽️' },
  { value: 'breakfast', label: 'Desayuno', emoji: '☀️' },
  { value: 'lunch', label: 'Comida', emoji: '🌤️' },
  { value: 'dinner', label: 'Cena', emoji: '🌙' },
  { value: 'snack', label: 'Snack', emoji: '🌰' },
]

type MealTypeTabsProps = {
  value: string
  onChange: (v: string) => void
}

export default function MealTypeTabs({ value, onChange }: MealTypeTabsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
      {TABS.map(tab => {
        const active = value === tab.value
        return (
          <button
            key={tab.value}
            onClick={() => onChange(tab.value)}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all"
            style={active
              ? { background: '#a3e635', color: '#060e07' }
              : { background: '#142514', color: '#547856', border: '1px solid #1c321d' }
            }
          >
            <span>{tab.emoji}</span>
            <span>{tab.label}</span>
          </button>
        )
      })}
    </div>
  )
}
