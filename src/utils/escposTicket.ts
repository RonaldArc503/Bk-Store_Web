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

/** POS-58 y termicas 58mm: 384 dots, Font A = 32 chars, Font B = 42 chars */
export function getTicketCharsPerLine(paperSize: PaperSize): number {
  const width = getPaperWidthMm(paperSize)
  if (width <= 58) return 32
  if (width <= 72) return 42
  return 48
}

const ESC = '\x1B'
const GS = '\x1D'
const LF = '\x0A'

const INIT = ESC + '@'
const FONT_A = ESC + 'M' + '\x00'
const FONT_B = ESC + 'M' + '\x01'
const ALIGN_LEFT = ESC + 'a' + '\x00'
const ALIGN_CENTER = ESC + 'a' + '\x01'
const BOLD_ON = ESC + 'E' + '\x01'
const BOLD_OFF = ESC + 'E' + '\x00'
const CUT = GS + 'V' + '\x41' + '\x03'

function sanitize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '')
}

function truncate(text: string, max: number): string {
  const clean = sanitize(text)
  if (clean.length <= max) return clean
  if (max <= 1) return clean.slice(0, max)
  return `${clean.slice(0, max - 1)}.`
}

function divider(width: number): string {
  return '-'.repeat(width)
}

/** Fila con texto izquierda y monto derecha, ancho fijo */
function moneyRow(label: string, amount: string, width: number): string {
  const right = sanitize(amount)
  const maxLabel = Math.max(8, width - right.length - 1)
  const left = truncate(label, maxLabel)
  const spaces = Math.max(1, width - left.length - right.length)
  return left + ' '.repeat(spaces) + right
}

/** Linea de articulo: 3 cant + 19 nombre + 10 total = 32 (Font A) */
function itemRow(qty: number, name: string, lineTotal: number, width: number): string {
  if (width <= 32) {
    const q = String(qty).padStart(3, ' ')
    const total = `$${lineTotal.toFixed(2)}`.padStart(10, ' ')
    const nameMax = width - q.length - 1 - total.length
    const n = truncate(name, nameMax).padEnd(nameMax, ' ')
    return `${q} ${n}${total}`
  }

  const q = String(qty).padStart(4, ' ')
  const total = `$${lineTotal.toFixed(2)}`.padStart(10, ' ')
  const nameMax = width - q.length - 1 - total.length
  const n = truncate(name, nameMax).padEnd(nameMax, ' ')
  return `${q}${n}${total}`
}

function unitRow(unitPrice: number, width: number): string {
  const text = `  P.U $${unitPrice.toFixed(2)}`
  return truncate(text, width)
}

function shortDate(raw: string): string {
  const clean = sanitize(raw)
  if (clean.length <= 22) return clean
  const parsed = new Date(raw)
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleString('es-SV', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }
  return truncate(clean, 22)
}

export function buildEscPosTicket(data: SaleTicketData, paperSize: PaperSize): string {
  const width = getTicketCharsPerLine(paperSize)
  const ticketId = String(data.orderId || '').slice(-8).toUpperCase()
  const payment = truncate(data.paymentLabel || data.method || 'Efectivo', 16)
  const total = Number(data.total || 0)
  const base = Math.round((total / 1.13) * 100) / 100
  const iva = Math.round((total - base) * 100) / 100

  const chunks: string[] = [
    INIT,
    FONT_A,
    ALIGN_CENTER,
    BOLD_ON,
    truncate(sanitize(data.storeName).toUpperCase(), width),
    LF,
    BOLD_OFF,
  ]

  if (data.subtitle) {
    chunks.push(truncate(sanitize(data.subtitle), width), LF)
  }

  chunks.push(LF, ALIGN_LEFT, FONT_B)
  chunks.push(`Doc: ${ticketId}`, LF)
  chunks.push(`Fecha: ${shortDate(data.date)}`, LF)
  chunks.push('Caja: 1', LF)
  chunks.push('Cliente: Consumidor Final', LF)
  chunks.push(FONT_A, divider(width), LF)

  if (width <= 32) {
    chunks.push('Cant Articulo         Total', LF)
  } else {
    chunks.push('Cant  Articulo                    Total', LF)
  }

  chunks.push(divider(width), LF)

  for (const item of data.items) {
    const qty = Number(item.quantity || 0)
    const lineTotal = Number(item.lineTotal || 0)
    const unit = qty > 0 ? lineTotal / qty : 0
    chunks.push(itemRow(qty, item.name || 'Producto', lineTotal, width), LF)
    chunks.push(FONT_B, unitRow(unit, width), LF, FONT_A)
  }

  chunks.push(divider(width), LF)
  chunks.push(moneyRow('Subtotal s/IVA', `$${base.toFixed(2)}`, width), LF)
  chunks.push(moneyRow('IVA 13%', `$${iva.toFixed(2)}`, width), LF)
  chunks.push(BOLD_ON, moneyRow('TOTAL', `$${total.toFixed(2)}`, width), LF, BOLD_OFF)
  chunks.push(moneyRow('Pago', payment, width), LF)

  if (data.method === 'efectivo') {
    const cashReceived = Number(data.cashReceived ?? total)
    const changeAmount = Number(data.changeAmount ?? cashReceived - total)
    const changeText =
      changeAmount < 0 ? `-$${Math.abs(changeAmount).toFixed(2)}` : `$${changeAmount.toFixed(2)}`
    chunks.push(moneyRow('Efectivo', `$${cashReceived.toFixed(2)}`, width), LF)
    chunks.push(moneyRow('Cambio', changeText, width), LF)
  } else {
    chunks.push(moneyRow('Pagado', `$${total.toFixed(2)}`, width), LF)
  }

  chunks.push(divider(width), LF)
  chunks.push(ALIGN_CENTER, FONT_A, 'Gracias por tu preferencia', LF)
  chunks.push(LF, LF, LF, CUT)

  return chunks.join('')
}

export function buildTestEscPos(): string {
  return [
    '\x1B@',
    '\x1Ba\x01',
    'PRUEBA PR-100',
    '\x0A',
    '\x1Ba\x00',
    'Si lees esto, la ticketera funciona.',
    '\x0A\x0A\x0A',
    '\x1DV\x41\x03',
  ].join('')
}
