import { useEffect, useMemo, useState } from 'react'
import {
  TrendingUp, TrendingDown, DollarSign, Package, Users,
  ArrowRight, AlertTriangle, Clock, Receipt, CreditCard, Banknote,
  BarChart3, ShoppingBag, CalendarDays, RotateCcw, CheckCircle2,
} from 'lucide-react'
import { toast } from 'react-toastify'
import { Sidebar } from '../components/Sidebar'
import { OrderService } from '../services/OrderService'
import { InventoryService } from '../services/InventoryService'
import { UserService } from '../services/UserService'
import { DevolucionService, type Devolucion } from '../services/DevolucionService'
import { normalizeOrderItems, procesarDevolucionCompleta } from '../utils/devolucionHelpers'
import { getOrderDevuelto, getOrderEffectiveTotal, sumOrderEffectiveTotals } from '../utils/orderTotals'
import { useAuth } from '../hooks/useAuth'
import { useSettings } from '../context/SettingsContext'
import type { InventoryStats } from '../types/product'
import { useNavigate } from 'react-router-dom'
import jsPDF from 'jspdf'

type OrderItem = {
  id?: string; productId?: string; productoId?: string
  name?: string; nombre?: string
  quantity?: number; cantidad?: number; qty?: number
  unitPrice?: number; precio?: number; precioUnitario?: number
  lineTotal?: number; subtotal?: number; total?: number
}

type OrderRecord = {
  id: string; date?: string; createdAt?: string
  items?: OrderItem[]; method?: string
  subtotal?: number; tax?: number; total?: number
  totalDevuelto?: number
  devolucion?: { tipo: 'total' | 'parcial'; devolucionId: string; fecha: string; totalDevuelto?: number }
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { settings } = useSettings()
  const lowStockThreshold = settings.inventory.lowStockThreshold
  const currency = 'MXN'

  const [orders, setOrders] = useState<OrderRecord[]>([])
  const [devoluciones, setDevoluciones] = useState<Devolucion[]>([])
  const [inventoryStats, setInventoryStats] = useState<InventoryStats>({ totalProductos: 0, stockTotal: 0, alertasStock: 0 })
  const [userStats, setUserStats] = useState({ totalUsuarios: 0, usuariosActivos: 0, usuariosInactivos: 0 })
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<OrderRecord | null>(null)
  const { user } = useAuth()

  const [showDevolucion, setShowDevolucion] = useState(false)
  const [devItems, setDevItems] = useState<Record<string, number>>({})
  const [devMotivo, setDevMotivo] = useState('defectuoso')
  const [isProcessingDev, setIsProcessingDev] = useState(false)

  const DEV_MOTIVOS = [
    { value: 'defectuoso', label: 'Producto defectuoso' },
    { value: 'error_venta', label: 'Error de venta' },
    { value: 'cambio_opinion', label: 'Cliente cambió de opinión' },
    { value: 'otro', label: 'Otro' },
  ]

  const selectedOrderItems = useMemo(
    () => (selectedOrder ? normalizeOrderItems(selectedOrder.items) : []),
    [selectedOrder],
  )

  const openDevModal = () => {
    if (!selectedOrder) return
    const items = normalizeOrderItems(selectedOrder.items)
    if (items.length === 0) {
      toast.warning('Esta venta no tiene productos registrados para devolver')
      return
    }
    const init: Record<string, number> = {}
    items.forEach((_, i) => { init[String(i)] = 0 })
    setDevItems(init)
    setDevMotivo('defectuoso')
    setShowDevolucion(true)
  }

  const devTotal = useMemo(() => {
    if (!selectedOrder) return 0
    const items = selectedOrderItems
    return Object.entries(devItems).reduce((sum, [idx, qty]) => {
      if (qty <= 0) return sum
      const item = items[Number(idx)]
      if (!item) return sum
      const up = getItemSubtotal(item) / (getItemQuantity(item) || 1)
      return sum + up * qty
    }, 0)
  }, [devItems, selectedOrder, selectedOrderItems])

  const hasDevSel = Object.values(devItems).some((q) => q > 0)

  const processDev = async () => {
    if (!selectedOrder || !hasDevSel) return
    setIsProcessingDev(true)
    try {
      let empNombre = user?.email || 'Desconocido'
      let empRol = 'Vendedor'
      if (user?.email) {
        try {
          const u = await UserService.getUserByEmail(user.email)
          if (u) { empNombre = u.nombreCompleto || u.usuario; empRol = u.rol || 'Vendedor' }
        } catch { /* ignore */ }
      }

      const result = await procesarDevolucionCompleta({
        order: { ...selectedOrder, items: selectedOrderItems },
        devItems,
        motivo: DEV_MOTIVOS.find((m) => m.value === devMotivo)?.label || devMotivo,
        empleado: empNombre,
        empleadoRol: empRol,
        userId: user?.uid,
      })

      toast.success(
        `Devolución ${result.tipo} por $${result.montoDevuelto.toFixed(2)} — ventas y caja actualizadas`,
      )
      setShowDevolucion(false)
      setSelectedOrder(null)

      const [freshOrders, freshDevs, inventoryData] = await Promise.all([
        OrderService.getAllOrders(),
        DevolucionService.getAllDevoluciones(),
        InventoryService.getInventoryStats(lowStockThreshold),
      ])
      setOrders(freshOrders as OrderRecord[])
      setDevoluciones(freshDevs)
      setInventoryStats(inventoryData)
    } catch (err) {
      console.error('Error en devolución:', err)
      const msg = err instanceof Error ? err.message : 'Error al procesar la devolución'
      toast.error(msg)
    } finally {
      setIsProcessingDev(false)
    }
  }

  useEffect(() => {
    let mounted = true
    ;(async () => {
      setLoading(true)
      try {
        const [ordersData, inventoryData, usersData, devsData] = await Promise.all([
          OrderService.getAllOrders(),
          InventoryService.getInventoryStats(lowStockThreshold),
          UserService.getUserStats(),
          DevolucionService.getAllDevoluciones(),
        ])
        if (!mounted) return
        setOrders(ordersData as OrderRecord[])
        setInventoryStats(inventoryData)
        setUserStats(usersData)
        setDevoluciones(devsData)
      } catch (error) { console.error('Error loading dashboard data:', error) }
      finally { if (mounted) setLoading(false) }
    })()
    return () => { mounted = false }
  }, [lowStockThreshold])

  /* ─── Helpers ─── */
  const formatCurrency = (value: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(value)
  const formatNumber = (value: number) => new Intl.NumberFormat('es-MX').format(value)
  const toNumber = (value: unknown) => { const n = Number(value); return Number.isFinite(n) ? n : 0 }
  const toPaymentLabel = (method?: string) => {
    const labels: Record<string, string> = { efectivo: 'Efectivo', tarjeta: 'Tarjeta', transferencia: 'Transferencia', qr: 'Código QR' }
    return (method && labels[method]) || method || 'Sin método'
  }
  const getItemQuantity = (item: OrderItem) => toNumber(item.quantity ?? item.cantidad ?? item.qty ?? 0)
  const getItemName = (item: OrderItem) => String(item.name ?? item.nombre ?? 'Producto').trim() || 'Producto'
  const getItemSubtotal = (item: OrderItem) => {
    const explicit = toNumber(item.lineTotal ?? item.subtotal ?? item.total)
    if (explicit > 0) return explicit
    return getItemQuantity(item) * toNumber(item.unitPrice ?? item.precioUnitario ?? item.precio)
  }
  const getItemKey = (item: OrderItem) => {
    const id = String(item.id ?? item.productId ?? item.productoId ?? '').trim()
    return id ? `id:${id}` : `name:${getItemName(item).toLowerCase()}`
  }
  const getOrderTotal = (order: OrderRecord) => toNumber(order.total)
  const getTicket = (orderId: string) => orderId.slice(-8).toUpperCase()
  const toDateTime = (value?: string) => {
    if (!value) return ''
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? value : d.toLocaleString('es-SV')
  }
  const parseDate = (value?: string) => { if (!value) return null; const d = new Date(value); return Number.isNaN(d.getTime()) ? null : d }
  const orderDateValue = (order: OrderRecord) => { const d = parseDate(order.date || order.createdAt); return d ? d.getTime() : 0 }
  const sumTotals = (list: OrderRecord[]) => sumOrderEffectiveTotals(list)

  /* ─── Calculations ─── */
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1)
  const startOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate())
  const endOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999)
  const isInRange = (date: Date | null, start: Date, end: Date) => date ? date >= start && date <= end : false

  const ordersToday = orders.filter((o) => isInRange(parseDate(o.date || o.createdAt), startOfToday, endOfToday))
  const ordersYesterday = orders.filter((o) => isInRange(parseDate(o.date || o.createdAt), startOfYesterday, endOfYesterday))
  const ordersThisMonth = orders.filter((o) => { const d = parseDate(o.date || o.createdAt); return d && d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() })
  const ordersLastMonth = orders.filter((o) => { const d = parseDate(o.date || o.createdAt); if (!d) return false; const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1); return d.getFullYear() === lm.getFullYear() && d.getMonth() === lm.getMonth() })

  const revenueToday = sumTotals(ordersToday)
  const revenueYesterday = sumTotals(ordersYesterday)
  const revenueMonth = sumTotals(ordersThisMonth)
  const monthSalesCount = ordersThisMonth.length

  const devolucionesToday = useMemo(() => {
    return devoluciones.filter((d) => {
      const raw = d.createdAt || d.fecha
      if (!raw) return false
      const dt = new Date(raw)
      return !Number.isNaN(dt.getTime()) && isInRange(dt, startOfToday, endOfToday)
    })
  }, [devoluciones, startOfToday.getTime(), endOfToday.getTime()])

  const totalDevueltoHoy = useMemo(
    () => devolucionesToday.reduce((s, d) => s + Number(d.totalDevuelto || 0), 0),
    [devolucionesToday],
  )

  const ventasBrutasHoy = ordersToday.reduce((s, o) => s + Number(o.total || 0), 0)

  const changePercent = (current: number, previous: number) => previous <= 0 ? null : ((current - previous) / previous) * 100
  const todayChange = changePercent(revenueToday, revenueYesterday)
  const monthChange = changePercent(monthSalesCount, ordersLastMonth.length)

  /* ─── Recent Sales ─── */
  const recentSales = useMemo(() => {
    const sorted = [...orders].sort((a, b) => orderDateValue(b) - orderDateValue(a))
    return sorted.slice(0, 8).map((order) => {
      const items = normalizeOrderItems(order.items)
      const quantity = items.reduce((sum, item) => sum + getItemQuantity(item), 0)
      const firstItem = items[0]
      const extraCount = items.length > 1 ? ` +${items.length - 1}` : ''
      return {
        id: order.id,
        product: `${getItemName(firstItem || {})}${extraCount}`,
        quantity,
        total: getOrderEffectiveTotal(order),
        devuelto: getOrderDevuelto(order),
        method: order.method,
        date: order.date || order.createdAt,
        order,
      }
    })
  }, [orders])

  /* ─── Last 7 days for mini chart ─── */
  const last7Days = useMemo(() => {
    const days: { label: string; value: number; count: number; dateKey: string }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
      const start = new Date(d.getFullYear(), d.getMonth(), d.getDate())
      const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)
      const dayOrders = orders.filter((o) => isInRange(parseDate(o.date || o.createdAt), start, end))
      days.push({
        label: d.toLocaleDateString('es-MX', { weekday: 'short' }),
        value: sumOrderEffectiveTotals(dayOrders),
        count: dayOrders.length,
        dateKey: `${d.getDate()}/${d.getMonth() + 1}`,
      })
    }
    return days
  }, [orders, now.toDateString()])
  const maxDayValue = Math.max(...last7Days.map((d) => d.value), 1)

  /* ─── Payment methods breakdown ─── */
  const paymentBreakdown = useMemo(() => {
    const map: Record<string, number> = {}
    ordersThisMonth.forEach((o) => {
      const m = o.method || 'efectivo'
      map[m] = (map[m] || 0) + getOrderEffectiveTotal(o)
    })
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [orders])

  const paymentIcons: Record<string, typeof Banknote> = { efectivo: Banknote, transferencia: CreditCard, qr: ShoppingBag, tarjeta: CreditCard }

  /* ─── Greeting ─── */
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches'
  const dateStr = now.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  /* ─── PDF ─── */
  const downloadOrderReceiptPdf = (order: OrderRecord) => {
    const paperSize = settings.printing.paperSize
    const width = paperSize === '58mm' ? 58 : paperSize === '80mm' ? 80 : 216
    const isLetter = paperSize === 'letter'
    const items = Array.isArray(order.items) ? order.items : []
    const lh = paperSize === '58mm' ? 4 : 5
    const height = isLetter ? 279 : Math.max(140, 90 + items.length * (lh * 2) + 60)
    const doc = new jsPDF({ unit: 'mm', format: isLetter ? 'letter' : [width, height] })
    const left = 4; const right = isLetter ? 200 : width - 4; const center = (left + right) / 2
    const fs = paperSize === '58mm' ? 6 : 7
    let y = 8

    doc.setFontSize(paperSize === '58mm' ? 10 : 14); doc.setFont('helvetica', 'bold')
    doc.text('Bikini Store', center, y, { align: 'center' }); y += 4
    doc.setFontSize(fs); doc.setFont('helvetica', 'normal')
    doc.text('Sistema de Punto de Venta', center, y, { align: 'center' }); y += 5

    doc.text(`Doc N°: ${getTicket(order.id)}`, left, y)
    doc.text('Caja: 1', right, y, { align: 'right' }); y += 3.5
    doc.text(`Fecha: ${toDateTime(order.date || order.createdAt)}`, left, y); y += 3.5
    doc.text(`Pago: ${toPaymentLabel(order.method)}`, left, y); y += 3

    doc.setLineWidth(0.3); doc.line(left, y, right, y); y += 3

    doc.setFont('helvetica', 'bold'); doc.setFontSize(fs)
    doc.text('Cant.', left, y); doc.text('Artículo', left + 8, y)
    y += 2; doc.setLineWidth(0.15); doc.line(left, y, right, y); y += 3

    doc.setFont('helvetica', 'normal'); doc.setFontSize(fs)
    const maxNameLen = paperSize === '58mm' ? 22 : 30
    items.forEach((item) => {
      const qty = getItemQuantity(item)
      const name = getItemName(item)
      const lineTotal = getItemSubtotal(item)
      const unitPrice = qty > 0 ? lineTotal / qty : 0
      const displayName = name.length > maxNameLen ? name.substring(0, maxNameLen - 1) + '…' : name
      doc.text(`${qty}`, left, y); doc.text(displayName, left + 8, y); y += lh
      doc.setFontSize(fs - 1)
      doc.text(`  P.Unit: $${unitPrice.toFixed(2)}`, left, y)
      doc.text(`$${lineTotal.toFixed(2)}`, right, y, { align: 'right' })
      doc.setFontSize(fs); y += lh
    })

    y += 1; doc.line(left, y, right, y); y += 3.5

    const total = getOrderTotal(order)
    const base = Math.round((total / 1.13) * 100) / 100
    const iva = Math.round((total - base) * 100) / 100

    doc.setFontSize(fs)
    doc.text('Subtotal (sin IVA):', left, y); doc.text(`$${base.toFixed(2)}`, right, y, { align: 'right' }); y += 3.5
    doc.text('IVA 13%:', left, y); doc.text(`$${iva.toFixed(2)}`, right, y, { align: 'right' }); y += 3
    doc.setLineWidth(0.4); doc.line(left, y, right, y); y += 4

    doc.setFontSize(paperSize === '58mm' ? 9 : 11); doc.setFont('helvetica', 'bold')
    doc.text('TOTAL:', left, y); doc.text(`$${total.toFixed(2)}`, right, y, { align: 'right' }); y += 5

    doc.setFontSize(fs); doc.setFont('helvetica', 'normal')
    doc.text(`Método de pago: ${toPaymentLabel(order.method)}`, left, y); y += 3.5
    doc.text(`Pagado: $${total.toFixed(2)}`, left, y); y += 4

    doc.setLineWidth(0.3); doc.line(left, y, right, y); y += 3.5
    doc.setFontSize(fs)
    doc.text('¡Gracias por su compra!', center, y, { align: 'center' }); y += 3
    doc.setFontSize(fs - 1)
    doc.text('IVA incluido en todos los precios', center, y, { align: 'center' })

    doc.save(`comprobante-${String(order.id).replace(/[^a-zA-Z0-9_-]/g, '') || 'venta'}.pdf`)
  }

  const relativeTime = (dateStr?: string) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    if (Number.isNaN(d.getTime())) return ''
    const diff = (now.getTime() - d.getTime()) / 1000
    if (diff < 60) return 'Hace un momento'
    if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`
    if (diff < 86400) return `Hace ${Math.floor(diff / 3600)}h`
    return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col md:flex-row">
      <Sidebar activeItem="dashboard" />

      <main className="flex-1 overflow-auto p-4 pt-20 md:pt-6 md:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">{greeting} 👋</h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5 flex items-center gap-1.5">
                <CalendarDays className="w-4 h-4" />
                <span className="capitalize">{dateStr}</span>
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => navigate('/pos')} className="px-4 py-2 bg-[#8CC63F] hover:bg-[#7ab535] text-white text-sm font-medium rounded-xl transition-colors active:scale-95 flex items-center gap-2">
                <ShoppingBag className="w-4 h-4" /> Nueva Venta
              </button>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4 mb-6">
          {/* Ventas Hoy (neto) */}
          <div className="col-span-2 sm:col-span-1 lg:col-span-1 bg-gradient-to-br from-[#8CC63F] to-[#6ba52e] p-4 md:p-5 rounded-2xl text-white shadow-lg shadow-[#8CC63F]/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-6 -mt-6" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center"><DollarSign className="w-4 h-4" /></div>
                {todayChange !== null && (
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${todayChange >= 0 ? 'bg-white/20' : 'bg-red-400/30'}`}>
                    {todayChange >= 0 ? <TrendingUp className="w-3 h-3 inline mr-0.5" /> : <TrendingDown className="w-3 h-3 inline mr-0.5" />}
                    {todayChange >= 0 ? '+' : ''}{todayChange.toFixed(0)}%
                  </span>
                )}
              </div>
              <p className="text-lime-100 text-xs font-medium">Ventas Hoy (neto)</p>
              <p className="text-xl md:text-2xl font-bold mt-0.5">{loading ? '...' : formatCurrency(revenueToday)}</p>
              <p className="text-lime-200 text-[11px] mt-1">
                {ordersToday.length} ventas
                {!loading && totalDevueltoHoy > 0 && (
                  <> · Bruto {formatCurrency(ventasBrutasHoy)}</>
                )}
              </p>
            </div>
          </div>

          {/* Devoluciones Hoy */}
          <div className="bg-white dark:bg-gray-900 border border-amber-200 dark:border-amber-900/50 p-4 md:p-5 rounded-2xl relative overflow-hidden">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-amber-100 dark:bg-amber-950/40 rounded-lg flex items-center justify-center">
                <RotateCcw className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-xs font-medium">Devoluciones Hoy</p>
            <p className="text-xl md:text-2xl font-bold text-amber-700 dark:text-amber-400 mt-0.5">
              {loading ? '...' : formatCurrency(totalDevueltoHoy)}
            </p>
            <p className="text-gray-400 dark:text-gray-500 text-[11px] mt-1">
              {loading ? '—' : `${devolucionesToday.length} registro${devolucionesToday.length === 1 ? '' : 's'}`}
            </p>
          </div>

          {/* Ventas del Mes */}
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-4 md:p-5 rounded-2xl relative overflow-hidden">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-orange-100 dark:bg-orange-950/40 rounded-lg flex items-center justify-center"><BarChart3 className="w-4 h-4 text-orange-600 dark:text-orange-400" /></div>
              {monthChange !== null && (
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${monthChange >= 0 ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400'}`}>
                  {monthChange >= 0 ? '+' : ''}{monthChange.toFixed(0)}%
                </span>
              )}
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-xs font-medium">Ventas del Mes</p>
            <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mt-0.5">{loading ? '...' : formatCurrency(revenueMonth)}</p>
            <p className="text-gray-400 dark:text-gray-500 text-[11px] mt-1">{monthSalesCount} órdenes</p>
          </div>

          {/* Productos */}
          <div onClick={() => navigate('/inventory')} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-4 md:p-5 rounded-2xl cursor-pointer hover:border-lime-300 dark:hover:border-lime-700 transition-all group">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-lime-100 dark:bg-lime-950/40 rounded-lg flex items-center justify-center"><Package className="w-4 h-4 text-lime-600 dark:text-lime-400" /></div>
              {inventoryStats.alertasStock > 0 && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 flex items-center gap-0.5">
                  <AlertTriangle className="w-3 h-3" /> {inventoryStats.alertasStock}
                </span>
              )}
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-xs font-medium">Productos</p>
            <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mt-0.5">{loading ? '...' : formatNumber(inventoryStats.totalProductos)}</p>
            <p className="text-gray-400 dark:text-gray-500 text-[11px] mt-1 group-hover:text-lime-600 dark:group-hover:text-lime-400 transition-colors flex items-center gap-0.5">Ver inventario <ArrowRight className="w-3 h-3" /></p>
          </div>

          {/* Usuarios */}
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-4 md:p-5 rounded-2xl">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-purple-100 dark:bg-purple-950/40 rounded-lg flex items-center justify-center"><Users className="w-4 h-4 text-purple-600 dark:text-purple-400" /></div>
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-xs font-medium">Usuarios</p>
            <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mt-0.5">{loading ? '...' : formatNumber(userStats.totalUsuarios)}</p>
            <p className="text-gray-400 dark:text-gray-500 text-[11px] mt-1">{userStats.usuariosActivos} activos</p>
          </div>
        </div>

        {/* Charts & Activity Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-6">
          {/* Mini Bar Chart - Últimos 7 días */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Ventas - Últimos 7 días</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Ingresos diarios</p>
              </div>
              <button onClick={() => navigate('/reports')} className="text-xs text-[#8CC63F] hover:underline font-medium flex items-center gap-1">
                Ver reportes <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="flex items-end gap-3 md:gap-4" style={{ height: '200px' }}>
              {last7Days.map((day, i) => {
                const isToday = i === 6
                const pct = day.value > 0 ? Math.max(10, (day.value / maxDayValue) * 100) : 4
                const barHeight = Math.round((pct / 100) * 170)
                return (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1.5 group" style={{ height: '100%' }}>
                    <div
                      className="w-full relative rounded-lg overflow-hidden"
                      style={{ height: '170px' }}
                    >
                      <div className="absolute inset-0 bg-gray-100 dark:bg-gray-800/60 rounded-lg" />
                      <div
                        className={`absolute bottom-0 left-0 right-0 rounded-lg transition-all duration-700 ease-out ${isToday ? 'bg-gradient-to-t from-[#6ba52e] to-[#8CC63F]' : day.value > 0 ? 'bg-gradient-to-t from-gray-400 to-gray-300 dark:from-gray-500 dark:to-gray-400 group-hover:from-[#6ba52e]/70 group-hover:to-[#8CC63F]/70' : 'bg-gray-200/50 dark:bg-gray-700/50'}`}
                        style={{ height: `${barHeight}px` }}
                        title={`${day.dateKey}: ${formatCurrency(day.value)} (${day.count} ventas)`}
                      />
                    </div>
                    <span className={`text-[10px] md:text-xs capitalize leading-none ${isToday ? 'text-[#8CC63F] font-bold' : 'text-gray-500 dark:text-gray-400'}`}>{day.label}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Payment Methods Breakdown */}
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 md:p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Métodos de Pago</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Este mes</p>
            {loading ? (
              <p className="text-sm text-gray-400 animate-pulse">Cargando...</p>
            ) : paymentBreakdown.length === 0 ? (
              <p className="text-sm text-gray-400">Sin datos aún</p>
            ) : (
              <div className="space-y-3">
                {paymentBreakdown.map(([method, amount]) => {
                  const Icon = paymentIcons[method] || Banknote
                  const pct = revenueMonth > 0 ? (amount / revenueMonth) * 100 : 0
                  return (
                    <div key={method}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-700 dark:text-gray-300">{toPaymentLabel(method)}</span>
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(amount)}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full bg-[#8CC63F] rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Recent Sales */}
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden">
          <div className="p-4 md:p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Ventas Recientes</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Últimas transacciones</p>
            </div>
            <button onClick={() => navigate('/reports')} className="text-xs text-[#8CC63F] hover:underline font-medium hidden sm:flex items-center gap-1">
              Ver todas <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {loading ? (
            <div className="p-6 flex items-center gap-2 text-gray-400"><Clock className="w-4 h-4 animate-spin" /> Cargando...</div>
          ) : recentSales.length === 0 ? (
            <div className="p-8 text-center">
              <Receipt className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
              <p className="text-gray-500 dark:text-gray-400 text-sm">Sin ventas registradas</p>
              <button onClick={() => navigate('/pos')} className="mt-3 text-sm text-[#8CC63F] font-medium hover:underline">Realizar primera venta</button>
            </div>
          ) : (
            <div className="divide-y divide-gray-50 dark:divide-gray-800">
              {recentSales.map((sale) => {
                const PayIcon = paymentIcons[sale.method || 'efectivo'] || Banknote
                return (
                  <button
                    key={sale.id}
                    onClick={() => setSelectedOrder(sale.order)}
                    className="w-full flex items-center gap-3 p-4 md:px-6 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors text-left active:bg-gray-100 dark:active:bg-gray-800"
                  >
                    <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                      <PayIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{sale.product}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{sale.quantity} {sale.quantity === 1 ? 'artículo' : 'artículos'} · {relativeTime(sale.date)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(sale.total)}</p>
                      {sale.devuelto > 0 && (
                        <p className="text-[10px] text-amber-600 dark:text-amber-400">−{formatCurrency(sale.devuelto)} dev.</p>
                      )}
                      <p className="text-[11px] text-gray-400 dark:text-gray-500">{toPaymentLabel(sale.method)}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Spacer for mobile bottom */}
        <div className="h-6 md:h-0" />
      </main>

      {/* Order Detail Modal (oculto mientras el modal de devolución está abierto) */}
      {selectedOrder && !showDevolucion && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setSelectedOrder(null)}>
          <div
            className="w-full sm:max-w-2xl bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900 z-10">
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Detalle de venta</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Ticket: {getTicket(selectedOrder.id)}</p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-95 transition">
                Cerrar
              </button>
            </div>
            <div className="p-4 md:p-6 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Fecha</p>
                  <p className="font-medium text-gray-900 dark:text-white mt-0.5">{toDateTime(selectedOrder.date || selectedOrder.createdAt)}</p>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Pago</p>
                  <p className="font-medium text-gray-900 dark:text-white mt-0.5">{toPaymentLabel(selectedOrder.method)}</p>
                </div>
                <div className="p-3 rounded-xl bg-[#8CC63F]/10 border border-[#8CC63F]/20">
                  <p className="text-xs text-[#8CC63F] font-medium">Total</p>
                  <p className="font-bold text-[#8CC63F] mt-0.5">{formatCurrency(getOrderTotal(selectedOrder))}</p>
                </div>
              </div>
              <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800/60">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-xs uppercase text-gray-500 font-medium">Producto</th>
                      <th className="px-4 py-2.5 text-center text-xs uppercase text-gray-500 font-medium">Cant.</th>
                      <th className="px-4 py-2.5 text-right text-xs uppercase text-gray-500 font-medium">Precio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrderItems.map((item, idx) => (
                      <tr key={`${getItemKey(item)}-${idx}`} className="border-t border-gray-100 dark:border-gray-800">
                        <td className="px-4 py-2.5 text-gray-900 dark:text-white">{getItemName(item)}</td>
                        <td className="px-4 py-2.5 text-center text-gray-600 dark:text-gray-300">{getItemQuantity(item)}</td>
                        <td className="px-4 py-2.5 text-right font-medium text-gray-900 dark:text-white">{formatCurrency(getItemSubtotal(item))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {selectedOrder.devolucion && (
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
                  selectedOrder.devolucion.tipo === 'total'
                    ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
                    : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                }`}>
                  <RotateCcw className="w-4 h-4" />
                  Venta con devolución {selectedOrder.devolucion.tipo}
                </div>
              )}
              <div className="flex justify-end gap-2">
                {(!selectedOrder.devolucion?.tipo || selectedOrder.devolucion.tipo !== 'total') && (
                  <button onClick={openDevModal} className="px-4 py-2.5 text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 rounded-xl flex items-center gap-2 active:scale-95 transition">
                    <RotateCcw className="w-4 h-4" /> Devolución
                  </button>
                )}
                <button onClick={() => downloadOrderReceiptPdf(selectedOrder)} className="px-4 py-2.5 text-sm font-medium text-white bg-[#8CC63F] hover:bg-[#7ab535] rounded-xl flex items-center gap-2 active:scale-95 transition">
                  <Receipt className="w-4 h-4" /> Descargar PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Devolución */}
      {showDevolucion && selectedOrder && (
        <div
          className="fixed inset-0 z-[100] bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setShowDevolucion(false)}
          role="presentation"
        >
          <div
            className="w-full sm:max-w-lg bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-200 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900 z-10">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg shrink-0">
                  <RotateCcw className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">Procesar devolución</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    Ticket: {getTicket(selectedOrder.id)} · {getItemName(selectedOrderItems[0] || {})}
                    {selectedOrderItems.length > 1 ? ` +${selectedOrderItems.length - 1}` : ''}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDevolucion(false)}
                className="shrink-0 px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Volver
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Motivo</label>
                <select value={devMotivo} onChange={(e) => setDevMotivo(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100">
                  {DEV_MOTIVOS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Artículos a devolver</p>
                <div className="space-y-2">
                  {selectedOrderItems.length === 0 ? (
                    <p className="text-sm text-amber-600 dark:text-amber-400 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30">
                      No hay líneas de producto en esta venta.
                    </p>
                  ) : (
                    selectedOrderItems.map((item, idx) => {
                      const maxQ = getItemQuantity(item)
                      const curQ = devItems[String(idx)] || 0
                      const unitPrice = maxQ > 0 ? getItemSubtotal(item) / maxQ : 0
                      return (
                        <div
                          key={`${getItemKey(item)}-${idx}`}
                          className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{getItemName(item)}</p>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400">
                              Comprados: {maxQ} · {formatCurrency(getItemSubtotal(item))}
                              {maxQ > 1 ? ` (${formatCurrency(unitPrice)}/u)` : ''}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setDevItems((p) => ({ ...p, [String(idx)]: Math.max(0, curQ - 1) }))
                              }}
                              disabled={curQ === 0}
                              className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center justify-center text-lg font-bold disabled:opacity-40"
                            >
                              −
                            </button>
                            <span className={`w-8 text-center text-sm font-bold ${curQ > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400'}`}>
                              {curQ}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setDevItems((p) => ({ ...p, [String(idx)]: Math.min(maxQ, curQ + 1) }))
                              }}
                              disabled={curQ >= maxQ || maxQ <= 0}
                              className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center justify-center text-lg font-bold disabled:opacity-40"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
              {hasDevSel && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                  <span className="text-sm font-medium text-amber-800 dark:text-amber-300">Total a devolver</span>
                  <span className="text-lg font-bold text-amber-700 dark:text-amber-400">{formatCurrency(devTotal)}</span>
                </div>
              )}
              <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <AlertTriangle className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                <p className="text-xs text-blue-700 dark:text-blue-300">El stock será restaurado automáticamente al inventario.</p>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowDevolucion(false)} className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">Cancelar</button>
                <button type="button" onClick={processDev} disabled={!hasDevSel || isProcessingDev || selectedOrderItems.length === 0} className={`flex-1 py-2.5 rounded-xl text-sm font-medium text-white flex items-center justify-center gap-2 transition-colors ${hasDevSel && !isProcessingDev && selectedOrderItems.length > 0 ? 'bg-amber-500 hover:bg-amber-600' : 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed'}`}>
                  {isProcessingDev ? 'Procesando...' : <><CheckCircle2 className="w-4 h-4" />Confirmar</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
