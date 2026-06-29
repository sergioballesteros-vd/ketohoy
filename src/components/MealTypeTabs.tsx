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
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
      {TABS.map(tab => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-sm transition-colors ${
            value === tab.value
              ? 'bg-green-700 text-white font-medium'
              : 'bg-gray-900 text-gray-400 hover:bg-gray-800'
          }`}
        >
          <span>{tab.emoji}</span>
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  )
}
