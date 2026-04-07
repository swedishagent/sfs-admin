import { useState, useEffect } from 'react'
import { getProductBySku, getProductStock } from '../api'
import type { ProductDetail as ProductDetailType } from '../api'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, AlertTriangle, CheckCircle, RefreshCw, ExternalLink } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'

interface ProductDetailProps {
  sku: string
  onClose: () => void
}

export default function ProductDetail({ sku, onClose }: ProductDetailProps) {
  const [product, setProduct] = useState<ProductDetailType | null>(null)
  const [loading, setLoading] = useState(true)
  const [stock, setStock] = useState<{ qty: number; is_in_stock: boolean } | null>(null)

  useEffect(() => {
    loadProduct()
  }, [sku])

  const loadProduct = async () => {
    setLoading(true)
    try {
      const [data, stockData] = await Promise.all([
        getProductBySku(sku),
        getProductStock(sku).catch(() => null)
      ])
      setProduct(data)
      if (stockData) setStock(stockData)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Kunde inte hämta produkt')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!product) {
    return (
      <div className="space-y-4">
        <Button size="icon" variant="ghost" onClick={onClose} aria-label="Tillbaka">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="text-center py-12">
          <p className="text-[#6c757d]">Produkten hittades inte</p>
        </div>
      </div>
    )
  }

  const productUrl = (product as any).url_key
    ? `https://swedishfoodshop.com/${(product as any).url_key}.html`
    : null

  return (
    <div className="space-y-3 pb-20 lg:pb-0">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Button size="icon" variant="ghost" onClick={onClose} aria-label="Tillbaka">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold truncate">{product.name}</h2>
          <p className="text-xs text-[#6c757d] font-mono">{product.sku}</p>
        </div>
        <Button size="icon" variant="outline" onClick={loadProduct} disabled={loading} aria-label="Uppdatera">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Main card: image + key info side by side on desktop */}
      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Image */}
            <div className="shrink-0 flex justify-center sm:justify-start">
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full max-h-64 sm:w-48 sm:h-48 object-contain rounded-lg bg-white"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22128%22 height=%22128%22 viewBox=%220 0 128 128%22%3E%3Crect fill=%22%23f3f4f6%22 width=%22128%22 height=%22128%22/%3E%3Ctext x=%2264%22 y=%2270%22 text-anchor=%22middle%22 fill=%22%239ca3af%22 font-size=%2248%22%3E%F0%9F%93%A6%3C/text%3E%3C/svg%3E'
                  }}
                />
              ) : (
                <div className="w-full h-48 sm:w-48 sm:h-48 rounded-lg bg-gray-100 flex items-center justify-center text-5xl">
                  📦
                </div>
              )}
            </div>

            {/* Key info */}
            <div className="flex-1 min-w-0 space-y-3">
              {/* Price */}
              {product.price !== undefined && (
                <div>
                  <p className="text-xs text-[#6c757d]">Pris</p>
                  <p className="text-2xl font-bold text-[#006aa7]">
                    {product.price.toFixed(2)} kr
                    {(product as any).special_price && (
                      <span className="text-sm font-normal text-red-500 ml-2">
                        (Rea: {(product as any).special_price.toFixed(2)} kr)
                      </span>
                    )}
                  </p>
                </div>
              )}

              {/* Stock */}
              {stock && (
                <div>
                  <p className="text-xs text-[#6c757d] mb-1">Lagerstatus</p>
                  <div className="flex items-center gap-2">
                    {stock.is_in_stock ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <Badge variant="success">I lager</Badge>
                        <span className="text-sm text-[#6c757d]">({stock.qty} st)</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <Badge variant="destructive">Slut i lager</Badge>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Weight */}
              {product.weight && (
                <div>
                  <p className="text-xs text-[#6c757d]">Vikt</p>
                  <p className="text-sm font-medium">{product.weight} {product.weight_unit || 'g'}</p>
                </div>
              )}

              {/* Status */}
              {(product as any).status && (
                <div>
                  <p className="text-xs text-[#6c757d]">Status</p>
                  <Badge variant={(product as any).status === 'active' ? 'success' : 'secondary'}>
                    {(product as any).status === 'active' ? 'Aktiv' : 'Inaktiv'}
                  </Badge>
                </div>
              )}

              {/* Link to shop */}
              {productUrl && (
                <a
                  href={productUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-[#006aa7] hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Visa i butiken
                </a>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Description */}
      {product.description && (
        <Card>
          <CardContent className="p-3 sm:p-4">
            <p className="text-xs text-[#6c757d] mb-1">Beskrivning</p>
            <p className="text-sm text-[#343a40] whitespace-pre-line">{product.description}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
