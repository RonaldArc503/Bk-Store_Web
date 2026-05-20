/** Totales de venta considerando devoluciones registradas */

export type OrderWithDevolucion = {
  total?: number
  totalDevuelto?: number
  devolucion?: { totalDevuelto?: number; montoDevuelto?: number }
}

export function getOrderDevuelto(order: OrderWithDevolucion): number {
  const direct = Number(order.totalDevuelto)
  if (Number.isFinite(direct) && direct > 0) return direct
  const fromDev = Number(order.devolucion?.totalDevuelto ?? order.devolucion?.montoDevuelto)
  return Number.isFinite(fromDev) ? fromDev : 0
}

export function getOrderOriginalTotal(order: OrderWithDevolucion): number {
  return Math.max(0, Number(order.total ?? 0))
}

/** Monto neto de la venta después de devoluciones */
export function getOrderEffectiveTotal(order: OrderWithDevolucion): number {
  return Math.max(0, getOrderOriginalTotal(order) - getOrderDevuelto(order))
}

export function sumOrderEffectiveTotals<T extends OrderWithDevolucion>(orders: T[]): number {
  return orders.reduce((sum, o) => sum + getOrderEffectiveTotal(o), 0)
}
