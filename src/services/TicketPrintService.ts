import type { jsPDF } from 'jspdf'
import { buildEscPosTicket, type SaleTicketData } from '../utils/escposTicket'
import type { PaperSize } from '../utils/printPaperSize'
import { printPdfInBrowser } from '../utils/browserTicketPrint'
import { configureQzSecurity, getQzSetupStatus, isQzSigningReady } from './qzSecurity'

export type { SaleTicketData }

const QZ_SCRIPT_URL = 'https://cdn.jsdelivr.net/npm/qz-tray@2.2.4/qz-tray.js'
const QZ_CONNECT_TIMEOUT_MS = 20000

const BAD_PRINTER = /pdf|onenote|fax|xps|microsoft print|document writer|anydesk|adobe|cutepdf|send to/i

const THERMAL_PATTERNS = [
  /lr2000/i,
  /logic.?controls/i,
  /bematech/i,
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
  /t[eé]rmic/i,
  /termic/i,
  /generic/i,
  /text only/i,
  /usb/i,
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
  await configureQzSecurity(qz)

  if (qz.websocket.isActive()) {
    return qz
  }

  await Promise.race([
    qz.websocket.connect(),
    new Promise<never>((_, reject) =>
      setTimeout(
        () =>
          reject(
            new Error(
              'QZ Tray no responde. Abre QZ Tray, pulsa Allow/Permitir y marca Recordar.'
            )
          ),
        QZ_CONNECT_TIMEOUT_MS
      )
    ),
  ])

  return qz
}

export function pickBestPrinter(printers: string[], savedName?: string, defaultName?: string | null): string | null {
  const usable = printers.filter((name) => !BAD_PRINTER.test(name))
  const list = usable.length ? usable : printers
  if (!list.length) return null

  if (savedName && list.includes(savedName)) return savedName

  for (const pattern of THERMAL_PATTERNS) {
    const match = list.find((name) => pattern.test(name))
    if (match) return match
  }

  if (defaultName && list.includes(defaultName) && !BAD_PRINTER.test(defaultName)) return defaultName
  return list[0] ?? null
}

export async function detectPrinters(): Promise<{
  available: boolean
  printers: string[]
  selected: string | null
  error?: string
  signed?: boolean
  setup?: Awaited<ReturnType<typeof getQzSetupStatus>>
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

    const setup = await getQzSetupStatus()

    return {
      available: true,
      printers,
      selected: pickBestPrinter(printers, undefined, defaultName),
      signed: isQzSigningReady(),
      setup,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo conectar con QZ Tray'
    const setup = await getQzSetupStatus().catch(() => ({
      certOnServer: false,
      keyOnServer: false,
      signed: false,
    }))
    return { available: false, printers: [], selected: null, error: message, setup }
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
    throw new Error('No se pudo seleccionar una impresora valida')
  }

  if (BAD_PRINTER.test(printer)) {
    throw new Error(
      `La impresora "${printer}" no es una ticketera. Ve a Configuracion > Impresion > Detectar y elige la LR2000.`
    )
  }

  return printer
}

function buildTestEscPos(): string {
  return [
    '\x1B@',
    '\x1Ba\x01',
    'PRUEBA LR2000',
    '\x0A',
    '\x1Ba\x00',
    'Si lees esto, la ticketera funciona.',
    '\x0A\x0A\x0A',
    '\x1DV\x41\x03',
  ].join('')
}

async function printRawEscPos(qz: NonNullable<Window['qz']>, printerName: string, payload: string): Promise<void> {
  const configs = [
    qz.configs.create(printerName, { encoding: 'ISO-8859-1', altPrinting: true }),
    qz.configs.create(printerName, { encoding: 'ISO-8859-1' }),
    qz.configs.create(printerName, { encoding: 'UTF-8', altPrinting: true }),
    qz.configs.create(printerName, { encoding: 'UTF-8' }),
  ]

  const dataVariants: unknown[][] = [
    [payload],
    [{ type: 'raw', format: 'plain', data: payload }],
    [{ type: 'raw', format: 'command', flavor: 'plain', data: payload }],
  ]

  let lastError: unknown = null
  for (const config of configs) {
    for (const data of dataVariants) {
      try {
        await qz.print(config, data)
        return
      } catch (error) {
        lastError = error
      }
    }
  }

  const msg = lastError instanceof Error ? lastError.message : String(lastError)
  if (/denied|blocked|cancel/i.test(msg)) {
    throw new Error(
      'QZ bloqueo la impresion. Busca la ventana "Action Required" de QZ Tray (puede estar detras) y pulsa Allow + Remember.'
    )
  }
  throw new Error(`Ticketera "${printerName}": ${msg || 'error desconocido'}`)
}

export async function printTestTicket(options: {
  printerName?: string
}): Promise<{ printer: string }> {
  const qz = await connectQz()
  const printer = await resolvePrinter(qz, options.printerName)
  await printRawEscPos(qz, printer, buildTestEscPos())
  return { printer }
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

    try {
      await printRawEscPos(qz, printer, escpos)
      return { method: 'qz-escpos', printer }
    } catch (escposError) {
      if (options.pdfFallback) {
        try {
          await printPdfWithQz(qz, printer, options.pdfFallback)
          return { method: 'qz-pdf', printer }
        } catch {
          /* try browser below */
        }
      }
      throw escposError
    }
  } catch (qzError) {
    if (options.pdfFallback) {
      try {
        await printPdfInBrowser(options.pdfFallback)
        return { method: 'browser' }
      } catch {
        /* fall through */
      }
    }
    throw qzError instanceof Error
      ? qzError
      : new Error('No se pudo imprimir. Revisa QZ Tray y la impresora LR2000.')
  }
}

export { getQzSetupStatus, isQzSigningReady }
