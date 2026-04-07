import { useState, useEffect, useCallback, useRef } from 'react'
import { getShipments, getShipmentTracking, getShipmentDetail, refreshShipmentTracking, getShippingLabel, getShippingDocument } from '../api'
import type { Shipment, TrackingData, ShipmentDetail } from '../api'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  RefreshCw, Truck, Package, MapPin, Calendar, Clock, CheckCircle2, AlertCircle,
  ArrowRight, ArrowLeft, Timer, ShoppingBag, Mail, Phone, Search, SlidersHorizontal,
  AlertTriangle, FileText, Download
} from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return null
  // Format: YYYYMMDD -> YYYY-MM-DD
  if (dateStr.length === 8) {
    const year = dateStr.slice(0, 4)
    const month = dateStr.slice(4, 6)
    const day = dateStr.slice(6, 8)
    return `${year}-${month}-${day}`
  }
  // ISO format
  return dateStr.split('T')[0]
}

const formatTime = (timeStr: string | null) => {
  if (!timeStr) return null
  // Format: HHMMSS -> HH:MM
  return `${timeStr.slice(0, 2)}:${timeStr.slice(2, 4)}`
}

const formatDateTime = (isoStr: string | null) => {
  if (!isoStr) return null
  const date = new Date(isoStr)
  return date.toLocaleDateString('sv-SE') + ' ' + date.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'delivered':
      return <Badge variant="success"><CheckCircle2 className="h-3 w-3 mr-1" />Levererad</Badge>
    case 'in_transit':
      return <Badge variant="default"><Truck className="h-3 w-3 mr-1" />Under transport</Badge>
    case 'access_point':
      return <Badge variant="warning"><MapPin className="h-3 w-3 mr-1" />Väntar på upphämtning</Badge>
    case 'processing':
      return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Behandlas</Badge>
    case 'exception':
      return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Problem</Badge>
    case 'pickup':
      return <Badge variant="secondary"><Package className="h-3 w-3 mr-1" />Hämtad</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

const calculateDeliveryTime = (
  orderCreated: string | null,
  shipmentCreated: string | null,
  delivered: string | null
): { orderToShip: string | null; shipToDeliver: string | null; total: string | null } => {
  const result = { orderToShip: null as string | null, shipToDeliver: null as string | null, total: null as string | null }

  if (!orderCreated) return result

  const orderDate = new Date(orderCreated)

  if (shipmentCreated) {
    const shipDate = new Date(shipmentCreated)
    const diffHours = Math.round((shipDate.getTime() - orderDate.getTime()) / (1000 * 60 * 60))
    if (diffHours < 24) {
      result.orderToShip = `${diffHours}h`
    } else {
      result.orderToShip = `${Math.round(diffHours / 24)}d`
    }
  }

  if (delivered && shipmentCreated) {
    // Delivered format is YYYYMMDD, need to convert
    const deliverDate = delivered.length === 8
      ? new Date(`${delivered.slice(0, 4)}-${delivered.slice(4, 6)}-${delivered.slice(6, 8)}`)
      : new Date(delivered)
    const shipDate = new Date(shipmentCreated)
    const diffHours = Math.round((deliverDate.getTime() - shipDate.getTime()) / (1000 * 60 * 60))
    if (diffHours < 24) {
      result.shipToDeliver = `${diffHours}h`
    } else {
      result.shipToDeliver = `${Math.round(diffHours / 24)}d`
    }

    const totalHours = Math.round((deliverDate.getTime() - orderDate.getTime()) / (1000 * 60 * 60))
    if (totalHours < 24) {
      result.total = `${totalHours}h`
    } else {
      result.total = `${Math.round(totalHours / 24)}d`
    }
  }

  return result
}

// =============================================================================
// SHIPMENT LIST
// =============================================================================

const PAGE_SIZE = 20

interface ShipmentListProps {
  shipments: Shipment[]
  onSelect: (shipment: Shipment) => void
  loading: boolean
  refreshing: boolean
  daysFilter: string
  onDaysFilterChange: (val: string) => void
  onRefresh: () => void
}

type StatusFilter = 'all' | 'sla_breached' | 'in_transit' | 'access_point' | 'delivered' | 'exception'

function ShipmentList({ shipments, onSelect, loading, refreshing, daysFilter, onDaysFilterChange, onRefresh }: ShipmentListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilter, setShowFilter] = useState(false)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const sentinelRef = useRef<HTMLDivElement>(null)

  // Client-side filtering
  const filteredShipments = shipments.filter(shipment => {
    // Status filter
    if (statusFilter === 'sla_breached' && shipment.sla_status !== 'breached' && shipment.sla_status !== 'at_risk') return false
    if (statusFilter === 'in_transit' && shipment.tracking_status !== 'in_transit') return false
    if (statusFilter === 'access_point' && shipment.tracking_status !== 'access_point') return false
    if (statusFilter === 'delivered' && shipment.tracking_status !== 'delivered') return false
    if (statusFilter === 'exception' && shipment.tracking_status !== 'exception') return false

    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      (shipment.order_number || '').toLowerCase().includes(q) ||
      (shipment.customer_name || '').toLowerCase().includes(q) ||
      (shipment.track_number || '').toLowerCase().includes(q) ||
      (shipment.shipping_address?.country || '').toLowerCase().includes(q)
    )
  })

  // Reset visible count when filters change
  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [searchQuery, statusFilter, daysFilter])

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < filteredShipments.length) {
          setVisibleCount(prev => Math.min(prev + PAGE_SIZE, filteredShipments.length))
        }
      },
      { rootMargin: '200px' }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [visibleCount, filteredShipments.length])

  const visibleShipments = filteredShipments.slice(0, visibleCount)
  const hasMore = visibleCount < filteredShipments.length

  // Counts for filter labels
  const slaCount = shipments.filter(s => s.sla_status === 'breached' || s.sla_status === 'at_risk').length
  const transitCount = shipments.filter(s => s.tracking_status === 'in_transit').length
  const accessPointCount = shipments.filter(s => s.tracking_status === 'access_point').length
  const deliveredCount = shipments.filter(s => s.tracking_status === 'delivered').length
  const exceptionCount = shipments.filter(s => s.tracking_status === 'exception').length

  return (
    <div className="space-y-4 pb-20 lg:pb-0">
      {/* Toolbar */}
      <div className="space-y-2">
        <div className="flex gap-2 items-center">
          {/* Search field */}
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6c757d]" />
            <Input
              type="text"
              placeholder="Sök frakter..."
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
            onClick={onRefresh}
            disabled={loading}
            aria-label="Uppdatera"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>

          {/* Count - hidden on mobile */}
          <span className="text-sm text-[#6c757d] hidden sm:inline whitespace-nowrap">
            {filteredShipments.length}{filteredShipments.length !== shipments.length ? `/${shipments.length}` : ''} frakter
          </span>
        </div>

        {/* Refreshing indicator */}
        {refreshing && (
          <div className="flex items-center gap-2 text-xs text-[#6c757d] px-1">
            <RefreshCw className="h-3 w-3 animate-spin" />
            <span>Uppdaterar tracking-status…</span>
          </div>
        )}

        {/* Filter dropdown */}
        {showFilter && (
          <div className="flex flex-wrap gap-2 items-center">
            <Select value={daysFilter} onValueChange={onDaysFilterChange}>
              <SelectTrigger className="w-[140px] sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Senaste 7 dagar</SelectItem>
                <SelectItem value="14">Senaste 14 dagar</SelectItem>
                <SelectItem value="30">Senaste 30 dagar</SelectItem>
                <SelectItem value="60">Senaste 60 dagar</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger className="w-[140px] sm:w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alla status</SelectItem>
                <SelectItem value="sla_breached">
                  ⚠️ SLA-varning{slaCount > 0 ? ` (${slaCount})` : ''}
                </SelectItem>
                <SelectItem value="in_transit">
                  Under transport{transitCount > 0 ? ` (${transitCount})` : ''}
                </SelectItem>
                <SelectItem value="access_point">
                  📍 Väntar på upphämtning{accessPointCount > 0 ? ` (${accessPointCount})` : ''}
                </SelectItem>
                <SelectItem value="delivered">
                  Levererade{deliveredCount > 0 ? ` (${deliveredCount})` : ''}
                </SelectItem>
                <SelectItem value="exception">
                  Problem{exceptionCount > 0 ? ` (${exceptionCount})` : ''}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Shipments list */}
      {filteredShipments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Truck className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-[#6c757d]">{searchQuery ? 'Inga frakter matchar sökningen' : 'Inga frakter hittades'}</p>
            <p className="text-sm text-[#6c757d] mt-1">{searchQuery ? 'Prova ett annat sökord' : 'Prova ett annat tidsintervall'}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {visibleShipments.map(shipment => (
            <ShipmentCard
              key={shipment.shipment_id}
              shipment={shipment}
              onSelect={() => onSelect(shipment)}
            />
          ))}
          {/* Infinite scroll sentinel */}
          <div ref={sentinelRef} className="h-1" />
          {hasMore && (
            <p className="text-center text-sm text-[#6c757d] py-2">
              Visar {visibleCount} av {filteredShipments.length} — scrolla för fler
            </p>
          )}
        </div>
      )}
    </div>
  )
}

interface ShipmentCardProps {
  shipment: Shipment
  onSelect: () => void
}

function ShipmentCard({ shipment, onSelect }: ShipmentCardProps) {
  const isDelivered = shipment.tracking_status === 'delivered'
  const isInTransit = shipment.tracking_status === 'in_transit'
  const isAccessPoint = shipment.tracking_status === 'access_point'
  const isProcessing = shipment.tracking_status === 'processing'
  const isException = shipment.tracking_status === 'exception'
  const showGreen = isDelivered
  const showYellow = isAccessPoint
  const showRed = isException
  
  // Shorten track number for display (show last 8 chars)
  const shortTrack = shipment.track_number ? 
    '...' + shipment.track_number.slice(-8) : '–'
  
  return (
    <Card 
      className={`cursor-pointer transition-all hover:shadow-md active:scale-[0.99] touch-manipulation ${
        showGreen ? 'bg-green-50/50 border-green-300' : ''
      } ${showYellow ? 'bg-amber-50/50 border-amber-300' : ''} ${showRed ? 'bg-red-50/50 border-red-300' : ''}`} 
      onClick={onSelect}
    >
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            {/* Header row - same as Orders */}
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-lg font-bold text-[#006aa7]">#{shipment.order_number}</span>
              <span className="text-sm text-[#6c757d]">
                {new Date(shipment.created_at).toLocaleDateString('sv-SE')}
              </span>
            </div>

            {/* Customer - same as Orders */}
            <p className="font-medium text-sm truncate mb-1">{shipment.customer_name}</p>

            {/* Meta row - same structure as Orders */}
            <div className="text-xs text-[#6c757d] flex items-center gap-x-2">
              <span className="font-mono">{shortTrack}</span>
              <span>•</span>
              <span>{shipment.shipping_address?.country || '–'}</span>
              {shipment.ups_cost != null && (
                <>
                  <span>•</span>
                  <span className="font-medium text-[#343a40]">{shipment.ups_cost.toFixed(0)} kr</span>
                </>
              )}
              <span className="flex-1" />
              {/* SLA warning icon */}
              {shipment.sla_status === 'breached' && (
                <span className="text-red-500 flex items-center gap-0.5" title={`SLA överskriden: ${shipment.sla_days_used}d / max ${shipment.sla_max_days}d`}>
                  <AlertTriangle className="h-4 w-4" />
                </span>
              )}
              {shipment.sla_status === 'at_risk' && (
                <span className="text-amber-500 flex items-center gap-0.5" title="SLA-gräns idag">
                  <AlertTriangle className="h-4 w-4" />
                </span>
              )}
              {(isDelivered || isInTransit || isAccessPoint || isProcessing || isException) && (
                <Badge 
                  variant={isDelivered ? 'success' : isException ? 'destructive' : isAccessPoint ? 'warning' : isProcessing ? 'outline' : 'secondary'} 
                  className="text-xs py-0"
                >
                  {isDelivered ? 'Levererad' : isException ? 'Problem' : isAccessPoint ? 'Upphämtning' : isProcessing ? 'Behandlas' : 'Under transport'}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// =============================================================================
// SHIPMENT DETAIL VIEW
// =============================================================================

interface ShipmentDetailViewProps {
  shipment: Shipment
  detail: ShipmentDetail | null
  tracking: TrackingData | null
  loading: boolean
  onBack: () => void
  onRefresh: () => void
  onOpenOrder?: (orderId: string) => void
}

function ShipmentDetailView({ shipment, detail, tracking, loading, onBack, onRefresh, onOpenOrder }: ShipmentDetailViewProps) {
  const deliveryTimes = calculateDeliveryTime(
    detail?.order?.created_at || null,
    shipment.created_at,
    tracking?.actual_delivery || null
  )
  const [showDocs, setShowDocs] = useState(false)
  const [labelData, setLabelData] = useState<{ base64: string; format: string } | null>(null)
  const [invoiceData, setInvoiceData] = useState<{ base64: string; format: string } | null>(null)
  const [loadingDocs, setLoadingDocs] = useState(false)

  const loadDocs = async () => {
    setLoadingDocs(true)
    setLabelData(null)
    setInvoiceData(null)
    try {
      const label = await getShippingLabel(shipment.track_number)
      setLabelData(label)
    } catch { /* ignore */ }
    try {
      const invoice = await getShippingDocument(shipment.track_number, 'commercial_invoice')
      setInvoiceData(invoice)
    } catch { /* ignore */ }
    setLoadingDocs(false)
  }

  const openDocs = () => {
    setShowDocs(true)
    if (!labelData && !invoiceData) loadDocs()
  }

  return (
    <div className="space-y-4 pb-20 lg:pb-6">
      {/* Header row - order number left, actions right */}
      <div className="flex items-center justify-between">
        <Button
          size="icon"
          variant="ghost"
          onClick={onBack}
          className="shrink-0"
          aria-label="Tillbaka"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <div className="flex-1 mx-2 min-w-0">
          <h1 className="text-lg font-semibold truncate text-[#006aa7]">
            #{shipment.order_number || shipment.order_id || shipment.track_number}
          </h1>
        </div>

        <div className="flex items-center shrink-0">
          <Button
            size="icon"
            variant="outline"
            onClick={openDocs}
            className="h-9 w-9"
            aria-label="Dokument"
          >
            <FileText className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            onClick={onRefresh}
            disabled={loading}
            className="h-9 w-9"
            aria-label="Uppdatera"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {loading && !tracking ? (
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : (
        <>
          {/* Status header */}
          {tracking && (
            <Card className="bg-gradient-to-r from-[#006aa7]/5 to-[#FFB500]/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  {getStatusBadge(tracking.status)}
                  {tracking.estimated_delivery && !tracking.actual_delivery && (
                    <span className="text-sm text-[#6c757d]">
                      Beräknad: {formatDate(tracking.estimated_delivery)}
                    </span>
                  )}
                  {tracking.actual_delivery && (
                    <span className="text-sm text-green-600 font-medium">
                      Levererad: {formatDate(tracking.actual_delivery)}
                    </span>
                  )}
                </div>
                <p className="font-medium">{tracking.status_description}</p>
                {tracking.current_location && (
                  <p className="text-sm text-[#6c757d] flex items-center gap-1 mt-1">
                    <MapPin className="h-3 w-3" />
                    {tracking.current_location}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* SLA info */}
          {shipment.sla_status && shipment.sla_service && (
            <Card className={
              shipment.sla_status === 'breached' ? 'border-red-300 bg-red-50/50' :
              shipment.sla_status === 'at_risk' ? 'border-amber-300 bg-amber-50/50' :
              'border-green-300 bg-green-50/50'
            }>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  {shipment.sla_status === 'breached' ? (
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  ) : shipment.sla_status === 'at_risk' ? (
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  )}
                  <span className={`font-medium text-sm ${
                    shipment.sla_status === 'breached' ? 'text-red-700' :
                    shipment.sla_status === 'at_risk' ? 'text-amber-700' :
                    'text-green-700'
                  }`}>
                    {shipment.sla_status === 'breached' ? 'SLA överskriden' :
                     shipment.sla_status === 'at_risk' ? 'SLA-gräns idag' :
                     'Inom SLA'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-xs text-[#6c757d]">Tjänst</p>
                    <p className="text-sm font-medium">{shipment.sla_service}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#6c757d]">Max</p>
                    <p className="text-sm font-medium">{shipment.sla_max_days} arbetsdag{shipment.sla_max_days !== 1 ? 'ar' : ''}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#6c757d]">Faktiskt</p>
                    <p className={`text-sm font-bold ${
                      shipment.sla_status === 'breached' ? 'text-red-600' :
                      shipment.sla_status === 'at_risk' ? 'text-amber-600' :
                      'text-green-600'
                    }`}>
                      {shipment.sla_days_used != null ? `${shipment.sla_days_used} dag${shipment.sla_days_used !== 1 ? 'ar' : ''}` : '–'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Delivery time stats */}
          {(deliveryTimes.orderToShip || deliveryTimes.shipToDeliver || deliveryTimes.total) && (
            <div className="grid grid-cols-3 gap-2">
              {deliveryTimes.orderToShip && (
                <Card>
                  <CardContent className="p-3 text-center">
                    <Timer className="h-4 w-4 mx-auto mb-1 text-[#006aa7]" />
                    <p className="text-lg font-bold text-[#006aa7]">{deliveryTimes.orderToShip}</p>
                    <p className="text-xs text-[#6c757d]">Order → Skickat</p>
                  </CardContent>
                </Card>
              )}
              {deliveryTimes.shipToDeliver && (
                <Card>
                  <CardContent className="p-3 text-center">
                    <Truck className="h-4 w-4 mx-auto mb-1 text-[#FFB500]" />
                    <p className="text-lg font-bold text-[#FFB500]">{deliveryTimes.shipToDeliver}</p>
                    <p className="text-xs text-[#6c757d]">Transport</p>
                  </CardContent>
                </Card>
              )}
              {deliveryTimes.total && (
                <Card>
                  <CardContent className="p-3 text-center">
                    <CheckCircle2 className="h-4 w-4 mx-auto mb-1 text-green-600" />
                    <p className="text-lg font-bold text-green-600">{deliveryTimes.total}</p>
                    <p className="text-xs text-[#6c757d]">Totalt</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Order & Shipment info */}
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
            {/* Order info */}
            {detail?.order ? (
              <Card 
                className={onOpenOrder ? "cursor-pointer hover:shadow-md hover:border-[#006aa7] transition-all" : ""}
                onClick={() => onOpenOrder?.(detail.order!.order_id)}
              >
                <CardHeader className="pb-2 pt-3 px-4">
                  <CardTitle className="text-xs font-medium text-[#6c757d] flex items-center gap-2">
                    <ShoppingBag className="h-4 w-4" /> Order
                    {onOpenOrder && <ArrowRight className="h-3 w-3 ml-auto text-gray-400" />}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3">
                  <p className="font-medium text-[#343a40]">#{detail.order.order_id}</p>
                  <p className="text-sm">Beställd: {formatDateTime(detail.order.created_at)}</p>
                  <p className="text-sm font-medium mt-1">{detail.order.grand_total?.toFixed(0) || '–'} kr</p>
                  <p className="text-xs text-[#6c757d]">{detail.order.qty_ordered || '–'} produkter</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader className="pb-2 pt-3 px-4">
                  <CardTitle className="text-xs font-medium text-[#6c757d] flex items-center gap-2">
                    <ShoppingBag className="h-4 w-4" /> Order
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3 text-sm text-[#6c757d]">
                  Ingen kopplad order hittades
                </CardContent>
              </Card>
            )}

            {/* Shipment info */}
            <Card>
              <CardHeader className="pb-2 pt-3 px-4">
                <CardTitle className="text-xs font-medium text-[#6c757d] flex items-center gap-2">
                  <Truck className="h-4 w-4" /> Frakt
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <p className="text-sm">Skickad: {formatDateTime(shipment.created_at)}</p>
                <p className="text-sm font-mono text-xs mt-1">{shipment.track_number}</p>
                <p className="text-xs text-[#6c757d] mt-1 uppercase">{shipment.carrier}</p>
                
                {/* UPS Billing info */}
                {(shipment.ups_cost != null || detail?.ups_charge) && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs text-[#6c757d] mb-1">UPS-kostnad:</p>
                    <p className="font-semibold text-sm">{(detail?.ups_charge?.net_charge ?? shipment.ups_cost ?? 0).toFixed(0)} kr</p>
                    {detail?.ups_charge && (
                      <div className="flex gap-2 text-xs text-[#6c757d] mt-1">
                        {detail.ups_charge.weight && <span>{detail.ups_charge.weight} kg</span>}
                        {detail.ups_charge.zone && <><span>•</span><span>Zon {detail.ups_charge.zone}</span></>}
                        {detail.ups_charge.service && <><span>•</span><span>{detail.ups_charge.service}</span></>}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Customer info */}
          <Card>
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-xs font-medium text-[#6c757d] flex items-center gap-2">
                <Mail className="h-4 w-4" /> Kund
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <p className="font-medium">{shipment.customer_name}</p>
              {detail?.order?.customer_email && (
                <p className="text-sm text-[#6c757d]">{detail.order.customer_email}</p>
              )}
              {shipment.shipping_address && (
                <div className="text-sm mt-2">
                  <p>{shipment.shipping_address.street || ''}</p>
                  <p>
                    {[shipment.shipping_address.postcode, shipment.shipping_address.city]
                      .filter(Boolean)
                      .join(' ')}
                  </p>
                  <p>{shipment.shipping_address.country}</p>
                  {shipment.shipping_address.telephone && (
                    <p className="flex items-center gap-1 mt-1 text-[#6c757d]">
                      <Phone className="h-3 w-3" />
                      {shipment.shipping_address.telephone}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tracking activities */}
          {tracking && tracking.activities.length > 0 && (
            <Card>
              <CardHeader className="pb-2 pt-3 px-4">
                <CardTitle className="text-xs font-medium text-[#6c757d] flex items-center gap-2">
                  <Clock className="h-4 w-4" /> Händelser ({tracking.activities.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <div className="space-y-0">
                  {tracking.activities.map((activity, idx) => (
                    <div key={idx} className="flex gap-3 pb-4 relative">
                      {/* Timeline line */}
                      {idx < tracking.activities.length - 1 && (
                        <div className="absolute left-[11px] top-6 w-0.5 h-full bg-gray-200" />
                      )}

                      {/* Timeline dot */}
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                        idx === 0 ? 'bg-[#006aa7] text-white' : 'bg-gray-200 text-gray-500'
                      }`}>
                        {idx === 0 ? <ArrowRight className="h-3 w-3" /> : <div className="w-2 h-2 bg-gray-400 rounded-full" />}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{activity.description}</p>
                        <p className="text-xs text-[#6c757d]">
                          {activity.city && `${activity.city}, ${activity.country}`}
                        </p>
                        <p className="text-xs text-[#6c757d] flex items-center gap-2 mt-0.5">
                          <Calendar className="h-3 w-3" />
                          {formatDate(activity.date)}
                          <Clock className="h-3 w-3 ml-1" />
                          {formatTime(activity.time)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Documents Dialog */}
      <Dialog open={showDocs} onOpenChange={setShowDocs}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Fraktdokument</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {loadingDocs ? (
              <div className="flex items-center justify-center py-8">
                <Spinner size="lg" />
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
                      download={`label_${shipment.track_number}.${labelData.format}`}
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
                      download={`tullfaktura_${shipment.track_number}.pdf`}
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
    </div>
  )
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

interface ShipmentsProps {
  onOpenOrder?: (orderId: string) => void
  openTrackNumber?: string | null
  onShipmentOpened?: () => void
}

export default function Shipments({ onOpenOrder, openTrackNumber, onShipmentOpened }: ShipmentsProps = {}) {
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [daysFilter, setDaysFilter] = useState('14')
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null)
  const [shipmentDetail, setShipmentDetail] = useState<ShipmentDetail | null>(null)
  const [trackingData, setTrackingData] = useState<TrackingData | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    loadShipments()
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
    }
  }, [daysFilter])

  // Open shipment from external navigation (e.g., from Orders)
  useEffect(() => {
    if (openTrackNumber && !selectedShipment) {
      // Create a minimal shipment object to trigger detail view
      const minimalShipment: Shipment = {
        shipment_id: 0,
        order_id: 0,
        order_number: '',
        customer_name: '',
        track_number: openTrackNumber,
        carrier: 'UPS',
        created_at: ''
      }
      openShipmentDetail(minimalShipment)
      onShipmentOpened?.()
    }
  }, [openTrackNumber, selectedShipment, onShipmentOpened])

  const loadShipments = async (triggerRefresh = true) => {
    setLoading(true)
    try {
      const data = await getShipments(parseInt(daysFilter), 'ups')
      setShipments(data.shipments)
      
      if (triggerRefresh) {
        // Collect all non-delivered shipments with track numbers
        const nonDelivered = data.shipments.filter(
          s => s.track_number && s.tracking_status !== 'delivered'
        )
        const uncached = data.shipments.filter(
          s => s.track_number && !s.tracking_status
        )
        
        const toRefresh = nonDelivered.length > 0 ? nonDelivered : uncached
        
        if (toRefresh.length > 0) {
          setRefreshing(true)
          // Force refresh for non-delivered (updates stale cache entries)
          refreshShipmentTracking(
            toRefresh.map(s => s.track_number),
            nonDelivered.length > 0  // force=true if we have non-delivered cached items
          ).then(result => {
            if (result.queued > 0) {
              // Reload list after background refresh completes
              const delay = 2000 + result.queued * 250
              refreshTimerRef.current = setTimeout(() => {
                loadShipments(false)
                setRefreshing(false)
              }, delay)
            } else {
              setRefreshing(false)
            }
          }).catch(() => setRefreshing(false))
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Kunde inte hämta frakter')
    } finally {
      setLoading(false)
    }
  }

  const openShipmentDetail = useCallback(async (shipment: Shipment) => {
    setSelectedShipment(shipment)
    setShipmentDetail(null)
    setTrackingData(null)
    setDetailLoading(true)

    try {
      // Load tracking and detail in parallel
      const [tracking, detail] = await Promise.all([
        getShipmentTracking(shipment.track_number).catch(() => null),
        getShipmentDetail(shipment.track_number).catch(() => null)
      ])
      setTrackingData(tracking)
      setShipmentDetail(detail)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Kunde inte hämta detaljer')
    } finally {
      setDetailLoading(false)
    }
  }, [])

  const refreshDetail = useCallback(async () => {
    if (!selectedShipment) return
    setDetailLoading(true)
    try {
      const [tracking, detail] = await Promise.all([
        getShipmentTracking(selectedShipment.track_number).catch(() => null),
        getShipmentDetail(selectedShipment.track_number).catch(() => null)
      ])
      setTrackingData(tracking)
      setShipmentDetail(detail)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Kunde inte uppdatera')
    } finally {
      setDetailLoading(false)
    }
  }, [selectedShipment])

  const closeDetail = useCallback(() => {
    // Update the shipment in the list with fresh tracking data before closing
    if (selectedShipment && trackingData) {
      setShipments(prev => prev.map(s => {
        if (s.track_number === selectedShipment.track_number) {
          return {
            ...s,
            tracking_status: trackingData.status,
            delivery_date: trackingData.actual_delivery || s.delivery_date
          }
        }
        return s
      }))
    }
    setSelectedShipment(null)
    setShipmentDetail(null)
    setTrackingData(null)
  }, [selectedShipment, trackingData])

  // Show detail view
  if (selectedShipment) {
    return (
      <ShipmentDetailView
        shipment={selectedShipment}
        detail={shipmentDetail}
        tracking={trackingData}
        loading={detailLoading}
        onBack={closeDetail}
        onRefresh={refreshDetail}
        onOpenOrder={onOpenOrder}
      />
    )
  }

  // Loading state
  if (loading && shipments.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  // List view
  return (
    <ShipmentList
      shipments={shipments}
      onSelect={openShipmentDetail}
      loading={loading}
      refreshing={refreshing}
      daysFilter={daysFilter}
      onDaysFilterChange={setDaysFilter}
      onRefresh={loadShipments}
    />
  )
}
