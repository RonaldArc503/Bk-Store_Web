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
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../context/ThemeContext'
import { useState } from 'react'

interface SidebarProps {
  activeItem?: string
}

function ThemeRow() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <div className="flex items-center justify-between gap-3 px-1 py-1">
      <div className="flex items-center gap-2 min-w-0">
        {isDark ? (
          <Moon className="w-4 h-4 shrink-0 text-indigo-300" aria-hidden />
        ) : (
          <Sun className="w-4 h-4 shrink-0 text-amber-500" aria-hidden />
        )}
        <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">
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
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      onClick={toggleTheme}
      className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-lime-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 ${
        isDark ? 'bg-lime-600' : 'bg-gray-200 dark:bg-gray-600'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          isDark ? 'translate-x-6' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}

export function Sidebar({ activeItem = 'dashboard' }: SidebarProps) {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: BarChart3 },
    { id: 'pos', label: 'Punto de Venta', path: '/pos', icon: ShoppingBag },
    { id: 'corte', label: 'Corte de Caja', path: '/corte', icon: Banknote },
    { id: 'inventario', label: 'Inventario', path: '/inventory', icon: ShoppingCart },
    { id: 'usuarios', label: 'Gestión de Usuarios', path: '/users', icon: Users },
    { id: 'configuracion', label: 'Configuracion', path: '/configuracion', icon: Settings },
  ]

  const navButtonClass = (isActive: boolean) =>
    `w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? 'bg-lime-50 text-lime-600 dark:bg-lime-950/50 dark:text-lime-400'
        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white'
    }`

  const iconClass = (isActive: boolean) =>
    `w-5 h-5 ${isActive ? 'text-lime-500 dark:text-lime-400' : 'text-gray-400 dark:text-gray-500'}`

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleNavigate = (path: string) => {
    navigate(path)
    setIsMobileMenuOpen(false)
  }

  return (
    <>
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
          <ul className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon
              const isActive = activeItem === item.id

              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => handleNavigate(item.path)}
                    className={navButtonClass(isActive)}
                  >
                    <Icon className={iconClass(isActive)} />
                    {item.label}
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="p-4 border-t border-gray-100 dark:border-gray-800 space-y-3">
          <ThemeRow />
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white transition-colors"
          >
            <LogOut className="w-5 h-5 text-gray-400 dark:text-gray-500" />
            Cerrar Sesion
          </button>
        </div>
      </aside>

      <div className="md:hidden fixed top-0 left-0 right-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 z-40">
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-lime-500 dark:bg-lime-600 rounded-full flex items-center justify-center">
              <ShoppingCart className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-sm text-gray-900 dark:text-white">Bikini Store</h1>
            </div>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition text-gray-700 dark:text-gray-200"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {isMobileMenuOpen && (
          <nav className="border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 max-h-[calc(100vh-72px)] overflow-y-auto">
            <ul className="space-y-1 p-4">
              {menuItems.map((item) => {
                const Icon = item.icon
                const isActive = activeItem === item.id

                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => handleNavigate(item.path)}
                      className={navButtonClass(isActive)}
                    >
                      <Icon className={iconClass(isActive)} />
                      {item.label}
                    </button>
                  </li>
                )
              })}
              <li className="pt-3 border-t border-gray-100 dark:border-gray-800">
                <ThemeRow />
              </li>
              <li className="pt-1">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors"
                >
                  <LogOut className="w-5 h-5 text-gray-400" />
                  Cerrar Sesion
                </button>
              </li>
            </ul>
          </nav>
        )}
      </div>
    </>
  )
}
