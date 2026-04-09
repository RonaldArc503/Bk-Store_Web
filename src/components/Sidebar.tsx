import { ShoppingCart, Package, ShoppingBag, BarChart3, Settings, LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

interface SidebarProps {
  activeItem?: string
}

export function Sidebar({ activeItem = 'dashboard' }: SidebarProps) {
  const navigate = useNavigate()
  const { logout } = useAuth()

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: BarChart3 },
    { id: 'ventas', label: 'Ventas', path: '/ventas', icon: ShoppingBag },
    { id: 'inventario', label: 'Inventario', path: '/inventory', icon: ShoppingCart },
    { id: 'productos', label: 'Productos', path: '/products', icon: Package },
    { id: 'configuracion', label: 'Configuracion', path: '/configuracion', icon: Settings },
  ]

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleNavigate = (path: string) => {
    navigate(path)
  }

  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-screen flex flex-col">
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-lime-500 rounded-full flex items-center justify-center">
            <ShoppingCart className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-gray-900">Bikini Store</h1>
            <p className="text-xs text-gray-500">Sistema de Inventario</p>
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
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-lime-50 text-lime-600'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-lime-500' : 'text-gray-400'}`} />
                  {item.label}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-gray-100">
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
        >
          <LogOut className="w-5 h-5 text-gray-400" />
          Cerrar Sesion
        </button>
      </div>
    </aside>
  )
}