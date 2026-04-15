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
  Moon,
  Sun,
  ReceiptText,
} from 'lucide-react'

import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../context/ThemeContext'
import { useState } from 'react'

interface SidebarProps {
  activeItem?: string
}

/* ---------------- THEME ---------------- */
function ThemeRow() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <div className="flex items-center justify-between gap-3 px-1 py-1">
      <div className="flex items-center gap-2">
        {isDark ? (
          <Moon className="w-4 h-4 text-indigo-300" />
        ) : (
          <Sun className="w-4 h-4 text-amber-500" />
        )}
        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
          Modo oscuro
        </span>
      </div>
      <ThemeToggle />
    </div>
  )
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      onClick={toggleTheme}
      className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${
        isDark ? 'bg-lime-600' : 'bg-gray-300'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform bg-white rounded-full transition ${
          isDark ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}

/* ---------------- SIDEBAR ---------------- */
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
    { id: 'reportes', label: 'Reportes', path: '/reports', icon: ReceiptText },
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

  const isActive = (item: any) =>
    activeItem ? item.id === activeItem : location.pathname === item.path

  return (
    <>
      {/* DESKTOP */}
      <aside className="hidden md:flex w-64 bg-white dark:bg-gray-900 border-r dark:border-gray-800 min-h-screen flex-col">
        <div className="p-6 border-b dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-lime-500 rounded-full flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold dark:text-white">Bikini Store</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Sistema de Inventario
              </p>
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
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg ${
                  active
                    ? 'bg-lime-50 text-lime-600 dark:bg-lime-900 dark:text-lime-400'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </button>
            )
          })}
        </nav>

        <div className="p-4 border-t dark:border-gray-800 space-y-3">
          <ThemeRow />

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg"
          >
            <LogOut className="w-5 h-5" />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* MOBILE */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white dark:bg-gray-900 border-b dark:border-gray-800">
        <div className="p-4 flex justify-between items-center">
          <h1 className="font-bold dark:text-white">Bikini Store</h1>

          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {isMobileMenuOpen && (
          <div className="p-4 space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item.path)}
                  className="w-full flex items-center gap-3 px-4 py-2"
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </button>
              )
            })}

            <ThemeRow />

            <button onClick={handleLogout} className="w-full flex gap-2">
              <LogOut />
              Cerrar Sesión
            </button>
          </div>
        )}
      </div>
    </>
  )
}