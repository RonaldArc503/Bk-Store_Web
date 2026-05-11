import { useEffect, useMemo, useState } from 'react'
import { TrendingUp, TrendingDown, DollarSign, Package, ShoppingCart, Users, Minus } from 'lucide-react'
import { Sidebar } from '../components/Sidebar'
import { OrderService } from '../services/OrderService'
import { InventoryService } from '../services/InventoryService'
import { UserService } from '../services/UserService'
import { useSettings } from '../context/SettingsContext'
import type { InventoryStats } from '../types/product'
import { useNavigate } from 'react-router-dom'
import jsPDF from 'jspdf'

type OrderItem = {
  id?: string
  productId?: string
  productoId?: string
  name?: string
  nombre?: string
  quantity?: number
  cantidad?: number
  qty?: number
  unitPrice?: number
  precio?: number
  precioUnitario?: number
  lineTotal?: number
  subtotal?: number
  total?: number
}

type OrderRecord = {
  id: string
  date?: string
  createdAt?: string
  items?: OrderItem[]
  method?: string
  subtotal?: number
  tax?: number
  total?: number
}

type StatCard = {
  title: string
  value: string
  change?: string
  trend?: 'up' | 'down' | 'flat'
  icon: typeof DollarSign
  color: string
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { settings } = useSettings()
  const lowStockThreshold = settings.inventory.lowStockThreshold
  const currency = 'MXN'

  const [orders, setOrders] = useState<OrderRecord[]>([])
  const [inventoryStats, setInventoryStats] = useState<InventoryStats>({
    totalProductos: 0,
    stockTotal: 0,
    alertasStock: 0,
  })
  const [userStats, setUserStats] = useState({
    totalUsuarios: 0,
    usuariosActivos: 0,
    usuariosInactivos: 0,
  })
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<OrderRecord | null>(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      setLoading(true)
      try {
        const [ordersData, inventoryData, usersData] = await Promise.all([
          OrderService.getAllOrders(),
          InventoryService.getInventoryStats(lowStockThreshold),
          UserService.getUserStats(),
        ])

        if (!mounted) return
        setOrders(ordersData as OrderRecord[])
        setInventoryStats(inventoryData)
        setUserStats(usersData)
      } catch (error) {
        console.error('Error loading dashboard data:', error)
      } finally {
        if (mounted) setLoading(false)
      }
    })()

    return () => {
      mounted = false
    }
  }, [lowStockThreshold])

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(value)

  const formatNumber = (value: number) => new Intl.NumberFormat('es-MX').format(value)
  const toNumber = (value: unknown) => {
    const n = Number(value)
    return Number.isFinite(n) ? n : 0
  }
  const toPaymentLabel = (method?: string) => {
    const labels: Record<string, string> = {
      efectivo: 'Efectivo',
      tarjeta: 'Tarjeta',
      transferencia: 'Transferencia',
      qr: 'Código QR',
    }
    return (method && labels[method]) || method || 'Sin método'
  }
  const getItemQuantity = (item: OrderItem) => toNumber(item.quantity ?? item.cantidad ?? item.qty ?? 0)
  const getItemName = (item: OrderItem) => String(item.name ?? item.nombre ?? 'Producto').trim() || 'Producto'
  const getItemSubtotal = (item: OrderItem) => {
    const explicit = toNumber(item.lineTotal ?? item.subtotal ?? item.total)
    if (explicit > 0) return explicit
    const qty = getItemQuantity(item)
    const unit = toNumber(item.unitPrice ?? item.precioUnitario ?? item.precio)
    return qty * unit
  }
  const getItemKey = (item: OrderItem) => {
    const id = String(item.id ?? item.productId ?? item.productoId ?? '').trim()
    if (id) return `id:${id}`
    return `name:${getItemName(item).toLowerCase()}`
  }
  const getOrderSubtotal = (order: OrderRecord) =>
    toNumber(order.subtotal) || (order.items || []).reduce((s, item) => s + getItemSubtotal(item), 0)
  const getOrderTotal = (order: OrderRecord) => toNumber(order.total)
  const getOrderTax = (order: OrderRecord) => {
    const subtotal = getOrderSubtotal(order)
    const total = getOrderTotal(order)
    const tax = toNumber(order.tax)
    if (tax > 0) return tax
    return Math.max(0, total - subtotal)
  }
  const getTicket = (orderId: string) => orderId.slice(-8).toUpperCase()
  const toDateTime = (value?: string) => {
    if (!value) return ''
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return value
    return d.toLocaleString('es-SV')
  }

  const parseDate = (value?: string) => {
    if (!value) return null
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return null
    return d
  }

  const orderDateValue = (order: OrderRecord) => {
    const d = parseDate(order.date || order.createdAt)
    return d ? d.getTime() : 0
  }

  const sumTotals = (list: OrderRecord[]) =>
    list.reduce((sum, order) => sum + Number(order.total || 0), 0)

  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  const startOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate())
  const endOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999)

  const isInRange = (date: Date | null, start: Date, end: Date) => {
    if (!date) return false
    return date >= start && date <= end
  }

  const ordersToday = orders.filter((order) =>
    isInRange(parseDate(order.date || order.createdAt), startOfToday, endOfToday)
  )

  const ordersYesterday = orders.filter((order) =>
    isInRange(parseDate(order.date || order.createdAt), startOfYesterday, endOfYesterday)
  )

  const ordersThisMonth = orders.filter((order) => {
    const d = parseDate(order.date || order.createdAt)
    return d && d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  })

  const ordersLastMonth = orders.filter((order) => {
    const d = parseDate(order.date || order.createdAt)
    if (!d) return false
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    return d.getFullYear() === lastMonth.getFullYear() && d.getMonth() === lastMonth.getMonth()
  })

  const revenueToday = sumTotals(ordersToday)
  const revenueYesterday = sumTotals(ordersYesterday)

  const monthSalesCount = ordersThisMonth.length
  const lastMonthSalesCount = ordersLastMonth.length

  const changePercent = (current: number, previous: number) => {
    if (previous <= 0) return null
    return ((current - previous) / previous) * 100
  }

  const formatChange = (value: number | null) => {
    if (value === null) return undefined
    const sign = value >= 0 ? '+' : ''
    return `${sign}${value.toFixed(1)}%`
  }

  const todayChange = changePercent(revenueToday, revenueYesterday)
  const monthChange = changePercent(monthSalesCount, lastMonthSalesCount)

  const stats: StatCard[] = [
    {
      title: 'Ventas Hoy',
      value: loading ? '...' : formatCurrency(revenueToday),
      change: loading ? undefined : formatChange(todayChange),
      trend: todayChange === null ? 'flat' : todayChange >= 0 ? 'up' : 'down',
      icon: DollarSign,
      color: 'bg-blue-500',
    },
    {
      title: 'Productos',
      value: loading ? '...' : formatNumber(inventoryStats.totalProductos),
      icon: Package,
      color: 'bg-lime-500',
    },
    {
      title: 'Ventas del Mes',
      value: loading ? '...' : formatNumber(monthSalesCount),
      change: loading ? undefined : formatChange(monthChange),
      trend: monthChange === null ? 'flat' : monthChange >= 0 ? 'up' : 'down',
      icon: ShoppingCart,
      color: 'bg-orange-500',
    },
    {
      title: 'Usuarios',
      value: loading ? '...' : formatNumber(userStats.totalUsuarios),
      icon: Users,
      color: 'bg-purple-500',
    },
  ]

  const recentSales = useMemo(() => {
    const sorted = [...orders].sort((a, b) => orderDateValue(b) - orderDateValue(a))
    return sorted.slice(0, 5).map((order) => {
      const items = order.items || []
      const quantity = items.reduce((sum, item) => sum + getItemQuantity(item), 0)
      const firstItem = items[0]
      const extraCount = items.length > 1 ? ` + ${items.length - 1}` : ''
      const product = `${getItemName(firstItem || {})}${extraCount}`

      return {
        id: order.id,
        product,
        quantity,
        total: formatCurrency(Number(order.total || 0)),
        status: 'Completado',
        order,
      }
    })
  }, [orders, currency])

  const downloadOrderReceiptPdf = (order: OrderRecord) => {
    const items = Array.isArray(order.items) ? order.items : []
    const width = 80
    const lineHeight = 5
    const baseHeight = 95
    const height = Math.max(baseHeight, 55 + items.length * lineHeight + 35)
    const subtotal = getOrderSubtotal(order)
    const total = getOrderTotal(order)
    const tax = getOrderTax(order)
    const doc = new jsPDF({ unit: 'mm', format: [width, height] })
    const left = 6
    const right = width - 6
    const font = 8
    let y = 10

    doc.setFontSize(12)
    doc.text('Bikini Store', width / 2, y, { align: 'center' })
    y += 5
    doc.setFontSize(font)
    doc.text(`Ticket: ${getTicket(order.id)}`, left, y)
    y += 4
    doc.text(`Fecha: ${toDateTime(order.date || order.createdAt)}`, left, y)
    y += 4
    doc.text(`Pago: ${toPaymentLabel(order.method)}`, left, y)
    y += 3
    doc.line(left, y, right, y)
    y += 4

    items.forEach((item) => {
      doc.text(`${getItemQuantity(item)} x ${getItemName(item)}`, left, y)
      doc.text(`$${getItemSubtotal(item).toFixed(2)}`, right, y, { align: 'right' })
      y += lineHeight
    })

    y += 2
    doc.line(left, y, right, y)
    y += 4
    doc.text(`Total sin IVA: $${subtotal.toFixed(2)}`, left, y)
    y += 4
    doc.text(`IVA: $${tax.toFixed(2)}`, left, y)
    y += 5
    doc.text(`Total con IVA: $${total.toFixed(2)}`, left, y)

    const safeId = String(order.id).replace(/[^a-zA-Z0-9_-]/g, '')
    doc.save(`comprobante-${safeId || 'venta'}.pdf`)
  }

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
            const TrendIcon = stat.trend === 'up' ? TrendingUp : stat.trend === 'down' ? TrendingDown : Minus

            return (
              <div
                key={index}
                onClick={stat.title === 'Productos' ? () => navigate('/inventory') : undefined}
                className={`bg-white dark:bg-gray-900 p-4 md:p-6 rounded-lg md:rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 ${
                  stat.title === 'Productos' ? 'cursor-pointer hover:border-lime-400 dark:hover:border-lime-600 transition-colors' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-3 md:mb-4">
                  <div className={`w-10 h-10 md:w-12 md:h-12 ${stat.color} rounded-lg flex items-center justify-center`}>
                    <Icon className="w-5 h-5 md:w-6 md:h-6 text-white" />
                  </div>
                  {stat.change && (
                    <div
                      className={`flex items-center gap-1 text-xs md:text-sm ${
                        stat.trend === 'down' ? 'text-red-600' : 'text-green-600'
                      }`}
                    >
                      <TrendIcon className="w-4 h-4" />
                      {stat.change}
                    </div>
                  )}
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
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-6 text-sm text-gray-500 dark:text-gray-400">
                      Cargando ventas...
                    </td>
                  </tr>
                ) : recentSales.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-6 text-sm text-gray-500 dark:text-gray-400">
                      Sin ventas registradas
                    </td>
                  </tr>
                ) : (
                  recentSales.map((sale) => (
                    <tr
                      key={sale.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800/40 cursor-pointer"
                      onClick={() => setSelectedOrder(sale.order)}
                    >
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100 font-medium">#{sale.id}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{sale.product}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{sale.quantity}</td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100 font-medium">{sale.total}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex px-2.5 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300">
                          {sale.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cards - Mobile */}
        <div className="md:hidden space-y-4 pb-8">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-100 dark:border-gray-800 p-4">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Ventas Recientes</h2>
          </div>
          {loading ? (
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-100 dark:border-gray-800 p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Cargando ventas...</p>
            </div>
          ) : recentSales.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-100 dark:border-gray-800 p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Sin ventas registradas</p>
            </div>
          ) : (
            recentSales.map((sale) => (
              <div
                key={sale.id}
                className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-100 dark:border-gray-800 p-4 space-y-3"
                onClick={() => setSelectedOrder(sale.order)}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-mono text-gray-500 dark:text-gray-400">#{sale.id}</p>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{sale.product}</p>
                  </div>
                  <span className="inline-flex px-2.5 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300">
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
            ))
          )}
        </div>
      </main>
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setSelectedOrder(null)}>
          <div
            className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Detalle de venta</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Ticket: {getTicket(selectedOrder.id)}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="px-2 py-1 text-sm rounded-md border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Cerrar
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
                <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/60">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Fecha</p>
                  <p className="font-medium">{toDateTime(selectedOrder.date || selectedOrder.createdAt)}</p>
                </div>
                <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/60">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Tipo de pago</p>
                  <p className="font-medium">{toPaymentLabel(selectedOrder.method)}</p>
                </div>
                <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/60">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total sin IVA</p>
                  <p className="font-medium">{formatCurrency(getOrderSubtotal(selectedOrder))}</p>
                </div>
                <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/60">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total con IVA</p>
                  <p className="font-semibold">{formatCurrency(getOrderTotal(selectedOrder))}</p>
                </div>
              </div>
              <div className="rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800/60">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs uppercase text-gray-500">Producto</th>
                      <th className="px-3 py-2 text-center text-xs uppercase text-gray-500">Cant.</th>
                      <th className="px-3 py-2 text-right text-xs uppercase text-gray-500">Precio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedOrder.items || []).map((item, idx) => (
                      <tr key={`${getItemKey(item)}-${idx}`} className="border-t border-gray-100 dark:border-gray-800">
                        <td className="px-3 py-2">{getItemName(item)}</td>
                        <td className="px-3 py-2 text-center">{getItemQuantity(item)}</td>
                        <td className="px-3 py-2 text-right font-medium">{formatCurrency(getItemSubtotal(item))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => downloadOrderReceiptPdf(selectedOrder)}
                  className="px-3 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg"
                >
                  Descargar comprobante PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
