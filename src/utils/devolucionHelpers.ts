import { CajaService } from '../services/CajaService'
import { InventoryService } from '../services/InventoryService'

export type OrderItemLike = {
  id?: string
  productId?: string
  productoId?: string
  name?: string
  nombre?: string
  quantity?: number
  cantidad?: number
  qty?: number
}

export async function assertCajaAbierta(userId?: string): Promise<void> {
  await CajaService.closeStaleOpenCajas()
  const active = await CajaService.getTodayOpenCaja(userId)
  if (!active?.id || active.status !== 'open') {
    throw new Error('Debes abrir la caja del día actual para procesar devoluciones')
  }
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
    throw new Error(`No se pudo identificar el producto: ${item.name || item.nombre || 'desconocido'}`)
  }

  let inv = await InventoryService.getInventarioByProductoId(productId)
  if (!inv?.id) {
    const all = await InventoryService.getInventario()
    inv = all.find((i) => i.id === productId || i.productoId === productId) || null
  }

  if (!inv?.id) {
    throw new Error(`Inventario no encontrado para ${item.name || item.nombre || productId}`)
  }

  await InventoryService.agregarStock(inv.id, qty, `devolución venta ${ventaId}`)
}
