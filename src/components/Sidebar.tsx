import {
  ShoppingCart,
  ShoppingBag,
  BarChart3,
  Settings,
  LogOut,
  Users,
  Menu,
  X,
  Banknote,
  FileText,
  ChevronLeft,
} from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useSettings } from '../context/SettingsContext'
import { AppBrandLogo, AppBrandMark } from './AppBrandLogo'
import { useState, useEffect } from 'react'
import { getResolvedBranding } from '../constants/branding'
import type { ModuleKey } from '../auth/permissions'

interface SidebarProps {
  activeItem?: string
}

// ✅ Mover Tooltip FUERA del componente Sidebar
const Tooltip = ({ children, label, isCollapsed }: { 
  children: React.ReactNode; 
  label: string; 
  isCollapsed: boolean 
}) => {
  if (!isCollapsed) return <>{children}</>
  
  return (
    <div className="relative group">
      {children}
      <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-md whitespace-nowrap z-50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        {label}
      </div>
    </div>
  )
}

export function Sidebar({ activeItem }: SidebarProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { logout, hasModuleAccess } = useAuth()
  const { settings, updateUI } = useSettings()
  const branding = getResolvedBranding(settings)
  const isCollapsed = settings.ui.sidebarCollapsed
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)

  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [location.pathname])

  const menuItems: Array<{
    id: string
    label: string
    path: string
    icon: typeof BarChart3
    moduleKey: ModuleKey
    requiredAccess?: 'view' | 'full'
  }> = [
    { id: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: BarChart3, moduleKey: 'dashboard' },
    { id: 'pos', label: 'Punto de Venta', path: '/pos', icon: ShoppingBag, moduleKey: 'pos', requiredAccess: 'full' },
    { id: 'corte', label: 'Corte de Caja', path: '/corte', icon: Banknote, moduleKey: 'corte', requiredAccess: 'view' },
    { id: 'inventario', label: 'Inventario', path: '/inventory', icon: ShoppingCart, moduleKey: 'inventory', requiredAccess: 'view' },
    { id: 'reportes', label: 'Reportes', path: '/reports', icon: FileText, moduleKey: 'reports' },
    { id: 'usuarios', label: 'Usuarios', path: '/users', icon: Users, moduleKey: 'users' },
    { id: 'configuracion', label: 'Configuracion', path: '/configuracion', icon: Settings, moduleKey: 'configuracion' },
  ]
  const visibleItems = menuItems.filter((item) =>
    hasModuleAccess(item.moduleKey, item.requiredAccess || 'view'),
  )

  const handleNavigate = (path: string) => {
    navigate(path)
    setIsMobileMenuOpen(false)
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const isActive = (item: (typeof menuItems)[number]) =>
    activeItem ? item.id === activeItem : location.pathname === item.path

  return (
    <>
      {/* DESKTOP */}
      <aside
        className={`hidden md:flex bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 min-h-screen flex-col transition-all duration-300 ease-in-out relative ${
          isCollapsed ? 'w-[72px]' : 'w-64'
        }`}
      >
        {/* Logo Section */}
        <div
          className={`border-b border-gray-100 dark:border-gray-800 transition-all duration-300 ${
            isCollapsed ? 'py-4' : 'p-6'
          }`}
        >
          <AppBrandMark
            collapsed={isCollapsed}
            titleClassName="font-bold text-gray-900 dark:text-white truncate"
            subtitleClassName="text-xs text-gray-500 dark:text-gray-400 truncate"
          />
        </div>

        {/* Toggle Button */}
        <button
          onClick={() => updateUI({ sidebarCollapsed: !isCollapsed })}
          className={`absolute -right-3 top-20 z-10 w-6 h-6 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-md flex items-center justify-center transition-all hover:scale-110 ${
            isCollapsed ? 'rotate-0' : 'rotate-180'
          }`}
          title={isCollapsed ? 'Expandir menú' : 'Colapsar menú'}
        >
          <ChevronLeft className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" />
        </button>

        {/* Navigation */}
        <nav className={`flex-1 py-6 ${isCollapsed ? 'px-2' : 'px-4'}`}>
          <div className="space-y-1.5">
            {visibleItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item)
              return (
                <Tooltip key={item.id} label={item.label} isCollapsed={isCollapsed}>
                  <button
                    onClick={() => handleNavigate(item.path)}
                    onMouseEnter={() => setHoveredItem(item.id)}
                    onMouseLeave={() => setHoveredItem(null)}
                    className={`
                      w-full flex items-center gap-3 rounded-xl font-medium transition-all duration-200
                      ${isCollapsed ? 'justify-center py-3' : 'px-4 py-2.5 text-sm'}
                      ${active
                        ? 'bg-gradient-to-r from-lime-50 to-lime-100/50 text-lime-700 dark:from-lime-950/50 dark:to-transparent dark:text-lime-400'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white'
                      }
                      ${hoveredItem === item.id && !active && !isCollapsed ? 'translate-x-0.5' : ''}
                    `}
                  >
                    <Icon
                      className={`flex-shrink-0 transition-all duration-200 ${
                        isCollapsed ? 'w-5 h-5' : 'w-5 h-5'
                      } ${
                        active
                          ? 'text-lime-600 dark:text-lime-400'
                          : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300'
                      }`}
                    />
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </button>
                </Tooltip>
              )
            })}
          </div>
        </nav>

        {/* Logout Button */}
        <div className={`border-t border-gray-100 dark:border-gray-800 py-4 ${isCollapsed ? 'px-2' : 'px-4'}`}>
          <Tooltip label="Cerrar Sesión" isCollapsed={isCollapsed}>
            <button
              onClick={handleLogout}
              className={`
                w-full flex items-center gap-3 rounded-xl font-medium transition-all duration-200
                ${isCollapsed ? 'justify-center py-3' : 'px-4 py-2.5 text-sm'}
                text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30
              `}
            >
              <LogOut className={`flex-shrink-0 transition-all ${isCollapsed ? 'w-5 h-5' : 'w-5 h-5'}`} />
              {!isCollapsed && <span className="truncate">Cerrar Sesión</span>}
            </button>
          </Tooltip>
        </div>
      </aside>

      {/* MOBILE HEADER */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 z-50">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <AppBrandLogo size="sm" withShadow={false} />
            <h1 className="font-bold text-gray-900 dark:text-white truncate">{branding.appName}</h1>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors active:scale-95"
            aria-expanded={isMobileMenuOpen}
            aria-label="Menú de navegación"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* MOBILE DRAWER - outside header to avoid backdrop-filter containing block */}
      <div
        className={`
          md:hidden fixed inset-x-0 top-[57px] bottom-0 bg-white dark:bg-gray-900
          transform transition-transform duration-300 ease-in-out z-40
          ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full pointer-events-none'}
        `}
      >
        <div className="h-full overflow-y-auto overscroll-contain">
          <div className="p-4 space-y-1">
            {visibleItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item)
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item.path)}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-base font-medium transition-all active:scale-[0.98]
                    ${active
                      ? 'bg-gradient-to-r from-lime-50 to-lime-100/50 text-lime-700 dark:from-lime-950/50 dark:to-transparent dark:text-lime-400'
                      : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800'
                    }
                  `}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  {item.label}
                  {active && (
                    <div className="ml-auto w-2 h-2 rounded-full bg-lime-500 dark:bg-lime-400" />
                  )}
                </button>
              )
            })}
            
            <div className="pt-4 mt-4 border-t border-gray-100 dark:border-gray-800">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-base font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30 transition-colors active:scale-[0.98]"
              >
                <LogOut className="w-5 h-5" />
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE BACKDROP */}
      {isMobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/30 z-30"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  )
}

