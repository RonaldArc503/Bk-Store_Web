import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sidebar } from '../components/Sidebar'
import {
  ShoppingCart,
  Barcode,
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
  ChevronLeft,
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
import { BarcodeImageScanButton } from '../components/BarcodeImageScanButton'
import { useSettings } from '../context/SettingsContext'

type ProductDB = {
  id: string
  codigo?: string
  nombre: string
  stock: number
  precioUnitario: number
  precioMediaDocena: number
  precioDocena: number
}

type CartItemLocal = ProductDB & { quantity: number }

const TAX_RATE = 0.13

const roundCurrency = (value: number) => Math.round(value * 100) / 100

export default function POS() {
  const { user, authReady } = useAuth()
  const { settings } = useSettings()
  const navigate = useNavigate()

  const [cart, setCart] = useState<CartItemLocal[]>([])
  const [products, setProducts] = useState<ProductDB[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [barcodeScan, setBarcodeScan] = useState('')
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null)
  const [lastOrderInfo, setLastOrderInfo] = useState<any>(null)
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)
  const [showSaleSuccess, setShowSaleSuccess] = useState(false)
  const [lastSuccessfulOrder, setLastSuccessfulOrder] = useState<{ orderId: string; total: number } | null>(null)
  const successTimerRef = useRef<number | null>(null)

  const [cajaOpen, setCajaOpen] = useState<boolean | null>(null)

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
    return () => {
      if (successTimerRef.current !== null) {
        window.clearTimeout(successTimerRef.current)
      }
    }
  }, [])

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
            stock: p.stock,
            precioUnitario: p.precioUnitario || 0,
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

  const calculateItemTotal = (item: CartItemLocal) => {
    const qty = item.quantity
    const dozens = Math.floor(qty / 12)
    const halfDozens = Math.floor((qty % 12) / 6)
    const units = qty % 6
    return (
      dozens * (item.precioDocena || 0) +
      halfDozens * (item.precioMediaDocena || 0) +
      units * (item.precioUnitario || 0)
    )
  }

  const getAvailableStock = (productId: string) => {
    return products.find((p) => p.id === productId)?.stock ?? 0
  }

  const addToCart = (product: ProductDB) => {
    setCart((prev) => {
      const existing = prev.find((p) => p.id === product.id)
      const nextQty = (existing?.quantity ?? 0) + 1
      if (nextQty > product.stock) {
        toast.warning('Stock insuficiente para este producto')
        return prev
      }
      if (existing) return prev.map((p) => (p.id === product.id ? { ...p, quantity: nextQty } : p))
      return [...prev, { ...product, quantity: 1 }]
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
  const clearCart = () => setCart([])

  const cartTotal = useMemo(() => cart.reduce((sum, it) => sum + calculateItemTotal(it), 0), [cart])
  const taxAmount = useMemo(() => roundCurrency(cartTotal * TAX_RATE), [cartTotal])
  const totalWithTax = useMemo(() => roundCurrency(cartTotal + taxAmount), [cartTotal, taxAmount])
  const cartItemCount = useMemo(() => cart.reduce((sum, it) => sum + it.quantity, 0), [cart])

  const filteredProducts = products.filter((p) => p.nombre.toLowerCase().includes(searchTerm.toLowerCase()))

  const tryAddByBarcode = (code: string) => {
    const trimmed = code.trim()
    if (!trimmed) return
    const product = products.find((p) => (p.codigo || '').trim() === trimmed)
    if (product) {
      addToCart(product)
      setBarcodeScan('')
    } else {
      setBarcodeScan(trimmed)
      toast.error('Producto no encontrado')
    }
  }

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    tryAddByBarcode(barcodeScan)
  }

  const handleCheckout = () => {
    if (cart.length === 0) return
    const invalidItem = cart.find((item) => item.quantity > getAvailableStock(item.id))
    if (invalidItem) {
      toast.warning(`Stock insuficiente para ${invalidItem.nombre}`)
      return
    }
    setIsPaymentModalOpen(true)
  }

  const processPayment = async () => {
    if (!selectedPaymentMethod || isProcessingPayment) return
    if (!authReady || !user?.uid) {
      toast.error('Sesion invalida. Inicia sesion nuevamente.')
      return
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
        id: i.id,
        name: i.nombre || '',
        codigo: i.codigo || null,
        quantity: i.quantity,
        unitPrice: i.precioUnitario || 0,
        lineTotal: calculateItemTotal(i),
      })),
      subtotal: cartTotal,
      taxRate: TAX_RATE,
      tax: taxAmount,
      total: totalWithTax,
      method: selectedPaymentMethod,
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
        createdBy: user.uid,
      })

      try {
        const updatedProducts = await InventoryService.getProducts()
        setProducts(
          updatedProducts.map((p) => ({
            id: p.id,
            codigo: p.codigo,
            nombre: p.nombre,
            stock: p.stock,
            precioUnitario: p.precioUnitario || 0,
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
      setSelectedPaymentMethod(null)
      setLastSuccessfulOrder({ orderId, total: Number(order.total || 0) })
      setShowSaleSuccess(true)

      if (successTimerRef.current !== null) {
        window.clearTimeout(successTimerRef.current)
      }
      successTimerRef.current = window.setTimeout(() => {
        setShowSaleSuccess(false)
      }, 2200)

      if (settings.notifications.sales) {
        toast.success('Venta registrada correctamente')
      }

      if (settings.printing.autoPrint) {
        setTimeout(() => {
          downloadTicketPdf(completedOrder, true)
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

  const downloadTicketPdf = (orderInfo: any, closeAfter: boolean) => {
    if (!orderInfo) return

    const paperSize = settings.printing.paperSize
    const width = paperSize === '58mm' ? 58 : paperSize === '80mm' ? 80 : 216
    const isLetter = paperSize === 'letter'
    const baseHeight = 90
    const lineHeight = 5
    const itemsCount = Array.isArray(orderInfo.items) ? orderInfo.items.length : 0
    const height = isLetter ? 279 : Math.max(baseHeight, 55 + itemsCount * lineHeight + 30)

    const doc = new jsPDF({
      unit: 'mm',
      format: isLetter ? 'letter' : [width, height],
    })

    const left = 6
    const right = isLetter ? 200 : width - 6
    let y = 10

    doc.setFontSize(12)
    doc.text('Bikini Store', (left + right) / 2, y, { align: 'center' })
    y += 5
    doc.setFontSize(8)
    doc.text(`Ticket: ${orderInfo.orderId || orderInfo.id || ''}`, left, y)
    y += 4
    doc.text(`Fecha: ${orderInfo.date || ''}`, left, y)
    y += 4
    doc.line(left, y, right, y)
    y += 4

    doc.setFontSize(8)
    const items = Array.isArray(orderInfo.items) ? orderInfo.items : []
    items.forEach((item: any) => {
      const name = item.name || 'Producto'
      const qty = item.quantity || 0
      const lineTotal = Number(item.lineTotal || 0)
      doc.text(`${qty} x ${name}`, left, y)
      doc.text(`$${lineTotal.toFixed(2)}`, right, y, { align: 'right' })
      y += lineHeight
    })

    y += 2
    doc.line(left, y, right, y)
    y += 4
    doc.text(`Subtotal: $${Number(orderInfo.subtotal || 0).toFixed(2)}`, left, y)
    y += 4
    doc.text(`IVA (13%): $${Number(orderInfo.tax || 0).toFixed(2)}`, left, y)
    y += 5
    doc.setFontSize(10)
    doc.text(`TOTAL: $${Number(orderInfo.total || 0).toFixed(2)}`, left, y)

    const rawId = String(orderInfo.orderId || orderInfo.id || 'ticket')
    const safeId = rawId.replace(/[^a-zA-Z0-9_-]/g, '')
    const fileName = `ticket-${safeId || 'venta'}.pdf`
    doc.save(fileName)

    if (closeAfter) {
      setIsTicketModalOpen(false)
    }
  }

  if (cajaOpen === null) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex">
        <Sidebar activeItem="pos" />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-gray-500 dark:text-gray-400 animate-pulse">Verificando estado de caja…</p>
        </main>
      </div>
    )
  }

  if (!cajaOpen) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col md:flex-row">
        <Sidebar activeItem="pos" />
        <main className="flex-1 flex items-center justify-center p-6">
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex">
      <Sidebar activeItem="pos" />

      <main className="flex-1 p-6">
        <div className="h-[72px] flex items-center gap-4 mb-4">
          <button className="p-1 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold">Punto de Venta</h1>
        </div>

        <div className="space-y-4">
          <form
            onSubmit={handleBarcodeSubmit}
            className="flex flex-col sm:flex-row gap-3 max-w-3xl sm:items-center"
          >
            <div className="relative flex-1 min-w-0">
              <Barcode className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                value={barcodeScan}
                onChange={(e) => setBarcodeScan(e.target.value)}
                placeholder="Escanear código de barras..."
                className="w-full pl-12 pr-4 py-3 bg-[#F3F4F6] rounded-xl outline-none"
              />
            </div>
            <div className="flex flex-wrap gap-2 items-center shrink-0">
              <BarcodeImageScanButton
                onDecoded={(text) => tryAddByBarcode(text)}
              />
              <button
                type="submit"
                className="px-6 py-3 bg-[#8CC63F] text-white rounded-xl font-medium"
              >
                Agregar
              </button>
            </div>
          </form>

          <div className="relative max-w-3xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar productos..."
              className="w-full pl-12 pr-4 py-3 bg-[#F3F4F6] rounded-xl outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                onClick={() => addToCart(product)}
                className="bg-white rounded-xl p-5 border border-gray-200 cursor-pointer"
              >
                <h3 className="font-bold">{product.nombre}</h3>
                <p className="text-2xl font-bold text-[#8CC63F]">${(product.precioUnitario || 0).toFixed(2)}</p>
                <div className="text-sm text-gray-500">
                  <p>6 und: ${(product.precioMediaDocena || 0).toFixed(2)}</p>
                  <p>12 und: ${(product.precioDocena || 0).toFixed(2)}</p>
                </div>
                <p className="text-xs text-gray-400 mt-2">Stock: {product.stock}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Cart panel */}
      <div className={`fixed top-0 right-0 h-full w-[380px] bg-white border-l border-gray-200 z-20 transition-transform ${cart.length > 0 ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="h-[72px] px-6 border-b flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#8CC63F]/10 text-[#8CC63F] rounded-lg">
              <ShoppingCart size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold">Venta Actual</h2>
              <p className="text-xs text-gray-500">{cartItemCount} artículos</p>
            </div>
          </div>
          <button onClick={clearCart} className="p-2 text-gray-400 hover:text-red-500">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.map((item) => (
            <div key={item.id} className="bg-white p-4 rounded-xl border border-gray-200">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-sm">{item.nombre}</h4>
                  {item.quantity >= 6 && <span className="text-[10px] bg-[#8CC63F]/10 text-[#8CC63F] px-2 py-0.5 rounded mt-1 inline-block">Precio por Volumen Aplicado</span>}
                </div>
                <button onClick={() => removeFromCart(item.id)} className="text-gray-300 hover:text-red-500">
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 border border-gray-200">
                  <button onClick={() => updateQuantity(item.id, -1)} className="w-7 h-7 flex items-center justify-center">
                    <Minus size={14} />
                  </button>
                  <span className="font-bold text-sm w-6 text-center">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, 1)} className="w-7 h-7 flex items-center justify-center">
                    <Plus size={14} />
                  </button>
                </div>
                <span className="font-bold text-gray-900 text-base">${calculateItemTotal(item).toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>

          <div className="p-6 border-t bg-white">
          <div className="space-y-2 mb-5">
            <div className="flex justify-between text-gray-500 text-sm">
              <span>Subtotal</span>
              <span>${cartTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-500 text-sm">
              <span>IVA (13%)</span>
              <span>${taxAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xl font-bold text-gray-900 pt-3 border-t mt-2">
              <span>Total</span>
              <span className="text-[#8CC63F]">${totalWithTax.toFixed(2)}</span>
            </div>
          </div>

          <button onClick={handleCheckout} className="w-full py-3.5 rounded-xl bg-[#8CC63F] text-white font-bold flex items-center justify-center gap-2">
            Cobrar ${totalWithTax.toFixed(2)} <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Payment Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 bg-gray-900/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg">
            <h2 className="text-xl font-bold text-center mb-4">Seleccionar Método de Pago</h2>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                { id: 'efectivo', label: 'Efectivo', icon: Banknote },
                { id: 'tarjeta', label: 'Tarjeta', icon: CardIcon },
                { id: 'transferencia', label: 'Transferencia', icon: ArrowRightLeft },
                { id: 'qr', label: 'Código QR', icon: QrCode }
              ].map((method) => (
                <button key={method.id} onClick={() => setSelectedPaymentMethod(method.id)} className={`flex flex-col items-center p-4 rounded-xl border ${selectedPaymentMethod === method.id ? 'border-[#8CC63F] bg-[#8CC63F]/5' : 'border-gray-100'}`}>
                  <method.icon size={22} className="mb-2" />
                  <span className="font-semibold text-sm">{method.label}</span>
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setIsPaymentModalOpen(false)} className="flex-1 py-3 bg-gray-100 rounded-xl">Cancelar</button>
              <button onClick={processPayment} disabled={!selectedPaymentMethod || isProcessingPayment} className={`flex-1 py-3 rounded-xl text-white ${selectedPaymentMethod && !isProcessingPayment ? 'bg-[#8CC63F]' : 'bg-gray-300'}`}>
                Confirmar Pago
              </button>
            </div>
          </div>
        </div>
      )}

      {showSaleSuccess && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/35 backdrop-blur-sm px-4">
          <div className="relative w-full max-w-sm rounded-2xl bg-white dark:bg-gray-900 border border-lime-200 dark:border-lime-700 shadow-2xl p-6 text-center">
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
              <p className="mt-1 text-lg font-bold text-lime-600 dark:text-lime-400">
                Total: ${Number(lastSuccessfulOrder?.total || 0).toFixed(2)}
              </p>
              <button
                onClick={() => setShowSaleSuccess(false)}
                className="mt-5 px-5 py-2 rounded-lg bg-lime-500 hover:bg-lime-600 text-white font-semibold transition-colors"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ticket Modal */}
      {isTicketModalOpen && lastOrderInfo && (
        <div className="fixed inset-0 bg-gray-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-100 p-6 rounded-2xl w-full max-w-sm">
            <div id="print-area" className="bg-white p-6 rounded-lg">
              <div className="text-center mb-4">
                <div className="w-10 h-10 bg-[#8CC63F] text-white rounded-lg flex items-center justify-center mx-auto mb-2"><Store size={18} /></div>
                <h2 className="font-bold">Bikini Store</h2>
                <p className="text-xs text-gray-500">Ticket: {lastOrderInfo.orderId}</p>
                <p className="text-xs text-gray-500">Fecha: {lastOrderInfo.date}</p>
              </div>

              <div className="space-y-2 text-sm border-t border-b py-3">
                {lastOrderInfo.items.map((it: any, idx: number) => (
                  <div key={idx} className="flex justify-between">
                    <div>
                      <p className="font-medium text-gray-800">{it.name}</p>
                      <p className="text-xs text-gray-500">{it.quantity} unidades</p>
                    </div>
                    <span className="font-medium text-gray-900">${it.lineTotal.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="mt-4">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal</span>
                  <span>${lastOrderInfo.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>IVA (13%)</span>
                  <span>${lastOrderInfo.tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                  <span>TOTAL</span>
                  <span>${lastOrderInfo.total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button onClick={() => setIsTicketModalOpen(false)} className="flex-1 py-2 bg-white border rounded-xl">Cerrar</button>
              <button onClick={() => downloadTicketPdf(lastOrderInfo, true)} className="flex-1 py-2 bg-[#8CC63F] text-white rounded-xl flex items-center justify-center gap-2"><Receipt size={16} />Descargar PDF</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
