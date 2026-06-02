import type { jsPDF } from 'jspdf'
import { buildEscPosTicket, type SaleTicketData } from '../utils/escposTicket'
import type { PaperSize } from '../utils/printPaperSize'

export type { SaleTicketData }

const QZ_SCRIPT_URL = 'https://cdn.jsdelivr.net/npm/qz-tray@2.2.4/qz-tray.js'
const QZ_CONNECT_TIMEOUT_MS = 10000

const THERMAL_PATTERNS = [
  /thermal/i,
  /receipt/i,
  /recibo/i,
  /ticket/i,
  /ticketera/i,
  /pos/i,
  /epson/i,
  /tm-/i,
  /tm\d/i,
  /star/i,
  /tsp/i,
  /citizen/i,
  /bixolon/i,
  /58mm/i,
  /72mm/i,
  /80mm/i,
  /t[eé]rmic/i,
  /termic/i,
  /generic/i,
  /text only/i,
]

let qzLoadPromise: Promise<NonNullable<Window['qz']>> | null = null

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

async function connectQz(): Promise<NonNullable<Window['qz']>> {
  const qz = await loadQzTray()
  if (!qz.websocket.isActive()) {
    await Promise.race([
      qz.websocket.connect(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('QZ Tray no responde. Abre QZ Tray en la bandeja del sistema.')), QZ_CONNECT_TIMEOUT_MS)
      ),
    ])
  }
  return qz
}

export function pickBestPrinter(printers: string[], savedName?: string, defaultName?: string | null): string | null {
  if (!printers.length) return null
  if (savedName && printers.includes(savedName)) return savedName
  if (defaultName && printers.includes(defaultName)) return defaultName

  for (const pattern of THERMAL_PATTERNS) {
    const match = printers.find((name) => pattern.test(name))
    if (match) return match
  }

  return printers[0] ?? null
}

export async function detectPrinters(): Promise<{
  available: boolean
  printers: string[]
  selected: string | null
  error?: string
}> {
  try {
    const qz = await connectQz()
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
  commands: string[]
): Promise<void> {
  const configs = [
    qz.configs.create(printerName, { encoding: 'UTF-8' }),
    qz.configs.create(printerName, { encoding: 'UTF-8', altPrinting: true }),
    qz.configs.create(printerName, { encoding: 'ISO-8859-1', altPrinting: true }),
  ]

  let lastError: unknown = null
  for (const config of configs) {
    try {
      await qz.print(config, commands)
      return
    } catch (error) {
      lastError = error
    }
  }

  throw lastError instanceof Error ? lastError : new Error('QZ Tray rechazo la impresion ESC/POS')
}

function pdfToBase64(doc: jsPDF): string {
  const dataUri = doc.output('datauristring')
  const commaIndex = dataUri.indexOf(',')
  return commaIndex >= 0 ? dataUri.slice(commaIndex + 1) : dataUri
}

function printPdfInBrowser(doc: jsPDF): void {
  const blob = doc.output('blob')
  const url = URL.createObjectURL(blob)
  const iframe = document.createElement('iframe')
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:none;opacity:0;pointer-events:none'
  iframe.src = url
  document.body.appendChild(iframe)

  const cleanup = () => {
    URL.revokeObjectURL(url)
    iframe.remove()
  }

  iframe.onload = () => {
    try {
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()
    } finally {
      setTimeout(cleanup, 4000)
    }
  }
}

async function printPdfWithQz(qz: NonNullable<Window['qz']>, printerName: string, doc: jsPDF): Promise<void> {
  const config = qz.configs.create(printerName, { altFontRendering: true })
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
  method: 'qz-escpos' | 'qz-pdf' | 'browser'
  printer?: string
}

export async function printSaleTicket(
  ticket: SaleTicketData,
  options: { printerName?: string; paperSize: PaperSize; pdfFallback?: jsPDF | null }
): Promise<TicketPrintResult> {
  const escpos = buildEscPosTicket(ticket, options.paperSize)

  try {
    const qz = await connectQz()
    const printer = await resolvePrinter(qz, options.printerName)
    await printEscPosWithQz(qz, printer, escpos)
    return { method: 'qz-escpos', printer }
  } catch (escposError) {
    console.warn('ESC/POS via QZ fallo, intentando PDF', escposError)
  }

  if (options.pdfFallback) {
    try {
      const qz = await connectQz()
      const printer = await resolvePrinter(qz, options.printerName)
      await printPdfWithQz(qz, printer, options.pdfFallback)
      return { method: 'qz-pdf', printer }
    } catch (pdfQzError) {
      console.warn('PDF via QZ fallo, usando navegador', pdfQzError)
    }

    printPdfInBrowser(options.pdfFallback)
    return { method: 'browser' }
  }

  throw new Error(
    'No se pudo imprimir. Verifica que QZ Tray este abierto y que la ticketera este encendida.'
  )
}

/** @deprecated Usar printSaleTicket */
export async function printTicketDocument(
  doc: jsPDF,
  options: { printerName?: string; paperSize?: PaperSize; ticket?: SaleTicketData } = {}
): Promise<TicketPrintResult> {
  if (options.ticket && options.paperSize) {
    return printSaleTicket(options.ticket, {
      printerName: options.printerName,
      paperSize: options.paperSize,
      pdfFallback: doc,
    })
  }

  try {
    const qz = await connectQz()
    const printer = await resolvePrinter(qz, options.printerName)
    await printPdfWithQz(qz, printer, doc)
    return { method: 'qz-pdf', printer }
  } catch {
    printPdfInBrowser(doc)
    return { method: 'browser' }
  }
}

export function isLikelyQzInstalled(): boolean {
  return Boolean(window.qz?.websocket?.isActive?.())
}
