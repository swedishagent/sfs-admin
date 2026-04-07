import { useState, useEffect } from 'react'
import { 
  getOrders, getOrderDetail, updateOrderItemStatus, updateOrderStatus,
  generateShoppingListFromOrders, getEmailsByAddress, getEmailDetail,
  getOrderShipments, getShippingLabel, getShippingDocument
} from '../api'
import type { Order, OrderDetail, OrderItem, EmailSummary, EmailDetail, OrderShipment } from '../api'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  RefreshCw, ShoppingCart, ArrowLeft, Check, X, Undo2, Package,
  MapPin, Mail, Phone, Truck, Loader2, Clock, CheckCircle2,
  PackageX, Inbox, Send, ChevronDown, ChevronUp, Search, SlidersHorizontal,
  FileText, Download
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import ProductDetail from './ProductDetail'
import Shipping from './Shipping'

const fmtCurrency = (amount: number, currency?: string, decimals = 0) => {
  const sym = currency === 'EUR' ? '€' : 'kr'
  return `${amount.toFixed(decimals)} ${sym}`
}

// Tracking status badge helper
function getTrackingStatusBadge(status: string | null) {
  switch (status) {
    case 'delivered':
      return <Badge variant="success" className="text-xs py-0"><CheckCircle2 className="h-3 w-3 mr-1" />Levererad</Badge>
    case 'in_transit':
      return <Badge variant="default" className="text-xs py-0"><Truck className="h-3 w-3 mr-1" />Under transport</Badge>
    case 'access_point':
      return <Badge variant="warning" className="text-xs py-0"><MapPin className="h-3 w-3 mr-1" />Upphämtning</Badge>
    case 'exception':
      return <Badge variant="destructive" className="text-xs py-0">Problem</Badge>
    default:
      return status ? <Badge variant="secondary" className="text-xs py-0">{status}</Badge> : null
  }
}

// Integrated shipping card for order detail - combines Magento shipping info + tracking
function ShippingCard({ order, onOpenShipment }: {
  order: OrderDetail['order']
  onOpenShipment?: (trackNumber: string) => void
}) {
  const [shipments, setShipments] = useState<OrderShipment[]>([])
  const [showDocs, setShowDocs] = useState(false)
  const [selectedTrack, setSelectedTrack] = useState<string | null>(null)
  const [labelData, setLabelData] = useState<{ base64: string; format: string } | null>(null)
  const [invoiceData, setInvoiceData] = useState<{ base64: string; format: string } | null>(null)
  const [loadingDocs, setLoadingDocs] = useState(false)

  useEffect(() => {
    if (!order.order_id) return
    ;(async () => {
      try {
        const data = await getOrderShipments(order.order_id)
        setShipments(data.shipments)
      } catch {
        // Silently fail
      }
    })()
  }, [order.order_id])

  const loadDocs = async (trackNumber: string) => {
    setLoadingDocs(true)
    setLabelData(null)
    setInvoiceData(null)
    try {
      const label = await getShippingLabel(trackNumber)
      setLabelData(label)
    } catch { /* ignore */ }
    try {
      const invoice = await getShippingDocument(trackNumber, 'commercial_invoice')
      setInvoiceData(invoice)
    } catch { /* ignore */ }
    setLoadingDocs(false)
  }

  const openDocs = (trackNumber: string) => {
    setSelectedTrack(trackNumber)
    setShowDocs(true)
    loadDocs(trackNumber)
  }

  const hasShipments = shipments.length > 0
  const firstTrack = shipments[0]?.track_number

  return (
    <>
    <Card className={hasShipments ? 'cursor-pointer hover:shadow-md hover:border-[#006aa7] transition-all' : ''}
      onClick={() => hasShipments && firstTrack && onOpenShipment?.(firstTrack)}
    >
      <CardHeader className="pb-2 pt-3 sm:pt-6 px-3 sm:px-6">
        <CardTitle className="text-xs sm:text-sm font-medium text-[#6c757d] flex items-center gap-2">
          <Truck className="h-3 w-3 sm:h-4 sm:w-4" /> Frakt
          {hasShipments && <span className="h-3 w-3 ml-auto text-gray-400">→</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
        <p className="text-xs sm:text-sm">{order.shipping_description}</p>
        <div className="flex items-baseline gap-3 flex-wrap">
          <div>
            <p className="text-xs text-[#6c757d]">Kund betalade:</p>
            <p className="font-semibold text-sm sm:text-base">{fmtCurrency(order.shipping_amount, order.currency)}</p>
          </div>
          {order.ups_total_cost !== undefined && order.ups_total_cost !== null && (
            <>
              <div>
                <p className="text-xs text-[#6c757d]">UPS-kostnad:</p>
                <p className="font-semibold text-sm sm:text-base">{order.ups_total_cost.toFixed(0)} kr</p>
              </div>
              <div>
                <p className="text-xs text-[#6c757d]">Marginal:</p>
                <p className={`font-semibold text-sm sm:text-base ${
                  (order.ups_diff ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {(order.ups_diff ?? 0) >= 0 ? '+' : ''}
                  {(order.ups_diff ?? 0).toFixed(0)} kr
                  {order.ups_margin_pct && (
                    <span className="text-xs ml-1">({order.ups_margin_pct.toFixed(1)}%)</span>
                  )}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Tracking info integrated */}
        {hasShipments && (
          <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
            {shipments.map((s, i) => (
              <div key={s.shipment_id || i} className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-sm font-bold text-[#006aa7]">
                  {s.track_number}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={(e) => { e.stopPropagation(); openDocs(s.track_number) }}
                >
                  <FileText className="h-3 w-3 mr-1" /> Dokument
                </Button>
                {getTrackingStatusBadge(s.tracking_status)}
                {s.delivery_date && (
                  <span className="text-xs text-[#6c757d]">
                    {s.delivery_date.length === 8
                      ? `${s.delivery_date.slice(0,4)}-${s.delivery_date.slice(4,6)}-${s.delivery_date.slice(6,8)}`
                      : s.delivery_date}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>

    {/* Documents Dialog */}
    <Dialog open={showDocs} onOpenChange={setShowDocs}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Fraktdokument</DialogTitle>
          <DialogDescription>Tracking: {selectedTrack}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {loadingDocs ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-[#006aa7]" />
            </div>
          ) : (
            <>
              {labelData && (
                <div>
                  <p className="text-sm font-medium mb-2">Fraktsedel</p>
                  <div className="border rounded-lg overflow-hidden bg-white">
                    <img
                      src={`data:image/${labelData.format};base64,${labelData.base64}`}
                      alt="Fraktsedel"
                      className="max-w-full h-auto"
                    />
                  </div>
                  <a
                    href={`data:image/${labelData.format};base64,${labelData.base64}`}
                    download={`label_${selectedTrack}.${labelData.format}`}
                    className="inline-flex items-center gap-1 text-sm text-[#006aa7] hover:underline mt-2"
                  >
                    <Download className="h-4 w-4" /> Ladda ner
                  </a>
                </div>
              )}
              {invoiceData && (
                <div>
                  <p className="text-sm font-medium mb-2">Tullfaktura</p>
                  <div className="border rounded-lg overflow-hidden bg-white">
                    <iframe
                      src={`data:application/pdf;base64,${invoiceData.base64}`}
                      className="w-full" style={{ height: 400 }}
                      title="Tullfaktura"
                    />
                  </div>
                  <a
                    href={`data:application/pdf;base64,${invoiceData.base64}`}
                    download={`tullfaktura_${selectedTrack}.pdf`}
                    className="inline-flex items-center gap-1 text-sm text-[#006aa7] hover:underline mt-2"
                  >
                    <Download className="h-4 w-4" /> Ladda ner
                  </a>
                </div>
              )}
              {!labelData && !invoiceData && (
                <p className="text-sm text-[#6c757d]">Inga dokument tillgängliga</p>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
    </>
  )
}

// EmailSection component for order detail view
function EmailSection({ customerEmail }: { customerEmail: string }) {
  const [emails, setEmails] = useState<EmailSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedUid, setExpandedUid] = useState<string | null>(null)
  const [emailDetail, setEmailDetail] = useState<EmailDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  useEffect(() => {
    if (!customerEmail) { setLoading(false); return }
    (async () => {
      try {
        const data = await getEmailsByAddress(customerEmail, 10)
        setEmails(data.emails)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Kunde inte hämta mail')
      } finally {
        setLoading(false)
      }
    })()
  }, [customerEmail])

  const handleToggleEmail = async (uid: string) => {
    if (expandedUid === uid) { setExpandedUid(null); setEmailDetail(null); return }
    setExpandedUid(uid)
    setLoadingDetail(true)
    try {
      const detail = await getEmailDetail(uid)
      setEmailDetail(detail)
    } catch { toast.error('Kunde inte hämta mailet') }
    finally { setLoadingDetail(false) }
  }

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    } catch { return dateStr }
  }

  if (!customerEmail) return null

  return (
    <Card style={{ minWidth: 0, maxWidth: '100%', overflow: 'hidden' }}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Mail className="h-4 w-4" /> E-postkorrespondens
        </CardTitle>
      </CardHeader>
      <CardContent style={{ minWidth: 0, maxWidth: '100%', overflow: 'hidden' }}>
        {loading ? (
          <div className="flex items-center justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-[#006aa7]" /></div>
        ) : error ? (
          <p className="text-sm text-red-600 py-2">{error}</p>
        ) : emails.length === 0 ? (
          <p className="text-sm text-[#6c757d] py-2">Inga mail från denna kund</p>
        ) : (
          <div style={{ minWidth: 0, maxWidth: '100%' }}>
            {emails.map(email => (
              <div key={email.uid} className="border rounded-lg mb-2" style={{ minWidth: 0, maxWidth: '100%', overflow: 'hidden' }}>
                <button onClick={() => handleToggleEmail(email.uid)} className="w-full text-left p-3 hover:bg-gray-50" style={{ minWidth: 0, maxWidth: '100%', overflow: 'hidden' }}>
                  <div className="flex items-start gap-2" style={{ minWidth: 0, maxWidth: '100%' }}>
                    <div className={`shrink-0 mt-0.5 ${email.is_incoming ? 'text-blue-600' : 'text-green-600'}`}>
                      {email.is_incoming ? <Inbox className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                      <div style={{ minWidth: 0, overflow: 'hidden', marginBottom: 2 }}>
                        <span className={`text-sm font-medium ${!email.is_read ? 'text-[#006aa7]' : ''}`} style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email.subject}</span>
                      </div>
                      <p className="text-xs text-[#6c757d]" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email.is_incoming ? 'Från kund' : 'Till kund'} • {formatDate(email.date)}</p>
                    </div>
                    <div className="shrink-0 text-[#6c757d]">{expandedUid === email.uid ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</div>
                  </div>
                </button>
                {expandedUid === email.uid && (
                  <div className="border-t bg-gray-50 p-3" style={{ minWidth: 0, maxWidth: '100%', overflow: 'hidden' }}>
                    {loadingDetail ? (
                      <div className="flex items-center justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-[#006aa7]" /></div>
                    ) : emailDetail ? (
                      <div style={{ minWidth: 0, maxWidth: '100%', overflow: 'hidden' }}>
                        <div className="text-xs text-[#6c757d] space-y-0.5 mb-2">
                          <p className="truncate"><strong>Från:</strong> {emailDetail.from}</p>
                          <p className="truncate"><strong>Till:</strong> {emailDetail.to}</p>
                          <p><strong>Datum:</strong> {formatDate(emailDetail.date)}</p>
                        </div>
                        <div className="border-t pt-2" style={{ minWidth: 0, maxWidth: '100%', overflowX: 'auto' }}>
                          {emailDetail.is_html ? (
                            <iframe srcDoc={emailDetail.body} title="E-post" sandbox="allow-same-origin" style={{ width: '100%', minWidth: 0, minHeight: 150, maxHeight: 400, border: 0, display: 'block' }} />
                          ) : (
                            <pre style={{ fontSize: '0.875rem', whiteSpace: 'pre-wrap', fontFamily: 'inherit', color: '#1f2937', maxHeight: 256, overflowY: 'auto', overflowWrap: 'break-word', wordBreak: 'break-word', minWidth: 0, maxWidth: '100%' }}>
                              {emailDetail.body || '(tomt meddelande)'}
                            </pre>
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface OrdersProps {
  openOrderId?: string | null
  onOrderOpened?: () => void
  onOpenShipment?: (trackNumber: string) => void
}

export default function Orders({ openOrderId, onOrderOpened, onOpenShipment }: OrdersProps = {}) {
  const [orders, setOrders] = useState<Order[]>([])
  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null)
  const [selectedProductSku, setSelectedProductSku] = useState<string | null>(null)
  const [shippingOrderId, setShippingOrderId] = useState<string | null>(null)
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [confirmDialog, setConfirmDialog] = useState<{open: boolean, action: () => Promise<void>, title: string, description: string}>({
    open: false, action: async () => {}, title: '', description: ''
  })
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilter, setShowFilter] = useState(false)
  const [daysFilter, setDaysFilter] = useState('0')

  useEffect(() => {
    loadOrders()
  }, [statusFilter, daysFilter])

  // Handle external order open request
  useEffect(() => {
    if (openOrderId && !selectedOrder) {
      (async () => {
        setActionLoading('open-' + openOrderId)
        try {
          const detail = await getOrderDetail(openOrderId)
          setSelectedOrder(detail)
          onOrderOpened?.()
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Kunde inte hämta order')
          onOrderOpened?.()
        } finally {
          setActionLoading(null)
        }
      })()
    }
  }, [openOrderId])

  const loadOrders = async () => {
    setLoading(true)
    try {
      const data = await getOrders(statusFilter, parseInt(daysFilter))
      setOrders(data.orders)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Kunde inte hämta ordrar')
    } finally {
      setLoading(false)
    }
  }

  const openOrder = async (orderId: string) => {
    setActionLoading('open-' + orderId)
    try {
      const detail = await getOrderDetail(orderId)
      setSelectedOrder(detail)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Kunde inte hämta order')
    } finally {
      setActionLoading(null)
    }
  }

  const closeOrder = () => {
    setSelectedOrder(null)
    setSelectedProductSku(null)
  }

  const openProduct = (sku: string) => {
    setSelectedProductSku(sku)
  }

  const closeProduct = () => {
    setSelectedProductSku(null)
  }

  const toggleOrderSelection = (orderId: string) => {
    const newSet = new Set(selectedOrderIds)
    if (newSet.has(orderId)) {
      newSet.delete(orderId)
    } else {
      newSet.add(orderId)
    }
    setSelectedOrderIds(newSet)
  }

  const handleGenerateShoppingList = async () => {
    if (selectedOrderIds.size === 0) {
      toast.error('Välj minst en order')
      return
    }
    setActionLoading('generate')
    try {
      const result = await generateShoppingListFromOrders(Array.from(selectedOrderIds))
      toast.success(`Skapade inköpslista "${result.name}" med ${result.item_count} produkter`)
      setSelectedOrderIds(new Set())
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Kunde inte skapa lista')
    } finally {
      setActionLoading(null)
    }
  }

  const handleItemStatus = async (item: OrderItem, status: 'packed' | 'missing' | 'pending') => {
    if (!selectedOrder) return

    // Optimistically update local state
    const updatedItems = selectedOrder.items.map(i =>
      i.item_id === item.item_id
        ? { ...i, packing_status: status, qty_packed: status === 'packed' ? item.qty_ordered : 0, qty_missing: status === 'missing' ? item.qty_ordered : 0 }
        : i
    )
    setSelectedOrder({ ...selectedOrder, items: updatedItems })

    setActionLoading(`item-${item.item_id}`)
    try {
      await updateOrderItemStatus(selectedOrder.order.order_id, item.item_id, {
        sku: item.sku,
        product_name: item.name,
        qty_ordered: item.qty_ordered,
        unit_price: item.price,
        status,
        qty_packed: status === 'packed' ? item.qty_ordered : 0,
        qty_missing: status === 'missing' ? item.qty_ordered : 0
      })
      toast.success(status === 'pending' ? 'Ångrat' : status === 'packed' ? 'Markerad som packad' : 'Markerad som saknas')
    } catch (err) {
      // Revert on error
      setSelectedOrder(selectedOrder)
      toast.error(err instanceof Error ? err.message : 'Kunde inte uppdatera')
    } finally {
      setActionLoading(null)
    }
  }

  const handleOrderPacked = () => {
    if (!selectedOrder) return
    
    const isPacked = selectedOrder.order.packing_status === 'packed'
    
    if (isPacked) {
      // Unmark as packed
      setConfirmDialog({
        open: true,
        title: 'Ångra packad status?',
        description: 'Ordern kommer markeras som ej packad och återgå till processing.',
        action: async () => {
          setActionLoading('order-packed')
          try {
            await updateOrderStatus(selectedOrder.order.order_id, 'pending')
            toast.success('Order avmarkerad som packad')
            closeOrder()
            loadOrders()
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Kunde inte uppdatera')
          } finally {
            setActionLoading(null)
          }
        }
      })
    } else {
      // Mark as packed
      const unhandledItems = selectedOrder.items.filter(i => i.packing_status === 'pending')
      
      setConfirmDialog({
        open: true,
        title: 'Markera order som packad?',
        description: unhandledItems.length > 0 
          ? `${unhandledItems.length} produkter är fortfarande ohanterade. Vill du markera hela ordern som packad?`
          : `Alla ${selectedOrder.items.length} produkter är hanterade. Markera ordern som packad?`,
        action: async () => {
          setActionLoading('order-packed')
          try {
            await updateOrderStatus(selectedOrder.order.order_id, 'packed')
            toast.success('Order markerad som packad')
            closeOrder()
            loadOrders()
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Kunde inte uppdatera')
          } finally {
            setActionLoading(null)
          }
        }
      })
    }
  }

  const getItemStatusBadge = (status: string) => {
    switch (status) {
      case 'packed': return (
        <Badge variant="success" className="gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Packad
        </Badge>
      )
      case 'missing': return (
        <Badge variant="destructive" className="gap-1">
          <PackageX className="h-3 w-3" />
          Saknas
        </Badge>
      )
      default: return (
        <Badge variant="secondary" className="gap-1">
          <Clock className="h-3 w-3" />
          Väntar
        </Badge>
      )
    }
  }

  const getOrderStatusBadge = (order: Order) => {
    // Order status always takes priority
    switch (order.status) {
      case 'processing':
        // For processing orders, show packing/shipping status
        if (order.packing_status === 'shipped') {
          return <Badge className="text-xs py-0 bg-blue-600"><Truck className="h-3 w-3 mr-1" />Skickad</Badge>
        }
        if (order.packing_status === 'packed') {
          return <Badge variant="success" className="text-xs py-0"><CheckCircle2 className="h-3 w-3 mr-1" />Packad</Badge>
        }
        return <Badge variant="default" className="text-xs py-0"><Package className="h-3 w-3 mr-1" />Processing</Badge>
      case 'partly_purchased':
        return <Badge variant="warning" className="text-xs py-0"><Clock className="h-3 w-3 mr-1" />Behandlar</Badge>
      case 'pending_payment':
        return <Badge variant="secondary" className="text-xs py-0"><Clock className="h-3 w-3 mr-1" />Väntar betalning</Badge>
      case 'holded':
        return <Badge variant="secondary" className="text-xs py-0"><Clock className="h-3 w-3 mr-1" />Pausad</Badge>
      case 'complete':
        return <Badge variant="success" className="text-xs py-0"><CheckCircle2 className="h-3 w-3 mr-1" />Complete</Badge>
      case 'canceled':
        return <Badge variant="destructive" className="text-xs py-0"><X className="h-3 w-3 mr-1" />Canceled</Badge>
      default:
        return <Badge variant="secondary" className="text-xs py-0">{order.status}</Badge>
    }
  }

  // Client-side search filtering
  const filteredOrders = orders.filter(order => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      order.order_id.toLowerCase().includes(q) ||
      order.customer_name.toLowerCase().includes(q) ||
      order.customer_email.toLowerCase().includes(q) ||
      (order.shipping_address?.country || '').toLowerCase().includes(q)
    )
  })

  if (loading && orders.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#006aa7]" />
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-20 lg:pb-0">
      {/* Toolbar - only show on order list */}
      {!selectedOrder && !selectedProductSku && !shippingOrderId && (
        <div className="space-y-2">
          <div className="flex gap-2 items-center">
            {/* Search field */}
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6c757d]" />
              <Input
                type="text"
                placeholder="Sök ordrar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Filter button */}
            <Button
              size="icon"
              variant={showFilter ? 'default' : 'outline'}
              onClick={() => setShowFilter(!showFilter)}
              aria-label="Filter"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </Button>

            {/* Refresh button */}
            <Button
              size="icon"
              variant="outline"
              onClick={loadOrders}
              disabled={loading}
              aria-label="Uppdatera"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>

            {/* Count - hidden on mobile */}
            <span className="text-sm text-[#6c757d] hidden sm:inline whitespace-nowrap">
              {filteredOrders.length}{filteredOrders.length !== orders.length ? `/${orders.length}` : ''} ordrar
            </span>
          </div>

          {/* Filter dropdown */}
          {showFilter && (
            <div className="flex flex-wrap gap-2 items-center">
              <Select value={daysFilter} onValueChange={setDaysFilter}>
                <SelectTrigger className="w-[140px] sm:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Alla ordrar</SelectItem>
                  <SelectItem value="7">Senaste 7 dagar</SelectItem>
                  <SelectItem value="14">Senaste 14 dagar</SelectItem>
                  <SelectItem value="30">Senaste 30 dagar</SelectItem>
                  <SelectItem value="60">Senaste 60 dagar</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="flex-1 sm:flex-none sm:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alla statusar</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="packed">📦 Packade</SelectItem>
                  <SelectItem value="shipped">🚛 Skickade</SelectItem>
                  <SelectItem value="partly_purchased">Behandlar produkter</SelectItem>
                  <SelectItem value="pending_payment">Väntar på betalning</SelectItem>
                  <SelectItem value="holded">Pausad</SelectItem>
                  <SelectItem value="complete">Complete</SelectItem>
                  <SelectItem value="canceled">Canceled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Shopping list generation button */}
          {selectedOrderIds.size > 0 && (
            <div className="flex gap-2 items-center">
              <Button
                size="sm"
                onClick={handleGenerateShoppingList}
                disabled={actionLoading === 'generate'}
                className="shrink-0"
              >
                {actionLoading === 'generate' ? (
                  <Loader2 className="h-4 w-4 sm:mr-2 animate-spin" />
                ) : (
                  <ShoppingCart className="h-4 w-4 sm:mr-2" />
                )}
                <span className="hidden sm:inline">Skapa lista ({selectedOrderIds.size})</span>
                <span className="sm:hidden">({selectedOrderIds.size})</span>
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Order list */}
      {!selectedOrder && !selectedProductSku && !shippingOrderId && (
        <div className="space-y-2">
          {filteredOrders.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-[#6c757d]">{searchQuery ? 'Inga ordrar matchar sökningen' : 'Inga ordrar hittades'}</p>
                <p className="text-sm text-[#6c757d] mt-1">{searchQuery ? 'Prova ett annat sökord' : 'Prova ett annat statusfilter'}</p>
              </CardContent>
            </Card>
          ) : (
            filteredOrders.map(order => {
              const isShippedOrder = order.packing_status === 'shipped' && order.status === 'processing'
              const isPackedOrder = order.packing_status === 'packed' && order.status === 'processing'
              const isCanceled = order.status === 'canceled'
              
              return (
                <Card
                  key={order.order_id}
                  className={`cursor-pointer transition-all hover:shadow-md active:scale-[0.99] touch-manipulation ${
                    selectedOrderIds.has(order.order_id) ? 'ring-2 ring-[#006aa7]' : ''
                  } ${isShippedOrder ? 'bg-blue-50/50 border-blue-300' : ''
                  } ${isPackedOrder && !isShippedOrder ? 'bg-green-50/50 border-green-300' : ''
                  } ${isCanceled ? 'bg-red-50/50 border-red-300' : ''}`}
                >
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-start gap-3">
                      {/* Checkbox */}
                      <div onClick={(e) => e.stopPropagation()} className="pt-1 shrink-0">
                        <Checkbox 
                          checked={selectedOrderIds.has(order.order_id)}
                          onCheckedChange={() => toggleOrderSelection(order.order_id)}
                        />
                      </div>

                      {/* Order content */}
                      <div 
                        className="flex-1 min-w-0"
                        onClick={() => openOrder(order.order_id)}
                      >
                        {/* Header row: Order ID + date */}
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-[#006aa7]">#{order.order_id}</span>
                            {order.in_shopping_list && (
                              <ShoppingCart className="h-4 w-4 text-[#006aa7]" />
                            )}
                          </div>
                          <span className="text-sm text-[#6c757d]">
                            {new Date(order.created_at).toLocaleDateString('sv-SE')}
                          </span>
                        </div>

                        {/* Customer name */}
                        <p className="font-medium text-sm truncate mb-1">{order.customer_name}</p>

                        {/* Meta row: qty, country, total + status badge */}
                        <div className="text-xs text-[#6c757d] flex items-center gap-x-2 flex-wrap">
                          <span>{order.qty_ordered} st</span>
                          <span>•</span>
                          <span>{order.shipping_address.country}</span>
                          <span>•</span>
                          <span className="font-medium text-[#343a40]">{fmtCurrency(order.grand_total, order.currency)}</span>
                          <span className="flex-1" />
                          {getOrderStatusBadge(order)}
                        </div>
                      </div>

                      {/* Loading indicator */}
                      {actionLoading === 'open-' + order.order_id && (
                        <Loader2 className="h-5 w-5 animate-spin text-[#006aa7] shrink-0" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      )}

      {/* Shipping View */}
      {shippingOrderId ? (
        <Shipping
          orderId={shippingOrderId}
          onClose={() => setShippingOrderId(null)}
          onShipped={() => loadOrders()}
        />
      ) : selectedProductSku ? (
        <ProductDetail 
          sku={selectedProductSku} 
          onClose={closeProduct} 
        />
      ) : selectedOrder ? (
        /* Order detail */
        <div className="space-y-4 pb-20 lg:pb-0" style={{ minWidth: 0, maxWidth: '100%', overflow: 'hidden' }}>
          {/* Header row - matching ShoppingLists pattern */}
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              onClick={closeOrder}
              aria-label="Tillbaka"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold truncate">Order #{selectedOrder.order.order_id}</h2>
              <p className="text-xs text-[#6c757d]">{new Date(selectedOrder.order.created_at).toLocaleDateString('sv-SE')}</p>
            </div>
            
            <Button
              size="icon"
              variant="outline"
              onClick={loadOrders}
              disabled={loading}
              aria-label="Uppdatera"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {/* Order info cards */}
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="pb-2 pt-3 sm:pt-6 px-3 sm:px-6">
                <CardTitle className="text-xs sm:text-sm font-medium text-[#6c757d] flex items-center gap-2">
                  <Mail className="h-3 w-3 sm:h-4 sm:w-4" /> Kund
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                <p className="font-medium text-sm sm:text-base">{selectedOrder.order.customer_name}</p>
                <p className="text-xs sm:text-sm text-[#6c757d] truncate">{selectedOrder.order.customer_email}</p>
              </CardContent>
            </Card>
            
            <Card className="sm:col-span-2 lg:col-span-1">
              <CardHeader className="pb-2 pt-3 sm:pt-6 px-3 sm:px-6">
                <CardTitle className="text-xs sm:text-sm font-medium text-[#6c757d] flex items-center gap-2">
                  <MapPin className="h-3 w-3 sm:h-4 sm:w-4" /> Leveransadress
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs sm:text-sm px-3 sm:px-6 pb-3 sm:pb-6">
                <p className="font-medium">{selectedOrder.order.shipping_address.name}</p>
                <p>{selectedOrder.order.shipping_address.street}</p>
                <p>{selectedOrder.order.shipping_address.postcode} {selectedOrder.order.shipping_address.city}</p>
                <p>{selectedOrder.order.shipping_address.country}</p>
                {selectedOrder.order.shipping_address.telephone && (
                  <p className="flex items-center gap-1 mt-1 text-[#6c757d]">
                    <Phone className="h-3 w-3" />
                    {selectedOrder.order.shipping_address.telephone}
                  </p>
                )}
              </CardContent>
            </Card>
            
            <ShippingCard order={selectedOrder.order} onOpenShipment={onOpenShipment} />
          </div>

          {/* Products */}
          <Card>
            <CardHeader>
              <CardTitle>Produkter ({selectedOrder.items.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {selectedOrder.items.map(item => (
                <div 
                  key={item.item_id} 
                  className={`flex gap-3 p-3 rounded-lg ${
                    item.packing_status === 'packed' ? 'bg-green-50 border border-green-200' :
                    item.packing_status === 'missing' ? 'bg-red-50 border border-red-200' : 'bg-[#f8f9fa] border border-gray-100'
                  }`}
                >
                  {/* Product Image */}
                  <div 
                    className="shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => openProduct(item.sku)}
                  >
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-md bg-white"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2264%22 height=%2264%22 viewBox=%220 0 64 64%22%3E%3Crect fill=%22%23f3f4f6%22 width=%2264%22 height=%2264%22/%3E%3Ctext x=%2232%22 y=%2234%22 text-anchor=%22middle%22 fill=%22%239ca3af%22 font-size=%2224%22%3E%F0%9F%93%A6%3C/text%3E%3C/svg%3E';
                        }}
                      />
                    ) : (
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-md bg-gray-100 flex items-center justify-center text-2xl">
                        📦
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    {/* Title */}
                    <div 
                      className="font-medium text-sm sm:text-base leading-tight mb-1 cursor-pointer hover:text-[#006aa7] transition-colors"
                      onClick={() => openProduct(item.sku)}
                    >
                      {item.name}
                    </div>
                    
                    {/* Details */}
                    <div className="text-xs sm:text-sm text-[#6c757d] space-y-0.5">
                      <div className="font-mono text-xs">{item.sku}</div>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                        <span>{item.qty_ordered} st</span>
                        <span>×</span>
                        <span>{fmtCurrency(item.price, selectedOrder.order.currency, 2)}</span>
                        {item.discount > 0 && item.qty_ordered > 0 && (
                          <span className="text-green-600">-{fmtCurrency(item.discount / item.qty_ordered, selectedOrder.order.currency, 2)}</span>
                        )}
                      </div>
                      <div className="font-medium text-[#006aa7]">
                        = {fmtCurrency(item.row_total, selectedOrder.order.currency, 2)}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="shrink-0 flex flex-col sm:flex-row items-end sm:items-center gap-2">
                    {item.packing_status === 'pending' ? (
                      <>
                        <Button
                          size="sm"
                          variant="success"
                          onClick={() => handleItemStatus(item, 'packed')}
                          disabled={actionLoading === `item-${item.item_id}`}
                          className="h-9 w-9 sm:h-9 sm:w-auto sm:px-3 p-0"
                          aria-label="Markera som packad"
                        >
                          {actionLoading === `item-${item.item_id}` ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Check className="h-4 w-4" />
                              <span className="hidden sm:inline ml-1">Packad</span>
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleItemStatus(item, 'missing')}
                          disabled={actionLoading === `item-${item.item_id}`}
                          className="h-9 w-9 sm:h-9 sm:w-auto sm:px-3 p-0"
                          aria-label="Markera som saknas"
                        >
                          <X className="h-4 w-4" />
                          <span className="hidden sm:inline ml-1">Saknas</span>
                        </Button>
                      </>
                    ) : (
                      <div className="flex items-center gap-2">
                        {getItemStatusBadge(item.packing_status)}
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => handleItemStatus(item, 'pending')}
                          disabled={actionLoading === `item-${item.item_id}`}
                          className="h-9 w-9 p-0"
                        >
                          {actionLoading === `item-${item.item_id}` ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Undo2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Total */}
          <Card>
            <CardContent className="py-3 sm:py-4 px-3 sm:px-6">
              <div className="flex justify-between items-center text-base sm:text-lg font-semibold">
                <span>Totalt</span>
                <span>{fmtCurrency(selectedOrder.order.grand_total, selectedOrder.order.currency, 2)}</span>
              </div>
              {selectedOrder.order.discount_amount > 0 && (
                <div className="flex justify-between items-center text-xs sm:text-sm text-green-600 mt-1">
                  <span>Rabatt</span>
                  <span>-{fmtCurrency(selectedOrder.order.discount_amount, selectedOrder.order.currency, 2)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Email correspondence */}
          {selectedOrder.order.customer_email && (
            <div style={{ width: '100%', minWidth: 0, maxWidth: '100%', overflow: 'hidden' }}>
              <EmailSection customerEmail={selectedOrder.order.customer_email} />
            </div>
          )}

          {/* Shipping button */}
          <Button
            onClick={() => setShippingOrderId(selectedOrder.order.order_id)}
            variant={selectedOrder.order.packing_status === 'packed' ? 'default' : 'outline'}
            size="lg"
            className={`w-full ${
              selectedOrder.order.packing_status === 'packed' 
                ? 'bg-[#006aa7] hover:bg-[#005a8e]' 
                : selectedOrder.order.packing_status === 'shipped'
                  ? 'border-blue-400 text-blue-600 hover:bg-blue-50'
                  : 'border-[#006aa7] text-[#006aa7] hover:bg-[#006aa7]/5'
            }`}
          >
            <Truck className="h-5 w-5 mr-2" />
            {selectedOrder.order.packing_status === 'shipped' ? 'Boka ny frakt' : 'Boka frakt'}
          </Button>

          {/* Mark Packed button - at bottom, not floating */}
          <Button
            onClick={handleOrderPacked}
            disabled={actionLoading === 'order-packed'}
            variant={selectedOrder.order.packing_status === 'packed' ? 'outline' : 'default'}
            size="lg"
            className="w-full"
          >
            {actionLoading === 'order-packed' ? (
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            ) : selectedOrder.order.packing_status === 'packed' ? (
              <Undo2 className="h-5 w-5 mr-2" />
            ) : (
              <Package className="h-5 w-5 mr-2" />
            )}
            {selectedOrder.order.packing_status === 'packed' ? 'Ångra packad' : 'Markera packad'}
          </Button>
        </div>
      ) : null}

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
              disabled={actionLoading === 'order-packed'}
              className="w-full sm:w-auto"
            >
              {actionLoading === 'order-packed' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Bekräfta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
