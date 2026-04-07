import { useState, useEffect } from 'react'
import { WifiOff, Wifi } from 'lucide-react'
import { cn } from '@/lib/utils'

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return isOnline
}

export function OfflineBanner() {
  const isOnline = useOnlineStatus()
  const [showBanner, setShowBanner] = useState(false)
  const [wasOffline, setWasOffline] = useState(false)

  useEffect(() => {
    if (!isOnline) {
      setShowBanner(true)
      setWasOffline(true)
    } else if (wasOffline) {
      // Show "back online" briefly
      const timer = setTimeout(() => {
        setShowBanner(false)
        setWasOffline(false)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [isOnline, wasOffline])

  if (!showBanner) return null

  return (
    <div
      role="alert"
      className={cn(
        'fixed left-0 right-0 z-50 px-4 py-2 text-center text-sm font-medium text-white',
        'transition-all duration-300',
        'top-[calc(var(--sat)+56px)]', // Below header
        isOnline ? 'bg-green-500' : 'bg-amber-500'
      )}
    >
      <div className="flex items-center justify-center gap-2">
        {isOnline ? (
          <>
            <Wifi className="h-4 w-4" />
            <span>Ansluten igen</span>
          </>
        ) : (
          <>
            <WifiOff className="h-4 w-4" />
            <span>Du är offline – vissa funktioner är begränsade</span>
          </>
        )}
      </div>
    </div>
  )
}
