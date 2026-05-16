import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sidebar } from '../components/Sidebar'
import {
  ShoppingCart,
  Search,
  Plus,
  Minus,
  Trash2,
  ChevronRight,
  X,
  Receipt,
  Banknote,
  CreditCard as CardIcon,
  QrCode,
  ArrowRightLeft,
  Store,
  Lock,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react'
import { toast } from 'react-toastify'
import jsPDF from 'jspdf'
 
import { OrderService } from '../services/OrderService'
import { useAuth } from '../hooks/useAuth'
import { InventoryService } from '../services/InventoryService'
import { CajaService } from '../services/CajaService'
import { UserService } from '../services/UserService'
import { useSettings } from '../context/SettingsContext'

type ProductDB = {
  id: string
  codigo?: string
  nombre: string
  categoria: string
  stock: number
  precioUnitario: number
  precioTresUnidades: number
  precioMediaDocena: number
  precioDocena: number
}

type CartItemLocal = ProductDB & { quantity: number }

// IVA ya incluido en precios de venta — no se calcula por separado


export default function POS() {
  const { user, authReady } = useAuth()
  const { settings } = useSettings()
  const navigate = useNavigate()

  const [cart, setCart] = useState<CartItemLocal[]>([])
  const [products, setProducts] = useState<ProductDB[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Todos')
  const [showPricesWithoutIva, setShowPricesWithoutIva] = useState(false)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null)
  const [cashReceivedInput, setCashReceivedInput] = useState('')
  const [lastOrderInfo, setLastOrderInfo] = useState<any>(null)
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)
  const [showSaleSuccess, setShowSaleSuccess] = useState(false)
  const [lastSuccessfulOrder, setLastSuccessfulOrder] = useState<{
    orderId: string
    total: number
    method: string
    cashReceived: number | null
    changeAmount: number | null
  } | null>(null)

  const [cajaOpen, setCajaOpen] = useState<boolean | null>(null)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [empleadoInfo, setEmpleadoInfo] = useState<{ nombre: string; rol: string }>({ nombre: '', rol: '' })

  useEffect(() => {
    if (!user?.email) return
    UserService.getUserByEmail(user.email).then((u) => {
      if (u) setEmpleadoInfo({ nombre: u.nombreCompleto || u.usuario, rol: u.rol || '' })
    }).catch(() => {})
  }, [user?.email])

  useEffect(() => {
    if (cart.length === 0 && isCartOpen) {
      const isMobile = window.innerWidth < 768
      if (isMobile) setIsCartOpen(false)
    }
  }, [cart.length])

  useEffect(() => {
    if (!isPaymentModalOpen && !isTicketModalOpen && !showSaleSuccess && !isCartOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 100)
    }
  }, [isPaymentModalOpen, isTicketModalOpen, showSaleSuccess, isCartOpen])

  useEffect(() => {
    const styleId = 'print-paper-size-style'
    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null
    if (!styleEl) {
      styleEl = document.createElement('style')
      styleEl.id = styleId
      document.head.appendChild(styleEl)
    }

    const paperSize = settings.printing.paperSize
    const width = paperSize === '58mm' ? '58mm' : paperSize === '80mm' ? '80mm' : '216mm'
    const pageSize = paperSize === 'letter' ? 'letter' : `${width} 200mm`

    styleEl.textContent = `@media print { @page { size: ${pageSize}; margin: 10mm; } #print-area { width: ${width} !important; max-width: none !important; margin: 0 auto; } }`
  }, [settings.printing.paperSize])

  useEffect(() => {
    if (!authReady) {
      setCajaOpen(null)
      return
    }

    if (!user?.uid) {
      setCajaOpen(false)
      return
    }

    let mounted = true
    ;(async () => {
      try {
        const [prods, activeCaja] = await Promise.all([
          InventoryService.getProducts(),
          CajaService.getActiveCaja(user.uid),
        ])
        if (!mounted) return

        setCajaOpen(activeCaja != null && activeCaja.status !== 'closed')

        setProducts(
          prods.map((p) => ({
            id: p.id,
            codigo: p.codigo,
            nombre: p.nombre,
            categoria: p.tipo || 'General',
            stock: p.stock,
            precioUnitario: p.precioUnitario || 0,
            precioTresUnidades: p.precioTresUnidades || 0,
            precioMediaDocena: p.precioMediaDocena || 0,
            precioDocena: p.precioDocena || 0,
          }))
        )
      } catch (err) {
        console.error('Error loading POS data', err)
        if (mounted) setCajaOpen(false)
      }
    })()
    return () => { mounted = false }
  }, [authReady, user?.uid])

  const displayPrice = (price: number) =>
    showPricesWithoutIva ? Math.round((price / 1.13) * 100) / 100 : price

  const calculateItemTotal = (item: CartItemLocal) => {
    const qty = item.quantity
    const unitPrice = item.precioUnitario || 0
    const specialTiers = [
      { quantity: 12, price: item.precioDocena },
      { quantity: 6, price: item.precioMediaDocena },
      { quantity: 3, price: item.precioTresUnidades },
    ].filter((tier) => Number(tier.price) > 0)

    const bestTier = specialTiers.find((tier) => qty >= tier.quantity)
    if (!bestTier) return qty * unitPrice

    if (qty === bestTier.quantity) return Number(bestTier.price)

    const remaining = qty - bestTier.quantity
    return Number(bestTier.price) + remaining * unitPrice
  }

  const getAvailableStock = (productId: string) => {
    return products.find((p) => p.id === productId)?.stock ?? 0
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const query = searchTerm.trim().toLowerCase()
    if (!query) return

    const match = products.find(
      (p) => (p.codigo || '').toLowerCase() === query || p.nombre.toLowerCase() === query
    )
    if (match && match.stock > 0) {
      addToCart(match)
    } else if (match && match.stock <= 0) {
      toast.warning(`${match.nombre} no tiene stock disponible`)
    } else {
      toast.error('Producto no encontrado')
    }
    setSearchTerm('')
    requestAnimationFrame(() => {
      searchInputRef.current?.focus()
    })
  }

  const addToCart = (product: ProductDB, qty = 1) => {
    const existing = cart.find((p) => p.id === product.id)
    const nextQty = (existing?.quantity ?? 0) + qty
    if (nextQty > product.stock) {
      toast.warning('Stock insuficiente para este producto')
      return
    }
    if (existing) {
      setCart(cart.map((p) => (p.id === product.id ? { ...p, quantity: nextQty } : p)))
    } else {
      setCart([...cart, { ...product, quantity: qty }])
    }
    const label = qty === 1 ? `${product.nombre} agregado` : `${qty}x ${product.nombre} agregados`
    toast.success(label, { autoClose: 1000, hideProgressBar: true })
  }

  const setSpecialQuantity = (product: ProductDB, qty: 3 | 6 | 12) => {
    if (qty > product.stock) {
      toast.warning('Stock insuficiente para este producto')
      return
    }

    setCart((prev) => {
      const exists = prev.some((item) => item.id === product.id)
      if (exists) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: qty } : item
        )
      }
      return [...prev, { ...product, quantity: qty }]
    })
  }

  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) => {
      const current = prev.find((item) => item.id === id)
      if (!current) return prev

      if (delta > 0) {
        const available = getAvailableStock(id)
        if (current.quantity + delta > available) {
          toast.warning('Stock insuficiente para este producto')
          return prev
        }
      }

      return prev
        .map((item) => (item.id === id ? { ...item, quantity: item.quantity + delta } : item))
        .filter((i) => i.quantity > 0)
    })
  }

  const removeFromCart = (id: string) => setCart((prev) => prev.filter((i) => i.id !== id))
  const clearCart = () => { setCart([]); setIsCartOpen(false) }

  const cartTotal = useMemo(() => cart.reduce((sum, it) => sum + calculateItemTotal(it), 0), [cart])
  const cartItemCount = useMemo(() => cart.reduce((sum, it) => sum + it.quantity, 0), [cart])

  const categories = useMemo(
    () => ['Todos', ...Array.from(new Set(products.map((p) => p.categoria || 'General')))],
    [products]
  )

  const filteredProducts = useMemo(
    () =>
      products.filter((p) => {
        const byCategory = selectedCategory === 'Todos' || p.categoria === selectedCategory
        const query = searchTerm.toLowerCase()
        const bySearch =
          p.nombre.toLowerCase().includes(query) ||
          (p.codigo || '').toLowerCase().includes(query)
        return byCategory && bySearch
      }),
    [products, searchTerm, selectedCategory]
  )

  const handleCheckout = () => {
    if (cart.length === 0) return
    const invalidItem = cart.find((item) => item.quantity > getAvailableStock(item.id))
    if (invalidItem) {
      toast.warning(`Stock insuficiente para ${invalidItem.nombre}`)
      return
    }
    setSelectedPaymentMethod(null)
    setCashReceivedInput('')
    setIsPaymentModalOpen(true)
  }

  const processPayment = async () => {
    if (!selectedPaymentMethod || isProcessingPayment) return
    if (!authReady || !user?.uid) {
      toast.error('Sesion invalida. Inicia sesion nuevamente.')
      return
    }

    let cashReceived = 0
    let changeAmount = 0
    if (selectedPaymentMethod === 'efectivo') {
      cashReceived = Number(cashReceivedInput)
      if (!Number.isFinite(cashReceived) || cashReceivedInput.trim() === '') {
        toast.error('Ingresa el monto recibido en efectivo.')
        return
      }
      if (cashReceived < cartTotal) {
        toast.error('El monto recibido es menor al total de la venta.')
        return
      }
      changeAmount = Number((cartTotal - cashReceived).toFixed(2))
    }

    const orderId = OrderService.reserveOrderId()
    if (!orderId) {
      toast.error('No se pudo generar el ID de la orden.')
      return
    }

    const order = {
      id: orderId,
      date: new Date().toISOString(),
      items: cart.map((i) => ({
        lineTotal: calculateItemTotal(i),
        id: i.id,
        name: i.nombre || '',
        codigo: i.codigo || null,
        quantity: i.quantity,
        unitPrice: i.quantity > 0 ? calculateItemTotal(i) / i.quantity : 0,
      })),
      subtotal: cartTotal,
      tax: 0,
      total: cartTotal,
      method: selectedPaymentMethod,
      cashReceived: selectedPaymentMethod === 'efectivo' ? cashReceived : null,
      changeAmount: selectedPaymentMethod === 'efectivo' ? changeAmount : null,
      createdBy: user.uid,
    }

    const inventoryUpdates: Array<{ inventarioId: string; quantity: number }> = []

    setIsProcessingPayment(true)
    try {
      const activeCaja = await CajaService.getActiveCaja(user.uid)
      if (!activeCaja || !activeCaja.id || activeCaja.status === 'closed') {
        throw new Error('No hay una caja abierta para el usuario actual')
      }

      // Decrement inventory for each sold item (rollback if any fail)
      for (const it of order.items) {
        const inv = await InventoryService.getInventarioByProductoId(it.id)
        if (!inv || !inv.id) {
          throw new Error(`Inventario no encontrado para ${it.name}`)
        }
        await InventoryService.descontarStock(inv.id, it.quantity, `venta ${orderId}`)
        inventoryUpdates.push({ inventarioId: inv.id, quantity: it.quantity })
      }

      await OrderService.createOrder(order, orderId)
      await CajaService.addSaleToCaja(activeCaja.id, {
        orderId,
        method: selectedPaymentMethod || 'efectivo',
        amount: order.total,
        items: order.items,
        cashReceived: order.cashReceived,
        changeAmount: order.changeAmount,
        createdBy: user.uid,
      })

      try {
        const updatedProducts = await InventoryService.getProducts()
        setProducts(
          updatedProducts.map((p) => ({
            id: p.id,
            codigo: p.codigo,
            nombre: p.nombre,
            categoria: p.tipo || 'General',
            stock: p.stock,
            precioUnitario: p.precioUnitario || 0,
            precioTresUnidades: p.precioTresUnidades || 0,
            precioMediaDocena: p.precioMediaDocena || 0,
            precioDocena: p.precioDocena || 0,
          }))
        )
      } catch (refreshError) {
        console.warn('No se pudo refrescar inventario del POS tras la venta', refreshError)
      }

      const completedOrder = { ...order, orderId, date: new Date().toLocaleString('es-SV') }
      setLastOrderInfo(completedOrder)

      setIsPaymentModalOpen(false)
      setIsTicketModalOpen(settings.printing.autoPrint)
      setCart([])
      setIsCartOpen(false)
      setSelectedPaymentMethod(null)
      setCashReceivedInput('')
      setLastSuccessfulOrder({
        orderId,
        total: Number(order.total || 0),
        method: String(order.method || 'efectivo'),
        cashReceived: order.cashReceived,
        changeAmount: order.changeAmount,
      })
      setShowSaleSuccess(true)

      if (settings.notifications.sales) {
        toast.success('Venta registrada correctamente')
      }

      if (settings.printing.autoPrint) {
        setTimeout(() => {
          printTicketPdf(completedOrder, true)
        }, 200)
      }
    } catch (err) {
      await Promise.allSettled(
        inventoryUpdates.map((it) =>
          InventoryService.agregarStock(it.inventarioId, it.quantity, `rollback ${orderId}`)
        )
      )
      try {
        await OrderService.deleteOrder(orderId)
      } catch (cleanupError) {
        console.warn('Error cleaning up order after failure', cleanupError)
      }
      console.error('Error processing payment', err)
      const message = err instanceof Error ? err.message : 'Error al procesar la venta.'
      toast.error(`${message} No se realizaron cambios.`)
    } finally {
      setIsProcessingPayment(false)
    }
  }

  const paymentLabels: Record<string, string> = { efectivo: 'Efectivo', tarjeta: 'Tarjeta', transferencia: 'Transferencia', qr: 'Código QR' }

  const buildTicketPdf = (orderInfo: any) => {
    if (!orderInfo) return null

    const paperSize = settings.printing.paperSize
    const width = paperSize === '58mm' ? 58 : paperSize === '80mm' ? 80 : 216
    const isLetter = paperSize === 'letter'
    const items = Array.isArray(orderInfo.items) ? orderInfo.items : []
    const lineHeight = paperSize === '58mm' ? 4 : 5
    const height = isLetter ? 279 : Math.max(140, 90 + items.length * (lineHeight * 2) + 60)

    const doc = new jsPDF({ unit: 'mm', format: isLetter ? 'letter' : [width, height] })
    const left = 4
    const right = isLetter ? 200 : width - 4
    const center = (left + right) / 2
    const fs = paperSize === '58mm' ? 6 : 7
    let y = 8

    doc.setFontSize(fs + 1)
    doc.setFont('helvetica', 'bold')
    doc.text('BIKINI STORE', center, y, { align: 'center' })
    y += 4
    doc.setFontSize(fs + 1)
    doc.setFont('helvetica', 'normal')
    doc.text('SISTEMA DE PUNTO DE VENTA', center, y, { align: 'center' })
    y += 5

    doc.setFontSize(fs)
    const ticketId = String(orderInfo.orderId || orderInfo.id || '').slice(-8).toUpperCase()
    doc.text(`Doc N°: ${ticketId}`, left, y)
    doc.text(`Caja: 1`, right, y, { align: 'right' })
    y += 3.5
    doc.text(`Fecha: ${orderInfo.date || ''}`, left, y)
    y += 3.5
    const empName = empleadoInfo.nombre || user?.email || 'Cajero'
    const empRol = empleadoInfo.rol || 'Vendedor'
    doc.text(`Empleado: ${empName}`, left, y)
    y += 3.5
    doc.text(`Cargo: ${empRol}`, left, y)
    y += 3.5
    doc.text('NOMBRE: Consumidor Final', left, y)
    y += 3

    doc.setDrawColor(0)
    doc.setLineWidth(0.3)
    doc.line(left, y, right, y)
    y += 3

    // Items — each item on two lines to avoid column overlap
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(fs)
    doc.text('Cant.', left, y)
    doc.text('Artículo', left + 8, y)
    y += 2
    doc.setLineWidth(0.15)
    doc.line(left, y, right, y)
    y += 3

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(fs)
    items.forEach((item: any) => {
      const name = String(item.name || 'Producto')
      const qty = Number(item.quantity || 0)
      const lineTotal = Number(item.lineTotal || 0)
      const unitPrice = qty > 0 ? lineTotal / qty : 0
      const maxNameLen = paperSize === '58mm' ? 22 : 30
      const displayName = name.length > maxNameLen ? name.substring(0, maxNameLen - 1) + '…' : name

      doc.text(`${qty}`, left, y)
      doc.text(displayName, left + 8, y)
      y += lineHeight
      doc.setFontSize(fs)
      doc.text(`  P.Unit: $${unitPrice.toFixed(2)}`, left, y)
      doc.text(`$${lineTotal.toFixed(2)}`, right, y, { align: 'right' })
      doc.setFontSize(fs)
      y += lineHeight
    })

    y += 1
    doc.line(left, y, right, y)
    y += 3.5

    const total = Number(orderInfo.total || 0)
    const baseImponible = Math.round((total / 1.13) * 100) / 100
    const ivaAmount = Math.round((total - baseImponible) * 100) / 100

    doc.setFontSize(fs)
    doc.text('Subtotal (sin IVA):', left, y)
    doc.text(`$${baseImponible.toFixed(2)}`, right, y, { align: 'right' })
    y += 3.5
    doc.text('IVA 13%:', left, y)
    doc.text(`$${ivaAmount.toFixed(2)}`, right, y, { align: 'right' })
    y += 3
    doc.setLineWidth(0.4)
    doc.line(left, y, right, y)
    y += 4

    doc.setFontSize(fs)
    doc.setFont('helvetica', 'bold')
    doc.text('TOTAL:', left, y)
    doc.text(`$${total.toFixed(2)}`, right, y, { align: 'right' })
    y += 5

    doc.setFontSize(fs)
    doc.setFont('helvetica', 'normal')
    const method = paymentLabels[orderInfo.method] || orderInfo.method || 'Efectivo'
    doc.text(`Metodo de pago: ${method}`, left, y)
    y += 3.5
    if (orderInfo.method === 'efectivo') {
      const cashReceived = Number(orderInfo.cashReceived ?? total)
      const changeAmount = Number(orderInfo.changeAmount ?? total - cashReceived)
      const formattedChange = changeAmount < 0 ? `-$${Math.abs(changeAmount).toFixed(2)}` : `$${changeAmount.toFixed(2)}`
      doc.text(`Efectivo: $${cashReceived.toFixed(2)}`, left, y)
      y += 3.5
      doc.text(`Cambio: ${formattedChange}`, left, y)
    } else {
      doc.text(`Pagado: $${total.toFixed(2)}`, left, y)
    }
    y += 4

    doc.setLineWidth(0.3)
    doc.line(left, y, right, y)
    y += 3.5
    doc.setFontSize(fs)
    doc.text('Gracias por tu preferencia', center, y, { align: 'center' })
    return doc
  }

  const saveTicketPdf = (orderInfo: any, closeAfter: boolean) => {
    const doc = buildTicketPdf(orderInfo)
    if (!doc) return
    const rawId = String(orderInfo.orderId || orderInfo.id || 'ticket')
    const safeId = rawId.replace(/[^a-zA-Z0-9_-]/g, '')
    doc.save(`ticket-${safeId || 'venta'}.pdf`)
    if (closeAfter) setIsTicketModalOpen(false)
  }

  const printTicketPdf = (orderInfo: any, closeAfter: boolean) => {
    const doc = buildTicketPdf(orderInfo)
    if (!doc) return
    const pdfBlob = doc.output('blob')
    const blobUrl = URL.createObjectURL(pdfBlob)
    const printWindow = window.open(blobUrl, '_blank')
    if (printWindow) {
      printWindow.addEventListener('load', () => {
        printWindow.focus()
        printWindow.print()
      })
    }
    if (closeAfter) setIsTicketModalOpen(false)
  }

  if (cajaOpen === null) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col md:flex-row">
        <Sidebar activeItem="pos" />
        <main className="flex-1 flex items-center justify-center pt-20 md:pt-0">
          <p className="text-gray-500 dark:text-gray-400 animate-pulse">Verificando estado de caja…</p>
        </main>
      </div>
    )
  }

  if (!cajaOpen) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col md:flex-row">
        <Sidebar activeItem="pos" />
        <main className="flex-1 flex items-center justify-center p-6 pt-20 md:pt-6">
          <div className="max-w-md text-center">
            <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-950/40 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-red-500 dark:text-red-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Caja Cerrada</h2>
            <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl p-4 mb-6 text-left">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-700 dark:text-amber-300">
                No puedes realizar ventas hasta que se abra la caja del día. Dirígete al módulo de <strong>Corte de Caja</strong> para realizar la apertura.
              </p>
            </div>
            <button
              onClick={() => navigate('/corte')}
              className="px-6 py-3 bg-[#8CC63F] hover:bg-[#7ab535] text-white font-bold rounded-xl transition-colors"
            >
              Ir a Corte de Caja
            </button>
          </div>
        </main>
      </div>
    )
  }

  const cartContent = (
    <>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <ShoppingCart className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-sm text-gray-400 dark:text-gray-500">El carrito está vacío</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Selecciona productos para agregar</p>
          </div>
        ) : (
          cart.map((item) => (
            <div key={item.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-start">
                <div className="min-w-0">
                  <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100 truncate">{item.nombre}</h4>
                  {[3, 6, 12].includes(item.quantity) && <span className="text-[10px] bg-[#8CC63F]/10 text-[#8CC63F] px-2 py-0.5 rounded mt-1 inline-block">Precio por Volumen</span>}
                </div>
                <button onClick={() => removeFromCart(item.id)} className="text-gray-300 hover:text-red-500 shrink-0 ml-2">
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1 border border-gray-200 dark:border-gray-600">
                  <button onClick={() => updateQuantity(item.id, -1)} className="w-9 h-9 flex items-center justify-center text-gray-700 dark:text-gray-300 active:bg-gray-200 dark:active:bg-gray-600 rounded-md transition-colors">
                    <Minus size={16} />
                  </button>
                  <span className="font-bold text-sm w-8 text-center text-gray-900 dark:text-gray-100">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, 1)} className="w-9 h-9 flex items-center justify-center text-gray-700 dark:text-gray-300 active:bg-gray-200 dark:active:bg-gray-600 rounded-md transition-colors">
                    <Plus size={16} />
                  </button>
                </div>
                <span className="font-bold text-gray-900 dark:text-gray-100 text-base">${calculateItemTotal(item).toFixed(2)}</span>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {[3, 6, 12].map((pack) => {
                  const disabled = item.stock < pack
                  const active = item.quantity === pack
                  return (
                    <button
                      key={pack}
                      type="button"
                      onClick={() => !disabled && setSpecialQuantity(item, pack as 3 | 6 | 12)}
                      disabled={disabled}
                      className={`rounded-md border py-1.5 text-xs font-semibold transition-colors ${
                        disabled
                          ? 'bg-gray-100 dark:bg-gray-800/40 border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                          : active
                          ? 'bg-lime-100 text-lime-800 border-lime-300 dark:bg-lime-900/35 dark:text-lime-200 dark:border-lime-700'
                          : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-lime-50 hover:border-lime-300 dark:hover:bg-lime-900/20 dark:hover:border-lime-700'
                      }`}
                    >
                      {pack}U
                    </button>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {cart.length > 0 && (
        <div className="p-5 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-xl font-bold text-gray-900 dark:text-white">
              <span>Total</span>
              <span className="text-[#8CC63F]">${cartTotal.toFixed(2)}</span>
            </div>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 text-right">
              {showPricesWithoutIva ? 'Precios mostrados sin IVA · Total con IVA' : 'IVA incluido'}
            </p>
          </div>
          <button onClick={handleCheckout} className="w-full py-3.5 rounded-xl bg-[#8CC63F] text-white font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform">
            Cobrar ${cartTotal.toFixed(2)} <ChevronRight size={18} />
          </button>
          <button onClick={clearCart} className="w-full mt-2 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
            Vaciar carrito
          </button>
        </div>
      )}
    </>
  )

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col md:flex-row">
      <Sidebar activeItem="pos" />

      <div className="flex-1 flex flex-col md:flex-row min-h-0">
        {/* Products area */}
        <main className="flex-1 p-4 pt-20 md:pt-6 md:p-6 overflow-y-auto">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 md:p-5 mb-4 shadow-sm">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-[#8CC63F] flex items-center justify-center shadow-sm shrink-0">
                  <Store size={20} className="text-white" />
                </div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white truncate">Punto de Venta</h1>
              </div>
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-lime-50 dark:bg-lime-900/30 border border-lime-200 dark:border-lime-800/60">
                <span className="w-2 h-2 rounded-full bg-[#8CC63F]" />
                <span className="text-xs font-semibold text-lime-700 dark:text-lime-300">Caja abierta</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div className="relative min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-lime-700/50 dark:text-lime-300/70" size={17} />
                <input
                  ref={searchInputRef}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  autoFocus
                  placeholder="Escanear código o buscar producto..."
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-lime-200/80 dark:border-lime-800/70 bg-lime-50/40 dark:bg-lime-900/20 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-lime-300 dark:focus:ring-lime-700"
                />
              </div>
            </div>

            <div className="mt-3 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setShowPricesWithoutIva((v) => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  showPricesWithoutIva
                    ? 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700'
                    : 'bg-lime-50 text-lime-700 border-lime-300 dark:bg-lime-900/30 dark:text-lime-300 dark:border-lime-700'
                }`}
              >
                {showPricesWithoutIva ? 'Precios sin IVA' : 'Precios con IVA'}
              </button>
            </div>

            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {categories.map((category) => {
                const active = selectedCategory === category
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setSelectedCategory(category)}
                    className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
                      active
                        ? 'bg-lime-100 text-lime-800 border border-lime-300 dark:bg-lime-900/35 dark:text-lime-200 dark:border-lime-700'
                        : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700'
                    }`}
                  >
                    {category}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 pb-24 md:pb-4">
            {filteredProducts.map((product) => {
              const stock = Number(product.stock || 0)
              const isOutOfStock = stock <= 0
              const isLowStock = stock > 0 && stock <= 5
              const stockLabel = isOutOfStock ? 'Sin stock' : isLowStock ? 'Stock bajo' : 'Disponible'
              const stockTone = isOutOfStock
                ? 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800/60'
                : isLowStock
                ? 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/60'
                : 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700'
              const stockProgress = Math.max(0, Math.min(100, Math.round((stock / 24) * 100)))
              const stockProgressTone =
                stockProgress >= 70
                  ? 'bg-emerald-500'
                  : stockProgress >= 40
                  ? 'bg-lime-500'
                  : stockProgress >= 15
                  ? 'bg-amber-400'
                  : 'bg-orange-400'

              return (
                <div
                  key={product.id}
                  className={`group relative overflow-hidden rounded-2xl border p-4 transition-all duration-200 ${
                    isOutOfStock
                      ? 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 opacity-80'
                      : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:-translate-y-0.5 hover:shadow-md dark:hover:shadow-gray-900/60'
                  }`}
                >
                  <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-slate-100/80 dark:bg-slate-700/20 blur-2xl pointer-events-none" />
                  <div className="relative">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">{product.nombre}</h3>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 truncate">Cod: {product.codigo || 'N/A'}</p>
                      </div>
                      <span className={`shrink-0 px-2 py-1 rounded-full text-[11px] font-semibold ${stockTone}`}>
                        {stockLabel}
                      </span>
                    </div>
                    <div className="mt-3 rounded-xl bg-lime-50 dark:bg-lime-900/20 border border-lime-200 dark:border-lime-800 px-3 py-2.5">
                      <p className="text-[11px] uppercase tracking-wide text-lime-700/80 dark:text-lime-300">
                        Precio unitario {showPricesWithoutIva && <span className="text-amber-600 dark:text-amber-400">(sin IVA)</span>}
                      </p>
                      <p className="text-2xl font-bold leading-tight text-lime-800 dark:text-lime-100">${displayPrice(product.precioUnitario || 0).toFixed(2)}</p>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <button
                        onClick={() => { if (!isOutOfStock && stock >= 3) setSpecialQuantity(product, 3) }}
                        disabled={isOutOfStock || stock < 3}
                        className={`rounded-lg border px-2.5 py-2 text-left transition-colors ${
                          isOutOfStock || stock < 3
                            ? 'bg-gray-100 dark:bg-gray-800/40 border-gray-200 dark:border-gray-700 opacity-60 cursor-not-allowed'
                            : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:bg-lime-50 hover:border-lime-300 dark:hover:bg-lime-900/20 dark:hover:border-lime-700 cursor-pointer active:scale-95'
                        }`}
                      >
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">3 unidades</p>
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">${(product.precioTresUnidades || product.precioUnitario * 3).toFixed(2)}</p>
                      </button>
                      <button
                        onClick={() => { if (!isOutOfStock && stock >= 6) setSpecialQuantity(product, 6) }}
                        disabled={isOutOfStock || stock < 6}
                        className={`rounded-lg border px-2.5 py-2 text-left transition-colors ${
                          isOutOfStock || stock < 6
                            ? 'bg-gray-100 dark:bg-gray-800/40 border-gray-200 dark:border-gray-700 opacity-60 cursor-not-allowed'
                            : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:bg-lime-50 hover:border-lime-300 dark:hover:bg-lime-900/20 dark:hover:border-lime-700 cursor-pointer active:scale-95'
                        }`}
                      >
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">6 unidades</p>
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">${displayPrice(product.precioMediaDocena || 0).toFixed(2)}</p>
                      </button>
                      <button
                        onClick={() => { if (!isOutOfStock && stock >= 12) setSpecialQuantity(product, 12) }}
                        disabled={isOutOfStock || stock < 12}
                        className={`rounded-lg border px-2.5 py-2 text-left transition-colors ${
                          isOutOfStock || stock < 12
                            ? 'bg-gray-100 dark:bg-gray-800/40 border-gray-200 dark:border-gray-700 opacity-60 cursor-not-allowed'
                            : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:bg-lime-50 hover:border-lime-300 dark:hover:bg-lime-900/20 dark:hover:border-lime-700 cursor-pointer active:scale-95'
                        }`}
                      >
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">12 unidades</p>
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">${displayPrice(product.precioDocena || 0).toFixed(2)}</p>
                      </button>
                    </div>
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500 dark:text-gray-400">Stock</span>
                        <span className={`font-semibold ${isOutOfStock ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}`}>{stock}</span>
                      </div>
                      <div className="mt-1 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${stockProgressTone}`} style={{ width: `${stockProgress}%` }} />
                      </div>
                    </div>
                    <button
                      onClick={() => { if (!isOutOfStock) addToCart(product) }}
                      disabled={isOutOfStock}
                      className={`mt-4 w-full py-2.5 rounded-xl text-sm font-semibold transition-colors active:scale-[0.97] ${
                        isOutOfStock
                          ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-500 cursor-not-allowed'
                          : 'bg-lime-100 hover:bg-lime-200 dark:bg-lime-800/40 dark:hover:bg-lime-700/50 text-lime-900 dark:text-lime-100'
                      }`}
                    >
                      {isOutOfStock ? 'Sin stock' : 'Agregar al carrito'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </main>

        {/* ═══ DESKTOP CART SIDEBAR (always visible, fixed to right) ═══ */}
        <aside className="hidden md:flex flex-col w-[380px] shrink-0 border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 h-screen sticky top-0">
          <div className="h-[72px] px-5 border-b border-gray-200 dark:border-gray-800 flex items-center bg-gray-50 dark:bg-gray-950 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#8CC63F]/10 text-[#8CC63F] rounded-lg">
                <ShoppingCart size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Venta Actual</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">{cartItemCount} artículos</p>
              </div>
            </div>
          </div>
          {cartContent}
        </aside>
      </div>

      {/* ═══ MOBILE: Floating cart button ═══ */}
      {cart.length > 0 && !isCartOpen && (
        <button
          onClick={() => setIsCartOpen(true)}
          className="md:hidden fixed bottom-6 right-6 z-30 flex items-center gap-2.5 px-5 py-3.5 bg-[#8CC63F] text-white rounded-2xl shadow-lg shadow-[#8CC63F]/30 active:scale-95 transition-transform"
        >
          <ShoppingCart size={20} />
          <span className="font-bold text-sm">
            {cartItemCount} · ${cartTotal.toFixed(2)}
          </span>
        </button>
      )}

      {/* ═══ MOBILE: Cart slide-over ═══ */}
      {isCartOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/40" onClick={() => setIsCartOpen(false)} />
          <div className="absolute top-0 right-0 h-full w-full max-w-[400px] flex flex-col bg-white dark:bg-gray-900 shadow-xl animate-[slideInRight_0.25s_ease-out]">
            <div className="h-[64px] px-5 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gray-50 dark:bg-gray-950 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#8CC63F]/10 text-[#8CC63F] rounded-lg">
                  <ShoppingCart size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900 dark:text-white">Venta Actual</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{cartItemCount} artículos</p>
                </div>
              </div>
              <button onClick={() => setIsCartOpen(false)} className="p-2.5 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors active:scale-95">
                <X size={20} />
              </button>
            </div>
            {cartContent}
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 bg-gray-900/50 z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 w-full max-w-lg">
            <h2 className="text-xl font-bold text-center mb-4 text-gray-900 dark:text-white">Seleccionar Método de Pago</h2>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                { id: 'efectivo', label: 'Efectivo', icon: Banknote },
                { id: 'tarjeta', label: 'Tarjeta', icon: CardIcon },
                { id: 'transferencia', label: 'Transferencia', icon: ArrowRightLeft },
                { id: 'qr', label: 'Código QR', icon: QrCode }
              ].map((method) => (
                <button key={method.id} onClick={() => setSelectedPaymentMethod(method.id)} className={`flex flex-col items-center p-4 rounded-xl border text-gray-800 dark:text-gray-200 transition-colors ${selectedPaymentMethod === method.id ? 'border-[#8CC63F] bg-[#8CC63F]/10 dark:bg-[#8CC63F]/10' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                  <method.icon size={22} className="mb-2" />
                  <span className="font-semibold text-sm">{method.label}</span>
                </button>
              ))}
            </div>

            {selectedPaymentMethod === 'efectivo' && (
              <div className="mb-4 rounded-xl border border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-800/50">
                <label htmlFor="cash-received" className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                  Monto recibido en efectivo
                </label>
                <input
                  id="cash-received"
                  type="number"
                  min="0"
                  step="0.01"
                  value={cashReceivedInput}
                  onChange={(e) => setCashReceivedInput(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-lime-500"
                />
                <p className="mt-2 text-xs text-gray-600 dark:text-gray-300">Total venta: ${cartTotal.toFixed(2)}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => { setIsPaymentModalOpen(false); setSelectedPaymentMethod(null); setCashReceivedInput('') }} className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">Cancelar</button>
              <button onClick={processPayment} disabled={!selectedPaymentMethod || isProcessingPayment || (selectedPaymentMethod === 'efectivo' && (cashReceivedInput.trim() === '' || Number(cashReceivedInput) < cartTotal))} className={`flex-1 py-3 rounded-xl text-white transition-colors ${selectedPaymentMethod && !isProcessingPayment && !(selectedPaymentMethod === 'efectivo' && (cashReceivedInput.trim() === '' || Number(cashReceivedInput) < cartTotal)) ? 'bg-[#8CC63F] hover:bg-[#7ab535]' : 'bg-gray-300 dark:bg-gray-700 dark:text-gray-500'}`}>
                Confirmar Pago
              </button>
            </div>
          </div>
        </div>
      )}

      {showSaleSuccess && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/35 backdrop-blur-sm px-4"
          onClick={() => setShowSaleSuccess(false)}
        >
          <div
            className="relative w-full max-w-sm rounded-2xl bg-white dark:bg-gray-900 border border-lime-200 dark:border-lime-700 shadow-2xl p-6 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
              <div className="absolute -top-8 -left-8 w-24 h-24 bg-lime-200/50 rounded-full animate-ping" />
              <div className="absolute -bottom-6 -right-8 w-20 h-20 bg-lime-300/40 rounded-full animate-ping [animation-delay:250ms]" />
            </div>
            <div className="relative">
              <div className="mx-auto w-16 h-16 rounded-full bg-lime-100 dark:bg-lime-900/40 flex items-center justify-center mb-4">
                <CheckCircle2 className="w-10 h-10 text-lime-600 dark:text-lime-400 animate-bounce" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Venta exitosa</h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                Orden {lastSuccessfulOrder?.orderId || ''} registrada correctamente.
              </p>
              {(() => {
                const total = Number(lastSuccessfulOrder?.total || 0)
                const method = String(lastSuccessfulOrder?.method || 'efectivo')
                const efectivo =
                  Number(lastSuccessfulOrder?.cashReceived ?? 0) > 0
                    ? Number(lastSuccessfulOrder?.cashReceived)
                    : total
                const hasSavedChange =
                  lastSuccessfulOrder?.changeAmount !== null &&
                  typeof lastSuccessfulOrder?.changeAmount !== 'undefined'
                const cambio = hasSavedChange
                  ? Number(lastSuccessfulOrder?.changeAmount)
                  : Number((total - efectivo).toFixed(2))
                const cambioText = cambio < 0 ? `-$${Math.abs(cambio).toFixed(2)}` : `$${cambio.toFixed(2)}`
                return (
                  <div className="mt-3 rounded-xl border border-lime-200 dark:border-lime-800 bg-lime-50/70 dark:bg-lime-900/20 p-3 text-left space-y-1.5">
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                      Total: <span className="text-lime-700 dark:text-lime-300">${total.toFixed(2)}</span>
                    </p>
                    {method === 'efectivo' ? (
                      <>
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                          Efectivo: <span className="text-lime-700 dark:text-lime-300">${efectivo.toFixed(2)}</span>
                        </p>
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                          Cambio: <span className="text-lime-700 dark:text-lime-300">{cambioText}</span>
                        </p>
                      </>
                    ) : (
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                        Pagado: <span className="text-lime-700 dark:text-lime-300">${total.toFixed(2)}</span>
                      </p>
                    )}
                  </div>
                )
              })()}
              <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">Toca fuera de esta ventana para cerrar</p>
            </div>
          </div>
        </div>
      )}

      {/* Ticket Modal */}
      {isTicketModalOpen && lastOrderInfo && (() => {
        const tTotal = Number(lastOrderInfo.total || 0)
        const tBase = Math.round((tTotal / 1.13) * 100) / 100
        const tIva = Math.round((tTotal - tBase) * 100) / 100
        const tMethod = paymentLabels[lastOrderInfo.method] || lastOrderInfo.method || 'Efectivo'
        const tCashReceived = Number(lastOrderInfo.cashReceived || 0)
        const tChangeAmount = Number(lastOrderInfo.changeAmount || 0)
        const showCashBreakdown = lastOrderInfo.method === 'efectivo' && tCashReceived > 0
        const tTicketId = String(lastOrderInfo.orderId || lastOrderInfo.id || '').slice(-8).toUpperCase()
        return (
          <div className="fixed inset-0 bg-gray-900/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="w-full sm:max-w-sm bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 sm:p-5 rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto">
              <div id="print-area" className="bg-white dark:bg-gray-900 p-5 rounded-xl shadow-sm text-xs">
                {/* Header */}
                <div className="text-center mb-4">
                  <div className="w-11 h-11 bg-[#8CC63F] text-white rounded-xl flex items-center justify-center mx-auto mb-2"><Store size={20} /></div>
                  <h2 className="text-sm font-bold uppercase text-gray-900 dark:text-white">Bikini Store</h2>
                  <p className="text-sm uppercase text-gray-400 dark:text-gray-500 mt-0.5">Sistema de Punto de Venta</p>
                </div>

                {/* Info */}
                <div className="grid grid-cols-2 gap-y-1 gap-x-2 text-xs text-gray-500 dark:text-gray-400 mb-3 px-1">
                  <p>Doc N°: <span className="font-medium text-gray-700 dark:text-gray-300">{tTicketId}</span></p>
                  <p className="text-right">Caja: <span className="font-medium text-gray-700 dark:text-gray-300">1</span></p>
                  <p className="col-span-2">Fecha: <span className="font-medium text-gray-700 dark:text-gray-300">{lastOrderInfo.date}</span></p>
                  <p className="col-span-2">Empleado: <span className="font-medium text-gray-700 dark:text-gray-300">{empleadoInfo.nombre || user?.email || 'Cajero'}{empleadoInfo.rol ? ` (${empleadoInfo.rol})` : ''}</span></p>
                  <p className="col-span-2">NAME: <span className="font-medium text-gray-700 dark:text-gray-300">Final Consumer</span></p>
                </div>

                {/* Items table */}
                <div className="border-t border-gray-200 dark:border-gray-700">
                  <div className="grid grid-cols-[32px_1fr_60px_60px] gap-1 py-2 px-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide border-b border-gray-100 dark:border-gray-800">
                    <span>Cant.</span>
                    <span>Artículo</span>
                    <span className="text-right">P. Unit.</span>
                    <span className="text-right">Total</span>
                  </div>
                  {lastOrderInfo.items.map((it: any, idx: number) => {
                    const qty = Number(it.quantity || 0)
                    const lt = Number(it.lineTotal || 0)
                    const up = qty > 0 ? lt / qty : 0
                    return (
                      <div key={idx} className="grid grid-cols-[32px_1fr_60px_60px] gap-1 py-2 px-1 text-xs border-b border-gray-50 dark:border-gray-800/50">
                        <span className="text-gray-600 dark:text-gray-300">{qty}</span>
                        <span className="text-gray-800 dark:text-gray-200 font-medium truncate">{it.name}</span>
                        <span className="text-right text-gray-500 dark:text-gray-400">${up.toFixed(2)}</span>
                        <span className="text-right font-medium text-gray-900 dark:text-gray-100">${lt.toFixed(2)}</span>
                      </div>
                    )
                  })}
                </div>

                {/* IVA breakdown */}
                <div className="mt-3 space-y-1.5 text-xs px-1">
                  <div className="flex justify-between text-gray-500 dark:text-gray-400">
                    <span>Subtotal (sin IVA)</span>
                    <span>${tBase.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-500 dark:text-gray-400">
                    <span>IVA 13%</span>
                    <span>${tIva.toFixed(2)}</span>
                  </div>
                </div>

                {/* Total */}
                <div className="flex justify-between items-center font-bold text-xs mt-3 pt-3 border-t-2 border-gray-900 dark:border-gray-100 text-gray-900 dark:text-white px-1">
                  <span>TOTAL</span>
                  <span>${tTotal.toFixed(2)}</span>
                </div>

                {/* Payment info */}
                <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800/60 rounded-lg text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Metodo de pago</span>
                    <span className="font-semibold text-gray-800 dark:text-gray-200">{tMethod}</span>
                  </div>
                  {showCashBreakdown ? (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Efectivo</span>
                        <span className="font-semibold text-[#8CC63F]">${tCashReceived.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Cambio</span>
                        <span className="font-semibold text-gray-800 dark:text-gray-200">
                          {tChangeAmount < 0 ? `-$${Math.abs(tChangeAmount).toFixed(2)}` : `$${tChangeAmount.toFixed(2)}`}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Pagado</span>
                      <span className="font-semibold text-[#8CC63F]">${tTotal.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-3">Thank you for shopping with us</p>
              </div>
              <div className="mt-3 flex gap-2">
                <button onClick={() => setIsTicketModalOpen(false)} className="flex-1 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-200 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-sm">Cerrar</button>
                <button onClick={() => saveTicketPdf(lastOrderInfo, true)} className="flex-1 py-2.5 bg-[#8CC63F] text-white rounded-xl flex items-center justify-center gap-2 text-sm active:scale-95 transition-transform"><Receipt size={16} />Descargar PDF</button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
