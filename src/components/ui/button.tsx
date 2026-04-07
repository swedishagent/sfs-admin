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
