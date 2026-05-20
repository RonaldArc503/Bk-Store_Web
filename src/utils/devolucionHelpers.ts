import { CajaService } from '../services/CajaService'
import { DevolucionService, type Devolucion, type DevolucionItem } from '../services/DevolucionService'
import { InventoryService } from '../services/InventoryService'
import { OrderService } from '../services/OrderService'

export type OrderItemLike = {
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

export type OrderForDevolucion = {
  id: string
  total?: number
  method?: string
  totalDevuelto?: number
  items?: OrderItemLike[]
}

const toNumber = (value: unknown) => {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

export function getItemQuantity(item: OrderItemLike) {
  return toNumber(item.quantity ?? item.cantidad ?? item.qty ?? 0)
}

export function getItemName(item: OrderItemLike) {
  return String(item.name ?? item.nombre ?? 'Producto').trim() || 'Producto'
}

export function getItemSubtotal(item: OrderItemLike) {
  const explicit = toNumber(item.lineTotal ?? item.subtotal ?? item.total)
  if (explicit > 0) return explicit
  const qty = getItemQuantity(item)
  return qty * toNumber(item.unitPrice ?? item.precioUnitario ?? item.precio)
}

export async function assertCajaAbierta(userId?: string): Promise<{ cajaId: string }> {
  await CajaService.closeStaleOpenCajas()
  const active = await CajaService.getTodayOpenCaja(userId)
  if (!active?.id || active.status !== 'open') {
    throw new Error('Debes abrir la caja del día actual para procesar devoluciones')
  }
  return { cajaId: active.id }
}

export function resolveProductId(item: OrderItemLike): string {
  return String(item.id || item.productId || item.productoId || '').trim()
}

/** Restaura stock; lanza si no encuentra inventario del producto. */
export async function restoreStockForDevolucion(
  item: OrderItemLike,
  qty: number,
  ventaId: string,
): Promise<void> {
  const productId = resolveProductId(item)
  if (!productId) {
    throw new Error(`No se pudo identificar el producto: ${getItemName(item)}`)
  }

  let inv = await InventoryService.getInventarioByProductoId(productId)
  if (!inv?.id) {
    const all = await InventoryService.getInventario()
    inv = all.find((i) => i.id === productId || i.productoId === productId) || null
  }

  if (!inv?.id) {
    throw new Error(`Inventario no encontrado para ${getItemName(item)}`)
  }

  await InventoryService.agregarStock(inv.id, qty, `devolución venta ${ventaId}`)
}

export function buildDevolucionItems(
  order: OrderForDevolucion,
  devItems: Record<string, number>,
): { items: DevolucionItem[]; montoDevuelto: number } {
  const lineItems = order.items || []
  const devolucionItems: DevolucionItem[] = []
  let montoDevuelto = 0

  for (const [idx, qty] of Object.entries(devItems)) {
    if (qty <= 0) continue
    const item = lineItems[Number(idx)]
    if (!item) continue
    const soldQty = getItemQuantity(item)
    if (qty > soldQty) {
      throw new Error(`Cantidad inválida para ${getItemName(item)} (máx. ${soldQty})`)
    }
    const unitPrice = getItemSubtotal(item) / (soldQty || 1)
    const subtotal = unitPrice * qty
    montoDevuelto += subtotal
    devolucionItems.push({
      productId: resolveProductId(item),
      nombre: getItemName(item),
      cantidad: qty,
      precioUnitario: unitPrice,
      subtotal,
    })
  }

  return { items: devolucionItems, montoDevuelto }
}

export type ProcesarDevolucionParams = {
  order: OrderForDevolucion
  devItems: Record<string, number>
  motivo: string
  empleado: string
  empleadoRol: string
  userId?: string
}

export type ProcesarDevolucionResult = {
  devolucion: Devolucion
  montoDevuelto: number
  totalDevueltoAcumulado: number
  tipo: 'total' | 'parcial'
  cajaId: string
}

/** Flujo completo: stock, registro, orden, y descuento en caja del día */
export async function procesarDevolucionCompleta(
  params: ProcesarDevolucionParams,
): Promise<ProcesarDevolucionResult> {
  const { order, devItems, motivo, empleado, empleadoRol, userId } = params
  const { cajaId } = await assertCajaAbierta(userId)

  const { items: devolucionItems, montoDevuelto } = buildDevolucionItems(order, devItems)
  if (devolucionItems.length === 0 || montoDevuelto <= 0) {
    throw new Error('Selecciona al menos un artículo para devolver')
  }

  const orderTotal = toNumber(order.total)
  const yaDevuelto = toNumber(order.totalDevuelto)
  if (yaDevuelto + montoDevuelto > orderTotal + 0.01) {
    throw new Error(
      `El monto a devolver ($${montoDevuelto.toFixed(2)}) supera el saldo de la venta ($${(orderTotal - yaDevuelto).toFixed(2)})`,
    )
  }

  for (const [idx, qty] of Object.entries(devItems)) {
    if (qty <= 0) continue
    const item = (order.items || [])[Number(idx)]
    if (item) await restoreStockForDevolucion(item, qty, order.id)
  }

  const tipoPrevio: 'total' | 'parcial' =
    yaDevuelto + montoDevuelto >= orderTotal - 0.01 ? 'total' : 'parcial'

  const devolucion = await DevolucionService.crearDevolucion({
    ventaOriginalId: order.id,
    fecha: new Date().toLocaleString('es-SV'),
    createdAt: new Date().toISOString(),
    empleado,
    empleadoRol,
    motivo,
    items: devolucionItems,
    totalDevuelto: montoDevuelto,
    tipo: tipoPrevio,
  })

  const { totalDevueltoAcumulado, tipo } = await OrderService.aplicarDevolucionAOrden(
    order.id,
    devolucion.id,
    montoDevuelto,
  )

  let cajaParaAjuste = (await CajaService.findCajaIdByOrderId(order.id)) || cajaId
  const cajaOrigen = cajaParaAjuste ? await CajaService.getCajaById(cajaParaAjuste) : null
  if (!cajaOrigen || cajaOrigen.status === 'closed') {
    cajaParaAjuste = cajaId
  }

  await CajaService.registrarDevolucionEnCaja(cajaParaAjuste, {
    orderId: order.id,
    devolucionId: devolucion.id,
    method: order.method || 'efectivo',
    amount: montoDevuelto,
    createdBy: userId,
  })

  return {
    devolucion,
    montoDevuelto,
    totalDevueltoAcumulado,
    tipo,
    cajaId: cajaParaAjuste,
  }
}
