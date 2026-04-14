import { TrendingUp, TrendingDown, DollarSign, Package, ShoppingCart, Users } from 'lucide-react'
import { Sidebar } from '../components/Sidebar'

const stats = [
  {
    title: 'Ventas Hoy',
    value: '$12,450',
    change: '+12.5%',
    trend: 'up',
    icon: DollarSign,
    color: 'bg-blue-500',
  },
  {
    title: 'Productos',
    value: '1,234',
    change: '+5.2%',
    trend: 'up',
    icon: Package,
    color: 'bg-lime-500',
  },
  {
    title: 'Ventas del Mes',
    value: '856',
    change: '-2.1%',
    trend: 'down',
    icon: ShoppingCart,
    color: 'bg-orange-500',
  },
  {
    title: 'Clientes',
    value: '2,450',
    change: '+8.4%',
    trend: 'up',
    icon: Users,
    color: 'bg-purple-500',
  },
] as const

const recentSales = [
  { id: '#001', product: 'Bikini Rojo Floral', quantity: 2, total: '$89.98', status: 'Completado' },
  { id: '#002', product: 'Traje de Bano Negro', quantity: 1, total: '$45.50', status: 'Pendiente' },
  { id: '#003', product: 'Bikini Azul Marino', quantity: 3, total: '$134.97', status: 'Completado' },
  { id: '#004', product: 'Cover Up Blanco', quantity: 1, total: '$32.00', status: 'Completado' },
  { id: '#005', product: 'Bikini Verde Tropical', quantity: 2, total: '$78.00', status: 'Pendiente' },
]

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col md:flex-row">
      <Sidebar activeItem="dashboard" />

      <main className="flex-1 overflow-auto md:p-8 p-4 pt-20 md:pt-0">
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm md:text-base">Resumen de tu tienda</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon
            const TrendIcon = stat.trend === 'up' ? TrendingUp : TrendingDown

            return (
              <div key={index} className="bg-white dark:bg-gray-900 p-4 md:p-6 rounded-lg md:rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
                <div className="flex items-center justify-between mb-3 md:mb-4">
                  <div className={`w-10 h-10 md:w-12 md:h-12 ${stat.color} rounded-lg flex items-center justify-center`}>
                    <Icon className="w-5 h-5 md:w-6 md:h-6 text-white" />
                  </div>
                  <div
                    className={`flex items-center gap-1 text-xs md:text-sm ${
                      stat.trend === 'up' ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    <TrendIcon className="w-4 h-4" />
                    {stat.change}
                  </div>
                </div>

                <h3 className="text-gray-500 dark:text-gray-400 text-xs md:text-sm font-medium">{stat.title}</h3>
                <p className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
              </div>
            )
          })}
        </div>

        {/* Table - Desktop */}
        <div className="hidden md:block bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
          <div className="p-6 border-b border-gray-100 dark:border-gray-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Ventas Recientes</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800/80">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Producto
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Cantidad
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Estado
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {recentSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100 font-medium">{sale.id}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{sale.product}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{sale.quantity}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100 font-medium">{sale.total}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${
                          sale.status === 'Completado'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200'
                        }`}
                      >
                        {sale.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cards - Mobile */}
        <div className="md:hidden space-y-4 pb-8">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-100 dark:border-gray-800 p-4">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Ventas Recientes</h2>
          </div>
          {recentSales.map((sale) => (
            <div key={sale.id} className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-100 dark:border-gray-800 p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-mono text-gray-500 dark:text-gray-400">{sale.id}</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{sale.product}</p>
                </div>
                <span
                  className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${
                    sale.status === 'Completado'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
                      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200'
                  }`}
                >
                  {sale.status}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Cantidad</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{sale.quantity}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Total</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{sale.total}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
