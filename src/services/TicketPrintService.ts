import type { jsPDF } from 'jspdf'
import { buildEscPosTicket, type SaleTicketData } from '../utils/escposTicket'
import type { PaperSize } from '../utils/printPaperSize'
import { configureQzSecurity, isQzSigningReady } from './qzSecurity'

export type { SaleTicketData }

const QZ_SCRIPT_URL = 'https://cdn.jsdelivr.net/npm/qz-tray@2.2.4/qz-tray.js'
const QZ_CONNECT_TIMEOUT_MS = 15000

const THERMAL_PATTERNS = [
  /pos-58/i,
  /pos58/i,
  /pos-58d/i,
  /58mm/i,
  /thermal/i,
  /receipt/i,
  /recibo/i,
  /ticket/i,
  /ticketera/i,
  /\bpos\b/i,
  /epson/i,
  /tm-/i,
  /tm\d/i,
  /star/i,
  /tsp/i,
  /citizen/i,
  /bixolon/i,
  /72mm/i,
  /80mm/i,
  /t[eé]rmic/i,
  /termic/i,
  /generic/i,
  /text only/i,
  /usb/i,
]

let qzLoadPromise: Promise<NonNullable<Window['qz']>> | null = null
let qzConnectPromise: Promise<NonNullable<Window['qz']>> | null = null

function loadQzTray(): Promise<NonNullable<Window['qz']>> {
  if (window.qz) return Promise.resolve(window.qz)
  if (qzLoadPromise) return qzLoadPromise

  qzLoadPromise = new Promise((resolve, reject) => {
    const finish = () => {
      if (window.qz) resolve(window.qz)
      else reject(new Error('QZ Tray no respondio'))
    }

    const existing = document.querySelector(`script[src="${QZ_SCRIPT_URL}"]`)
    if (existing) {
      if (window.qz) {
        resolve(window.qz)
        return
      }
      existing.addEventListener('load', finish)
      existing.addEventListener('error', () => reject(new Error('No se pudo cargar QZ Tray')))
      return
    }

    const script = document.createElement('script')
    script.src = QZ_SCRIPT_URL
    script.async = true
    script.onload = finish
    script.onerror = () => reject(new Error('No se pudo cargar QZ Tray'))
    document.head.appendChild(script)
  })

  return qzLoadPromise
}

async function connectQz(force = false): Promise<NonNullable<Window['qz']>> {
  if (!force && qzConnectPromise) {
    try {
      return await qzConnectPromise
    } catch {
      qzConnectPromise = null
    }
  }

  qzConnectPromise = (async () => {
    const qz = await loadQzTray()
    await configureQzSecurity(qz)
    if (!qz.websocket.isActive()) {
      await Promise.race([
        qz.websocket.connect(),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error('QZ Tray no responde. Abre QZ Tray en la bandeja del sistema.')),
            QZ_CONNECT_TIMEOUT_MS
          )
        ),
      ])
    }
    return qz
  })()

  try {
    return await qzConnectPromise
  } catch (error) {
    qzConnectPromise = null
    throw error
  }
}

export async function warmUpQzConnection(): Promise<boolean> {
  try {
    await connectQz()
    return true
  } catch {
    return false
  }
}

export function pickBestPrinter(printers: string[], savedName?: string, defaultName?: string | null): string | null {
  if (!printers.length) return null
  if (savedName && printers.includes(savedName)) return savedName

  for (const pattern of THERMAL_PATTERNS) {
    const match = printers.find((name) => pattern.test(name))
    if (match) return match
  }

  if (defaultName && printers.includes(defaultName)) return defaultName
  return printers[0] ?? null
}

export async function detectPrinters(): Promise<{
  available: boolean
  printers: string[]
  selected: string | null
  error?: string
  signed?: boolean
}> {
  try {
    const qz = await connectQz(true)
    const printers = await qz.printers.find()
    let defaultName: string | null = null
    try {
      defaultName = await qz.printers.getDefault()
    } catch {
      defaultName = null
    }

    return {
      available: true,
      printers,
      selected: pickBestPrinter(printers, undefined, defaultName),
      signed: isQzSigningReady(),
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo conectar con QZ Tray'
    return { available: false, printers: [], selected: null, error: message }
  }
}

async function resolvePrinter(qz: NonNullable<Window['qz']>, savedName?: string): Promise<string> {
  const printers = await qz.printers.find()
  if (!printers.length) {
    throw new Error('No hay impresoras instaladas en esta PC')
  }

  let defaultName: string | null = null
  try {
    defaultName = await qz.printers.getDefault()
  } catch {
    defaultName = null
  }

  const printer = pickBestPrinter(printers, savedName, defaultName)
  if (!printer) {
    throw new Error('No se pudo seleccionar una impresora')
  }
  return printer
}

async function printEscPosWithQz(
  qz: NonNullable<Window['qz']>,
  printerName: string,
  payload: string
): Promise<void> {
  const attempts: Array<{ config: unknown; data: unknown[] }> = [
    {
      config: qz.configs.create(printerName, { encoding: 'ISO-8859-1' }),
      data: [payload],
    },
    {
      config: qz.configs.create(printerName, { encoding: 'ISO-8859-1', altPrinting: true }),
      data: [payload],
    },
    {
      config: qz.configs.create(printerName, { encoding: 'UTF-8', altPrinting: true }),
      data: [{ type: 'raw', format: 'command', flavor: 'plain', data: payload }],
    },
    {
      config: qz.configs.create(printerName, { encoding: 'UTF-8' }),
      data: [{ type: 'raw', format: 'plain', data: payload }],
    },
  ]

  let lastError: unknown = null
  for (const attempt of attempts) {
    try {
      await qz.print(attempt.config, attempt.data)
      return
    } catch (error) {
      lastError = error
    }
  }

  const msg = lastError instanceof Error ? lastError.message : String(lastError)
  throw new Error(
    msg.includes('denied') || msg.includes('blocked')
      ? 'QZ Tray bloqueo la impresion. Pulsa Allow/Permitir en la ventana de QZ (tambien la de IMPRESION).'
      : `No se pudo imprimir en "${printerName}": ${msg}`
  )
}

function pdfToBase64(doc: jsPDF): string {
  const dataUri = doc.output('datauristring')
  const commaIndex = dataUri.indexOf(',')
  return commaIndex >= 0 ? dataUri.slice(commaIndex + 1) : dataUri
}

async function printPdfWithQz(qz: NonNullable<Window['qz']>, printerName: string, doc: jsPDF): Promise<void> {
  const config = qz.configs.create(printerName, { altFontRendering: true, altPrinting: true })
  const base64 = pdfToBase64(doc)
  await qz.print(config, [
    {
      type: 'pixel',
      format: 'pdf',
      flavor: 'base64',
      data: base64,
      options: { ignoreTransparency: true, altFontRendering: true },
    },
  ])
}

export type TicketPrintResult = {
  method: 'qz-escpos' | 'qz-pdf'
  printer: string
  needsQzApproval?: boolean
}

export async function printSaleTicket(
  ticket: SaleTicketData,
  options: { printerName?: string; paperSize: PaperSize; pdfFallback?: jsPDF | null }
): Promise<TicketPrintResult> {
  const escpos = buildEscPosTicket(ticket, options.paperSize)
  const qz = await connectQz(true)
  const printer = await resolvePrinter(qz, options.printerName)

  try {
    await printEscPosWithQz(qz, printer, escpos)
    return { method: 'qz-escpos', printer, needsQzApproval: !isQzSigningReady() }
  } catch (escposError) {
    console.warn('ESC/POS fallo, intentando PDF por QZ', escposError)

    if (options.pdfFallback) {
      try {
        await printPdfWithQz(qz, printer, options.pdfFallback)
        return { method: 'qz-pdf', printer, needsQzApproval: !isQzSigningReady() }
      } catch (pdfError) {
        const escMsg = escposError instanceof Error ? escposError.message : 'Error ESC/POS'
        const pdfMsg = pdfError instanceof Error ? pdfError.message : 'Error PDF'
        throw new Error(`${escMsg}. Respaldo PDF: ${pdfMsg}`)
      }
    }

    throw escposError instanceof Error ? escposError : new Error('Error al imprimir ticket')
  }
}

export function isLikelyQzInstalled(): boolean {
  return Boolean(window.qz?.websocket?.isActive?.())
}
