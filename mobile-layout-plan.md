# Orders.tsx Mobile Layout Improvement Plan

## 1. Header Layout Improvements

### Current Issues:
- Header takes 2 rows with buttons that have text on mobile
- "Tillbaka" button text wastes space
- "Uppdatera" and "Markera packad/Ångra packad" buttons are too wide

### Recommended Changes:

```tsx
// CURRENT CODE (lines ~415-450):
<div className="flex flex-col gap-3">
  {/* Row 1: Tillbaka left, Title center */}
  <div className="flex items-center gap-3">
    <Button variant="outline" size="sm" onClick={closeOrder} className="shrink-0">
      <ArrowLeft className="h-4 w-4 mr-2" />
      Tillbaka
    </Button>
    <h2 className="text-lg sm:text-xl font-semibold flex-1 truncate">
      Order #{selectedOrder.order.order_id}
    </h2>
  </div>
  {/* Row 2: Uppdatera left, Ångra/Markera right - compact buttons */}
  <div className="flex justify-between">
    <Button variant="outline" size="sm" onClick={loadOrders} disabled={loading}>
      <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
      Uppdatera
    </Button>
    <Button 
      onClick={handleOrderPacked}
      disabled={actionLoading === 'order-packed'}
      variant={selectedOrder.order.packing_status === 'packed' ? 'outline' : 'default'}
    >
      {actionLoading === 'order-packed' ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : selectedOrder.order.packing_status === 'packed' ? (
        <Undo2 className="h-4 w-4 mr-2" />
      ) : (
        <Package className="h-4 w-4 mr-2" />
      )}
      {selectedOrder.order.packing_status === 'packed' ? 'Ångra packad' : 'Markera packad'}
    </Button>
  </div>
</div>

// IMPROVED CODE:
<div className="flex flex-col gap-2">
  {/* Row 1: Compact header with icon-only back button */}
  <div className="flex items-center gap-2">
    <Button 
      variant="outline" 
      size="icon" 
      onClick={closeOrder} 
      className="shrink-0 h-9 w-9"
      aria-label="Tillbaka"
    >
      <ArrowLeft className="h-4 w-4" />
    </Button>
    <h2 className="text-base sm:text-xl font-semibold flex-1 truncate">
      Order #{selectedOrder.order.order_id}
    </h2>
    {/* Icon-only update button */}
    <Button 
      variant="outline" 
      size="icon"
      onClick={loadOrders} 
      disabled={loading}
      className="h-9 w-9 shrink-0"
      aria-label="Uppdatera"
    >
      <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
    </Button>
  </div>
  
  {/* Row 2: Full-width Markera packad button */}
  <Button 
    onClick={handleOrderPacked}
    disabled={actionLoading === 'order-packed'}
    variant={selectedOrder.order.packing_status === 'packed' ? 'outline' : 'default'}
    className="w-full sm:w-auto"
    size="sm"
  >
    {actionLoading === 'order-packed' ? (
      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
    ) : selectedOrder.order.packing_status === 'packed' ? (
      <Undo2 className="h-4 w-4 mr-2" />
    ) : (
      <Package className="h-4 w-4 mr-2" />
    )}
    {selectedOrder.order.packing_status === 'packed' ? 'Ångra packad' : 'Markera packad'}
  </Button>
</div>
```

### Key Changes:
- **Tillbaka**: Change to `size="icon"` with `h-9 w-9` - removes text, saves space
- **Uppdatera**: Move to top row as icon-only button, `size="icon"` `h-9 w-9`
- **Markera packad**: Full width on mobile (`w-full sm:w-auto`), keep text for clarity
- **Gap**: Reduce from `gap-3` to `gap-2` for tighter spacing
- **Title**: Smaller text on mobile (`text-base` vs `text-lg`)

---

## 2. Product Items List Improvements

### Current Issues:
- Buttons still show text on mobile (though hidden with `hidden sm:inline`)
- Image size could be optimized
- Status badge + undo button layout could be tighter
- Product info spacing could be more compact

### Recommended Changes:

```tsx
// CURRENT CODE (lines ~500-570):
<div 
  key={item.item_id} 
  className={`flex gap-3 p-3 rounded-lg ...`}
>
  {/* Product Image */}
  <div className="shrink-0...">
    {item.image_url ? (
      <img
        src={item.image_url}
        alt={item.name}
        className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-md bg-white"
        ...
      />
    ) : (...)}
  </div>

  {/* Product Info */}
  <div className="flex-1 min-w-0">
    <div className="font-medium text-sm sm:text-base leading-tight mb-1...">
      {item.name}
    </div>
    <div className="text-xs sm:text-sm text-[#6c757d] space-y-0.5">
      <div className="font-mono text-xs">{item.sku}</div>
      ...
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
          {actionLoading === `item-${item.item_id}` ? (...) : (
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
        {getStatusBadge(item.packing_status)}
        <Button 
          size="sm" 
          variant="ghost"
          onClick={() => handleItemStatus(item, 'pending')}
          disabled={actionLoading === `item-${item.item_id}`}
          className="h-9 w-9 p-0"
        >
          {actionLoading === `item-${item.item_id}` ? (...) : <Undo2 className="h-4 w-4" />}
        </Button>
      </div>
    )}
  </div>
</div>

// IMPROVED CODE:
<div 
  key={item.item_id} 
  className={`flex gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg ...`}
>
  {/* Product Image - smaller on mobile */}
  <div 
    className="shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
    onClick={() => openProduct(item.sku)}
  >
    {item.image_url ? (
      <img
        src={item.image_url}
        alt={item.name}
        className="w-14 h-14 sm:w-20 sm:h-20 object-cover rounded-md bg-white"
        ...
      />
    ) : (
      <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-md bg-gray-100 flex items-center justify-center text-xl sm:text-2xl">
        📦
      </div>
    )}
  </div>

  {/* Product Info - tighter spacing */}
  <div className="flex-1 min-w-0 py-0.5">
    <div 
      className="font-medium text-sm leading-tight cursor-pointer hover:text-[#006aa7] transition-colors line-clamp-2"
      onClick={() => openProduct(item.sku)}
    >
      {item.name}
    </div>
    <div className="text-xs text-[#6c757d] mt-0.5">
      <span className="font-mono">{item.sku}</span>
      <span className="mx-1">·</span>
      <span>{item.qty_ordered} st</span>
    </div>
    <div className="text-xs sm:text-sm font-medium text-[#006aa7] mt-0.5">
      {item.row_total.toFixed(0)} kr
    </div>
  </div>

  {/* Actions - icon only, stacked on mobile */}
  <div className="shrink-0 flex flex-col items-end justify-center gap-1.5">
    {item.packing_status === 'pending' ? (
      <>
        <Button
          size="icon"
          variant="success"
          onClick={() => handleItemStatus(item, 'packed')}
          disabled={actionLoading === `item-${item.item_id}`}
          className="h-8 w-8 sm:h-9 sm:w-9"
          aria-label="Packad"
        >
          {actionLoading === `item-${item.item_id}` ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
        </Button>
        <Button
          size="icon"
          variant="destructive"
          onClick={() => handleItemStatus(item, 'missing')}
          disabled={actionLoading === `item-${item.item_id}`}
          className="h-8 w-8 sm:h-9 sm:w-9"
          aria-label="Saknas"
        >
          <X className="h-4 w-4" />
        </Button>
      </>
    ) : (
      <div className="flex flex-col items-end gap-1">
        {getStatusBadge(item.packing_status)}
        <Button 
          size="icon" 
          variant="ghost"
          onClick={() => handleItemStatus(item, 'pending')}
          disabled={actionLoading === `item-${item.item_id}`}
          className="h-7 w-7 sm:h-8 sm:w-8"
        >
          {actionLoading === `item-${item.item_id}` ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Undo2 className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>
    )}
  </div>
</div>
```

### Key Changes:
- **Image**: Reduced from `w-16 h-16` to `w-14 h-14` on mobile
- **Padding**: Reduced from `p-3` to `p-2` on mobile
- **Gap**: Reduced from `gap-3` to `gap-2` on mobile
- **Product name**: Added `line-clamp-2` to prevent overflow
- **Simplified info**: Show only SKU, qty, and total price (remove individual price/discount details on mobile)
- **Buttons**: Changed to `size="icon"` with smaller sizes (`h-8 w-8` mobile, `h-9 w-9` desktop)
- **Undo button**: Smaller on mobile (`h-7 w-7`)
- **Removed text**: All button text hidden, rely on icons and aria-labels

---

## 3. Customer Info Cards Layout

### Current Issues:
- Cards take full width on mobile, creating long scrolling
- Padding is too generous on mobile
- Font sizes don't need to be as small (already okay but can be optimized)

### Recommended Changes:

```tsx
// CURRENT CODE (lines ~455-495):
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
      ...
    </CardContent>
  </Card>
  
  <Card>
    <CardHeader className="pb-2 pt-3 sm:pt-6 px-3 sm:px-6">
      <CardTitle className="text-xs sm:text-sm font-medium text-[#6c757d] flex items-center gap-2">
        <Truck className="h-3 w-3 sm:h-4 sm:w-4" /> Frakt
      </CardTitle>
    </CardHeader>
    <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
      ...
    </CardContent>
  </Card>
</div>

// IMPROVED CODE - More compact card layout:
<div className="grid gap-2 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
  {/* Kund Card */}
  <Card>
    <CardHeader className="pb-1.5 pt-2.5 sm:pb-2 sm:pt-6 px-3 sm:px-6">
      <CardTitle className="text-xs font-medium text-[#6c757d] flex items-center gap-1.5 sm:gap-2">
        <Mail className="h-3 w-3 sm:h-4 sm:w-4" /> 
        <span className="hidden sm:inline">Kund</span>
      </CardTitle>
    </CardHeader>
    <CardContent className="px-3 sm:px-6 pb-2.5 sm:pb-6">
      <p className="font-medium text-sm">{selectedOrder.order.customer_name}</p>
      <p className="text-xs text-[#6c757d] truncate">{selectedOrder.order.customer_email}</p>
    </CardContent>
  </Card>
  
  {/* Leveransadress Card */}
  <Card className="sm:col-span-2 lg:col-span-1">
    <CardHeader className="pb-1.5 pt-2.5 sm:pb-2 sm:pt-6 px-3 sm:px-6">
      <CardTitle className="text-xs font-medium text-[#6c757d] flex items-center gap-1.5 sm:gap-2">
        <MapPin className="h-3 w-3 sm:h-4 sm:w-4" /> 
        <span className="hidden sm:inline">Leveransadress</span>
      </CardTitle>
    </CardHeader>
    <CardContent className="text-xs px-3 sm:px-6 pb-2.5 sm:pb-6">
      <p className="font-medium">{selectedOrder.order.shipping_address.name}</p>
      <p>{selectedOrder.order.shipping_address.street}</p>
      <p>{selectedOrder.order.shipping_address.postcode} {selectedOrder.order.shipping_address.city}</p>
      <p className="flex items-center gap-1">
        <span>{selectedOrder.order.shipping_address.country}</span>
        {selectedOrder.order.shipping_address.telephone && (
          <>
            <span className="text-[#6c757d]">·</span>
            <Phone className="h-3 w-3 text-[#6c757d]" />
            <span className="text-[#6c757d]">{selectedOrder.order.shipping_address.telephone}</span>
          </>
        )}
      </p>
    </CardContent>
  </Card>
  
  {/* Frakt Card */}
  <Card>
    <CardHeader className="pb-1.5 pt-2.5 sm:pb-2 sm:pt-6 px-3 sm:px-6">
      <CardTitle className="text-xs font-medium text-[#6c757d] flex items-center gap-1.5 sm:gap-2">
        <Truck className="h-3 w-3 sm:h-4 sm:w-4" /> 
        <span className="hidden sm:inline">Frakt</span>
      </CardTitle>
    </CardHeader>
    <CardContent className="px-3 sm:px-6 pb-2.5 sm:pb-6">
      <p className="text-xs line-clamp-1">{selectedOrder.order.shipping_description}</p>
      <p className="font-semibold text-sm sm:text-base">{selectedOrder.order.shipping_amount.toFixed(0)} kr</p>
    </CardContent>
  </Card>
</div>
```

### Key Changes:
- **Gap**: Reduced from `gap-3` to `gap-2` on mobile
- **Card padding**: Tighter on mobile (`pt-2.5 pb-1.5` vs `pt-3 pb-2`)
- **Card titles**: Hide text on mobile (icon only), show on sm+ screens
- **Address card**: Put phone on same line as country to save vertical space
- **Shipping description**: Added `line-clamp-1` to prevent overflow

---

## 4. Dialogs (Confirmation Dialogs)

### Current Issues:
- Dialog doesn't have specific mobile styling
- Footer buttons are stacked but could be improved

### Recommended Changes:

```tsx
// CURRENT CODE (lines ~600-625):
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

// IMPROVED CODE - Add mobile-specific dialog sizing:
<Dialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog(prev => ({...prev, open}))}>
  <DialogContent className="sm:max-w-[425px] max-w-[calc(100%-2rem)] mx-auto">
    <DialogHeader className="space-y-2">
      <DialogTitle className="text-base sm:text-lg">{confirmDialog.title}</DialogTitle>
      <DialogDescription className="text-sm">{confirmDialog.description}</DialogDescription>
    </DialogHeader>
    <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3 mt-4">
      <Button 
        variant="outline" 
        onClick={() => setConfirmDialog(prev => ({...prev, open: false}))}
        className="w-full sm:w-auto order-2 sm:order-1"
        size="sm"
      >
        Avbryt
      </Button>
      <Button 
        onClick={async () => {
          await confirmDialog.action()
          setConfirmDialog(prev => ({...prev, open: false}))
        }}
        disabled={actionLoading === 'order-packed'}
        className="w-full sm:w-auto order-1 sm:order-2"
        size="sm"
      >
        {actionLoading === 'order-packed' ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : null}
        Bekräfta
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Key Changes:
- **Dialog width**: Use `max-w-[calc(100%-2rem)]` on mobile with margin
- **Title size**: Smaller on mobile (`text-base` vs `text-lg`)
- **Button order**: Primary action first on mobile (better thumb reach), switched on desktop
- **Button size**: Use `size="sm"` for more compact buttons
- **Footer gap**: Consistent `gap-2 sm:gap-3`

---

## 5. Bottom Spacing for Mobile

### Current Status:
The component already has `pb-20 lg:pb-0` on the root container (line ~270), which is good. But we can improve the spacing inside the order detail view.

### Recommended Addition:

```tsx
// Add to the order detail container (around line 413):
{selectedOrder ? (
  /* Order detail */
  <div className="space-y-3 sm:space-y-4 pb-4">
    {/* ... rest of content ... */}
    
    {/* Extra bottom padding for mobile */}
    <div className="h-4 lg:hidden" />
  </div>
) : null}
```

Or better yet, ensure the Products card has proper bottom margin:

```tsx
// For the Total card (around line 580), add margin-bottom:
<Card className="mb-4 lg:mb-0">
  <CardContent className="py-3 sm:py-4 px-3 sm:px-6">
    ...
  </CardContent>
</Card>
```

---

## Summary of Changes

| Element | Mobile Change | Desktop Change |
|---------|--------------|----------------|
| **Header** | Icon-only buttons, full-width primary action | Keep text labels |
| **Product Image** | `w-14 h-14` | `w-20 h-20` |
| **Product Padding** | `p-2` | `p-3` |
| **Product Buttons** | `size="icon"` `h-8 w-8` | `size="icon"` `h-9 w-9` |
| **Card Padding** | Tighter (`pt-2.5 pb-1.5`) | Standard |
| **Card Titles** | Icon only | Icon + text |
| **Dialog** | Full-width, small buttons | Centered, standard |
| **Bottom Spacing** | `pb-20` container + extra padding | Normal spacing |

---

## Additional Recommendations

1. **Add tooltips** for icon-only buttons to help users learn the interface:
```tsx
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <Button size="icon" variant="outline" ...>
        <ArrowLeft className="h-4 w-4" />
      </Button>
    </TooltipTrigger>
    <TooltipContent>
      <p>Tillbaka</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

2. **Consider a swipe gesture** for marking items as packed on mobile (advanced).

3. **Add a sticky "Markera packad" button** at the bottom of the screen on mobile for easy access.

4. **Test with actual devices** - the Chrome mobile emulator is good but real devices may reveal additional issues.
