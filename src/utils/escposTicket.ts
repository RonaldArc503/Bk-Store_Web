import { getPaperWidthMm, type PaperSize } from './printPaperSize'

export type SaleTicketItem = {
  name: string
  quantity: number
  lineTotal: number
}

export type SaleTicketData = {
  orderId: string
  date: string
  items: SaleTicketItem[]
  total: number
  method: string
  cashReceived?: number | null
  changeAmount?: number | null
  storeName: string
  subtitle?: string
  paymentLabel?: string
}

const ESC = '\x1B'
const GS = '\x1D'
const LF = '\x0A'

function charsPerLine(paperSize: PaperSize): number {
  const width = getPaperWidthMm(paperSize)
  if (width <= 58) return 32
  if (width <= 72) return 42
  return 48
}

function sanitize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '')
}

function truncate(text: string, max: number): string {
  const clean = sanitize(text)
  if (clean.length <= max) return clean
  return `${clean.slice(0, Math.max(0, max - 1))}…`
}

function padLine(left: string, right: string, width: number): string {
  const l = truncate(left, width - right.length - 1)
  const spaces = Math.max(1, width - l.length - right.length)
  return l + ' '.repeat(spaces) + right
}

function divider(width: number): string {
  return '-'.repeat(width)
}

export function buildEscPosTicket(data: SaleTicketData, paperSize: PaperSize): string[] {
  const width = charsPerLine(paperSize)
  const ticketId = String(data.orderId || '').slice(-8).toUpperCase()
  const payment = data.paymentLabel || data.method || 'Efectivo'
  const total = Number(data.total || 0)
  const base = Math.round((total / 1.13) * 100) / 100
  const iva = Math.round((total - base) * 100) / 100

  const lines: string[] = [
    ESC + '@',
    ESC + 'a' + '\x01',
    ESC + 'E' + '\x01' + sanitize(data.storeName).toUpperCase() + ESC + 'E' + '\x00' + LF,
  ]

  if (data.subtitle) {
    lines.push(truncate(sanitize(data.subtitle), width) + LF)
  }

  lines.push(LF)
  lines.push(ESC + 'a' + '\x00')
  lines.push(`Doc N: ${ticketId}${LF}`)
  lines.push(`Fecha: ${sanitize(data.date)}${LF}`)
  lines.push(`Caja: 1${LF}`)
  lines.push('Nombre: Consumidor Final' + LF)
  lines.push(divider(width) + LF)
  lines.push(padLine('CANT  DESCRIPCION', 'TOTAL', width) + LF)
  lines.push(divider(width) + LF)

  for (const item of data.items) {
    const qty = Number(item.quantity || 0)
    const lineTotal = Number(item.lineTotal || 0)
    const unit = qty > 0 ? lineTotal / qty : 0
    const name = truncate(item.name || 'Producto', width - 14)
    lines.push(padLine(`${qty}  ${name}`, `$${lineTotal.toFixed(2)}`, width) + LF)
    lines.push(padLine(`    P.U $${unit.toFixed(2)}`, '', width) + LF)
  }

  lines.push(divider(width) + LF)
  lines.push(padLine('Subtotal (sin IVA)', `$${base.toFixed(2)}`, width) + LF)
  lines.push(padLine('IVA 13%', `$${iva.toFixed(2)}`, width) + LF)
  lines.push(ESC + 'E' + '\x01')
  lines.push(padLine('TOTAL', `$${total.toFixed(2)}`, width) + LF)
  lines.push(ESC + 'E' + '\x00')
  lines.push(padLine('Metodo de pago', payment, width) + LF)

  if (data.method === 'efectivo') {
    const cashReceived = Number(data.cashReceived ?? total)
    const changeAmount = Number(data.changeAmount ?? cashReceived - total)
    const changeText =
      changeAmount < 0 ? `-$${Math.abs(changeAmount).toFixed(2)}` : `$${changeAmount.toFixed(2)}`
    lines.push(padLine('Efectivo', `$${cashReceived.toFixed(2)}`, width) + LF)
    lines.push(padLine('Cambio', changeText, width) + LF)
  } else {
    lines.push(padLine('Pagado', `$${total.toFixed(2)}`, width) + LF)
  }

  lines.push(divider(width) + LF)
  lines.push(ESC + 'a' + '\x01')
  lines.push('Gracias por tu preferencia' + LF)
  lines.push(LF + LF + LF)
  lines.push(GS + 'V' + '\x41' + '\x03')
  return lines
}
