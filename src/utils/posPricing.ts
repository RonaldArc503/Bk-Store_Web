export type PackTier = { quantity: number; price: number }

export type LinePricingInput = {
  quantity: number
  precioUnitario: number
  precioTresUnidades?: number
  precioMediaDocena?: number
  precioDocena?: number
}

const roundMoney = (value: number) => Math.round(value * 100) / 100

/** Paquetes de venta ordenados de mayor a menor cantidad. */
export function getPackTiers(input: Omit<LinePricingInput, 'quantity'>): PackTier[] {
  return [
    { quantity: 12, price: Number(input.precioDocena) || 0 },
    { quantity: 6, price: Number(input.precioMediaDocena) || 0 },
    { quantity: 3, price: Number(input.precioTresUnidades) || 0 },
  ]
    .filter((tier) => tier.price > 0)
    .sort((a, b) => b.quantity - a.quantity)
}

function calculateWithTiers(remaining: number, tiers: PackTier[], unitPrice: number): number {
  if (remaining <= 0) return 0

  const tier = tiers.find((t) => remaining >= t.quantity)
  if (!tier) return remaining * unitPrice

  const packs = Math.floor(remaining / tier.quantity)
  if (packs > 0) {
    return packs * tier.price + calculateWithTiers(remaining - packs * tier.quantity, tiers, unitPrice)
  }

  return remaining * unitPrice
}

/**
 * Total de una línea: suma paquetes (12, 6, 3) por precio de inventario
 * y el sobrante al precio unitario. Ej. 2 docenas a $10 → $20, no $22.
 */
export function calculateLineTotal(input: LinePricingInput): number {
  const qty = Math.max(0, Math.floor(input.quantity))
  if (qty === 0) return 0

  const unitPrice = Number(input.precioUnitario) || 0
  const tiers = getPackTiers(input)
  if (tiers.length === 0) return roundMoney(qty * unitPrice)

  return roundMoney(calculateWithTiers(qty, tiers, unitPrice))
}
