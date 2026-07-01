'use client'
export const dynamic = 'force-dynamic'
import { useState, useCallback, useEffect } from 'react'
import type { MercadonaProduct as MercadonaResult } from '@/lib/mercadona'
import ProductDetailModal from '@/components/ProductDetailModal'
import { Search, Beef, Fish, Egg, Milk, Carrot, Nut, Droplets, UtensilsCrossed, Plus, Sparkles, X } from 'lucide-react'

const CATEGORIES = [
  { key: 'meat',       label: 'Carne',        icon: Beef },
  { key: 'fish',       label: 'Pescado',       icon: Fish },
  { key: 'eggs',       label: 'Huevos',        icon: Egg },
  { key: 'dairy',      label: 'Lácteos',       icon: Milk },
  { key: 'vegetables', label: 'Verduras',      icon: Carrot },
  { key: 'nuts',       label: 'Frutos secos',  icon: Nut },
  { key: 'oils',       label: 'Aceites',       icon: Droplets },
  { key: 'sauces',     label: 'Salsas',        icon: UtensilsCrossed },
]

export default function ExplorePage() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [products, setProducts] = useState<MercadonaResult[]>([])
  const [loading, setLoading] = useState(false)
  const [detailProduct, setDetailProduct] = useState<MercadonaResult | null>(null)

  // Default "Trending" items load when nothing is selected
  useEffect(() => {
    if (!selectedCategory && searchQuery.trim() === '') {
      const loadTrending = async () => {
        setLoading(true)
        try {
          const res = await fetch(`/api/mercadona/search?q=keto`)
          const data = await res.json()
          setProducts(data.products?.slice(0, 10) ?? [])
        } catch (e) {
          console.error('Failed to load trending', e)
        }
        setLoading(false)
      }
      loadTrending()
    }
  }, [selectedCategory, searchQuery])

  const fetchCategory = useCallback(async (key: string) => {
    if (selectedCategory === key) { 
      setSelectedCategory(null)
      return 
    }
    setSearchQuery('')
    setSelectedCategory(key)
    setLoading(true)
    try {
      const res = await fetch(`/api/mercadona/category/${key}`)
      const data = await res.json()
      setProducts(data.products ?? [])
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }, [selectedCategory])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) {
      setSelectedCategory(null)
      return
    }
    setSelectedCategory(null)
    setLoading(true)
    try {
      const res = await fetch(`/api/mercadona/search?q=${encodeURIComponent(searchQuery)}`)
      const data = await res.json()
      setProducts(data.products ?? [])
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  const handleAddToPantry = async (p: MercadonaResult) => {
    await fetch('/api/mercadona/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mercadonaId: p.id.replace('mercadona_', ''), addToPantry: true }),
    })
  }

  const handleAddToCart = async (p: MercadonaResult) => {
    await fetch('/api/mercadona/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mercadonaId: p.id.replace('mercadona_', ''), addToShoppingList: true }),
    })
  }

  return (
    <main className="px-4 pt-6 pb-24 min-h-screen" style={{ background: '#0a140a' }}>
      <ProductDetailModal
        product={detailProduct}
        onClose={() => setDetailProduct(null)}
        onAddToPantry={detailProduct ? () => handleAddToPantry(detailProduct) : undefined}
        onAddToShoppingList={detailProduct ? () => handleAddToCart(detailProduct) : undefined}
      />

      {/* Header & Search */}
      <div className="sticky top-0 z-10 pb-4" style={{ background: 'linear-gradient(180deg, #0a140a 80%, transparent 100%)' }}>
        <h1 className="text-3xl font-bold mb-4 tracking-tight" style={{ fontFamily: 'Syne, sans-serif', color: '#ecf5e0' }}>
          Descubrir
        </h1>
        
        <form onSubmit={handleSearch} className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#a3e635]">
            <Search size={20} />
          </div>
          <input
            type="text"
            className="w-full py-3.5 pl-11 pr-10 rounded-2xl outline-none transition-all duration-300"
            placeholder="Buscar productos keto..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ 
              background: 'rgba(163, 230, 53, 0.05)', 
              border: '1px solid rgba(163, 230, 53, 0.2)', 
              color: '#ecf5e0',
              backdropFilter: 'blur(12px)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
            }}
          />
          {searchQuery && (
            <button 
              type="button"
              onClick={() => { setSearchQuery(''); setSelectedCategory(null); }}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-[#547856] hover:text-[#a3e635] transition-colors"
            >
              <X size={18} />
            </button>
          )}
        </form>
      </div>

      {/* Horizontal Categories Scroll */}
      <div className="mt-2 mb-8 -mx-4 px-4 overflow-x-auto hide-scrollbar">
        <div className="flex gap-3 w-max pb-2">
          {CATEGORIES.map(cat => {
            const Icon = cat.icon
            const isSelected = selectedCategory === cat.key
            return (
              <button
                key={cat.key}
                onClick={() => fetchCategory(cat.key)}
                className="flex flex-col items-center justify-center gap-2 rounded-2xl w-20 h-24 transition-all duration-300 active:scale-95 shrink-0"
                style={isSelected
                  ? { background: '#a3e635', color: '#060e07', boxShadow: '0 8px 16px rgba(163, 230, 53, 0.2)' }
                  : { background: '#142514', border: '1px solid #1c321d', color: '#a3e635' }
                }
              >
                <Icon size={28} strokeWidth={isSelected ? 2.5 : 1.5} />
                <span className="text-[11px] font-medium tracking-wide" style={{ color: isSelected ? '#060e07' : '#ecf5e0' }}>
                  {cat.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center gap-2 mb-4">
        {!selectedCategory && !searchQuery ? (
          <>
            <Sparkles size={20} className="text-[#a3e635]" />
            <h2 className="text-lg font-bold" style={{ color: '#ecf5e0' }}>Populares en Keto</h2>
          </>
        ) : (
          <h2 className="text-lg font-bold" style={{ color: '#ecf5e0' }}>
            {searchQuery ? `Resultados para "${searchQuery}"` : CATEGORIES.find(c => c.key === selectedCategory)?.label}
          </h2>
        )}
      </div>

      {/* Results Grid */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="rounded-2xl h-56 animate-pulse" style={{ background: '#142514' }} />
          ))}
        </div>
      ) : products.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {products.map(p => (
            <div
              key={p.id}
              className="group flex flex-col rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.02] active:scale-95"
              style={{ background: '#142514', border: '1px solid #1c321d', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              onClick={() => setDetailProduct(p)}
            >
              <div className="aspect-square bg-white relative p-4 flex items-center justify-center">
                {p.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.imageUrl} alt={p.name} className="w-full h-full object-contain mix-blend-multiply" />
                ) : (
                  <div className="w-full h-full bg-gray-100 rounded-xl" />
                )}
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: '#a3e635', color: '#060e07' }}>
                  Keto {p.ketoScore}/5
                </div>
              </div>
              <div className="p-3 flex flex-col flex-1">
                <div className="text-xs font-medium line-clamp-2 leading-tight mb-2" style={{ color: '#ecf5e0' }}>
                  {p.name}
                </div>
                <div className="mt-auto flex items-center justify-between">
                  {p.unitPrice ? (
                    <span className="font-bold text-sm" style={{ color: '#a3e635' }}>
                      {p.unitPrice.toFixed(2)}€
                    </span>
                  ) : (
                    <span />
                  )}
                  <button 
                    className="w-7 h-7 rounded-full flex items-center justify-center transition-colors"
                    style={{ background: '#1c321d', color: '#a3e635' }}
                    onClick={(e) => { e.stopPropagation(); setDetailProduct(p); }}
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Search size={48} className="mx-auto mb-4 opacity-20 text-[#a3e635]" />
          <p className="text-[#547856]">No se encontraron productos.</p>
        </div>
      )}

      {/* Global styles for hide-scrollbar */}
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
    </main>
  )
}
