import { useState, useEffect } from 'react'
import { isAuthenticated, clearAuthToken } from './api'
import { Toaster } from 'sonner'
import { Button } from '@/components/ui/button'
import { Package, ShoppingCart, DollarSign, LogOut, Menu, Truck, X, BarChart3, Scale } from 'lucide-react'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { OfflineBanner } from '@/components/OfflineBanner'
import Login from './components/Login'
import Orders from './components/Orders'
import ShoppingLists from './components/ShoppingLists'
import Refunds from './components/Refunds'
import Shipments from './components/Shipments'
import Analytics from './components/Analytics'
import FreightComparison from './components/FreightComparison'
import './index.css'

type View = 'orders' | 'shopping' | 'refunds' | 'shipments' | 'analytics' | 'freight'

// Main nav items (shown in bottom nav on mobile)
const mainNavItems = [
  { id: 'orders' as View, label: 'Ordrar', icon: Package },
  { id: 'shopping' as View, label: 'Inköpslistor', icon: ShoppingCart },
  { id: 'refunds' as View, label: 'Återbetalningar', icon: DollarSign },
]

// Sidebar-only items (not in bottom nav)
const sidebarOnlyItems = [
  { id: 'shipments' as View, label: 'Frakter', icon: Truck },
  { id: 'freight' as View, label: 'Fraktjämförelse', icon: Scale },
  { id: 'analytics' as View, label: 'Analys', icon: BarChart3 },
]

// All nav items for sidebar
const allNavItems = [...mainNavItems, ...sidebarOnlyItems]

function App() {
  const [authenticated, setAuthenticated] = useState(isAuthenticated())
  const [currentView, setCurrentView] = useState<View>('orders')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [openOrderId, setOpenOrderId] = useState<string | null>(null)
  const [openShipmentTrack, setOpenShipmentTrack] = useState<string | null>(null)

  const handleOpenOrder = (orderId: string) => {
    setOpenOrderId(orderId)
    setCurrentView('orders')
  }

  const handleOrderOpened = () => {
    setOpenOrderId(null)
  }

  const handleOpenShipment = (trackNumber: string) => {
    setOpenShipmentTrack(trackNumber)
    setCurrentView('shipments')
  }

  const handleShipmentOpened = () => {
    setOpenShipmentTrack(null)
  }

  useEffect(() => {
    setAuthenticated(isAuthenticated())
  }, [])

  const handleLogin = () => {
    setAuthenticated(true)
  }

  const handleLogout = () => {
    clearAuthToken()
    setAuthenticated(false)
  }

  if (!authenticated) {
    return (
      <>
        <Toaster position="bottom-center" richColors duration={2000} />
        <Login onLogin={handleLogin} />
      </>
    )
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#f8f9fa]">
        <Toaster 
          position="bottom-center" 
          richColors 
          duration={2000}
          className="!bottom-24 lg:!bottom-4"
        />
        <OfflineBanner />
        
        {/* Header with safe area */}
        <header className="bg-[#006aa7] text-white px-4 pt-[calc(0.75rem+var(--sat))] pb-3 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              className="lg:hidden text-white hover:bg-white/20"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Öppna meny"
              aria-expanded={sidebarOpen}
            >
              <Menu className="h-4 w-4" />
            </Button>
            <h1 className="text-lg font-semibold">
              <span className="hidden sm:inline">🇸🇪 Swedish Food Shop</span>
              <span className="sm:hidden">🇸🇪 SFS Admin</span>
            </h1>
          </div>
          
          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1" aria-label="Huvudnavigation">
            {allNavItems.map(item => (
              <Button
                key={item.id}
                variant="ghost"
                className={`text-white hover:bg-white/20 ${currentView === item.id ? 'bg-white/25' : ''}`}
                onClick={() => setCurrentView(item.id)}
                aria-current={currentView === item.id ? 'page' : undefined}
              >
                <item.icon className="h-4 w-4 mr-2" aria-hidden="true" />
                {item.label}
              </Button>
            ))}
          </nav>

          <Button 
            variant="ghost" 
            size="icon"
            className="text-white hover:bg-white/20"
            onClick={handleLogout}
            aria-label="Logga ut"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
          </Button>
        </header>

        <div className="flex min-w-0 overflow-x-hidden">
          {/* Sidebar */}
          <aside 
            className={`
              fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-[#dee2e6] 
              transform transition-transform duration-200 ease-in-out
              lg:relative lg:translate-x-0
              ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            `}
            aria-label="Sidnavigation"
          >
            {/* Mobile sidebar header */}
            <div className="lg:hidden flex items-center justify-between p-4 border-b border-[#dee2e6] pt-[calc(1rem+var(--sat))]">
              <span className="font-semibold text-[#006aa7]">🇸🇪 Swedish Food Shop</span>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setSidebarOpen(false)}
                aria-label="Stäng meny"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <nav className="p-4 flex flex-col gap-1">
              {allNavItems.map(item => (
                <Button
                  key={item.id}
                  variant={currentView === item.id ? 'default' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => {
                    setCurrentView(item.id)
                    setSidebarOpen(false)
                  }}
                  aria-current={currentView === item.id ? 'page' : undefined}
                >
                  <item.icon className="h-4 w-4 mr-2" aria-hidden="true" />
                  {item.label}
                </Button>
              ))}
            </nav>
          </aside>

          {/* Overlay for mobile sidebar */}
          {sidebarOpen && (
            <div 
              className="fixed inset-0 bg-black/50 z-20 lg:hidden"
              onClick={() => setSidebarOpen(false)}
              aria-hidden="true"
            />
          )}

          {/* Main content with bottom padding for nav + safe area */}
          <main 
            className="flex-1 min-w-0 overflow-x-hidden p-4 pb-[calc(80px+var(--sab))] lg:p-6 lg:pb-6 min-h-[calc(100vh-56px)]"
            id="main-content"
          >
            <div className="max-w-6xl mx-auto min-w-0">
              <ErrorBoundary>
                {currentView === 'orders' && <Orders openOrderId={openOrderId} onOrderOpened={handleOrderOpened} onOpenShipment={handleOpenShipment} />}
                {currentView === 'shopping' && <ShoppingLists />}
                {currentView === 'refunds' && <Refunds />}
                {currentView === 'shipments' && <Shipments onOpenOrder={handleOpenOrder} openTrackNumber={openShipmentTrack} onShipmentOpened={handleShipmentOpened} />}
                {currentView === 'freight' && <FreightComparison />}
                {currentView === 'analytics' && <Analytics />}
              </ErrorBoundary>
            </div>
          </main>
        </div>

        {/* Mobile bottom nav - only main items */}
        <nav 
          className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#dee2e6] lg:hidden z-40 pb-[var(--sab)]"
          aria-label="Huvudnavigation"
        >
          <div className="flex">
            {mainNavItems.map(item => {
              const isActive = currentView === item.id
              return (
                <button
                  key={item.id}
                  className={`
                    flex-1 flex flex-col items-center py-3 text-xs relative
                    transition-colors touch-manipulation
                    ${isActive ? 'text-[#006aa7] font-medium' : 'text-[#6c757d]'}
                  `}
                  onClick={() => setCurrentView(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  aria-label={item.label}
                >
                  {isActive && (
                    <div 
                      className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-[#006aa7] rounded-full"
                      aria-hidden="true"
                    />
                  )}
                  <item.icon 
                    className={`h-6 w-6 mb-1 ${isActive ? 'stroke-[2.5]' : ''}`} 
                    aria-hidden="true" 
                  />
                  {item.label}
                </button>
              )
            })}
          </div>
        </nav>
      </div>
    </ErrorBoundary>
  )
}

export default App
