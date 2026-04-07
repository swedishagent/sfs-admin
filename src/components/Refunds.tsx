import { useState, useEffect } from 'react'
import { getPendingRefunds, markRefundProcessed } from '../api'
import type { Refund } from '../api'
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
import { RefreshCw, Check, DollarSign, AlertCircle, PartyPopper } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'

export default function Refunds() {
  const [refunds, setRefunds] = useState<Refund[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{open: boolean, refund: Refund | null}>({
    open: false, refund: null
  })

  useEffect(() => {
    loadRefunds()
  }, [])

  const loadRefunds = async () => {
    setLoading(true)
    try {
      const data = await getPendingRefunds()
      setRefunds(data.refunds)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Kunde inte hämta återbetalningar')
    } finally {
      setLoading(false)
    }
  }

  const handleProcessRefund = async (refund: Refund) => {
    setActionLoading(`refund-${refund.id}`)
    try {
      await markRefundProcessed(refund.id)
      toast.success(`Återbetalning för ${refund.product_name} markerad som behandlad`)
      loadRefunds()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Kunde inte markera som behandlad')
    } finally {
      setActionLoading(null)
      setConfirmDialog({ open: false, refund: null })
    }
  }

  // Group refunds by order
  const refundsByOrder = refunds.reduce((acc, refund) => {
    if (!acc[refund.order_id]) {
      acc[refund.order_id] = []
    }
    acc[refund.order_id].push(refund)
    return acc
  }, {} as Record<string, Refund[]>)

  const totalPending = refunds.reduce((sum, r) => sum + r.refund_amount, 0)

  if (loading && refunds.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-20 lg:pb-0">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2">
        {refunds.length > 0 ? (
          <Badge variant="destructive" className="text-sm px-3 py-1.5">
            <DollarSign className="h-4 w-4 mr-1.5 flex-shrink-0" />
            <span className="whitespace-nowrap">Att återbetala: {totalPending.toFixed(0)} kr</span>
          </Badge>
        ) : (
          <div />
        )}

        <Button 
          size="icon"
          variant="outline" 
          onClick={loadRefunds} 
          disabled={loading}
          aria-label="Uppdatera"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Content */}
      {refunds.length === 0 ? (
        <Card className="touch-manipulation">
          <CardContent className="py-12 text-center">
            <PartyPopper className="h-12 w-12 mx-auto mb-4 text-green-500" />
            <p className="text-lg font-medium">Inga väntande återbetalningar!</p>
            <p className="text-sm text-[#6c757d] mt-2">
              När produkter markeras som saknade dyker de upp här
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(refundsByOrder).map(([orderId, orderRefunds]) => {
            const orderTotal = orderRefunds.reduce((s, r) => s + r.refund_amount, 0)
            
            return (
              <Card key={orderId} className="touch-manipulation">
                <CardHeader className="pb-2 bg-[#f8f9fa]">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>Order #{orderId}</span>
                    <Badge variant="destructive">
                      {orderTotal.toFixed(0)} kr
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 divide-y divide-[#dee2e6]">
                  {orderRefunds.map(refund => (
                    <div key={refund.id} className="flex items-center gap-4 p-4">
                      <AlertCircle className="h-5 w-5 text-[#dc3545] flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">{refund.product_name}</div>
                        <div className="text-sm text-[#6c757d]">
                          {refund.sku} • {refund.qty_missing} st saknas
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-[#dc3545]">
                          {refund.refund_amount.toFixed(0)} kr
                        </div>
                        <div className="text-xs text-[#6c757d]">
                          {new Date(refund.created_at).toLocaleDateString('sv-SE')}
                        </div>
                      </div>
                      <Button
                        size="icon"
                        variant="success"
                        onClick={() => setConfirmDialog({ open: true, refund })}
                        disabled={actionLoading === `refund-${refund.id}`}
                        aria-label="Markera som behandlad"
                      >
                        {actionLoading === `refund-${refund.id}` ? (
                          <Spinner size="sm" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog(prev => ({...prev, open}))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Markera återbetalning som behandlad?</DialogTitle>
            <DialogDescription>
              {confirmDialog.refund && (
                <>
                  <strong>{confirmDialog.refund.product_name}</strong> ({confirmDialog.refund.qty_missing} st)
                  <br />
                  Belopp: <strong>{confirmDialog.refund.refund_amount.toFixed(0)} kr</strong>
                  <br /><br />
                  Har du återbetalat kunden i Magento/betalleverantören?
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              onClick={() => setConfirmDialog({ open: false, refund: null })}
              className="w-full sm:w-auto"
            >
              Avbryt
            </Button>
            <Button 
              onClick={() => confirmDialog.refund && handleProcessRefund(confirmDialog.refund)}
              disabled={actionLoading?.startsWith('refund-')}
              className="w-full sm:w-auto"
            >
              {actionLoading?.startsWith('refund-') && <Spinner size="sm" className="mr-2" />}
              Ja, markera som behandlad
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
