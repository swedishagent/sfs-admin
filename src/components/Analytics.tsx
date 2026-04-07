import { useState, useEffect } from 'react'
import { getAnalytics } from '../api'
import type { AnalyticsData } from '../api'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  RefreshCw, Timer, Truck, Package, TrendingUp, Globe, ShoppingBag,
  Clock, CheckCircle2, BarChart3
} from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

const formatHours = (hours: number | null): string => {
  if (hours === null || hours === undefined) return '–'
  if (hours < 24) return `${Math.round(hours)}h`
  const days = hours / 24
  if (days < 1.5) return '1 dag'
  return `${Math.round(days)} dagar`
}

const formatPercent = (value: number | null): string => {
  if (value === null || value === undefined) return '–'
  return `${Math.round(value)}%`
}

const formatNumber = (value: number | null): string => {
  if (value === null || value === undefined) return '–'
  return value.toLocaleString('sv-SE')
}

const formatCurrency = (value: number | null): string => {
  if (value === null || value === undefined) return '–'
  return `${Math.round(value).toLocaleString('sv-SE')} kr`
}

// =============================================================================
// STAT CARD
// =============================================================================

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: string
  subValue?: string
  trend?: 'up' | 'down' | 'neutral'
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'gray'
}

function StatCard({ icon, label, value, subValue, color = 'blue' }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    red: 'bg-red-50 text-red-600',
    gray: 'bg-gray-50 text-gray-600'
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-[#6c757d] font-medium">{label}</p>
            <p className="text-xl font-bold mt-0.5">{value}</p>
            {subValue && (
              <p className="text-xs text-[#6c757d] mt-0.5">{subValue}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// =============================================================================
// PROGRESS BAR
// =============================================================================

interface ProgressBarProps {
  label: string
  value: number
  total: number
  color?: string
}

function ProgressBar({ label, value, total, color = 'bg-[#006aa7]' }: ProgressBarProps) {
  const percent = total > 0 ? (value / total) * 100 : 0
  
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-[#6c757d]">{label}</span>
        <span className="font-medium">{value} / {total}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div 
          className={`h-full ${color} rounded-full transition-all`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}

// =============================================================================
// COUNTRY ROW
// =============================================================================

interface CountryRowProps {
  country: string
  orders: number
  revenue: number
  avgDelivery: number | null
}

function CountryRow({ country, orders, revenue, avgDelivery }: CountryRowProps) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-xs font-bold">
        {country}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{orders} ordrar</p>
        <p className="text-xs text-[#6c757d]">{formatCurrency(revenue)}</p>
      </div>
      <div className="text-right">
        {avgDelivery ? (
          <>
            <p className="font-medium text-sm">{formatHours(avgDelivery)}</p>
            <p className="text-xs text-[#6c757d]">leveranstid</p>
          </>
        ) : (
          <p className="text-xs text-[#6c757d]">–</p>
        )}
      </div>
    </div>
  )
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function Analytics() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [daysFilter, setDaysFilter] = useState('30')

  useEffect(() => {
    loadAnalytics()
  }, [daysFilter])

  const loadAnalytics = async () => {
    setLoading(true)
    try {
      const result = await getAnalytics(parseInt(daysFilter))
      setData(result)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Kunde inte hämta statistik')
    } finally {
      setLoading(false)
    }
  }

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-[#6c757d]">Kunde inte ladda statistik</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      {/* Header */}
      <div className="flex gap-2 items-center">
        <Select value={daysFilter} onValueChange={setDaysFilter}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Senaste 7 dagar</SelectItem>
            <SelectItem value="14">Senaste 14 dagar</SelectItem>
            <SelectItem value="30">Senaste 30 dagar</SelectItem>
            <SelectItem value="60">Senaste 60 dagar</SelectItem>
            <SelectItem value="90">Senaste 90 dagar</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex-1" />

        <Button
          size="icon"
          variant="outline"
          onClick={loadAnalytics}
          disabled={loading}
          aria-label="Uppdatera"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Delivery Times Section */}
      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Timer className="h-5 w-5 text-[#006aa7]" />
          Leveranstider
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            icon={<Package className="h-5 w-5" />}
            label="Order → Skickad"
            value={formatHours(data.delivery_times.avg_order_to_ship_hours)}
            subValue="genomsnitt"
            color="blue"
          />
          <StatCard
            icon={<Truck className="h-5 w-5" />}
            label="Transporttid"
            value={formatHours(data.delivery_times.avg_ship_to_deliver_hours)}
            subValue="genomsnitt"
            color="yellow"
          />
          <StatCard
            icon={<CheckCircle2 className="h-5 w-5" />}
            label="Total leveranstid"
            value={formatHours(data.delivery_times.avg_total_hours)}
            subValue="order → levererad"
            color="green"
          />
          <StatCard
            icon={<Clock className="h-5 w-5" />}
            label="Snabbaste"
            value={formatHours(data.delivery_times.fastest_delivery_hours)}
            subValue="total tid"
            color="green"
          />
        </div>
      </div>

      {/* Order Stats Section */}
      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <ShoppingBag className="h-5 w-5 text-[#006aa7]" />
          Orderstatistik
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            icon={<ShoppingBag className="h-5 w-5" />}
            label="Totalt ordrar"
            value={formatNumber(data.orders.total_orders)}
            subValue={`${formatNumber(data.orders.orders_per_day)} per dag`}
            color="blue"
          />
          <StatCard
            icon={<TrendingUp className="h-5 w-5" />}
            label="Total omsättning"
            value={formatCurrency(data.orders.total_revenue)}
            subValue={`${formatCurrency(data.orders.revenue_per_day)} per dag`}
            color="green"
          />
          <StatCard
            icon={<BarChart3 className="h-5 w-5" />}
            label="Snittorder"
            value={formatCurrency(data.orders.avg_order_value)}
            subValue="genomsnitt"
            color="blue"
          />
          <StatCard
            icon={<Package className="h-5 w-5" />}
            label="Produkter/order"
            value={data.orders.avg_items_per_order?.toFixed(1) || '–'}
            subValue="genomsnitt"
            color="gray"
          />
        </div>
      </div>

      {/* Shipping Status Section */}
      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Truck className="h-5 w-5 text-[#006aa7]" />
          Fraktstatus
        </h2>
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-green-600">{data.shipping.delivered}</p>
                <p className="text-xs text-[#6c757d]">Levererade</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-600">{data.shipping.in_transit}</p>
                <p className="text-xs text-[#6c757d]">Under transport</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{data.shipping.exceptions}</p>
                <p className="text-xs text-[#6c757d]">Problem</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-600">{data.shipping.unknown}</p>
                <p className="text-xs text-[#6c757d]">Okänd status</p>
              </div>
            </div>
            
            <div className="pt-2">
              <ProgressBar
                label="Leveransprocent"
                value={data.shipping.delivered}
                total={data.shipping.total}
                color="bg-green-500"
              />
            </div>
            
            {data.shipping.delivery_rate !== null && (
              <div className="text-center pt-2">
                <Badge variant={data.shipping.delivery_rate >= 80 ? 'success' : 'secondary'}>
                  {formatPercent(data.shipping.delivery_rate)} levererade
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Countries Section */}
      {data.top_countries && data.top_countries.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Globe className="h-5 w-5 text-[#006aa7]" />
            Toppländer
          </h2>
          <Card>
            <CardContent className="p-4">
              {data.top_countries.map((country, idx) => (
                <CountryRow
                  key={idx}
                  country={country.country}
                  orders={country.orders}
                  revenue={country.revenue}
                  avgDelivery={country.avg_delivery_hours}
                />
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Packing Performance */}
      {data.packing && (
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Package className="h-5 w-5 text-[#006aa7]" />
            Packningsprestanda
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatCard
              icon={<Clock className="h-5 w-5" />}
              label="Väntar på packning"
              value={formatNumber(data.packing.pending)}
              color={data.packing.pending > 10 ? 'red' : 'gray'}
            />
            <StatCard
              icon={<CheckCircle2 className="h-5 w-5" />}
              label="Packade idag"
              value={formatNumber(data.packing.packed_today)}
              color="green"
            />
            <StatCard
              icon={<Timer className="h-5 w-5" />}
              label="Snitt packningstid"
              value={formatHours(data.packing.avg_packing_hours)}
              subValue="order → packad"
              color="blue"
            />
          </div>
        </div>
      )}
    </div>
  )
}
