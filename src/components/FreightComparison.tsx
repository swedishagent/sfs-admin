import { useState, useEffect, useRef } from 'react'
import { 
  uploadUpsBilling, getUpsBilling, getUpsBillingSummary, 
  getUpsBillingUploads, deleteUpsBillingUpload 
} from '../api'
import type { UpsBillingData, UpsBillingSummary, UpsBillingUpload } from '../api'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { RefreshCw, Upload, Trash2, TrendingUp, TrendingDown, Receipt, Package, DollarSign, FileUp, CheckCircle2, Search, SlidersHorizontal, ChevronDown, ChevronUp } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'

function getCurrencySymbol(currency: string | null | undefined): string {
  switch (currency) {
    case 'EUR': return '€'
    case 'GBP': return '£'
    case 'NOK': return 'kr'
    case 'DKK': return 'kr'
    case 'USD': return '$'
    default: return 'kr'
  }
}

export default function FreightComparison() {
  const [billingData, setBillingData] = useState<UpsBillingData[]>([])
  const [, setSummary] = useState<UpsBillingSummary | null>(null)
  const [uploads, setUploads] = useState<UpsBillingUpload[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number; results: string[] }>({ current: 0, total: 0, results: [] })
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [filterInvoice, setFilterInvoice] = useState<string>('all_invoices')
  const [daysFilter, setDaysFilter] = useState('30')
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilter, setShowFilter] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState<{open: boolean, upload: UpsBillingUpload | null}>({
    open: false, upload: null
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [billingRes, summaryRes, uploadsRes] = await Promise.all([
        getUpsBilling(),
        getUpsBillingSummary(),
        getUpsBillingUploads()
      ])
      setBillingData(billingRes.billing_data)
      setSummary(summaryRes)
      setUploads(uploadsRes.uploads)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Kunde inte hämta fraktdata')
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFiles(Array.from(e.target.files))
    }
  }

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast.error('Välj en eller flera CSV-filer')
      return
    }

    setUploading(true)
    setUploadProgress({ current: 0, total: selectedFiles.length, results: [] })

    const results: string[] = []
    let successCount = 0

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i]
      setUploadProgress(prev => ({ ...prev, current: i + 1 }))
      try {
        const result = await uploadUpsBilling(file)
        results.push(`✅ ${file.name}: ${result.rows_matched} matchade, ${result.total_charges.toFixed(0)} ${getCurrencySymbol('SEK')}`)
        successCount++
      } catch (err) {
        results.push(`❌ ${file.name}: ${err instanceof Error ? err.message : 'Misslyckades'}`)
      }
      setUploadProgress(prev => ({ ...prev, results: [...results] }))
    }

    if (successCount === selectedFiles.length) {
      toast.success(`${successCount} fil${successCount > 1 ? 'er' : ''} uppladdade`)
    } else {
      toast.warning(`${successCount}/${selectedFiles.length} filer uppladdade`)
    }

    setSelectedFiles([])
    if (fileInputRef.current) fileInputRef.current.value = ''
    
    // Clear progress after a short delay
    setTimeout(() => {
      setUploadProgress({ current: 0, total: 0, results: [] })
    }, 3000)
    
    loadData()
    setUploading(false)
  }

  const handleDeleteUpload = async (upload: UpsBillingUpload) => {
    try {
      await deleteUpsBillingUpload(upload.id)
      toast.success('Uppladdning borttagen')
      setDeleteDialog({ open: false, upload: null })
      loadData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Kunde inte ta bort uppladdning')
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.csv'))
    if (files.length > 0) {
      setSelectedFiles(files)
    } else {
      toast.error('Bara CSV-filer stöds')
    }
  }

  // Time-based filtering
  const now = new Date()
  const cutoffDate = daysFilter === 'all' ? null : new Date(now.getTime() - parseInt(daysFilter) * 24 * 60 * 60 * 1000)
  
  const timeFilteredData = billingData.filter(row => {
    if (!cutoffDate) return true
    // pickup_date format varies — try parsing
    const dateStr = row.pickup_date || row.invoice_date || ''
    if (!dateStr) return true
    const rowDate = new Date(dateStr)
    return rowDate >= cutoffDate
  })

  // Invoice filter
  const invoiceFilteredData = (filterInvoice && filterInvoice !== 'all_invoices')
    ? timeFilteredData.filter(row => row.invoice_number === filterInvoice)
    : timeFilteredData

  // Search filter
  const filteredData = invoiceFilteredData.filter(row => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      (row.order_id || '').toLowerCase().includes(q) ||
      (row.recipient_name || '').toLowerCase().includes(q) ||
      (row.recipient_country || '').toLowerCase().includes(q) ||
      (row.tracking_number || '').toLowerCase().includes(q) ||
      (row.invoice_number || '').toLowerCase().includes(q)
    )
  })

  // Separate shipments from adjustments
  const shipmentRows = filteredData.filter(r => r.order_id && !r.tracking_number?.startsWith('NOTRK'))
  const adjustmentRows = filteredData.filter(r => !r.order_id || r.tracking_number?.startsWith('NOTRK'))

  // Calculate filtered totals for summary cards (based on time filter only, not search)
  const summaryData = invoiceFilteredData
  const localSummary = summaryData.reduce((acc, row) => {
    acc.upsTotal += row.net_charge
    if (row.magento_shipping_amount) {
      acc.customerTotal += row.magento_shipping_amount
      acc.orderCount += 1
    }
    return acc
  }, { upsTotal: 0, customerTotal: 0, orderCount: 0 })

  const localDiff = localSummary.customerTotal - localSummary.upsTotal
  const localMarginPct = localSummary.customerTotal > 0
    ? (localDiff / localSummary.customerTotal * 100)
    : 0

  const adjustmentTotal = adjustmentRows.reduce((sum, r) => sum + r.net_charge, 0)

  // Table totals (search-filtered)
  const tableTotals = filteredData.reduce((acc, row) => {
    acc.upsTotal += row.net_charge
    if (row.magento_shipping_amount) {
      acc.customerTotal += row.magento_shipping_amount
      acc.orderCount += 1
    }
    return acc
  }, { upsTotal: 0, customerTotal: 0, orderCount: 0 })

  const tableDiff = tableTotals.customerTotal - tableTotals.upsTotal
  const tableMarginPct = tableTotals.customerTotal > 0
    ? (tableDiff / tableTotals.customerTotal * 100)
    : 0

  if (loading && billingData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    )
  }

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
            onClick={loadData} 
            disabled={loading}
            aria-label="Uppdatera"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>

          {/* Count */}
          <span className="text-sm text-[#6c757d] hidden sm:inline whitespace-nowrap">
            {shipmentRows.length} frakter
          </span>
        </div>

        {/* Filter row */}
        {showFilter && (
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
                <SelectItem value="all">All data</SelectItem>
              </SelectContent>
            </Select>

            {billingData.length > 0 && (
              <Select value={filterInvoice} onValueChange={setFilterInvoice}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Alla fakturor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_invoices">Alla fakturor</SelectItem>
                  {Array.from(new Set(timeFilteredData.map(row => row.invoice_number))).map(invNum => (
                    <SelectItem key={invNum} value={invNum}>{invNum}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}
      </div>

      {/* Summary Cards — always visible first */}
      {localSummary.orderCount > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Receipt className="h-4 w-4 text-[#6c757d]" />
                <p className="text-xs text-[#6c757d]">UPS-kostnad</p>
              </div>
              <p className="text-xl font-bold text-[#212529]">{localSummary.upsTotal.toFixed(0)} {getCurrencySymbol('SEK')}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-4 w-4 text-[#6c757d]" />
                <p className="text-xs text-[#6c757d]">Kundfrakt</p>
              </div>
              <p className="text-xl font-bold text-[#212529]">{localSummary.customerTotal.toFixed(0)} {getCurrencySymbol('SEK')}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                {localDiff >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600" />
                )}
                <p className="text-xs text-[#6c757d]">Resultat</p>
              </div>
              <p className={`text-xl font-bold ${localDiff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {localDiff >= 0 ? '+' : ''}{localDiff.toFixed(0)} {getCurrencySymbol('SEK')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Package className="h-4 w-4 text-[#6c757d]" />
                <p className="text-xs text-[#6c757d]">Ordrar · Marginal</p>
              </div>
              <p className="text-xl font-bold text-[#212529]">
                {localSummary.orderCount} st
              </p>
              <p className={`text-sm font-semibold mt-0.5 ${localMarginPct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {localMarginPct.toFixed(1)}%
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Comparison Table */}
      {shipmentRows.length > 0 ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Fraktjämförelse per order
              {filterInvoice && filterInvoice !== 'all_invoices' && (
                <span className="ml-2 text-sm font-normal text-[#6c757d]">
                  — Faktura {filterInvoice}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 sm:px-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#dee2e6]">
                    <th className="text-left px-3 py-2 font-medium text-[#6c757d]">Order</th>
                    <th className="text-left px-3 py-2 font-medium text-[#6c757d]">Kund</th>
                    <th className="text-left px-3 py-2 font-medium text-[#6c757d] hidden md:table-cell">Land</th>
                    <th className="text-left px-3 py-2 font-medium text-[#6c757d] hidden lg:table-cell">Service</th>
                    <th className="text-left px-3 py-2 font-medium text-[#6c757d] hidden lg:table-cell">Vikt</th>
                    <th className="text-right px-3 py-2 font-medium text-[#6c757d]">UPS</th>
                    <th className="text-right px-3 py-2 font-medium text-[#6c757d]">Kund</th>
                    <th className="text-right px-3 py-2 font-medium text-[#6c757d]">Diff</th>
                  </tr>
                </thead>
                <tbody>
                  {shipmentRows.map((row, idx) => {
                    const diff = row.diff ?? 0
                    const isProfit = diff >= 0
                    
                    return (
                      <tr key={idx} className="border-b border-[#dee2e6] hover:bg-[#f8f9fa]">
                        <td className="px-3 py-2.5 font-mono text-xs">
                          {row.order_id}
                        </td>
                        <td className="px-3 py-2.5 truncate max-w-[140px]">
                          {row.recipient_name}
                        </td>
                        <td className="px-3 py-2.5 hidden md:table-cell">
                          {row.recipient_country}
                        </td>
                        <td className="px-3 py-2.5 hidden lg:table-cell text-xs text-[#6c757d]">
                          {row.service}
                        </td>
                        <td className="px-3 py-2.5 hidden lg:table-cell text-xs">
                          {row.weight ? `${row.weight} kg` : '—'}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono whitespace-nowrap">
                          {row.net_charge.toFixed(0)} {getCurrencySymbol('SEK')}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono whitespace-nowrap">
                          {row.magento_shipping_amount 
                            ? `${row.magento_shipping_amount.toFixed(0)} ${getCurrencySymbol(row.magento_currency)}`
                            : <span className="text-[#6c757d]">—</span>
                          }
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono whitespace-nowrap">
                          {row.magento_shipping_amount ? (
                            <span className={`font-semibold ${isProfit ? 'text-green-600' : 'text-red-600'}`}>
                              {isProfit ? '+' : ''}{diff.toFixed(0)} {getCurrencySymbol(row.magento_currency)}
                            </span>
                          ) : (
                            <span className="text-[#6c757d]">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                  
                  {/* Adjustment summary row */}
                  {adjustmentRows.length > 0 && (
                    <tr className="border-b border-[#dee2e6] text-[#6c757d]">
                      <td className="px-3 py-2.5 text-xs" colSpan={5}>
                        Justeringar ({adjustmentRows.length} st)
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono whitespace-nowrap text-xs">
                        {adjustmentTotal.toFixed(0)} {getCurrencySymbol('SEK')}
                      </td>
                      <td className="px-3 py-2.5" />
                      <td className="px-3 py-2.5" />
                    </tr>
                  )}
                  
                  {/* Totals Row */}
                  <tr className="bg-[#f8f9fa] font-bold">
                    <td className="px-3 py-2.5" colSpan={5}>
                      Totalt
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono whitespace-nowrap">
                      {tableTotals.upsTotal.toFixed(0)} {getCurrencySymbol('SEK')}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono whitespace-nowrap">
                      {tableTotals.customerTotal.toFixed(0)} {getCurrencySymbol('SEK')}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono whitespace-nowrap">
                      <span className={tableDiff >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {tableDiff >= 0 ? '+' : ''}{tableDiff.toFixed(0)} {getCurrencySymbol('SEK')}
                        <span className="text-xs font-semibold ml-1">({tableMarginPct.toFixed(1)}%)</span>
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : billingData.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Receipt className="h-12 w-12 mx-auto text-[#6c757d] mb-3" />
            <p className="text-[#6c757d]">
              Ingen fraktdata uppladdad ännu. Ladda upp en eller flera UPS-fakturor (CSV) nedan.
            </p>
          </CardContent>
        </Card>
      ) : filteredData.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Receipt className="h-12 w-12 mx-auto text-[#6c757d] mb-3" />
            <p className="text-[#6c757d]">
              {searchQuery ? 'Inga frakter matchar sökningen' : 'Inga frakter i valt tidsintervall'}
            </p>
          </CardContent>
        </Card>
      ) : null}

      {/* Upload Section — collapsible, at the bottom */}
      <Card>
        <CardHeader 
          className="pb-3 cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => setShowUpload(!showUpload)}
        >
          <CardTitle className="text-base flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Ladda upp UPS-fakturor (CSV)
            <div className="flex-1" />
            {uploads.length > 0 && (
              <span className="text-sm font-normal text-[#6c757d]">{uploads.length} fil{uploads.length > 1 ? 'er' : ''}</span>
            )}
            {showUpload ? <ChevronUp className="h-4 w-4 text-[#6c757d]" /> : <ChevronDown className="h-4 w-4 text-[#6c757d]" />}
          </CardTitle>
        </CardHeader>
        {showUpload && (
          <CardContent>
            {/* Drop zone */}
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
                selectedFiles.length > 0 ? 'border-[#006aa7] bg-blue-50' : 'border-[#dee2e6] hover:border-[#006aa7]'
              }`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                multiple
                onChange={handleFileSelect}
                disabled={uploading}
                className="hidden"
              />
              {selectedFiles.length > 0 ? (
                <div>
                  <FileUp className="h-8 w-8 mx-auto text-[#006aa7] mb-2" />
                  <p className="text-sm font-medium">
                    {selectedFiles.length} fil{selectedFiles.length > 1 ? 'er' : ''} vald{selectedFiles.length > 1 ? 'a' : ''}
                  </p>
                  <p className="text-xs text-[#6c757d] mt-1">
                    {selectedFiles.map(f => f.name).join(', ')}
                  </p>
                </div>
              ) : (
                <div>
                  <Upload className="h-8 w-8 mx-auto text-[#6c757d] mb-2" />
                  <p className="text-sm text-[#6c757d]">Klicka eller dra CSV-filer hit</p>
                  <p className="text-xs text-[#6c757d] mt-1">Stödjer flera filer samtidigt</p>
                </div>
              )}
            </div>

            {/* Upload button */}
            {selectedFiles.length > 0 && (
              <div className="mt-3 flex gap-2">
                <Button 
                  onClick={handleUpload} 
                  disabled={uploading}
                  className="bg-[#006aa7] hover:bg-[#005a8f] flex-1"
                >
                  {uploading ? (
                    <>
                      <Spinner className="mr-2" size="sm" />
                      Laddar upp {uploadProgress.current}/{uploadProgress.total}...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Ladda upp {selectedFiles.length} fil{selectedFiles.length > 1 ? 'er' : ''}
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={() => { setSelectedFiles([]); if (fileInputRef.current) fileInputRef.current.value = '' }}>
                  Avbryt
                </Button>
              </div>
            )}

            {/* Upload progress results */}
            {uploadProgress.results.length > 0 && (
              <div className="mt-3 space-y-1 p-3 bg-[#f8f9fa] rounded-lg">
                {uploadProgress.results.map((result, i) => (
                  <p key={i} className="text-xs">{result}</p>
                ))}
              </div>
            )}

            {/* Uploaded Files */}
            {uploads.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-sm font-medium text-[#6c757d]">Uppladdade fakturor:</p>
                {uploads.map(upload => (
                  <div key={upload.id} className="flex items-center justify-between p-2.5 bg-[#f8f9fa] rounded-lg">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{upload.filename}</p>
                        <p className="text-xs text-[#6c757d]">
                          Faktura {upload.invoice_number} · {upload.total_rows} rader · {upload.total_amount?.toFixed(0)} {getCurrencySymbol('SEK')}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-red-600 hover:bg-red-50 shrink-0"
                      onClick={() => setDeleteDialog({ open: true, upload })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open: false, upload: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ta bort uppladdning?</DialogTitle>
            <DialogDescription>
              Detta tar bort filen <strong>{deleteDialog.upload?.filename}</strong> och all tillhörande fraktdata 
              för faktura <strong>{deleteDialog.upload?.invoice_number}</strong>.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false, upload: null })}>
              Avbryt
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => deleteDialog.upload && handleDeleteUpload(deleteDialog.upload)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Ta bort
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
