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
} from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useState } from 'react'

interface SidebarProps {
  activeItem?: string
}

export function Sidebar({ activeItem }: SidebarProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { logout } = useAuth()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: BarChart3 },
    { id: 'pos', label: 'Punto de Venta', path: '/pos', icon: ShoppingBag },
    { id: 'corte', label: 'Corte de Caja', path: '/corte', icon: Banknote },
    { id: 'inventario', label: 'Inventario', path: '/inventory', icon: ShoppingCart },
    { id: 'usuarios', label: 'Usuarios', path: '/users', icon: Users },
    { id: 'configuracion', label: 'Configuración', path: '/configuracion', icon: Settings },
  ]

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
      <aside className="hidden md:flex w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 min-h-screen flex-col">
        <div className="p-6 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-lime-500 dark:bg-lime-600 rounded-full flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900 dark:text-white">Bikini Store</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Sistema de Inventario</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4">
          {menuItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item)
            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-lime-50 text-lime-600 dark:bg-lime-950/50 dark:text-lime-400'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white'
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? 'text-lime-500 dark:text-lime-400' : 'text-gray-400 dark:text-gray-500'}`} />
                {item.label}
              </button>
            )
          })}
        </nav>

        <div className="p-4 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white transition-colors"
          >
            <LogOut className="w-5 h-5 text-gray-400 dark:text-gray-500" />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* MOBILE */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 z-40">
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-lime-500 dark:bg-lime-600 rounded-full flex items-center justify-center">
              <ShoppingCart className="w-4 h-4 text-white" />
            </div>
            <h1 className="font-bold text-sm text-gray-900 dark:text-white">Bikini Store</h1>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition text-gray-700 dark:text-gray-200"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {isMobileMenuOpen && (
          <nav className="border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 max-h-[calc(100vh-72px)] overflow-y-auto p-4 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item)
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item.path)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'bg-lime-50 text-lime-600 dark:bg-lime-950/50 dark:text-lime-400'
                      : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </button>
              )
            })}
            <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors"
              >
                <LogOut className="w-5 h-5 text-gray-400" />
                Cerrar Sesión
              </button>
            </div>
          </nav>
        )}
      </div>
    </>
  )
}
