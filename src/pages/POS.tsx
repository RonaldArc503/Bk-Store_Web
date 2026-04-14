import React, { useEffect, useMemo, useState } from 'react'
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
  Store
} from 'lucide-react'
 
import { OrderService } from '../services/OrderService'
import { useAuth } from '../hooks/useAuth'
import { InventoryService } from '../services/InventoryService'
import { CajaService } from '../services/CajaService'
import { BarcodeImageScanButton } from '../components/BarcodeImageScanButton'

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

export default function POS() {
  const { user } = useAuth()

  const [cart, setCart] = useState<CartItemLocal[]>([])
  const [products, setProducts] = useState<ProductDB[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [barcodeScan, setBarcodeScan] = useState('')
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null)
  const [lastOrderInfo, setLastOrderInfo] = useState<any>(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const prods = await InventoryService.getProducts()
        if (!mounted) return
        // map to ProductDB shape
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
        console.error('Error loading products', err)
      }
    })()
    return () => { mounted = false }
  }, [])

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

  const addToCart = (product: ProductDB) => {
    setCart((prev) => {
      const existing = prev.find((p) => p.id === product.id)
      if (existing) return prev.map((p) => (p.id === product.id ? { ...p, quantity: p.quantity + 1 } : p))
      return [...prev, { ...product, quantity: 1 }]
    })
  }

  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => (item.id === id ? { ...item, quantity: item.quantity + delta } : item))
        .filter((i) => i.quantity > 0)
    )
  }

  const removeFromCart = (id: string) => setCart((prev) => prev.filter((i) => i.id !== id))
  const clearCart = () => setCart([])

  const cartTotal = useMemo(() => cart.reduce((sum, it) => sum + calculateItemTotal(it), 0), [cart])
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
      alert('Producto no encontrado')
    }
  }

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    tryAddByBarcode(barcodeScan)
  }

  const handleCheckout = () => {
    if (cart.length === 0) return
    setIsPaymentModalOpen(true)
  }

  const processPayment = async () => {
    if (!selectedPaymentMethod) return

    const order = {
      date: new Date().toISOString(),
      items: cart.map((i) => ({
        id: i.id,
        name: i.nombre || '',
        codigo: i.codigo || null,
        quantity: i.quantity,
        unitPrice: i.precioUnitario || 0,
        lineTotal: calculateItemTotal(i),
      })),
      total: cartTotal,
      method: selectedPaymentMethod,
      createdBy: user?.uid || null,
    }

    try {
      const created = await OrderService.createOrder(order)
      const orderId = created?.id || `ORD-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`
      setLastOrderInfo({ ...order, orderId, date: new Date().toLocaleString('es-SV') })

      // Update caja totals and add movimiento record to the active caja (if present)
      try {
        const activeCaja = await CajaService.getActiveCaja(user?.uid)
        if (activeCaja && activeCaja.id) {
          await CajaService.addSaleToCaja(activeCaja.id, {
            orderId,
            method: selectedPaymentMethod || 'efectivo',
            amount: order.total,
            items: order.items,
            createdBy: user?.uid,
          })
        }
      } catch (e) {
        console.error('Error updating caja totals', e)
      }

      // Decrement inventory for each sold item
      try {
        for (const it of order.items) {
          try {
            const inv = await InventoryService.getInventarioByProductoId(it.id)
            if (inv && inv.id) {
              await InventoryService.descontarStock(inv.id, it.quantity, `venta ${orderId}`)
            } else {
              console.warn('Inventario not found for product', it.id)
            }
          } catch (err) {
            console.error('Error descontando stock for item', it, err)
          }
        }
      } catch (err) {
        console.error('Error processing inventory decrements', err)
      }

      setIsPaymentModalOpen(false)
      setIsTicketModalOpen(true)
      setCart([])
      setSelectedPaymentMethod(null)
    } catch (err) {
      console.error('Error saving order', err)
      alert('Error al guardar la venta. Intente nuevamente.')
    }
  }

  const printTicket = () => {
    window.print()
    setIsTicketModalOpen(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
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
              <span>${(cartTotal * 0.13).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xl font-bold text-gray-900 pt-3 border-t mt-2">
              <span>Total</span>
              <span className="text-[#8CC63F]">${(cartTotal * 1.13).toFixed(2)}</span>
            </div>
          </div>

          <button onClick={handleCheckout} className="w-full py-3.5 rounded-xl bg-[#8CC63F] text-white font-bold flex items-center justify-center gap-2">
            Cobrar ${(cartTotal * 1.13).toFixed(2)} <ChevronRight size={18} />
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
              <button onClick={processPayment} disabled={!selectedPaymentMethod} className={`flex-1 py-3 rounded-xl text-white ${selectedPaymentMethod ? 'bg-[#8CC63F]' : 'bg-gray-300'}`}>
                Confirmar Pago
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
                  <span>${lastOrderInfo.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>IVA (13%)</span>
                  <span>${(lastOrderInfo.total * 0.13).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                  <span>TOTAL</span>
                  <span>${(lastOrderInfo.total * 1.13).toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button onClick={() => setIsTicketModalOpen(false)} className="flex-1 py-2 bg-white border rounded-xl">Cerrar</button>
              <button onClick={printTicket} className="flex-1 py-2 bg-[#8CC63F] text-white rounded-xl flex items-center justify-center gap-2"><Receipt size={16} />Imprimir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
