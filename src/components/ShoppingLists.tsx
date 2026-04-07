import { useState, useEffect } from 'react'
import {
  getShoppingLists, getShoppingList,
  updateShoppingItem, completeShoppingList, deleteShoppingList
} from '../api'
import type { ShoppingList, ShoppingItem } from '../api'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  RefreshCw, ArrowLeft, Check, X, SkipForward, Undo2, ShoppingCart, CheckCircle2,
  Trash2, Snowflake, Package, Layers, Search, Candy, Sandwich, Baby, Gift,
  BookOpen, UtensilsCrossed, Wheat, Popcorn, CakeSlice, Apple,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import ProductDetail from './ProductDetail'

// ─── Category grouping for shopping lists ────────────────────────────────────

interface CategoryGroup {
  key: string
  label: string
  icon: LucideIcon
  color: string       // tailwind bg class
  textColor: string   // tailwind text class
  match: (item: ShoppingItem) => boolean
  sortOrder: number
}

// Helper: check product name and specific (top-2) subcategories for keyword match
const catMatch = (item: ShoppingItem, keywords: string[]) => {
  // Use only 2 most specific categories (avoid broad parents like "Candy & Snacks")
  const allCats = (item.categories || [item.category || '']).map(c => c.toLowerCase())
  const specificCats = allCats.slice(0, 2)
  const name = item.product_name.toLowerCase()
  return keywords.some(kw => specificCats.some(c => c.includes(kw)) || name.includes(kw))
}

// Match against ALL categories (for broad fallback checks)
const catMatchAll = (item: ShoppingItem, keywords: string[]) => {
  const cats = (item.categories || [item.category || '']).map(c => c.toLowerCase())
  const name = item.product_name.toLowerCase()
  return keywords.some(kw => cats.some(c => c.includes(kw)) || name.includes(kw))
}

const CATEGORY_GROUPS: CategoryGroup[] = [
  // ── Priority order matters: first match wins ──
  {
    key: 'cold', label: 'Kylvaror', icon: Snowflake,
    color: 'bg-blue-50', textColor: 'text-blue-700',
    match: (item) => !!item.is_cold,
    sortOrder: 0,
  },
  {
    key: 'baby', label: 'Barnmat', icon: Baby,
    color: 'bg-purple-50', textColor: 'text-purple-700',
    match: (item) => catMatchAll(item, ['barnmat', 'baby food', 'baby', 'semper']),
    sortOrder: 1,
  },
  {
    key: 'snacks', label: 'Chips & Snacks', icon: Popcorn,
    color: 'bg-orange-50', textColor: 'text-orange-700',
    match: (item) => catMatch(item, [
      'chips', 'potato chips', 'nötter', 'nuts', 'ostkrok', 'cheese doodle',
      'dipmix', 'dip mix', 'dipmixer', 'popcorn',
    ]) || catMatchAll(item, ['olw', 'estrella']),
    sortOrder: 2,
  },
  {
    key: 'chocolate', label: 'Choklad', icon: CakeSlice,
    color: 'bg-amber-50', textColor: 'text-amber-800',
    match: (item) => catMatch(item, ['choklad', 'chocolate', 'bar']),
    sortOrder: 3,
  },
  {
    key: 'candy', label: 'Godis & Lösvikt', icon: Candy,
    color: 'bg-pink-50', textColor: 'text-pink-700',
    match: (item) => catMatch(item, [
      'lösvikt', 'by weight', 'lakrits', 'licorice',
      'tablettask', 'tablet box', 'sockerfri', 'sugerfree',
    ]) || catMatchAll(item, ['candy', 'godis', 'tyrkisk peber']),
    sortOrder: 4,
  },
  {
    key: 'bread', label: 'Bröd & Kakor', icon: Sandwich,
    color: 'bg-yellow-50', textColor: 'text-yellow-800',
    match: (item) => catMatch(item, [
      'bröd', 'bread', 'mjukt bröd', 'soft bread',
      'knäckebröd', 'crispbread',
    ]) || catMatchAll(item, ['pagen', 'wasa']),
    sortOrder: 5,
  },
  {
    key: 'souvenirs', label: 'Souvenirer & Presenter', icon: Gift,
    color: 'bg-indigo-50', textColor: 'text-indigo-700',
    match: (item) => catMatchAll(item, [
      'souvenir', 'present', 'gift', 'dalahäst', 'dala horse',
      'köksart', 'kitchen', 'hushåll', 'household', 'swedish stuff',
      'kläder', 'clothing', 'leksak', 'toy', 'nallar', 'filtar',
      'rolling pin', 'kruskavel', 'towel', 'handduk', 'mugg', 'mug',
      'baking utensil', 'bakredskap',
    ]),
    sortOrder: 6,
  },
  {
    key: 'baking', label: 'Bakning & Gröt', icon: Wheat,
    color: 'bg-lime-50', textColor: 'text-lime-800',
    match: (item) => catMatch(item, [
      'bakning', 'baking', 'mjöl', 'flour', 'müsli', 'muesli',
      'flingor', 'cereal', 'gröt', 'porridge', 'oatmeal',
    ]),
    sortOrder: 7,
  },
  {
    key: 'food', label: 'Mat & Livsmedel', icon: UtensilsCrossed,
    color: 'bg-green-50', textColor: 'text-green-700',
    match: (item) => catMatchAll(item, [
      'food', 'krydda', 'spice', 'dressing', 'sås', 'sauce',
      'soppa', 'soup', 'senap', 'mustard', 'sylt', 'jam', 'ost', 'cheese',
      'köttprodukt', 'meat', 'kaviar', 'fisk', 'fish', 'konserv', 'canned',
      'topping',
    ]),
    sortOrder: 8,
  },
  {
    key: 'drinks', label: 'Dryck', icon: Apple,
    color: 'bg-cyan-50', textColor: 'text-cyan-700',
    match: (item) => catMatchAll(item, [
      'dryck', 'drink', 'saft', 'juice', 'läsk', 'soda',
      'kaffe', 'coffee',
    ]),
    sortOrder: 9,
  },
  {
    key: 'magazines', label: 'Tidningar & Böcker', icon: BookOpen,
    color: 'bg-slate-50', textColor: 'text-slate-700',
    match: (item) => catMatchAll(item, [
      'tidning', 'magazine', 'böcker', 'book', 'cd', 'dvd',
    ]),
    sortOrder: 10,
  },
]

function getCategoryGroup(item: ShoppingItem): CategoryGroup {
  // Cold items always go to Kylvaror
  if (item.is_cold) return CATEGORY_GROUPS[0]

  // Try to match a specific category (skip cold since we checked above)
  for (let i = 1; i < CATEGORY_GROUPS.length; i++) {
    if (CATEGORY_GROUPS[i].match(item)) return CATEGORY_GROUPS[i]
  }

  // Fallback
  return {
    key: 'other', label: 'Övrigt', icon: Package,
    color: 'bg-gray-50', textColor: 'text-gray-700',
    match: () => true, sortOrder: 99,
  }
}

function groupItemsByCategory(items: ShoppingItem[]): { group: CategoryGroup; items: ShoppingItem[] }[] {
  const grouped = new Map<string, { group: CategoryGroup; items: ShoppingItem[] }>()

  for (const item of items) {
    const group = getCategoryGroup(item)
    if (!grouped.has(group.key)) {
      grouped.set(group.key, { group, items: [] })
    }
    grouped.get(group.key)!.items.push(item)
  }

  return Array.from(grouped.values()).sort((a, b) => a.group.sortOrder - b.group.sortOrder)
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function ShoppingLists() {
  const [lists, setLists] = useState<ShoppingList[]>([])
  const [selectedList, setSelectedList] = useState<(ShoppingList & { items: ShoppingItem[] }) | null>(null)
  const [selectedProductSku, setSelectedProductSku] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{open: boolean, action: () => Promise<void>, title: string, description: string}>({
    open: false, action: async () => {}, title: '', description: ''
  })
  const [itemQty, setItemQty] = useState<Record<number, number>>({})
  const [categorized, setCategorized] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadLists()
  }, [])

  const loadLists = async () => {
    setLoading(true)
    try {
      const data = await getShoppingLists()
      setLists(data.lists)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Kunde inte hämta listor')
    } finally {
      setLoading(false)
    }
  }

  const openList = async (listId: number) => {
    setActionLoading('open-' + listId)
    try {
      const list = await getShoppingList(listId)
      setSelectedList(list)
      setItemQty({})
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Kunde inte hämta lista')
    } finally {
      setActionLoading(null)
    }
  }

  const closeList = () => {
    setSelectedList(null)
    setSelectedProductSku(null)
    loadLists()
  }

  const openProduct = (sku: string) => {
    setSelectedProductSku(sku)
  }

  const closeProduct = () => {
    setSelectedProductSku(null)
  }

  const handleDeleteList = () => {
    if (!selectedList) return

    setConfirmDialog({
      open: true,
      title: 'Ta bort inköpslista?',
      description: `Vill du ta bort "${selectedList.name}"? Detta kan inte ångras.`,
      action: async () => {
        setActionLoading('delete')
        try {
          await deleteShoppingList(selectedList.id)
          toast.success('Lista borttagen!')
          closeList()
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Kunde inte ta bort lista')
        } finally {
          setActionLoading(null)
        }
      }
    })
  }

  const handleItemStatus = async (item: ShoppingItem, status: 'bought' | 'skipped' | 'pending', qty?: number) => {
    setActionLoading(`item-${item.id}`)
    try {
      const qtyToBuy = status === 'bought' ? (qty ?? itemQty[item.id] ?? item.qty_needed) : undefined
      await updateShoppingItem(item.id, status, qtyToBuy)
      if (selectedList) {
        await openList(selectedList.id)
      }
      toast.success(
        status === 'bought' ? 'Markerad som köpt' :
        status === 'skipped' ? 'Överhoppad' : 'Ångrat'
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Kunde inte uppdatera')
    } finally {
      setActionLoading(null)
    }
  }

  const handleCompleteList = () => {
    if (!selectedList) return
    
    const pendingItems = selectedList.items.filter(i => i.status === 'pending')
    
    setConfirmDialog({
      open: true,
      title: 'Slutför inköpslista?',
      description: pendingItems.length > 0
        ? `${pendingItems.length} produkter är fortfarande ohanterade. Vill du ändå slutföra listan?`
        : 'Alla produkter är hanterade. Slutför listan?',
      action: async () => {
        setActionLoading('complete')
        try {
          await completeShoppingList(selectedList.id)
          toast.success('Lista slutförd!')
          closeList()
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Kunde inte slutföra lista')
        } finally {
          setActionLoading(null)
        }
      }
    })
  }

  // Loading state
  if (loading && lists.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  // Product detail view
  if (selectedProductSku) {
    return <ProductDetail sku={selectedProductSku} onClose={closeProduct} />
  }

  // Shopping list detail view
  if (selectedList) {
    // Parse date from name if it's auto-generated (e.g., "Inköp 2026-02-04 00:02")
    const dateMatch = selectedList.name.match(/(\d{4}-\d{2}-\d{2})\s*(\d{2}:\d{2})?/)
    const listDate = dateMatch ? new Date(dateMatch[1] + (dateMatch[2] ? 'T' + dateMatch[2] : '')) : new Date(selectedList.created_at)
    const formattedDate = listDate.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })
    const formattedTime = listDate.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })
    
    return (
      <div className="space-y-4 pb-28 lg:pb-20">
        {/* Header row */}
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="ghost"
            onClick={closeList}
            aria-label="Tillbaka"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold truncate">{formattedDate}</h2>
            <p className="text-xs text-[#6c757d]">{formattedTime}</p>
          </div>
          
          <Button
            size="icon"
            variant={categorized ? "default" : "outline"}
            onClick={() => setCategorized(!categorized)}
            aria-label="Kategorisera"
            title="Sortera efter kylvaror/torrvaror"
          >
            <Layers className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            onClick={handleDeleteList}
            disabled={actionLoading === 'delete'}
            aria-label="Ta bort lista"
          >
            {actionLoading === 'delete' ? (
              <Spinner size="sm" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
          <Button
            size="icon"
            variant="outline"
            onClick={() => openList(selectedList.id)}
            disabled={actionLoading?.startsWith('open-')}
            aria-label="Uppdatera"
          >
            <RefreshCw className={`h-4 w-4 ${actionLoading?.startsWith('open-') ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {selectedList.notes && (
          <Card>
            <CardContent className="py-3 text-sm text-[#6c757d]">
              {selectedList.notes}
            </CardContent>
          </Card>
        )}

        {/* Items */}
        <Card>
          <CardContent className="p-0 divide-y divide-[#dee2e6]">
            {selectedList.items.length === 0 ? (
              <div className="py-12 text-center text-[#6c757d]">
                Listan är tom
              </div>
            ) : (
              <>
                {/* Pending items - categorized or flat */}
                {categorized ? (
                  <>
                    {groupItemsByCategory(selectedList.items.filter(i => i.status === 'pending')).map(({ group, items }) => (
                      <div key={group.key}>
                        <div className={`px-3 sm:px-4 py-2 ${group.color} text-sm font-medium ${group.textColor} flex items-center gap-2`}>
                          <group.icon className="h-4 w-4" />
                          {group.label}
                          <span className="ml-auto text-xs opacity-70">{items.length} st</span>
                        </div>
                        {items.map(item => (
                          <ShoppingListItem
                            key={item.id}
                            item={item}
                            itemQty={itemQty}
                            setItemQty={setItemQty}
                            onOpenProduct={openProduct}
                            onItemStatus={handleItemStatus}
                            actionLoading={actionLoading}
                          />
                        ))}
                      </div>
                    ))}
                  </>
                ) : (
                  selectedList.items.filter(i => i.status === 'pending').map(item => (
                    <ShoppingListItem
                      key={item.id}
                      item={item}
                      itemQty={itemQty}
                      setItemQty={setItemQty}
                      onOpenProduct={openProduct}
                      onItemStatus={handleItemStatus}
                      actionLoading={actionLoading}
                    />
                  ))
                )}

                {/* Bought items */}
                {selectedList.items.filter(i => i.status === 'bought').length > 0 && (
                  <div className="px-3 sm:px-4 py-2 bg-[#f8f9fa] text-sm font-medium text-[#6c757d] flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Köpta
                  </div>
                )}
                {selectedList.items.filter(i => i.status === 'bought').map(item => (
                  <CompletedItem
                    key={item.id}
                    item={item}
                    status="bought"
                    onOpenProduct={openProduct}
                    onUndo={() => handleItemStatus(item, 'pending')}
                    actionLoading={actionLoading}
                  />
                ))}

                {/* Skipped items */}
                {selectedList.items.filter(i => i.status === 'skipped').length > 0 && (
                  <div className="px-3 sm:px-4 py-2 bg-[#f8f9fa] text-sm font-medium text-[#6c757d] flex items-center gap-2">
                    <SkipForward className="h-4 w-4 text-gray-500" />
                    Överhoppade
                  </div>
                )}
                {selectedList.items.filter(i => i.status === 'skipped').map(item => (
                  <CompletedItem
                    key={item.id}
                    item={item}
                    status="skipped"
                    onOpenProduct={openProduct}
                    onUndo={() => handleItemStatus(item, 'pending')}
                    actionLoading={actionLoading}
                  />
                ))}
              </>
            )}
          </CardContent>
        </Card>

        {/* Floating action button for Complete List */}
        <div className="fixed bottom-[calc(80px+var(--sab))] lg:bottom-6 left-0 right-0 lg:left-auto lg:right-6 p-4 lg:p-0 lg:w-auto pointer-events-none">
          <Button
            onClick={handleCompleteList}
            disabled={actionLoading === 'complete'}
            size="lg"
            className="w-full lg:w-auto shadow-lg pointer-events-auto"
          >
            {actionLoading === 'complete' ? (
              <Spinner className="h-5 w-5 mr-2" />
            ) : (
              <Check className="h-5 w-5 mr-2" />
            )}
            Slutför lista
          </Button>
        </div>

        {/* Confirmation Dialog */}
        <Dialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog(prev => ({...prev, open}))}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{confirmDialog.title}</DialogTitle>
              <DialogDescription>{confirmDialog.description}</DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button 
                variant="outline" 
                onClick={() => setConfirmDialog(prev => ({...prev, open: false}))}
                className="w-full sm:w-auto"
              >
                Avbryt
              </Button>
              <Button 
                onClick={async () => {
                  await confirmDialog.action()
                  setConfirmDialog(prev => ({...prev, open: false}))
                }}
                disabled={actionLoading === 'complete' || actionLoading === 'delete'}
                className="w-full sm:w-auto"
              >
                {(actionLoading === 'complete' || actionLoading === 'delete') && <Spinner size="sm" className="mr-2" />}
                Bekräfta
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  // Client-side search filtering for list view
  const filteredLists = lists.filter(list => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      (list.name || '').toLowerCase().includes(q) ||
      new Date(list.created_at).toLocaleDateString('sv-SE').includes(q)
    )
  })

  // List view
  return (
    <div className="space-y-4 pb-20 lg:pb-0">
      {/* Toolbar */}
      <div className="flex gap-2 items-center">
        {/* Search field */}
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6c757d]" />
          <Input
            type="text"
            placeholder="Sök listor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Refresh button */}
        <Button 
          size="icon"
          variant="outline" 
          onClick={loadLists} 
          disabled={loading}
          aria-label="Uppdatera"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>

        {/* Count - hidden on mobile */}
        <span className="text-sm text-[#6c757d] hidden sm:inline whitespace-nowrap">
          {filteredLists.length}{filteredLists.length !== lists.length ? `/${lists.length}` : ''} listor
        </span>
      </div>

      {/* List of shopping lists */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredLists.length === 0 ? (
          <Card className="md:col-span-2 lg:col-span-3">
            <CardContent className="py-12 text-center text-[#6c757d]">
              <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{searchQuery ? 'Inga listor matchar sökningen' : 'Inga aktiva inköpslistor'}</p>
              <p className="text-sm mt-2">{searchQuery ? 'Prova ett annat sökord' : 'Skapa en ny eller generera från ordrar'}</p>
            </CardContent>
          </Card>
        ) : (
          filteredLists.map(list => (
            <Card 
              key={list.id} 
              className="cursor-pointer hover:shadow-md transition-shadow touch-manipulation"
              onClick={() => openList(list.id)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center justify-between">
                  {list.name}
                  {actionLoading === 'open-' + list.id && <Spinner size="sm" />}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <Badge variant="secondary">
                    {list.bought_count || 0} / {list.item_count || 0} köpta
                  </Badge>
                  <span className="text-sm text-[#6c757d]">
                    {new Date(list.created_at).toLocaleDateString('sv-SE')}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface ShoppingListItemProps {
  item: ShoppingItem
  itemQty: Record<number, number>
  setItemQty: React.Dispatch<React.SetStateAction<Record<number, number>>>
  onOpenProduct: (sku: string) => void
  onItemStatus: (item: ShoppingItem, status: 'bought' | 'skipped' | 'pending') => void
  actionLoading: string | null
}

function ShoppingListItem({ item, itemQty, setItemQty, onOpenProduct, onItemStatus, actionLoading }: ShoppingListItemProps) {
  const qty = itemQty[item.id] ?? item.qty_needed
  const isLoading = actionLoading === `item-${item.id}`

  return (
    <div className="p-3 sm:p-4">
      {/* Desktop layout */}
      <div className="hidden lg:flex gap-4 items-center">
        <div className="shrink-0 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => onOpenProduct(item.sku)}>
          {item.image_url ? (
            <img src={item.image_url} alt={item.product_name} className="w-16 h-16 object-cover rounded-md bg-white" onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2264%22 height=%2264%22 viewBox=%220 0 64 64%22%3E%3Crect fill=%22%23f3f4f6%22 width=%2264%22 height=%2264%22/%3E%3Ctext x=%2232%22 y=%2234%22 text-anchor=%22middle%22 fill=%22%239ca3af%22 font-size=%2224%22%3E%F0%9F%93%A6%3C/text%3E%3C/svg%3E'; }} />
          ) : (
            <div className="w-16 h-16 rounded-md bg-gray-100 flex items-center justify-center text-2xl">📦</div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="font-medium cursor-pointer hover:text-[#006aa7] transition-colors" onClick={() => onOpenProduct(item.sku)}>{item.product_name}</div>
          <div className="text-sm text-[#6c757d] flex flex-wrap gap-x-3">
            <span className="font-mono">{item.sku}</span>
            {item.weight && <span className="text-[#006aa7]">{item.weight} {item.weight_unit}</span>}
          </div>
          {item.source_order_ids && <div className="text-xs text-[#6c757d] truncate">Ordrar: {JSON.parse(item.source_order_ids || '[]').join(', ')}</div>}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center">
            <button onClick={() => setItemQty(prev => ({ ...prev, [item.id]: Math.max(0, qty - 1) }))} disabled={qty <= 0} className="h-8 w-8 flex items-center justify-center rounded-l-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50" aria-label="Minska antal"><span className="text-base font-bold">−</span></button>
            <div className="h-8 px-3 flex items-center justify-center border-y border-gray-300 bg-gray-50 min-w-[3.5rem]"><span className="text-sm font-semibold">{qty} <span className="text-gray-400 text-xs">/ {item.qty_needed}</span></span></div>
            <button onClick={() => setItemQty(prev => ({ ...prev, [item.id]: Math.min(item.qty_needed, qty + 1) }))} disabled={qty >= item.qty_needed} className="h-8 w-8 flex items-center justify-center rounded-r-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50" aria-label="Öka antal"><span className="text-base font-bold">+</span></button>
          </div>
          <div className="flex gap-1">
            <Button size="sm" variant="success" onClick={() => onItemStatus(item, 'bought')} disabled={isLoading || qty === 0} className="h-8 w-8 p-0" aria-label="Markera som köpt">{isLoading ? <Spinner size="sm" /> : <Check className="h-4 w-4" />}</Button>
            <Button size="sm" variant="destructive" onClick={() => onItemStatus(item, 'skipped')} disabled={isLoading} className="h-8 w-8 p-0" aria-label="Inte med i sändning"><X className="h-4 w-4" /></Button>
          </div>
        </div>
      </div>

      {/* Mobile layout */}
      <div className="lg:hidden space-y-3">
        <div className="flex gap-3">
          <div className="shrink-0 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => onOpenProduct(item.sku)}>
            {item.image_url ? (
              <img src={item.image_url} alt={item.product_name} className="w-14 h-14 object-cover rounded-md bg-white" onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2264%22 height=%2264%22 viewBox=%220 0 64 64%22%3E%3Crect fill=%22%23f3f4f6%22 width=%2264%22 height=%2264%22/%3E%3Ctext x=%2232%22 y=%2234%22 text-anchor=%22middle%22 fill=%22%239ca3af%22 font-size=%2224%22%3E%F0%9F%93%A6%3C/text%3E%3C/svg%3E'; }} />
            ) : (
              <div className="w-14 h-14 rounded-md bg-gray-100 flex items-center justify-center text-2xl">📦</div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm leading-tight cursor-pointer hover:text-[#006aa7] transition-colors" onClick={() => onOpenProduct(item.sku)}>{item.product_name}</div>
            <div className="text-xs text-[#6c757d] mt-0.5 flex flex-wrap gap-x-2">
              <span className="font-mono">{item.sku}</span>
              {item.weight && <span className="text-[#006aa7]">{item.weight}{item.weight_unit}</span>}
            </div>
            {item.source_order_ids && <div className="text-xs text-[#6c757d] mt-0.5 truncate">Ordrar: {JSON.parse(item.source_order_ids || '[]').join(', ')}</div>}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center">
            <button onClick={() => setItemQty(prev => ({ ...prev, [item.id]: Math.max(0, qty - 1) }))} disabled={qty <= 0} className="h-11 w-11 flex items-center justify-center rounded-l-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 touch-manipulation" aria-label="Minska antal"><span className="text-lg font-bold">−</span></button>
            <div className="h-11 px-4 flex items-center justify-center border-y border-gray-300 bg-gray-50 min-w-[4rem]"><span className="text-base font-semibold">{qty} <span className="text-gray-400 text-sm">/ {item.qty_needed}</span></span></div>
            <button onClick={() => setItemQty(prev => ({ ...prev, [item.id]: Math.min(item.qty_needed, qty + 1) }))} disabled={qty >= item.qty_needed} className="h-11 w-11 flex items-center justify-center rounded-r-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 touch-manipulation" aria-label="Öka antal"><span className="text-lg font-bold">+</span></button>
          </div>
          <div className="flex gap-2">
            <Button size="icon" variant="success" onClick={() => onItemStatus(item, 'bought')} disabled={isLoading || qty === 0} aria-label="Markera som köpt">{isLoading ? <Spinner size="sm" /> : <Check className="h-5 w-5" />}</Button>
            <Button size="icon" variant="destructive" onClick={() => onItemStatus(item, 'skipped')} disabled={isLoading} aria-label="Inte med i sändning"><X className="h-5 w-5" /></Button>
          </div>
        </div>
      </div>
    </div>
  )
}

interface CompletedItemProps {
  item: ShoppingItem
  status: 'bought' | 'skipped'
  onOpenProduct: (sku: string) => void
  onUndo: () => void
  actionLoading: string | null
}

function CompletedItem({ item, status, onOpenProduct, onUndo, actionLoading }: CompletedItemProps) {
  const isLoading = actionLoading === `item-${item.id}`
  const isBought = status === 'bought'

  return (
    <div className={`flex gap-3 p-3 sm:p-4 ${isBought ? 'bg-green-50/50' : ''} ${isBought ? 'opacity-75' : 'opacity-50'}`}>
      <div className="shrink-0 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => onOpenProduct(item.sku)}>
        {item.image_url ? (
          <img src={item.image_url} alt={item.product_name} className={`w-12 h-12 sm:w-14 sm:h-14 object-cover rounded-md bg-white ${isBought ? 'opacity-75' : 'opacity-50'}`} onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2264%22 height=%2264%22 viewBox=%220 0 64 64%22%3E%3Crect fill=%22%23f3f4f6%22 width=%2264%22 height=%2264%22/%3E%3Ctext x=%2232%22 y=%2234%22 text-anchor=%22middle%22 fill=%22%239ca3af%22 font-size=%2224%22%3E%F0%9F%93%A6%3C/text%3E%3C/svg%3E'; }} />
        ) : (
          <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-md bg-gray-100 flex items-center justify-center text-xl ${isBought ? 'opacity-75' : 'opacity-50'}`}>📦</div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className={`font-medium text-sm cursor-pointer hover:text-[#006aa7] transition-colors ${isBought ? 'line-through' : ''}`} onClick={() => onOpenProduct(item.sku)}>
          {item.product_name}
        </div>
        <div className="text-xs text-[#6c757d] flex flex-wrap gap-x-3">
          <span className="font-mono">{item.sku}</span>
          {item.weight && <span className="text-[#006aa7]">{item.weight} {item.weight_unit}</span>}
        </div>
      </div>

      <div className="shrink-0 flex flex-col items-end gap-1">
        <Badge variant={isBought ? 'success' : 'secondary'} className="text-xs">
          {isBought ? `${item.qty_bought} / ${item.qty_needed} st` : `${item.qty_needed} st`}
        </Badge>
        <Button
          size="sm"
          variant="ghost"
          onClick={onUndo}
          disabled={isLoading}
          className="h-7 w-7 p-0"
          aria-label="Ångra"
        >
          {isLoading ? <Spinner size="sm" /> : <Undo2 className="h-3 w-3" />}
        </Button>
      </div>
    </div>
  )
}
