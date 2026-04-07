import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SpinnerProps {
  className?: string
  size?: 'sm' | 'default' | 'lg'
}

const sizeClasses = {
  sm: 'h-4 w-4',
  default: 'h-5 w-5',
  lg: 'h-8 w-8',
}

export function Spinner({ className, size = 'default' }: SpinnerProps) {
  return (
    <Loader2 
      className={cn('animate-spin text-primary', sizeClasses[size], className)} 
      aria-label="Laddar..."
    />
  )
}

export function FullPageSpinner() {
  return (
    <div className="flex items-center justify-center h-64" role="status">
      <Spinner size="lg" />
      <span className="sr-only">Laddar...</span>
    </div>
  )
}
