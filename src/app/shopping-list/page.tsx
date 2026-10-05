'use client'
import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Check, Minus, Plus, ShoppingBasket, Trash2 } from 'lucide-react'
import AddProductSheet from '@/components/AddProductSheet'
import { useToast } from '@/components/Toast'
import { Skeleton, focusRing } from '@/components/ui'
import { formatShoppingQuantity } from '@/lib/shoppingList'
import { pluralize } from '@/lib/pluralize'
import { apiFetch } from '@/lib/apiFetch'
import ShoppingListExperiment from './ShoppingListExperiment'

export type ShoppingItem = {
  id: string
  name: string
  quantity: string | null
  purchaseQuantity: number | null
  requiredQuantity: number | null
  requiredUnit: string | null
  originalIngredientText: string | null
  sourceKey: string | null
  checked: boolean
  reason: string | null
  productId: string | null
  product: { packageQuantity: number | null; packageUnit: string | null; mercadonaId: string | null; unitPrice: number | null; imageUrl: string | null; category: string | null } | null
}

const JSON_HEADERS = { 'Content-Type': 'application/json' }
const euros = (n: number) => `${n.toFixed(2).replace('.', ',')} €`
const subscribeToUrl = (callback: () => void) => {
  window.addEventListener('popstate', callback)
  return () => window.removeEventListener('popstate', callback)
}
const hasRedesignFlag = () => new URLSearchParams(window.location.search).get('redesign') === '1'
const getGroupingFromUrl = (): 'flat' | 'zones' => new URLSearchParams(window.location.search).get('grouping') === 'flat' ? 'flat' : 'zones'

async function loadShoppingListItems(): Promise<ShoppingItem[]> {
  const res = await apiFetch('/api/shopping-list')
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

const LEAVE_MS = 140
function NeedAndPackage({ item }: { item: ShoppingItem }) {
  return <span className="mt-0.5 block break-words text-xs text-forest-300">
    <span className="block">{item.requiredQuantity != null && item.requiredUnit
      ? `Necesidad: ${formatShoppingQuantity(item.requiredQuantity)} ${item.requiredUnit}`
      : item.originalIngredientText ? `Necesidad: ${item.originalIngredientText}` : 'Cantidad necesaria no especificada'}</span>
    {item.originalIngredientText && item.requiredQuantity != null && <span className="block">Texto original: {item.originalIngredientText}</span>}
    <span className="block">{item.product?.packageQuantity != null && item.product.packageUnit
      ? `Envase: ${formatShoppingQuantity(item.product.packageQuantity)} ${item.product.packageUnit}`
      : 'Contenido del envase no especificado'}</span>
    <span className="block">{item.purchaseQuantity != null ? `Compra: ${formatShoppingQuantity(item.purchaseQuantity)} ${pluralize(item.purchaseQuantity, 'paquete', 'paquetes')}` : 'Paquetes por elegir'}</span>
  </span>
}

export default function ShoppingListPage() {
  const redesign = useSyncExternalStore(subscribeToUrl, hasRedesignFlag, () => false)
  const grouping = useSyncExternalStore(subscribeToUrl, getGroupingFromUrl, (): 'flat' | 'zones' => 'zones')
  const [items, setItems] = useState<ShoppingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState<null | 'search' | 'manual'>(null)
  const [leaving, setLeaving] = useState<Set<string>>(new Set())
  const { toast, show } = useToast()
  const mutations = useRef(new Set<string>())
  const pendingChecks = useRef(new Map<string, { target: boolean; queued: ShoppingItem | null }>())
  const [pendingMutations, setPendingMutations] = useState<Set<string>>(new Set())
  const removalFocus = useRef<{ trigger: HTMLElement; candidates: HTMLElement[] } | null>(null)
  useEffect(() => {
    const destination = removalFocus.current
    if (!destination || destination.trigger.isConnected) return
    removalFocus.current = null
    if (document.activeElement !== document.body) return
    destination.candidates.find(element => element.isConnected && !element.matches(':disabled') && element.getClientRects().length > 0)?.focus({ preventScroll: true })
  }, [items])
  const mounted = useRef(true)
  const generation = useRef(0)
  const rowOrder = useRef<string[]>([])
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  const refresh = useCallback(async () => {
    const current = ++generation.current
    try {
      const rows = await loadShoppingListItems()
      if (!mounted.current || current !== generation.current) return
      if (redesign) {
        if (rowOrder.current.length === 0) rowOrder.current = rows.map(row => row.id)
        else {
          const known = new Set(rowOrder.current)
          rows.forEach(row => { if (!known.has(row.id)) rowOrder.current.push(row.id) })
          const order = new Map(rowOrder.current.map((id, index) => [id, index]))
          rows.sort((a, b) => (order.get(a.id) ?? Infinity) - (order.get(b.id) ?? Infinity))
        }
      }
      setItems(rows)
      setError(null)
    } catch {
      if (!mounted.current || current !== generation.current) return
      setError('No se pudo cargar la lista de compra')
    } finally {
      setLoading(false)
    }
  }, [redesign])

  useEffect(() => {
    void (async () => {
      await refresh()
    })()
  }, [refresh])

  const pending = items.filter(i => !i.checked)
  const bought = items.filter(i => i.checked)
  const total = pending.reduce((sum, i) => sum + (i.product?.unitPrice ?? 0) * (i.purchaseQuantity ?? 0), 0)

  const owned: Record<string, number> = {}
  for (const i of pending) if (i.product?.mercadonaId) owned[i.product.mercadonaId] = (owned[i.product.mercadonaId] ?? 0) + (i.purchaseQuantity ?? 0)

  // Plays the exit (opacity/transform) before the row leaves the list; the request is not delayed.
  const leave = async (id: string) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    setLeaving(s => new Set(s).add(id))
    await new Promise(r => setTimeout(r, LEAVE_MS))
  }

  const request = async (url: string, init?: RequestInit) => {
    const res = await apiFetch(url, init)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res
  }

  // Buying moves the item into the pantry on the server (see pantryTransfer). Optimistic so the tick feels instant.
  const toggle = async (item: ShoppingItem) => {
    if (mutations.current.has(item.id)) {
      const check = pendingChecks.current.get(item.id)
      // Duplicate activation has the old checked value; an inverse action uses the new visible value.
      if (check && item.checked === check.target) check.queued = item
      return
    }
    const check = { target: !item.checked, queued: null as ShoppingItem | null }
    pendingChecks.current.set(item.id, check)
    mutations.current.add(item.id)
    setPendingMutations(new Set(mutations.current))
    generation.current++
    setItems(list => list.map(i => (i.id === item.id ? { ...i, checked: !i.checked } : i)))
    let success = false
    try {
      await request(`/api/shopping-list/${item.id}/check`, { method: 'PATCH' })
      success = true
      if (mounted.current) show(item.checked ? `${item.name} vuelve a la lista` : `${item.name} está en tu despensa`, item.checked ? undefined : { label: 'Ver', href: '/inventory' })
    } catch {
      if (mounted.current) {
        setItems(list => list.map(row => row.id === item.id ? item : row))
        show('No se pudo actualizar el producto')
      }
    }
    if (mounted.current) await refresh()
    mutations.current.delete(item.id)
    pendingChecks.current.delete(item.id)
    if (mounted.current) {
      setPendingMutations(new Set(mutations.current))
      if (success && check.queued) await toggle(check.queued)
    }
  }

  // Attach the rejection handler immediately: the request can fail during the existing row exit.
  const mutateRow = async (item: ShoppingItem, delta?: number) => {
    if (mutations.current.has(item.id)) return
    mutations.current.add(item.id)
    setPendingMutations(new Set(mutations.current))
    generation.current++
    const removing = delta === undefined || (item.purchaseQuantity ?? 0) + delta <= 0
    const trigger = document.activeElement as HTMLElement | null
    const row = trigger?.closest('li')
    if (removing && trigger && row) {
      const rows = Array.from(row.parentElement?.children ?? [])
      const index = rows.indexOf(row)
      const neighbors = [...rows.slice(index + 1), ...rows.slice(0, index).reverse()]
      const candidates = neighbors.map(element => element.querySelector<HTMLElement>('button')).filter((element): element is HTMLElement => !!element)
      const primary = document.querySelector<HTMLElement>('main header button')
      removalFocus.current = { trigger, candidates: primary ? [...candidates, primary] : candidates }
    }
    const result = request(`/api/shopping-list/${item.id}${delta === undefined ? '' : '/quantity'}`, {
      method: delta === undefined ? 'DELETE' : 'PATCH', headers: JSON_HEADERS,
      ...(delta === undefined ? {} : { body: JSON.stringify({ delta }) }),
    }).then(() => true, () => false)
    if (removing) await leave(item.id)
    if (mounted.current) setItems(list => removing ? list.filter(row => row.id !== item.id) : list.map(row => row.id === item.id ? { ...row, quantity: String((item.purchaseQuantity ?? 0) + delta!), purchaseQuantity: (item.purchaseQuantity ?? 0) + delta! } : row))
    const success = await result
    if (mounted.current) {
      setLeaving(ids => { const next = new Set(ids); next.delete(item.id); return next })
      if (!success) {
        // Merge only this row; never replace newer state of other products with an old list snapshot.
        setItems(list => list.some(row => row.id === item.id) ? list.map(row => row.id === item.id ? item : row) : [...list, item])
      }
      await refresh()
    }
    mutations.current.delete(item.id)
    if (mounted.current) setPendingMutations(new Set(mutations.current))
    if (!mounted.current) return
    if (success) {
      if (removing) undoable(item)
    } else {
      show(removing ? 'No se pudo eliminar el producto' : 'No se pudo cambiar la cantidad', {
        label: 'Reintentar', run: () => void mutateRow(item, delta),
      })
    }
  }

  const change = (item: ShoppingItem, delta: number) => mutateRow(item, delta)
  const remove = (item: ShoppingItem) => mutateRow(item)

  const undoable = (item: ShoppingItem) => {
    let restored = false
    const undo = async () => {
      if (restored || mutations.current.has(item.id)) return
      mutations.current.add(item.id)
      generation.current++
      try {
        const origin = item.sourceKey ? JSON.parse(item.sourceKey) as string[] : null
        let outcome: 'created' | 'existing' | undefined
        if (origin?.[0] === 'weekly-plan') {
          await request('/api/weekly-plan/shopping-list', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ planId: origin[1] }) })
        } else {
          const response = await request(origin ? `/api/recipes/${origin[0] === 'meal' ? origin[3] : origin[1]}/add-to-shopping-list` : '/api/shopping-list', {
            method: 'POST', headers: JSON_HEADERS,
            body: JSON.stringify(origin ? (origin[0] === 'meal' ? { mealId: origin[2] } : {}) : { name: item.name, restore: true, purchaseQuantity: item.purchaseQuantity, legacyQuantity: item.purchaseQuantity === null ? item.quantity : undefined, productId: item.productId, reason: item.reason, requiredQuantity: item.requiredQuantity, requiredUnit: item.requiredUnit, originalIngredientText: item.originalIngredientText }),
          })
          if (!origin) outcome = (await response.json()).outcome
        }
        restored = true
        if (!mounted.current) return
        await refresh()
        if (mounted.current && outcome) show(outcome === 'existing' ? 'Ya está en tu lista. Se conserva la cantidad actual.' : 'Producto restaurado')
      } catch {
        if (mounted.current) show('No se pudo restaurar el producto', { label: 'Reintentar', run: () => void undo() })
      } finally { mutations.current.delete(item.id) }
    }
    show(`${item.name} eliminado`, { label: 'Deshacer', run: () => void undo() })
  }

  // Bought items are already in the pantry; this only tidies the list.
  const clearBought = async () => {
    if (!bought.length || mutations.current.size) return
    const ids = bought.map(item => item.id)
    ids.forEach(id => mutations.current.add(id))
    setPendingMutations(new Set(mutations.current))
    generation.current++
    let success = false
    try {
      await request('/api/shopping-list', { method: 'DELETE', headers: JSON_HEADERS, body: JSON.stringify({ ids }) })
      success = true
    } catch { /* Keep the rows and offer the same operation again after releasing its lock. */ }
    if (mounted.current) await refresh()
    ids.forEach(id => mutations.current.delete(id))
    if (mounted.current) {
      setPendingMutations(new Set(mutations.current))
      if (!success) show('No se pudo limpiar la lista', { label: 'Reintentar', run: () => void clearBought() })
    }
  }

  if (redesign) return <main data-shopping-redesign="true" className="min-h-screen bg-[#f7f5ef] px-4 pt-[calc(env(safe-area-inset-top)+1rem)] text-forest-950">
    {loading ? <div className="space-y-3" aria-busy="true">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-14 bg-stone-100" />)}</div> : error ? <p role="alert" className="text-sm text-red-800">{error}{' '}<button type="button" onClick={() => void refresh()} className="font-semibold underline">Reintentar</button></p> : <ShoppingListExperiment
      items={items}
      grouping={grouping}
      pendingMutations={pendingMutations}
      leaving={leaving}
      onToggle={item => void toggle(item)}
      onChange={(item, delta) => void change(item, delta)}
      onRemove={item => void remove(item)}
      onClearBought={() => void clearBought()}
      onAdd={() => setAdding('search')}
    />}
    {adding && <AddProductSheet target="shopping" owned={owned} startManual={adding === 'manual'} onChanged={refresh} onClose={() => setAdding(null)} />}
    {toast}
  </main>

  return (
    <main className="min-h-screen px-4 pt-[calc(env(safe-area-inset-top)+1rem)]">
      <header className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-xl min-[360px]:text-2xl font-semibold text-forest-50">Lista de compra</h1>
          <p className="mt-0.5 text-sm text-forest-300">
            {loading ? ' ' : <span key={pending.length} className="inline-block">{`${pending.length} ${pluralize(pending.length, 'pendiente', 'pendientes')}`}</span>}
            {total > 0 && <span> · <span key={total} className="inline-block">{euros(total)} estimados</span></span>}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAdding('search')}
          className={`relative hit-area inline-flex h-10 items-center gap-1.5 rounded-full bg-[#a3e635] px-4 text-sm font-semibold text-forest-950 ${focusRing}`}
        >
          <Plus size={16} strokeWidth={3} /> Añadir
        </button>
      </header>

      {error && (
        <p role="alert" className="mb-4 rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}{' '}
          <button type="button" onClick={() => void refresh()} className="font-semibold underline">
            Reintentar
          </button>
        </p>
      )}

      {loading ? (
        <div className="space-y-3" aria-busy="true">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      ) : (
        <>
          {pending.length > 0 ? (
            <ul className="divide-y divide-forest-800">
              {pending.map(item => {
                const qty = item.purchaseQuantity ?? 0
                const price = item.product?.unitPrice
                return (
                  <li key={item.id} className={`flex min-h-16 items-center gap-2 py-1.5 ${leaving.has(item.id) ? 'leaving' : ''}`}>
                    <button
                      type="button"
                      aria-disabled={pendingMutations.has(item.id) || undefined}
                      onClick={() => void toggle(item)}
                      aria-label={`Marcar ${item.name} como comprado`}
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${focusRing}`}
                    >
                      <span className="h-6 w-6 rounded-full border-2 border-forest-400" />
                    </button>
                    <span className={`relative hidden h-10 w-10 shrink-0 overflow-hidden rounded-lg min-[360px]:block ${item.product?.imageUrl ? 'bg-white' : 'bg-forest-800'}`}>
                      {item.product?.imageUrl ? (
                        <Image src={item.product.imageUrl} alt="" fill sizes="40px" className="object-cover" />
                      ) : (
                        <ShoppingBasket className="absolute inset-0 m-auto text-forest-300" size={18} strokeWidth={1.5} />
                      )}
                    </span>
                    <span className="min-w-0 flex-1 pl-1">
                      <span className="line-clamp-2 text-[15px] leading-snug font-medium text-forest-50">{item.name}</span>
                      <NeedAndPackage item={item} />
                      {((price != null && qty > 0) || item.reason) && (
                        <span className="mt-0.5 block truncate text-xs text-forest-300">
                          {price != null && qty > 0 ? (qty > 1 ? `${euros(price * qty)} · ${euros(price)} por paquete` : `${euros(price)} por paquete`) : item.reason}
                        </span>
                      )}
                    </span>
                    {item.sourceKey || item.purchaseQuantity != null ? (
                      <span className="flex shrink-0 items-center rounded-full bg-forest-800">
                        <button
                          type="button"
                          disabled={pendingMutations.has(item.id)}
                          onClick={() => void change(item, -1)}
                          aria-label={qty <= 1 ? `Quitar ${item.name} de la lista` : `Reducir cantidad de ${item.name}`}
                          className={`flex h-11 w-10 items-center justify-center rounded-full text-forest-50 ${focusRing}`}
                        >
                          {qty <= 1 ? <Trash2 size={16} className="text-red-300" /> : <Minus size={16} />}
                        </button>
                        <span className="min-w-5 text-center text-sm font-semibold text-forest-50" aria-live="polite" aria-label={item.purchaseQuantity == null ? 'Paquetes por elegir' : `${item.purchaseQuantity} paquetes para comprar`}>
                          <span key={item.purchaseQuantity} className="inline-block">{item.purchaseQuantity == null ? '—' : formatShoppingQuantity(item.purchaseQuantity)}</span>
                        </span>
                        <button
                          type="button"
                          disabled={pendingMutations.has(item.id)}
                          onClick={() => void change(item, 1)}
                          aria-label={`Aumentar cantidad de ${item.name}`}
                          className={`flex h-11 w-10 items-center justify-center rounded-full text-[#a3e635] ${focusRing}`}
                        >
                          <Plus size={16} />
                        </button>
                      </span>
                    ) : (
                      <>
                        {item.quantity && <span className="sr-only">Dato histórico: {item.quantity}</span>}
                        <button
                          type="button"
                          disabled={pendingMutations.has(item.id)}
                          onClick={() => void remove(item)}
                          aria-label={`Quitar ${item.name} de la lista`}
                          className={`relative hit-area flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-forest-400 hover:text-red-300 ${focusRing}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </li>
                )
              })}
            </ul>
          ) : (
            !error && (
              <div className="py-6">
                <p className="font-medium text-forest-50">{bought.length > 0 ? 'Todo comprado' : 'Lista vacía'}</p>
                <p className="mt-1 text-sm text-forest-300">
                  {bought.length > 0 ? 'Lo que has comprado ya está en tu despensa.' : 'No tienes productos pendientes.'}
                </p>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
                  <Link
                    href="/explore"
                    className={`inline-flex min-h-11 items-center text-sm text-forest-100 underline underline-offset-4 ${focusRing}`}
                  >
                    Explorar productos
                  </Link>
                  <Link
                    href="/meals"
                    className={`inline-flex min-h-11 items-center text-sm text-forest-100 underline underline-offset-4 ${focusRing}`}
                  >
                    Ver recetas
                  </Link>
                  <button
                    type="button"
                    onClick={() => setAdding('manual')}
                    className={`inline-flex min-h-11 items-center text-sm text-forest-100 underline underline-offset-4 ${focusRing}`}
                  >
                    Añadir manualmente
                  </button>
                </div>
              </div>
            )
          )}

          {bought.length > 0 && (
            <section className="mt-6" aria-label="Comprado">
              <div className="mb-1 flex items-center justify-between gap-3">
                <h2 className="text-xs font-semibold tracking-wider text-forest-300 uppercase">
                  Comprado · en tu despensa
                </h2>
                <button
                  type="button"
                  disabled={pendingMutations.size > 0}
                  onClick={() => void clearBought()}
                  aria-label="Quitar los comprados de la lista"
                  className={`shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-forest-300 hover:text-forest-50 ${focusRing}`}
                >
                  Limpiar
                </button>
              </div>
              <ul className="divide-y divide-forest-800">
                {bought.map(item => (
                  <li key={item.id} className="flex min-h-14 items-center gap-2 py-1">
                    <button
                      type="button"
                      aria-disabled={pendingMutations.has(item.id) || undefined}
                      onClick={() => void toggle(item)}
                      aria-label={`Devolver ${item.name} a la lista`}
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${focusRing}`}
                    >
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#a3e635] text-forest-950">
                        <Check size={14} strokeWidth={3} />
                      </span>
                    </button>
                    <span className="min-w-0 flex-1 text-[15px] text-forest-300"><span className="strike">{item.name}</span><NeedAndPackage item={item} /></span>

                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {adding && (
        <AddProductSheet
          target="shopping"
          owned={owned}
          startManual={adding === 'manual'}
          onChanged={refresh}
          onClose={() => setAdding(null)}
        />
      )}
      {toast}
    </main>
  )
}
