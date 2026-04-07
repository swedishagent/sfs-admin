# SFS-Admin Mobile Design System

## Overview

This document defines a unified mobile design system for the sfs-admin application, ensuring consistent UX across all pages on mobile devices while maintaining the existing desktop experience.

---

## 1. Bottom Navigation Bar (Mobile Only)

### Current Implementation
The bottom navigation is already implemented in `App.tsx` with a fixed position bar containing 3 navigation items.

### Specification

```tsx
// Location: App.tsx - Fixed bottom navigation
<nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#dee2e6] lg:hidden z-40">
  <div className="flex">
    {navItems.map(item => (
      <button
        key={item.id}
        className={`flex-1 flex flex-col items-center py-2 text-xs ${
          currentView === item.id 
            ? 'text-[#006aa7]' 
            : 'text-[#6c757d]'
        }`}
        onClick={() => setCurrentView(item.id)}
      >
        <item.icon className="h-5 w-5 mb-1" />
        {item.label}
      </button>
      ))}
  </div>
</nav>
```

### Design Tokens
- **Height**: `py-2` (comfortable touch target)
- **Icon size**: `h-5 w-5`
- **Label size**: `text-xs`
- **Active color**: `text-[#006aa7]` (Swedish blue)
- **Inactive color**: `text-[#6c757d]` (muted gray)
- **Background**: `bg-white`
- **Border**: `border-t border-[#dee2e6]`
- **Z-index**: `z-40` (above content, below modals)

### Safe Area Support
```css
/* Add to index.css for notched devices */
.pb-safe {
  padding-bottom: max(1rem, env(safe-area-inset-bottom));
}
```

---

## 2. Sidebar Behavior

### Mobile (< 1024px)
- **Type**: Slide-out drawer overlay
- **Width**: `w-56` (224px)
- **Animation**: `transform transition-transform duration-200 ease-in-out`
- **Backdrop**: Black overlay at 50% opacity (`bg-black/50`)
- **Close trigger**: Click backdrop or select item
- **Z-index**: `z-30` (below header, above content)

```tsx
// Mobile sidebar pattern
<aside className={`
  fixed inset-y-0 left-0 z-30 w-56 bg-white border-r border-[#dee2e6] 
  pt-16 transform transition-transform duration-200 ease-in-out
  lg:relative lg:translate-x-0 lg:pt-0
  ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
`}>
  {/* Nav items */}
</aside>

{/* Overlay */}
{sidebarOpen && (
  <div 
    className="fixed inset-0 bg-black/50 z-20 lg:hidden"
    onClick={() => setSidebarOpen(false)}
  />
)}
```

### Desktop (≥ 1024px)
- **Type**: Persistent sidebar
- **Position**: Relative (in flow)
- **Visibility**: Always visible (`lg:translate-x-0`)

---

## 3. Header/Toolbar Patterns

### Page Header Structure
Every page should follow this consistent header pattern:

```tsx
// Two-row header pattern for detail views
<div className="flex flex-col gap-3">
  {/* Row 1: Back button + Title */}
  <div className="flex items-center gap-3">
    <Button variant="outline" size="sm" onClick={onBack} className="shrink-0">
      <ArrowLeft className="h-4 w-4 mr-2" />
      Tillbaka
    </Button>
    <h2 className="text-lg sm:text-xl font-semibold flex-1 truncate">
      Page Title
    </h2>
  </div>
  
  {/* Row 2: Action buttons */}
  <div className="flex justify-between gap-2">
    <Button variant="outline" size="sm">Secondary Action</Button>
    <Button>Primary Action</Button>
  </div>
</div>
```

### List View Toolbar
```tsx
<div className="flex flex-wrap gap-2 items-center">
  {/* Filters/Selects */}
  <Select>
    <SelectTrigger className="w-full sm:w-48">
      <SelectValue />
    </SelectTrigger>
  </Select>
  
  {/* Contextual actions */}
  {hasSelection && (
    <Button size="sm">
      Action ({selectionCount})
    </Button>
  )}
  
  {/* Spacer */}
  <div className="flex-1"></div>
  
  {/* Global actions */}
  <Button variant="outline" size="sm">
    <RefreshCw className="h-4 w-4 mr-2" />
    Uppdatera
  </Button>
</div>
```

---

## 4. Button Sizes and Touch Targets

### Button Component Specification

| Size | Mobile | Desktop | Use Case |
|------|--------|---------|----------|
| Default | `h-11` (44px) | `h-9` (36px) | Primary actions |
| Small | `h-10` (40px) | `h-8` (32px) | Secondary actions |
| Large | `h-12` (48px) | `h-10` (40px) | Important CTAs |
| Icon | `h-11 w-11` | `h-9 w-9` | Icon-only buttons |

### Mobile Touch Target Guidelines
- **Minimum touch target**: 44×44px (Apple HIG) / 48×48px (Material Design)
- **Our standard**: 44px minimum (`h-11`)
- **High-frequency actions**: 48px (`h-12`)

### Icon-Only Button Pattern
Use for actions where the icon is universally understood:

```tsx
// Compact icon-only button for mobile
<Button
  size="sm"
  variant="success"
  className="h-11 w-11 p-0"  // Square touch target
  aria-label="Markera som packad"
>
  <Check className="h-5 w-5" />
</Button>

// Desktop shows text
<Button
  size="sm"
  variant="success"
  className="h-9 w-auto sm:px-3 p-0"
>
  <Check className="h-4 w-4" />
  <span className="hidden sm:inline ml-1">Packad</span>
</Button>
```

### Text Button Pattern
Use when clarity is more important than space:

```tsx
// Always show text
<Button size="sm">
  <ShoppingCart className="h-4 w-4 mr-2" />
  Skapa inköpslista ({count})
</Button>
```

### Icon + Text Decision Matrix

| Action | Mobile | Desktop |
|--------|--------|---------|
| Packad/Köpt | Icon-only with aria-label | Icon + text |
| Saknas/Hoppa över | Icon-only with aria-label | Icon + text |
| Ångra | Icon-only | Icon + text |
| Skapa/Generera | Text only (may include icon) | Text + icon |
| Uppdatera | Icon-only or text | Text + icon |
| Slutför/Primary | Full text button | Full text button |

---

## 5. Card Padding and Spacing

### Card Component Spacing

| Element | Mobile | Desktop |
|---------|--------|---------|
| Card padding | `p-4` | `p-6` |
| Card header padding | `px-3 sm:px-4 py-3 sm:p-4` | `p-6 pb-2` |
| Card content padding | `px-3 sm:px-4 py-3 sm:p-4 pt-0` | `p-6 pt-0` |
| Card footer padding | `px-3 sm:px-4 py-3 sm:p-4 pt-0` | `p-6 pt-0` |

### Spacing Scale

| Token | Value | Usage |
|-------|-------|-------|
| `space-y-3` | 12px | Between cards in list |
| `space-y-4` | 16px | Between sections |
| `gap-2` | 8px | Between related buttons |
| `gap-3` | 12px | Between form elements |
| `gap-4` | 16px | Between grid items |

### Page Content Spacing
```tsx
// Standard page container
<div className="space-y-4 pb-20 lg:pb-0">
  {/* Toolbar */}
  <div className="flex flex-wrap gap-2">
    {/* ... */}
  </div>
  
  {/* Content */}
  <div className="space-y-3">
    {/* Cards... */}
  </div>
</div>
```

Note: `pb-20 lg:pb-0` accounts for the fixed bottom navigation on mobile.

---

## 6. Typography Hierarchy on Small Screens

### Type Scale

| Element | Mobile | Desktop | Weight | Color |
|---------|--------|---------|--------|-------|
| Page title | `text-lg` (18px) | `text-xl` (20px) | `font-semibold` | `#212529` |
| Section title | `text-base` (16px) | `text-lg` (18px) | `font-semibold` | `#212529` |
| Card title | `text-sm` (14px) | `text-base` (16px) | `font-medium` | `#212529` |
| Body text | `text-sm` (14px) | `text-sm` (14px) | `font-normal` | `#212529` |
| Muted text | `text-xs` (12px) | `text-xs` (12px) | `font-normal` | `#6c757d` |
| Label | `text-xs` (12px) | `text-xs` (12px) | `font-medium` | `#6c757d` |
| Bottom nav | `text-xs` (12px) | - | `font-normal` | active: `#006aa7`, inactive: `#6c757d` |

### Typography Patterns

```tsx
// Page title with truncation
<h2 className="text-lg sm:text-xl font-semibold flex-1 truncate">
  Order #{orderId}
</h2>

// Multi-line text truncation
<div className="font-medium text-sm leading-tight line-clamp-2">
  {productName}
</div>

// Monospace for SKUs
<span className="font-mono text-xs">{sku}</span>

// Text balance for headings
<CardTitle className="text-balance">
  {longTitle}
</CardTitle>
```

---

## 7. Icon Usage Guidelines

### Icon Sizes

| Context | Mobile | Desktop |
|---------|--------|---------|
| Inline with text | `h-4 w-4` | `h-4 w-4` |
| List item leading | `h-5 w-5` | `h-5 w-5` |
| Bottom navigation | `h-5 w-5` | - |
| Button icon-only | `h-5 w-5` | `h-4 w-4` |
| Large decorative | `h-12 w-12` | `h-12 w-12` |

### Icon + Text Spacing
```tsx
// Standard inline icon
<Button>
  <Icon className="h-4 w-4 mr-2" />
  Button text
</Button>

// Icon with gap utility (alternative)
<Button className="gap-2">
  <Icon className="h-4 w-4" />
  Button text
</Button>
```

---

## 8. Responsive Breakpoints

| Breakpoint | Value | Usage |
|------------|-------|-------|
| `sm` | 640px | Minor adjustments |
| `md` | 768px | Tablet layout changes |
| `lg` | 1024px | Desktop sidebar appears |
| `xl` | 1280px | Wider content areas |

### Common Responsive Patterns

```tsx
// Visibility
className="hidden lg:flex"      // Desktop only
className="lg:hidden"           // Mobile only

// Spacing
className="p-4 lg:p-6"          // Responsive padding
className="text-sm sm:text-base" // Responsive text

// Grid
className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"

// Flex direction
className="flex flex-col sm:flex-row"
```

---

## 9. Color System

### Primary Colors (Swedish Theme)

| Name | Value | Usage |
|------|-------|-------|
| Primary | `#006aa7` | Header, primary buttons, links |
| Primary hover | `#005a8f` | Button hover states |
| Secondary | `#fecc00` | Accents (rarely used) |

### Semantic Colors

| Name | Value | Usage |
|------|-------|-------|
| Success | `#28a745` | Completed states, success buttons |
| Success hover | `#218838` | Success button hover |
| Destructive | `#dc3545` | Errors, danger actions |
| Destructive hover | `#c82333` | Destructive button hover |
| Warning | `#ffc107` | Caution states |

### Neutral Colors

| Name | Value | Usage |
|------|-------|-------|
| Background | `#f8f9fa` | Page background |
| Card | `#ffffff` | Card backgrounds |
| Border | `#dee2e6` | Borders, dividers |
| Muted | `#6c757d` | Secondary text |
| Foreground | `#212529` | Primary text |

---

## 10. Form Elements on Mobile

### Input Fields
```tsx
// Prevent iOS zoom on focus
<Input 
  className="text-base"  // 16px minimum
  // ...
/>
```

### Select/Dropdown
```tsx
// Responsive width
<SelectTrigger className="w-full sm:w-48">
  <SelectValue />
</SelectTrigger>
```

---

## 11. Accessibility Requirements

### Touch Targets
- All interactive elements must be minimum 44×44px
- High-frequency actions should be 48×48px

### Focus States
- Visible focus indicators on all interactive elements
- Focus trap in modals

### Screen Reader Support
```tsx
// Icon-only buttons must have aria-label
<Button 
  className="h-11 w-11 p-0"
  aria-label="Markera som packad"
>
  <Check className="h-5 w-5" />
</Button>

// Decorative icons should be hidden
<Icon className="h-4 w-4" aria-hidden="true" />
```

---

## 12. Complete Page Template

```tsx
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, RefreshCw } from 'lucide-react'

export default function ExamplePage() {
  const [loading, setLoading] = useState(false)
  
  return (
    <div className="space-y-4 pb-20 lg:pb-0">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="shrink-0">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Tillbaka
          </Button>
          <h2 className="text-lg sm:text-xl font-semibold flex-1 truncate">
            Page Title
          </h2>
        </div>
        <div className="flex justify-between gap-2">
          <Button variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Uppdatera
          </Button>
          <Button>Primary Action</Button>
        </div>
      </div>
      
      {/* Content */}
      <div className="space-y-3">
        <Card className="touch-manipulation">
          <CardHeader className="pb-2 pt-3 sm:pt-6 px-3 sm:px-6">
            <CardTitle className="text-sm sm:text-base">Card Title</CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <p className="text-sm text-[#6c757d]">
              Card content goes here
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
```

---

## 13. Implementation Checklist

### App.tsx
- [x] Bottom navigation present on mobile
- [x] Sidebar uses slide-out pattern
- [x] Header is sticky with proper z-index
- [x] Safe area insets handled

### Orders.tsx
- [x] List items have touch-manipulation class
- [x] Icon-only buttons have aria-label
- [x] Responsive grid for desktop table view
- [x] Mobile-first card layout

### ShoppingLists.tsx
- [x] Quantity buttons are 44px touch targets
- [x] Icon-only action buttons on mobile
- [x] Text buttons on desktop
- [x] Proper spacing between items

### Refunds.tsx
- [x] Cards have touch-manipulation class
- [x] Proper use of destructive color for refunds
- [x] Responsive button text

### All Pages
- [x] pb-20 lg:pb-0 on main container
- [x] Consistent header pattern
- [x] Proper loading states
- [x] Error handling with toast notifications

---

## 14. Future Improvements

### Consider Adding
1. **Pull-to-refresh** on mobile lists
2. **Skeleton loaders** instead of spinner for better perceived performance
3. **Swipe actions** on list items (advanced)
4. **Haptic feedback** on action completion
5. **Offline indicators** when connection is lost

### Performance
1. Virtualize long lists with `react-window`
2. Lazy load images with loading="lazy"
3. Preload critical data on hover (desktop)

---

*Last updated: 2026-02-04*
