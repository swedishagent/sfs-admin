import { useState, useEffect, useCallback } from 'react'
import {
  prepareShipment, validateShipment, createShipment, voidShipment, rateShipment,
} from '../api'
import type { PreparedShipment, ShipmentResult, ShipmentRate, RateService, ShippingItem } from '../api'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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
  ArrowLeft, Loader2, Package, MapPin, Truck, CheckCircle2,
  AlertTriangle, XCircle, Copy, Download, Ban, Scale,
  FileText, Globe, Mail, ShoppingCart, Info, Settings2,
  Plus, Trash2,
} from 'lucide-react'

// ─── Constants ───────────────────────────────────────────────────────────────

const BOX_PRESETS: Record<string, { label: string; length: number; width: number; height: number }> = {
  S:  { label: 'S (25×20×15)',  length: 25, width: 20, height: 15 },
  M:  { label: 'M (35×25×20)',  length: 35, width: 25, height: 20 },
  L:  { label: 'L (45×35×25)',  length: 45, width: 35, height: 25 },
  XL: { label: 'XL (55×40×30)', length: 55, width: 40, height: 30 },
}

const UPS_SERVICES: Record<string, string> = {
  '11': 'UPS Standard',
  '08': 'UPS Expedited',
  '65': 'UPS Express Saver',
  '07': 'UPS Express',
  '54': 'UPS Express Plus',
}

const EU_COUNTRIES = new Set([
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
  'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
  'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
])

const COUNTRY_NAMES: Record<string, string> = {
  SE: 'Sverige', NO: 'Norge', DK: 'Danmark', FI: 'Finland', IS: 'Island',
  DE: 'Tyskland', FR: 'Frankrike', GB: 'Storbritannien', US: 'USA', NL: 'Nederländerna',
  BE: 'Belgien', AT: 'Österrike', CH: 'Schweiz', IT: 'Italien', ES: 'Spanien',
  PT: 'Portugal', PL: 'Polen', CZ: 'Tjeckien', IE: 'Irland', LU: 'Luxemburg',
  JP: 'Japan', AU: 'Australien', CA: 'Kanada', EE: 'Estland', LT: 'Litauen',
  LV: 'Lettland', HU: 'Ungern', RO: 'Rumänien', BG: 'Bulgarien', HR: 'Kroatien',
  SI: 'Slovenien', SK: 'Slovakien', GR: 'Grekland', CN: 'Kina', MT: 'Malta',
  CY: 'Cypern',
}

interface ShipmentOptions {
  signatureRequired: boolean
  directDelivery: boolean
  carbonNeutral: boolean
  saturdayDelivery: boolean
  deliveryConfirmation: boolean
}

type Step = 'loading' | 'review' | 'validated' | 'created' | 'error'

interface ShippingProps {
  orderId: string
  onClose: () => void
  onShipped?: () => void
}

// ─── Helper: labeled input ───────────────────────────────────────────────────

function LabeledInput({
  label, value, onChange, placeholder, className, type = 'text', disabled, maxLength,
}: {
  label: string; value: string | number; onChange: (v: string) => void;
  placeholder?: string; className?: string; type?: string; disabled?: boolean; maxLength?: number;
}) {
  return (
    <div className={className}>
      <label className="text-xs text-[#6c757d] mb-1 block">{label}</label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-8 text-sm"
        disabled={disabled}
        maxLength={maxLength}
      />
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function Shipping({ orderId, onClose, onShipped }: ShippingProps) {
  const [step, setStep] = useState<Step>('loading')
  const [shipment, setShipment] = useState<PreparedShipment | null>(null)
  const [result, setResult] = useState<ShipmentResult | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // ─── Recipient editable fields ───────────────────────────────────────
  const [recipientName, setRecipientName] = useState('')
  const [recipientCompany, setRecipientCompany] = useState('')
  const [recipientEmail, setRecipientEmail] = useState('')
  const [recipientPhone, setRecipientPhone] = useState('')
  const [recipientStreet, setRecipientStreet] = useState('')
  const [recipientCity, setRecipientCity] = useState('')
  const [recipientState, setRecipientState] = useState('')
  const [recipientPostalCode, setRecipientPostalCode] = useState('')
  const [recipientCountryCode, setRecipientCountryCode] = useState('')

  // ─── Package fields ──────────────────────────────────────────────────
  const [weight, setWeight] = useState(0)
  const [boxPreset, setBoxPreset] = useState('M')
  const [dimLength, setDimLength] = useState(35)
  const [dimWidth, setDimWidth] = useState(25)
  const [dimHeight, setDimHeight] = useState(20)
  const [serviceCode, setServiceCode] = useState('11')

  // ─── Shipment options ────────────────────────────────────────────────
  const [options, setOptions] = useState<ShipmentOptions>({
    signatureRequired: false,
    directDelivery: false,
    carbonNeutral: false,
    saturdayDelivery: false,
    deliveryConfirmation: false,
  })

  // ─── Customs fields ──────────────────────────────────────────────────
  const [customsDescription, setCustomsDescription] = useState('Packaged food products')
  const [exportReason, setExportReason] = useState('SALE')
  const [recipientIsCompany, setRecipientIsCompany] = useState(false)
  const [recipientTaxId, setRecipientTaxId] = useState('')
  const [termsOfShipment, setTermsOfShipment] = useState('DAP')
  const [editableItems, setEditableItems] = useState<ShippingItem[]>([])

  // ─── Exporter fields (editable) ──────────────────────────────────────
  const [exporterName, setExporterName] = useState('Olav AB')
  const [exporterTaxId, setExporterTaxId] = useState('SE559390795801')
  const [exporterPhone, setExporterPhone] = useState('+46101799799')
  const [exporterStreet, setExporterStreet] = useState('Vallgatan 6B')
  const [exporterCity, setExporterCity] = useState('Borlänge')
  const [exporterPostalCode, setExporterPostalCode] = useState('78442')
  const [exporterCountryCode, setExporterCountryCode] = useState('SE')

  // ─── Validation & rate ───────────────────────────────────────────────
  const [validationResult, setValidationResult] = useState<{
    valid: boolean; errors: string[]; warnings: string[]
  } | null>(null)
  const [rate, setRate] = useState<ShipmentRate | null>(null)

  // ─── Void dialog ─────────────────────────────────────────────────────
  const [voidDialog, setVoidDialog] = useState(false)

  // ─── Computed ────────────────────────────────────────────────────────
  const customsRequired = recipientCountryCode
    ? !EU_COUNTRIES.has(recipientCountryCode.toUpperCase())
    : (shipment?.customs_required || false)

  const countryName = COUNTRY_NAMES[recipientCountryCode.toUpperCase()] || ''

  // ─── Load shipment data ──────────────────────────────────────────────

  const loadShipment = useCallback(async () => {
    setStep('loading')
    setLoadError(null)
    try {
      const data = await prepareShipment(orderId)
      setShipment(data)

      // Initialize recipient fields
      const r = data.recipient
      setRecipientName(r?.name || '')
      setRecipientCompany(r?.company || '')
      setRecipientEmail(data.recipient_email || '')
      setRecipientPhone(r?.phone || '')
      setRecipientStreet(r?.address?.street || '')
      setRecipientCity(r?.address?.city || '')
      setRecipientState(r?.address?.state || '')
      setRecipientPostalCode(r?.address?.postal_code || '')
      setRecipientCountryCode(r?.address?.country_code || '')

      // Initialize package fields
      setWeight(data.package?.weight_kg || 0)
      const suggested = (data.package?.suggested_box || 'M').toUpperCase()
      if (BOX_PRESETS[suggested]) {
        setBoxPreset(suggested)
        const preset = BOX_PRESETS[suggested]
        setDimLength(preset.length)
        setDimWidth(preset.width)
        setDimHeight(preset.height)
      } else {
        setBoxPreset('M')
        setDimLength(35)
        setDimWidth(25)
        setDimHeight(20)
      }
      if (data.package?.dimensions) {
        setDimLength(data.package.dimensions.length)
        setDimWidth(data.package.dimensions.width)
        setDimHeight(data.package.dimensions.height)
      }

      setServiceCode(data.service?.code || '11')

      // Initialize items (for customs editing)
      if (data.items) {
        setEditableItems(data.items.map(i => ({ ...i })))
      }

      // Initialize exporter from shipper data
      const s = data.shipper
      if (s) {
        setExporterName(s.name || 'Olav AB')
        setExporterTaxId(s.tax_id || 'SE559390795801')
        setExporterPhone(s.phone || '+46101799799')
        if (s.address) {
          setExporterStreet(s.address.street || 'Vallgatan 6B')
          setExporterCity(s.address.city || 'Borlänge')
          setExporterPostalCode(s.address.postal_code || '78442')
          setExporterCountryCode(s.address.country_code || 'SE')
        }
      }

      setStep('review')
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Kunde inte förbereda frakt')
      setStep('error')
    }
  }, [orderId])

  useEffect(() => {
    loadShipment()
  }, [loadShipment])

  // ─── Build current shipment data with edits ─────────────────────────

  const getCurrentData = (): PreparedShipment & { recipient_email?: string } => {
    if (!shipment) throw new Error('No shipment data')
    return {
      ...shipment,
      recipient: {
        name: recipientName,
        company: recipientCompany,
        attention_name: recipientName,
        phone: recipientPhone,
        address: {
          street: recipientStreet,
          city: recipientCity,
          state: recipientState,
          postal_code: recipientPostalCode,
          country_code: recipientCountryCode,
        },
      },
      recipient_email: recipientEmail,
      shipper: {
        name: exporterName,
        attention_name: exporterName,
        phone: exporterPhone,
        tax_id: exporterTaxId,
        address: {
          street: exporterStreet,
          city: exporterCity,
          state: '',
          postal_code: exporterPostalCode,
          country_code: exporterCountryCode,
        },
      },
      package: {
        ...shipment.package,
        weight_kg: weight,
        suggested_box: boxPreset,
        dimensions: { length: dimLength, width: dimWidth, height: dimHeight },
      },
      service: {
        code: serviceCode,
        name: UPS_SERVICES[serviceCode] || serviceCode,
      },
      shipment_options: {
        signature_required: options.signatureRequired,
        direct_delivery: options.directDelivery,
        carbon_neutral: options.carbonNeutral,
        saturday_delivery: options.saturdayDelivery,
        delivery_confirmation: options.deliveryConfirmation,
      },
      customs_required: customsRequired,
      items: editableItems,
      total_value: editableItems.reduce((sum, item) => sum + item.total_value, 0),
      customs_info: customsRequired ? {
        description: customsDescription,
        reason_for_export: exportReason,
        recipient_is_company: recipientIsCompany,
        recipient_tax_id: recipientTaxId,
        terms_of_shipment: termsOfShipment,
      } : undefined,
    } as any
  }

  // ─── Actions ─────────────────────────────────────────────────────────

  const handleValidate = async () => {
    setActionLoading('validate')
    setValidationResult(null)
    setRate(null)
    try {
      const data = getCurrentData()
      const [valRes, rateRes] = await Promise.all([
        validateShipment(data),
        rateShipment(data).catch(() => null),
      ])
      setValidationResult(valRes)
      if (rateRes?.success) setRate(rateRes)
      if (valRes.valid) {
        setStep('validated')
        toast.success('Validering OK')
      } else {
        toast.error('Validering misslyckades')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Valideringsfel')
    } finally {
      setActionLoading(null)
    }
  }

  const handleCreate = async () => {
    setActionLoading('create')
    try {
      const data = getCurrentData()
      const res = await createShipment(data)
      setResult(res)
      if (res.success) {
        setStep('created')
        toast.success('Frakt skapad!')
        onShipped?.()
      } else {
        toast.error(res.errors?.join(', ') || 'Kunde inte skapa frakt')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Kunde inte skapa frakt')
    } finally {
      setActionLoading(null)
    }
  }

  const handleVoid = async () => {
    if (!result?.tracking_number) return
    setActionLoading('void')
    try {
      const res = await voidShipment(result.tracking_number, orderId)
      if (res.success) {
        toast.success('Frakt makulerad')
        setStep('review')
        setResult(null)
        setValidationResult(null)
        onShipped?.() // Refresh order list (status reverted to packed)
      } else {
        toast.error(res.errors?.join(', ') || 'Kunde inte makulera frakt')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Kunde inte makulera frakt')
    } finally {
      setActionLoading(null)
      setVoidDialog(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Kopierat!')
  }

  // ─── Customs item helpers ────────────────────────────────────────────

  const updateItem = (index: number, field: keyof ShippingItem | 'invoice_name', value: string | number) => {
    setEditableItems(prev => {
      const next = [...prev]
      const item = { ...next[index] }
      if (field === 'qty' || field === 'weight_kg' || field === 'unit_value' || field === 'total_value') {
        const numVal = typeof value === 'string' ? parseFloat(value) || 0 : value
        ;(item as any)[field] = numVal
        if (field === 'qty' || field === 'unit_value') {
          item.total_value = Math.round(item.unit_value * item.qty * 100) / 100
        }
      } else {
        ;(item as any)[field] = value
      }
      next[index] = item
      return next
    })
  }

  const toggleItemCustoms = (index: number) => {
    setEditableItems(prev => {
      const next = [...prev]
      next[index] = { ...next[index], exclude_from_customs: !next[index].exclude_from_customs }
      return next
    })
  }

  const addItem = () => {
    setEditableItems(prev => [...prev, {
      sku: '',
      name: '',
      invoice_name: '',
      qty: 1,
      weight_kg: 0.1,
      hts_code: '',
      origin_country: 'SE',
      unit_value: 0,
      total_value: 0,
    }])
  }

  const removeItem = (index: number) => {
    setEditableItems(prev => prev.filter((_, i) => i !== index))
  }

  // ─── Render ──────────────────────────────────────────────────────────

  if (step === 'loading') {
    return (
      <div className="space-y-4">
        <Header orderId={orderId} onClose={onClose} />
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-[#006aa7]" />
              <p className="text-sm text-[#6c757d]">Förbereder frakt för order #{orderId}...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (step === 'error') {
    return (
      <div className="space-y-4">
        <Header orderId={orderId} onClose={onClose} />
        <Card>
          <CardContent className="py-8">
            <div className="flex flex-col items-center gap-3">
              <XCircle className="h-8 w-8 text-red-500" />
              <p className="text-sm text-red-600 text-center">{loadError}</p>
              <Button size="sm" onClick={loadShipment}>Försök igen</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!shipment) return null

  return (
    <div className="space-y-3 pb-20 lg:pb-0">
      <Header orderId={orderId} onClose={onClose} />

      {/* ─── Errors from prepare ─── */}
      {shipment.errors?.length > 0 && (
        <div className="space-y-1.5">
          {shipment.errors.map((e, i) => (
            <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
              <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{e}</span>
            </div>
          ))}
        </div>
      )}

      {/* ─── Created result ─── */}
      {step === 'created' && result?.success && (
        <CreatedResult
          result={result}
          actionLoading={actionLoading}
          onCopy={copyToClipboard}
          onVoid={() => setVoidDialog(true)}
        />
      )}

      {/* Created but failed */}
      {step === 'created' && !result?.success && (
        <Card className="border-red-300 bg-red-50/50">
          <CardContent className="py-4">
            <div className="flex items-start gap-2">
              <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-700">Frakten kunde inte skapas</p>
                {result?.errors?.map((e, i) => (
                  <p key={i} className="text-sm text-red-600 mt-1">{e}</p>
                ))}
                <Button
                  size="sm" variant="outline" className="mt-2"
                  onClick={() => { setStep('review'); setResult(null); setValidationResult(null) }}
                >
                  Tillbaka
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Review / Edit ─── */}
      {step !== 'created' && (
        <>
          {/* ── Mottagare ── */}
          <Card>
            <CardHeader className="pb-2 pt-3 px-3 sm:px-6">
              <CardTitle className="text-sm font-medium text-[#6c757d] flex items-center gap-2">
                <MapPin className="h-4 w-4" /> Mottagare
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3">
              <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                <LabeledInput label="Namn" value={recipientName} onChange={setRecipientName} placeholder="Namn" />
                <LabeledInput label="Företag" value={recipientCompany} onChange={setRecipientCompany} placeholder="Företag (valfritt)" />
                <LabeledInput label="E-post" value={recipientEmail} onChange={setRecipientEmail} placeholder="E-post" />
                <LabeledInput label="Telefon" value={recipientPhone} onChange={setRecipientPhone} placeholder="Telefon" />
                <div className="col-span-2">
                  <label className="text-xs text-[#6c757d] mb-1 block">Gatuadress</label>
                  <textarea
                    value={recipientStreet}
                    onChange={(e) => setRecipientStreet(e.target.value)}
                    placeholder="Gatuadress"
                    rows={2}
                    className="flex w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                  />
                </div>
                <LabeledInput label="Postnummer" value={recipientPostalCode} onChange={setRecipientPostalCode} placeholder="Postnummer" />
                <LabeledInput label="Stad" value={recipientCity} onChange={setRecipientCity} placeholder="Stad" />
                <LabeledInput label="Region" value={recipientState} onChange={setRecipientState} placeholder="Region (valfritt)" />
                <div>
                  <label className="text-xs text-[#6c757d] mb-1 block">Land</label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={recipientCountryCode}
                      onChange={(e) => setRecipientCountryCode(e.target.value.toUpperCase())}
                      placeholder="SE"
                      className="h-8 text-sm w-20"
                      maxLength={2}
                    />
                    {countryName && (
                      <span className="text-sm text-foreground">{countryName}</span>
                    )}
                  </div>
                </div>
              </div>
              {/* customs_required is indicated by showing the customs section below */}
            </CardContent>
          </Card>

          {/* ── Paket ── */}
          <Card>
            <CardHeader className="pb-2 pt-3 px-3 sm:px-6">
              <CardTitle className="text-sm font-medium text-[#6c757d] flex items-center gap-2">
                <Package className="h-4 w-4" /> Paket
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[#6c757d] mb-1 block">Vikt (kg)</label>
                  <Input
                    type="number" step="0.1" min="0.1"
                    value={weight}
                    onChange={(e) => setWeight(parseFloat(e.target.value) || 0)}
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-[#6c757d] mb-1 block">Snabbval kartong</label>
                  <Select
                    value={boxPreset}
                    onValueChange={(val) => {
                      setBoxPreset(val)
                      const preset = BOX_PRESETS[val]
                      if (preset) {
                        setDimLength(preset.length)
                        setDimWidth(preset.width)
                        setDimHeight(preset.height)
                      }
                    }}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(BOX_PRESETS).map(([key, val]) => (
                        <SelectItem key={key} value={key}>{val.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Dimensions */}
              <div>
                <label className="text-xs text-[#6c757d] mb-1 block">Mått (cm) — L × B × H</label>
                <div className="grid grid-cols-3 gap-2">
                  <Input type="number" step="1" min="1" value={dimLength} className="h-8 text-sm"
                    onChange={(e) => { setDimLength(parseInt(e.target.value) || 0); setBoxPreset('') }} placeholder="L" />
                  <Input type="number" step="1" min="1" value={dimWidth} className="h-8 text-sm"
                    onChange={(e) => { setDimWidth(parseInt(e.target.value) || 0); setBoxPreset('') }} placeholder="B" />
                  <Input type="number" step="1" min="1" value={dimHeight} className="h-8 text-sm"
                    onChange={(e) => { setDimHeight(parseInt(e.target.value) || 0); setBoxPreset('') }} placeholder="H" />
                </div>
              </div>

              {/* Product weight summary */}
              {editableItems.length > 0 && (
                <div className="rounded-md bg-[#f8f9fa] border p-2 text-xs text-[#6c757d] space-y-0.5">
                  <div className="flex items-center gap-1.5 font-medium">
                    <Info className="h-3 w-3" />
                    Produkter ({editableItems.length} st, {editableItems.reduce((s, i) => s + i.qty, 0)} enheter)
                    <span className="ml-auto text-foreground text-sm">
                      {shipment.package?.calculated_weight_kg?.toFixed(2) || weight.toFixed(2)} kg
                    </span>
                  </div>
                  {editableItems.length <= 10 && editableItems.map((item, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span className="truncate mr-2">{item.qty}× {item.name}</span>
                      <span className="shrink-0">{(item.weight_kg * item.qty).toFixed(2)} kg</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Volume weight */}
              <div className="flex items-center gap-2 text-xs text-[#6c757d]">
                <Scale className="h-3 w-3" />
                {dimLength} × {dimWidth} × {dimHeight} cm
                {dimLength > 0 && dimWidth > 0 && dimHeight > 0 && (
                  <> — volymvikt: {((dimLength * dimWidth * dimHeight) / 5000).toFixed(1)} kg</>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ── Leveransalternativ ── */}
          <Card>
            <CardHeader className="pb-2 pt-3 px-3 sm:px-6">
              <CardTitle className="text-sm font-medium text-[#6c757d] flex items-center gap-2">
                <Settings2 className="h-4 w-4" /> Leveransalternativ
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {([
                  { key: 'signatureRequired' as const, label: 'Kräv signatur' },
                  { key: 'directDelivery' as const, label: 'Enbart till mottagarens adress' },
                  { key: 'carbonNeutral' as const, label: 'Carbon Neutral' },
                  { key: 'saturdayDelivery' as const, label: 'Lördagsleverans' },
                  { key: 'deliveryConfirmation' as const, label: 'E-postbekräftelse vid leverans' },
                ]).map(({ key, label }) => (
                  <label
                    key={key}
                    className={`flex items-center gap-2 p-2 rounded-md border cursor-pointer text-sm transition-colors ${
                      options[key]
                        ? 'border-[#006aa7] bg-[#006aa7]/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={options[key]}
                      onChange={(e) => setOptions(prev => ({ ...prev, [key]: e.target.checked }))}
                      className="h-3.5 w-3.5 rounded border-gray-300 text-[#006aa7] focus:ring-[#006aa7]"
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
              {options.deliveryConfirmation && recipientEmail && (
                <p className="text-xs text-[#6c757d] mt-1.5 flex items-center gap-1">
                  <Mail className="h-3 w-3" /> Leveransnotis skickas till {recipientEmail}
                </p>
              )}
              {options.deliveryConfirmation && !recipientEmail && (
                <p className="text-xs text-orange-600 mt-1.5 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> E-post saknas — leveransnotis kan inte skickas
                </p>
              )}
            </CardContent>
          </Card>

          {/* ── Tulldeklaration ── */}
          {customsRequired && (
            <Card>
              <CardHeader className="pb-2 pt-3 px-3 sm:px-6">
                <CardTitle className="text-sm font-medium text-[#6c757d] flex items-center gap-2">
                  <Globe className="h-4 w-4" /> Tulldeklaration
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 sm:px-6 pb-3 space-y-3">
                {/* Description + reason + incoterms */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-[#6c757d] mb-1 block">Innehållsbeskrivning (max 35)</label>
                    <Input
                      value={customsDescription}
                      onChange={(e) => setCustomsDescription(e.target.value.slice(0, 35))}
                      placeholder="Packaged food products"
                      className="h-8 text-sm"
                      maxLength={35}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#6c757d] mb-1 block">Exportorsak</label>
                    <Select value={exportReason} onValueChange={setExportReason}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SALE">Försäljning</SelectItem>
                        <SelectItem value="GIFT">Gåva</SelectItem>
                        <SelectItem value="SAMPLE">Varuprov</SelectItem>
                        <SelectItem value="RETURN">Retur</SelectItem>
                        <SelectItem value="REPAIR">Reparation</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-[#6c757d] mb-1 block">Leveransvillkor (Incoterms)</label>
                    <Select value={termsOfShipment} onValueChange={setTermsOfShipment}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DDP">DDP — Delivered Duty Paid</SelectItem>
                        <SelectItem value="DDU">DDU — Delivered Duty Unpaid</SelectItem>
                        <SelectItem value="DAP">DAP — Delivered at Place</SelectItem>
                        <SelectItem value="CIF">CIF — Cost Insurance Freight</SelectItem>
                        <SelectItem value="FOB">FOB — Free On Board</SelectItem>
                        <SelectItem value="EXW">EXW — Ex Works</SelectItem>
                        <SelectItem value="CPT">CPT — Carriage Paid To</SelectItem>
                        <SelectItem value="CIP">CIP — Carriage Insurance Paid</SelectItem>
                        <SelectItem value="FCA">FCA — Free Carrier</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Recipient customs info */}
                <div className="rounded-md bg-[#f8f9fa] border p-2.5 space-y-2">
                  <p className="text-xs font-medium text-[#6c757d]">Mottagare (tull)</p>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={recipientIsCompany}
                      onChange={(e) => setRecipientIsCompany(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-gray-300 text-[#006aa7] focus:ring-[#006aa7]"
                    />
                    <span className="text-sm">Mottagaren är ett företag</span>
                  </label>
                  <LabeledInput
                    label="Skatte-ID / EORI / VAT (valfritt)"
                    value={recipientTaxId}
                    onChange={setRecipientTaxId}
                    placeholder="t.ex. GB123456789"
                  />
                </div>

                {/* Editable product list */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-[#6c757d]">Produkter i tulldeklaration</p>
                    <Button type="button" size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={addItem}>
                      <Plus className="h-3 w-3" /> Lägg till rad
                    </Button>
                  </div>
                  {editableItems.map((item, idx) => {
                    const excluded = !!item.exclude_from_customs
                    return (
                    <div key={idx} className={`p-2 rounded border text-sm space-y-1.5 relative group transition-colors ${
                      excluded ? 'bg-amber-50/50 border-amber-200 opacity-70' : 'bg-[#f8f9fa] border-gray-200'
                    }`}>
                      {/* Excluded banner */}
                      {excluded && (
                        <div className="flex items-center gap-1.5 text-[10px] text-amber-700 bg-amber-100 rounded px-2 py-1 -mt-0.5 mb-1">
                          <Info className="h-3 w-3 shrink-0" />
                          <span>Bara kostnad — värdet fördelas på övriga rader i tulldokumentet</span>
                        </div>
                      )}
                      {/* Row 1: SKU + invoice name + toggle + delete */}
                      <div className="flex items-center gap-2">
                        <div className="flex-1 space-y-1">
                          <div className="grid grid-cols-[100px_1fr] gap-2">
                            <div>
                              <label className="text-[10px] text-[#6c757d] block">SKU</label>
                              <Input value={item.sku} className="h-7 text-xs font-mono"
                                onChange={(e) => updateItem(idx, 'sku', e.target.value)} placeholder="SKU" />
                            </div>
                            <div>
                              <label className="text-[10px] text-[#6c757d] block">Tullnamn (engelska)</label>
                              <Input value={item.invoice_name || ''} className={`h-7 text-xs ${excluded ? 'opacity-50' : ''}`}
                                onChange={(e) => updateItem(idx, 'invoice_name' as any, e.target.value)} placeholder="Commercial invoice name"
                                disabled={excluded} />
                            </div>
                          </div>
                          {item.name && item.name !== item.invoice_name && !excluded && (
                            <p className="text-[10px] text-[#6c757d] truncate pl-[108px]">Ordernamn: {item.name}</p>
                          )}
                        </div>
                        <div className="flex flex-col gap-1 shrink-0 mt-3">
                          <Button type="button" size="sm"
                            variant={excluded ? 'default' : 'outline'}
                            className={`h-7 w-7 p-0 ${excluded
                              ? 'bg-amber-500 hover:bg-amber-600 text-white'
                              : 'text-[#6c757d] hover:text-[#006aa7] hover:border-[#006aa7]'
                            }`}
                            onClick={() => toggleItemCustoms(idx)}
                            title={excluded ? 'Inkludera i tulldokument' : 'Exkludera från tulldokument (bara kostnad)'}
                          >
                            <FileText className="h-3.5 w-3.5" />
                          </Button>
                          <Button type="button" size="sm" variant="ghost"
                            className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                            onClick={() => removeItem(idx)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      {/* Row 2: Editable fields — hide customs-specific fields when excluded */}
                      <div className={`grid grid-cols-3 ${excluded ? 'sm:grid-cols-3' : 'sm:grid-cols-6'} gap-2`}>
                        <div>
                          <label className="text-[10px] text-[#6c757d] block">Antal</label>
                          <Input type="number" min="1" step="1" value={item.qty} className="h-7 text-xs"
                            onChange={(e) => updateItem(idx, 'qty', e.target.value)} />
                        </div>
                        {!excluded && (
                          <div>
                            <label className="text-[10px] text-[#6c757d] block">Vikt/st (kg)</label>
                            <Input type="number" min="0.001" step="0.001" value={item.weight_kg} className="h-7 text-xs"
                              onChange={(e) => updateItem(idx, 'weight_kg', e.target.value)} />
                          </div>
                        )}
                        <div>
                          <label className="text-[10px] text-[#6c757d] block">Pris/st</label>
                          <Input type="number" min="0" step="0.01" value={item.unit_value} className="h-7 text-xs"
                            onChange={(e) => updateItem(idx, 'unit_value', e.target.value)} />
                        </div>
                        {!excluded && (
                          <>
                            <div>
                              <label className="text-[10px] text-[#6c757d] block">HTS-kod</label>
                              <Input value={item.hts_code} className="h-7 text-xs"
                                onChange={(e) => updateItem(idx, 'hts_code', e.target.value)}
                                placeholder="HTS-kod" />
                            </div>
                            <div>
                              <label className="text-[10px] text-[#6c757d] block">Ursprung</label>
                              <Input value={item.origin_country} className="h-7 text-xs" maxLength={2}
                                onChange={(e) => updateItem(idx, 'origin_country', e.target.value.toUpperCase())}
                                placeholder="SE" />
                            </div>
                          </>
                        )}
                        <div>
                          <label className="text-[10px] text-[#6c757d] block">Totalt</label>
                          <Input type="number" value={item.total_value} className="h-7 text-xs bg-gray-50" disabled />
                        </div>
                      </div>
                      {!excluded && !item.hts_code && (
                        <div className="flex items-center gap-1 text-[10px] text-orange-600">
                          <AlertTriangle className="h-3 w-3" /> HTS-kod saknas
                        </div>
                      )}
                    </div>
                    )
                  })}

                  {editableItems.length === 0 && (
                    <div className="text-center py-4 text-sm text-[#6c757d]">
                      Inga produkter. Klicka "Lägg till rad" ovan.
                    </div>
                  )}

                  {/* Total value */}
                  {editableItems.length > 0 && (() => {
                    const totalValue = editableItems.reduce((s, i) => s + i.total_value, 0)
                    const excludedValue = editableItems.filter(i => i.exclude_from_customs).reduce((s, i) => s + i.total_value, 0)
                    const includedValue = totalValue - excludedValue
                    return (
                      <div className="pt-1 border-t space-y-1">
                        <div className="flex justify-between items-center text-sm font-medium">
                          <span>Totalt tullvärde</span>
                          <span className="text-[#006aa7]">
                            {totalValue.toFixed(2)} {shipment.total_value_currency}
                          </span>
                        </div>
                        {excludedValue > 0 && (
                          <div className="flex justify-between items-center text-xs text-amber-700">
                            <span>↳ varav {excludedValue.toFixed(2)} fördelas på {editableItems.filter(i => !i.exclude_from_customs).length} tullrader</span>
                            <span>Dokument: {includedValue.toFixed(2)} + {excludedValue.toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </div>

                {/* Exporter info (editable) */}
                <div className="rounded-md bg-[#f8f9fa] border p-2.5 space-y-2">
                  <p className="text-xs font-medium text-[#6c757d]">Exportör</p>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                    <LabeledInput label="Företagsnamn" value={exporterName} onChange={setExporterName} placeholder="Olav AB" />
                    <LabeledInput label="Organisationsnummer" value={exporterTaxId} onChange={setExporterTaxId} placeholder="SE559390795801" />
                    <LabeledInput label="Telefon" value={exporterPhone} onChange={setExporterPhone} placeholder="+46..." />
                    <LabeledInput label="Gatuadress" value={exporterStreet} onChange={setExporterStreet} placeholder="Gatuadress" />
                    <LabeledInput label="Postnummer" value={exporterPostalCode} onChange={setExporterPostalCode} placeholder="Postnr" />
                    <LabeledInput label="Stad" value={exporterCity} onChange={setExporterCity} placeholder="Stad" />
                    <div>
                      <label className="text-xs text-[#6c757d] mb-1 block">Land</label>
                      <Input
                        value={exporterCountryCode}
                        onChange={(e) => setExporterCountryCode(e.target.value.toUpperCase())}
                        className="h-8 text-sm w-20"
                        maxLength={2}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Validation result + rate + service selection ── */}
          {validationResult && (
            <Card className={validationResult.valid ? 'border-green-300' : 'border-red-300'}>
              <CardContent className="py-3 space-y-2">
                {validationResult.valid ? (
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-medium text-sm">Validering godkänd</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {validationResult.errors?.map((e, i) => (
                      <div key={i} className="flex items-start gap-2 text-red-600 text-sm">
                        <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>{e}</span>
                      </div>
                    ))}
                  </div>
                )}
                {validationResult.warnings?.map((w, i) => (
                  <div key={i} className="flex items-start gap-2 text-yellow-700 text-sm mt-1">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{w}</span>
                  </div>
                ))}

                {/* Kundens fraktval — shown here near service selection */}
                {shipment.magento_shipping?.description && (
                  <div className="flex items-center gap-2 pt-2 mt-1 border-t text-sm text-[#6c757d]">
                    <ShoppingCart className="h-4 w-4 shrink-0" />
                    <span>Kundens val:</span>
                    <span className="font-medium text-foreground">{shipment.magento_shipping.description}</span>
                    <span className="ml-auto font-medium">{shipment.magento_shipping.amount?.toFixed(2)} {shipment.magento_shipping.currency}</span>
                  </div>
                )}

                {/* Service selection from rate results */}
                {rate?.success && rate.available_services && rate.available_services.length > 0 && (
                  <div className="pt-2 mt-2 border-t border-green-200 space-y-2">
                    <p className="text-xs font-medium text-[#6c757d]">Välj frakttjänst</p>
                    <div className="space-y-1.5">
                      {rate.available_services.map((svc: RateService) => {
                        const isSelected = svc.code === serviceCode
                        const arrivalDate = svc.arrival_date
                          ? `${svc.arrival_date.slice(0,4)}-${svc.arrival_date.slice(4,6)}-${svc.arrival_date.slice(6,8)}`
                          : ''
                        return (
                          <button
                            key={svc.code} type="button"
                            className={`w-full flex items-center justify-between p-2 rounded-lg border text-sm transition-colors text-left ${
                              isSelected
                                ? 'border-[#006aa7] bg-[#006aa7]/5 ring-1 ring-[#006aa7]'
                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                            onClick={() => { setServiceCode(svc.code); setStep('validated') }}
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={`font-medium ${isSelected ? 'text-[#006aa7]' : ''}`}>
                                  {svc.name || svc.code}
                                </span>
                                {isSelected && <Badge className="text-[10px] py-0 px-1 bg-[#006aa7]">Vald</Badge>}
                              </div>
                              {(arrivalDate || svc.transit_days) && (
                                <span className="text-xs text-[#6c757d]">
                                  {arrivalDate ? `Leverans ${arrivalDate}` : ''}
                                  {svc.transit_days ? ` (${svc.transit_days} arbetsdagar)` : ''}
                                  {svc.delivery_by ? ` före ${svc.delivery_by}` : ''}
                                </span>
                              )}
                            </div>
                            <span className={`font-bold whitespace-nowrap ml-2 ${isSelected ? 'text-[#006aa7]' : ''}`}>
                              {parseFloat(svc.amount).toFixed(0)} {svc.currency}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
                {rate?.success && (!rate.available_services || rate.available_services.length === 0) && rate.cost && (
                  <div className="flex items-center justify-between pt-2 mt-2 border-t border-green-200">
                    <div>
                      <p className="text-xs text-[#6c757d]">Beräknad fraktkostnad</p>
                      <p className="text-lg font-bold text-[#006aa7]">
                        {parseFloat(rate.cost.amount).toFixed(2)} {rate.cost.currency}
                      </p>
                    </div>
                  </div>
                )}
                {rate && !rate.success && (
                  <div className="flex items-start gap-2 text-yellow-700 text-sm pt-2 mt-2 border-t border-yellow-200">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>Kunde inte hämta pris: {rate.errors?.join(', ')}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* ── Action buttons ── */}
          <div className="flex gap-2">
            {step === 'review' && (
              <Button onClick={handleValidate} disabled={actionLoading === 'validate'} className="flex-1">
                {actionLoading === 'validate'
                  ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  : <CheckCircle2 className="h-4 w-4 mr-2" />}
                Validera & hämta pris
              </Button>
            )}
            {step === 'validated' && (
              <>
                <Button
                  variant="outline"
                  onClick={() => { setStep('review'); setValidationResult(null); setRate(null) }}
                  className="shrink-0"
                >
                  Ändra
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={actionLoading === 'create'}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {actionLoading === 'create'
                    ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    : <Truck className="h-4 w-4 mr-2" />}
                  Skapa frakt
                </Button>
              </>
            )}
          </div>
        </>
      )}

      {/* ── Void dialog ── */}
      <Dialog open={voidDialog} onOpenChange={setVoidDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Makulera frakt?</DialogTitle>
            <DialogDescription>
              Tracking-nummer {result?.tracking_number} kommer att makuleras. Denna åtgärd kan inte ångras.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setVoidDialog(false)} className="w-full sm:w-auto">
              Avbryt
            </Button>
            <Button
              variant="destructive"
              onClick={handleVoid}
              disabled={actionLoading === 'void'}
              className="w-full sm:w-auto"
            >
              {actionLoading === 'void'
                ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                : <Ban className="h-4 w-4 mr-2" />}
              Makulera
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Created Result Card ─────────────────────────────────────────────────────

function CreatedResult({
  result, actionLoading, onCopy, onVoid,
}: {
  result: ShipmentResult
  actionLoading: string | null
  onCopy: (text: string) => void
  onVoid: () => void
}) {
  return (
    <Card className="border-green-300 bg-green-50/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2 text-green-700">
          <CheckCircle2 className="h-5 w-5" /> Frakt skapad!
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {result.tracking_number && (
          <div>
            <p className="text-xs text-[#6c757d] mb-1">Tracking-nummer</p>
            <div className="flex items-center gap-2">
              <span className="text-xl font-mono font-bold text-[#006aa7]">{result.tracking_number}</span>
              <Button size="sm" variant="ghost" onClick={() => onCopy(result.tracking_number!)} className="h-8 w-8 p-0">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {result.cost && (
          <div>
            <p className="text-xs text-[#6c757d] mb-1">Fraktkostnad</p>
            <span className="text-lg font-semibold">{result.cost.amount} {result.cost.currency}</span>
          </div>
        )}

        {result.label_base64 && (
          <div>
            <p className="text-xs text-[#6c757d] mb-1">Fraktetikett</p>
            <div className="bg-white border rounded-lg p-2 inline-block">
              <img
                src={`data:image/${result.label_format || 'gif'};base64,${result.label_base64}`}
                alt="Fraktetikett"
                className="max-w-full h-auto"
                style={{ maxHeight: 300 }}
              />
            </div>
            <div className="mt-2">
              <a
                href={`data:image/${result.label_format || 'gif'};base64,${result.label_base64}`}
                download={`label_${result.tracking_number}.${result.label_format || 'gif'}`}
                className="inline-flex items-center gap-1 text-sm text-[#006aa7] hover:underline"
              >
                <Download className="h-4 w-4" /> Ladda ner etikett
              </a>
            </div>
          </div>
        )}

        {!result.label_base64 && result.label_url && (
          <div>
            <p className="text-xs text-[#6c757d] mb-1">Fraktetikett</p>
            <a href={result.label_url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-[#006aa7] hover:underline">
              <Download className="h-4 w-4" /> Ladda ner etikett
            </a>
          </div>
        )}

        {result.documents && result.documents.length > 0 && (
          <div>
            <p className="text-xs text-[#6c757d] mb-1">Tulldokument</p>
            <div className="space-y-2">
              {result.documents.map((doc, i) => (
                <div key={i}>
                  {doc.base64 && doc.format?.toUpperCase() === 'PDF' && (
                    <div className="bg-white border rounded-lg overflow-hidden mb-1">
                      <iframe
                        src={`data:application/pdf;base64,${doc.base64}`}
                        className="w-full" style={{ height: 300 }} title={doc.type}
                      />
                    </div>
                  )}
                  <a href={doc.url || '#'} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-[#006aa7] hover:underline">
                    <FileText className="h-4 w-4" />
                    Ladda ner {doc.type === 'commercial_invoice' ? 'tullfaktura' : doc.type} ({doc.format})
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {result.warnings && result.warnings.length > 0 && (
          <div className="space-y-1">
            {result.warnings.map((w, i) => (
              <div key={i} className="flex items-start gap-2 p-2 rounded bg-yellow-50 border border-yellow-200 text-sm text-yellow-800">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{w}</span>
              </div>
            ))}
          </div>
        )}

        <Button variant="destructive" size="sm" onClick={onVoid} disabled={actionLoading === 'void'} className="mt-2">
          <Ban className="h-4 w-4 mr-1" /> Makulera frakt
        </Button>
      </CardContent>
    </Card>
  )
}

// ─── Header ──────────────────────────────────────────────────────────────────

function Header({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <Button size="icon" variant="ghost" onClick={onClose} aria-label="Tillbaka">
        <ArrowLeft className="h-4 w-4" />
      </Button>
      <div className="flex-1 min-w-0">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Truck className="h-5 w-5 text-[#006aa7]" />
          Boka frakt
        </h2>
        <p className="text-xs text-[#6c757d]">Order #{orderId}</p>
      </div>
    </div>
  )
}
