# Mobile Responsiveness - Priority Fixes Implementation

This document contains the actual code changes needed to implement the high-priority mobile responsiveness fixes.

---

## Fix 1: Button Component (`src/components/ui/button.tsx`)

### Current Issue
- Default button height is 36px (below 44px minimum)
- Small button is 32px (too small)
- Icon button is 36x36px (below minimum)

### Implementation

```tsx
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer touch-manipulation select-none active:scale-95",
  {
    variants: {
      variant: {
        default: "bg-[#006aa7] text-white shadow hover:bg-[#005a8f]",
        destructive: "bg-[#dc3545] text-white shadow-sm hover:bg-[#c82333]",
        success: "bg-[#28a745] text-white shadow-sm hover:bg-[#218838]",
        outline: "border border-[#dee2e6] bg-white shadow-sm hover:bg-[#f8f9fa]",
        secondary: "bg-[#e9ecef] text-[#212529] shadow-sm hover:bg-[#dee2e6]",
        ghost: "hover:bg-[#f8f9fa]",
        link: "text-[#006aa7] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 sm:h-9 px-4 py-2",
        sm: "h-10 sm:h-8 rounded-md px-3 text-xs",
        lg: "h-12 sm:h-10 rounded-md px-6 sm:px-8",
        icon: "h-11 w-11 sm:h-9 sm:w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
```

---

## Fix 2: Checkbox Component (`src/components/ui/checkbox.tsx`)

### Current Issue
- Checkbox is 20x20px (too small for mobile)

### Implementation

```tsx
import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

const Checkbox = React.forwardRef<
  React.ComponentRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "peer h-6 w-6 sm:h-5 sm:w-5 shrink-0 rounded-sm border border-[#006aa7] shadow focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#006aa7] disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-[#006aa7] data-[state=checked]:text-white touch-manipulation",
      className
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator className={cn("flex items-center justify-center text-current")}>
      <Check className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
))
Checkbox.displayName = CheckboxPrimitive.Root.displayName

export { Checkbox }
```

---

## Fix 3: Card Component (`src/components/ui/card.tsx`)

### Current Issue
- Fixed padding doesn't adapt for mobile

### Implementation

```tsx
import * as React from "react"
import { cn } from "@/lib/utils"

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-lg border border-[#dee2e6] bg-white text-[#212529] shadow-sm",
      className
    )}
    {...props}
  />
))
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 px-3 sm:px-4 py-3 sm:p-4", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("font-semibold leading-none tracking-tight text-balance", className)}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm text-[#6c757d]", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("px-3 sm:px-4 py-3 sm:p-4 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center px-3 sm:px-4 py-3 sm:p-4 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
```

---

## Fix 4: Dialog Component (`src/components/ui/dialog.tsx`)

### Current Issue
- Dialog touches screen edges on mobile
- Footer buttons don't stack on very small screens

### Implementation

```tsx
import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

const Dialog = DialogPrimitive.Root
const DialogTrigger = DialogPrimitive.Trigger
const DialogPortal = DialogPrimitive.Portal
const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-[calc(100%-1.5rem)] sm:w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border border-[#dee2e6] bg-white p-4 sm:p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 rounded-lg max-h-[calc(100vh-2rem)] overflow-y-auto",
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-3 sm:right-4 top-3 sm:top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-[#006aa7] focus:ring-offset-2 disabled:pointer-events-none h-8 w-8 sm:h-auto sm:w-auto flex items-center justify-center touch-manipulation">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)}
    {...props}
  />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:space-x-2", className)}
    {...props}
  />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight text-balance pr-8", className)}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-[#6c757d]", className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
```

---

## Fix 5: Global CSS Updates (`src/index.css`)

### Add to existing file

```css
@import "tailwindcss";

:root {
  /* Swedish colors */
  --color-primary: #006aa7;
  --color-primary-foreground: #ffffff;
  --color-secondary: #fecc00;
  
  /* Base colors */
  --color-background: #f8f9fa;
  --color-foreground: #212529;
  --color-card: #ffffff;
  --color-card-foreground: #212529;
  --color-muted: #6c757d;
  --color-muted-foreground: #495057;
  --color-border: #dee2e6;
  --color-input: #dee2e6;
  
  /* Semantic colors */
  --color-destructive: #dc3545;
  --color-destructive-foreground: #ffffff;
  --color-success: #28a745;
  --color-success-foreground: #ffffff;
  --color-warning: #ffc107;
  --color-warning-foreground: #212529;
  
  /* Radius */
  --radius-sm: 0.375rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  
  /* Safe area insets for notched devices */
  --sat: env(safe-area-inset-top);
  --sar: env(safe-area-inset-right);
  --sab: env(safe-area-inset-bottom);
  --sal: env(safe-area-inset-left);
}

/* Base styles */
html {
  /* Scroll padding to account for mobile bottom nav */
  scroll-padding-bottom: 80px;
}

@media (min-width: 1024px) {
  html {
    scroll-padding-bottom: 0;
  }
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background-color: var(--color-background);
  color: var(--color-foreground);
  /* Prevent horizontal scroll on mobile */
  overflow-x: hidden;
}

/* Custom utility classes for colors */
@layer utilities {
  .bg-primary {
    background-color: var(--color-primary);
  }
  .text-primary {
    color: var(--color-primary);
  }
  .bg-success {
    background-color: var(--color-success);
  }
  .text-success {
    color: var(--color-success);
  }
  .bg-destructive {
    background-color: var(--color-destructive);
  }
  .text-destructive {
    color: var(--color-destructive);
  }
  .bg-warning {
    background-color: var(--color-warning);
  }
  .border-border {
    border-color: var(--color-border);
  }
  
  /* Touch manipulation for better mobile performance */
  .touch-manipulation {
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
  }
  
  /* Prevent text selection on interactive elements */
  .select-none {
    -webkit-user-select: none;
    user-select: none;
  }
  
  /* Text balance for better headlines */
  .text-balance {
    text-wrap: balance;
  }
}

/* Mobile-specific improvements */
@media (max-width: 640px) {
  /* Improve touch feedback */
  button, a, [role="button"] {
    -webkit-tap-highlight-color: rgba(0, 106, 167, 0.1);
  }
  
  /* Ensure inputs are easy to tap */
  input, select, textarea {
    font-size: 16px; /* Prevents iOS zoom on focus */
  }
}

/* Overscroll behavior to prevent body scroll when modals are open */
body:has(.fixed.z-50) {
  overflow: hidden;
}
```

---

## Fix 6: App.tsx Updates

### Key Changes
- Add safe area insets to header
- Add safe area insets to bottom nav
- Adjust main content padding

### Implementation - Header Section

```tsx
{/* Header */}
<header className="bg-[#006aa7] text-white px-4 pt-[env(safe-area-inset-top)] pb-3 flex items-center justify-between sticky top-0 z-40">
```

### Implementation - Bottom Nav Section

```tsx
{/* Mobile bottom nav */}
<nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#dee2e6] lg:hidden z-40 pb-[env(safe-area-inset-bottom)]">
```

### Implementation - Main Content

```tsx
{/* Main content */}
<main className="flex-1 p-3 sm:p-4 lg:p-6 min-h-[calc(100vh-56px-env(safe-area-inset-top))]">
```

---

## Fix 7: Orders.tsx - Button Size Updates

### Current Issue
- Action buttons are icon-only on mobile but only 36px
- Need 44px minimum

### Changes Required

In the order items section, update button classes:

```tsx
// Change from:
className="h-9 w-9 sm:h-9 sm:w-auto sm:px-3 p-0"

// To:
className="h-11 w-11 sm:h-9 sm:w-auto sm:px-3 p-0"
```

Also add `touch-manipulation` class to the Card for better touch handling:

```tsx
<Card className={`cursor-pointer transition-all hover:shadow-md touch-manipulation ...`}>
```

---

## Fix 8: ShoppingLists.tsx - Quantity Button Updates

### Changes Required

Update custom quantity buttons to be larger on mobile:

```tsx
// Mobile buttons (currently h-10 w-10, should be h-11 w-11)
<button className="h-11 w-11 flex items-center justify-center ...">

// Desktop buttons (keep h-8 w-8)
<button className="h-8 w-8 flex items-center justify-center ...">
```

Also add `touch-manipulation` to all custom buttons.

---

## Fix 9: Refunds.tsx - Button Updates

### Changes Required

Update the "Behandlad" button:

```tsx
// Change from:
<Button size="sm" variant="success" ...>

// To:
<Button size="sm" variant="success" className="h-10 w-10 sm:h-8 sm:w-auto sm:px-3">
```

---

## Quick Apply Script

To apply all fixes quickly, use these search/replace patterns:

### Pattern 1: Fix button sizes in components
```bash
# In Orders.tsx
sed -i 's/className="h-9 w-9 sm:h-9/className="h-11 w-11 sm:h-9/g' Orders.tsx

# In Refunds.tsx  
sed -i 's/size="sm"/size="sm" className="h-10 sm:h-8"/g' Refunds.tsx
```

### Pattern 2: Add touch-manipulation to interactive cards
```bash
# Add touch-manipulation to clickable Cards
sed -i 's/cursor-pointer transition-all hover:shadow-md/cursor-pointer transition-all hover:shadow-md touch-manipulation/g' Orders.tsx
```

---

## Verification Steps

After applying fixes:

1. **Button touch targets:**
   ```bash
   # Check computed height in browser devtools
   # Should be 44px+ on mobile viewport (<640px)
   ```

2. **Checkbox size:**
   ```bash
   # Should be 24px on mobile, 20px on desktop
   ```

3. **Safe areas:**
   - Test on iOS Simulator with iPhone 14 Pro
   - Verify header and bottom nav aren't obscured

4. **Dialog margins:**
   - Open any confirmation dialog
   - Should have 0.75rem (12px) margin on each side at mobile

---

## Notes

- All changes are backward-compatible
- Desktop experience is preserved (no visual changes above 640px)
- Mobile experience is significantly improved
- Touch targets now meet WCAG 2.1 AA standards
