'use client'

import { Check, ChevronDown, Minus, Plus, Trash2 } from 'lucide-react'
import type { ShoppingItem } from './page'
import { formatShoppingQuantity } from '@/lib/shoppingList'
import { pluralize } from '@/lib/pluralize'
import { focusRing } from '@/components/ui'

const groups = [
  { label: 'Fruta y verdura', categories: ['fruit', 'vegetables'] },
  { label: 'Carne y pescado', categories: ['meat', 'fish'] },
  { label: 'Refrigerados', categories: ['dairy', 'eggs'] },
  { label: 'Despensa', categories: ['nuts', 'oils', 'sauces', 'drinks'] },
  { label: 'Otros', categories: [] },
] as const

type Props = {
  items: ShoppingItem[]
  grouping: 'flat' | 'zones'
  pendingMutations: Set<string>
  leaving: Set<string>
  onToggle: (item: ShoppingItem) => void
  onChange: (item: ShoppingItem, delta: number) => void
  onRemove: (item: ShoppingItem) => void
  onClearBought: () => void
  onAdd: () => void
}

function NeedAndPackage({ item, checked = false }: { item: ShoppingItem; checked?: boolean }) {
  const needKnown = item.requiredQuantity != null && !!item.requiredUnit
  const packageKnown = item.product?.packageQuantity != null && !!item.product.packageUnit
  const needValue = needKnown ? formatShoppingQuantity(item.requiredQuantity!) : null
  const packageValue = packageKnown ? formatShoppingQuantity(item.product!.packageQuantity!) : null
  const sameNeedAndPackage = needKnown && packageKnown
    && item.requiredQuantity === item.product!.packageQuantity && item.requiredUnit === item.product!.packageUnit
  const purchase = item.purchaseQuantity == null ? null
    : `${formatShoppingQuantity(item.purchaseQuantity)} ${pluralize(item.purchaseQuantity, 'paquete', 'paquetes')}`
  const compactSameSinglePackage = sameNeedAndPackage && item.purchaseQuantity === 1
  const need = needKnown
    ? `${checked ? 'Necesitabas' : 'Necesitas'} ${needValue} ${item.requiredUnit}${compactSameSinglePackage ? ` · ${purchase}` : ''}`
    : !packageKnown ? 'Cantidad y envase por confirmar' : 'Cantidad por confirmar'
  const pack = packageKnown
    ? `Envase ${packageValue} ${item.product!.packageUnit}`
    : needKnown ? 'Envase por confirmar' : null
  const packageAndPurchase = compactSameSinglePackage
    ? null
    : [pack, purchase].filter(Boolean).join(' · ')

  return <span className="block break-words">
    <span className={`block text-sm tabular-nums ${needKnown ? 'text-stone-700' : 'font-medium text-amber-800'}`}>{need}</span>
    {packageAndPurchase && <span className="block text-xs tabular-nums text-stone-500">{packageAndPurchase}</span>}
  </span>
}

function originLabel(item: ShoppingItem) {
  if (item.reason) return item.reason
  if (!item.sourceKey) return null
  try {
    const kind = (JSON.parse(item.sourceKey) as unknown[])[0]
    if (kind === 'weekly-plan') return 'Añadido desde la compra del plan semanal.'
    if (kind === 'recipe' || kind === 'meal') return 'Añadido desde una receta.'
  } catch { /* Keep malformed legacy origin data undisplayed, but intact on the item. */ }
  return null
}

function RowDetails({ item, disabled, onChange, onRemove }: {
  item: ShoppingItem
  disabled: boolean
  onChange: (item: ShoppingItem, delta: number) => void
  onRemove: (item: ShoppingItem) => void
}) {
  const qty = item.purchaseQuantity ?? 0
  const hasControls = !item.checked && (item.sourceKey != null || item.purchaseQuantity != null)
  const origin = originLabel(item)

  return <details className="group/details">
    <summary className={`absolute right-0 top-2 z-10 flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-full text-stone-600 marker:hidden ${focusRing}`}>
      <ChevronDown size={18} aria-hidden="true" className="transition-transform group-open/details:rotate-180 motion-reduce:transition-none" />
      <span className="sr-only">Detalles y origen de {item.name}</span>
    </summary>
    <div className="mb-2 ml-12 border-l-2 border-stone-200 pl-3 text-xs text-stone-600">
      {hasControls && <div className="mt-2 flex min-h-11 items-center gap-2">
        <span className="mr-1 font-medium text-stone-700">Compra</span>
        <button type="button" disabled={disabled} onClick={() => onChange(item, -1)} aria-label={qty <= 1 ? `Quitar ${item.name} de la lista` : `Reducir cantidad de ${item.name}`} className={`flex h-11 w-11 items-center justify-center rounded-full border border-stone-300 bg-white text-stone-800 disabled:opacity-50 ${focusRing}`}>
          {qty <= 1 ? <Trash2 size={16} aria-hidden="true" /> : <Minus size={16} aria-hidden="true" />}
        </button>
        <span className="min-w-8 text-center text-sm font-semibold tabular-nums" aria-live="polite">{item.purchaseQuantity == null ? 'Por elegir' : `${formatShoppingQuantity(item.purchaseQuantity)} ${pluralize(item.purchaseQuantity, 'paquete', 'paquetes')}`}</span>
        <button type="button" disabled={disabled} onClick={() => onChange(item, 1)} aria-label={`Aumentar cantidad de ${item.name}`} className={`flex h-11 w-11 items-center justify-center rounded-full border border-stone-300 bg-white text-forest-800 disabled:opacity-50 ${focusRing}`}>
          <Plus size={16} aria-hidden="true" />
        </button>
      </div>}
      {item.originalIngredientText && <p className="mt-2">En la receta: {item.originalIngredientText}</p>}
      {origin && <p className="mt-2">Origen: {origin}</p>}
      {item.product?.unitPrice != null && <p className="mt-2">Precio catálogo: {item.product.unitPrice.toFixed(2).replace('.', ',')} €</p>}
      {!hasControls && !item.checked && <button type="button" disabled={disabled} onClick={() => onRemove(item)} aria-label={`Quitar ${item.name} de la lista`} className={`mt-2 inline-flex min-h-11 items-center text-xs font-medium text-red-800 underline underline-offset-2 ${focusRing}`}>Quitar de la lista</button>}
    </div>
  </details>
}

function ShoppingRow({ item, pendingMutations, leaving, onToggle, onChange, onRemove }: Props & { item: ShoppingItem }) {
  const checked = item.checked
  return <li className={`relative border-b border-stone-200 ${leaving.has(item.id) ? 'leaving' : ''}`}>
    <div className="flex min-h-[4.5rem] items-center gap-2 py-1 pr-11">
      <button
        type="button"
        aria-pressed={checked}
        aria-disabled={pendingMutations.has(item.id) || undefined}
        onClick={() => onToggle(item)}
        aria-label={checked ? `Devolver ${item.name} a la lista` : `Marcar ${item.name} como comprado`}
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${focusRing}`}
      >
        <span className={`flex h-7 w-7 items-center justify-center rounded-full border-2 ${checked ? 'border-forest-800 bg-forest-800 text-white' : 'border-forest-800 bg-transparent'}`}>
          {checked && <Check size={16} strokeWidth={3} aria-hidden="true" />}
        </span>
      </button>
      <div className="min-w-0 flex-1 py-1">
        <div className="flex items-start gap-2">
          <span className={`min-w-0 flex-1 break-words text-[15px] leading-snug font-semibold ${checked ? 'text-stone-500 line-through decoration-stone-500' : 'text-forest-950'}`}>{item.name}</span>
          {checked && <span className="shrink-0 pt-0.5 text-[11px] font-semibold text-forest-800">Comprado</span>}
        </div>
        <NeedAndPackage item={item} checked={checked} />
      </div>
    </div>
    <RowDetails item={item} disabled={pendingMutations.has(item.id)} onChange={onChange} onRemove={onRemove} />
  </li>
}

export default function ShoppingListExperiment(props: Props) {
  const pending = props.items.filter(item => !item.checked)
  const bought = props.items.filter(item => item.checked)
  const categorized = groups.map(group => ({
    ...group,
    items: props.items.filter(item => group.categories.length
      ? group.categories.includes(item.product?.category as never)
      : !groups.some(candidate => candidate.categories.includes(item.product?.category as never))),
  })).filter(group => group.items.length > 0).map(group => ({
    ...group,
    pendingCount: group.items.filter(item => !item.checked).length,
    boughtCount: group.items.filter(item => item.checked).length,
  }))
  const rows = props.grouping === 'flat'
    ? <ul>{props.items.map(item => <ShoppingRow key={item.id} {...props} item={item} />)}</ul>
    : <div>{categorized.map(group => <section key={group.label} aria-label={`${group.label}: ${group.pendingCount} pendientes, ${group.boughtCount} comprados`}>
      <h2 className="flex min-h-10 items-end justify-between border-b border-stone-300 pb-1 text-xs font-semibold uppercase tracking-wide text-stone-600">
        <span>{group.label}</span><span className="normal-case tracking-normal tabular-nums">{group.pendingCount} pendientes · {group.boughtCount} comprados</span>
      </h2>
      <ul>{group.items.map(item => <ShoppingRow key={item.id} {...props} item={item} />)}</ul>
    </section>)}</div>

  return <>
    <header className="mb-3 flex items-end justify-between gap-3">
      <div>
        <h1 className="text-xl min-[360px]:text-2xl font-semibold text-forest-950">Lista de compra</h1>
        <p aria-live="polite" className="mt-1 text-sm text-stone-600 tabular-nums">{pending.length} {pluralize(pending.length, 'pendiente', 'pendientes')} · {bought.length} {pluralize(bought.length, 'comprado', 'comprados')}</p>
      </div>
      <button type="button" onClick={props.onAdd} aria-label="Añadir a la lista" className={`flex h-12 shrink-0 items-center rounded-full bg-[#a3e635] px-4 text-sm font-semibold text-forest-950 ${focusRing}`}>
        <Plus size={16} strokeWidth={3} aria-hidden="true" /><span className="ml-1.5">Añadir</span>
      </button>
    </header>

    {pending.length === 0 && bought.length > 0 && <p className="mb-1 text-sm font-semibold text-forest-800">Todo comprado · los productos siguen en su sitio</p>}
    {props.items.length > 0 ? rows : <div className="py-5 text-forest-950"><p className="font-semibold">Lista vacía</p><p className="mt-1 text-sm text-stone-600">No tienes productos pendientes.</p></div>}
    {bought.length > 0 && <button type="button" disabled={props.pendingMutations.size > 0} onClick={props.onClearBought} aria-label="Quitar los productos comprados de la lista" className={`mb-2 mt-2 inline-flex min-h-11 items-center text-xs font-semibold text-stone-600 underline underline-offset-2 disabled:opacity-50 ${focusRing}`}>Limpiar {bought.length} comprados</button>}
  </>
}
