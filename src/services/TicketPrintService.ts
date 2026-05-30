import type { jsPDF } from 'jspdf'

const QZ_SCRIPT_URL = 'https://cdn.jsdelivr.net/npm/qz-tray@2.2.4/qz-tray.js'
const QZ_CONNECT_TIMEOUT_MS = 3000

const THERMAL_PATTERNS = [
  /thermal/i,
  /receipt/i,
  /recibo/i,
  /ticket/i,
  /ticketera/i,
  /pos/i,
  /epson\s*tm/i,
  /star\s/i,
  /citizen/i,
  /bixolon/i,
  /58mm/i,
  /72mm/i,
  /80mm/i,
  /t[eé]rmic/i,
  /termic/i,
]

let qzLoadPromise: Promise<NonNullable<Window['qz']>> | null = null

function loadQzTray(): Promise<NonNullable<Window['qz']>> {
  if (window.qz) return Promise.resolve(window.qz)
  if (qzLoadPromise) return qzLoadPromise

  qzLoadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${QZ_SCRIPT_URL}"]`)
    if (existing) {
      existing.addEventListener('load', () => {
        if (window.qz) resolve(window.qz)
        else reject(new Error('QZ Tray no disponible'))
      })
      existing.addEventListener('error', () => reject(new Error('No se pudo cargar QZ Tray')))
      return
    }

    const script = document.createElement('script')
    script.src = QZ_SCRIPT_URL
    script.async = true
    script.onload = () => {
      if (window.qz) resolve(window.qz)
      else reject(new Error('QZ Tray no disponible'))
    }
    script.onerror = () => reject(new Error('No se pudo cargar QZ Tray'))
    document.head.appendChild(script)
  })

  return qzLoadPromise
}

function configureQzSecurity(qz: NonNullable<Window['qz']>) {
  qz.security.setCertificatePromise((resolve) => resolve())
  qz.security.setSignaturePromise(() => (resolve) => resolve(''))
}

async function connectQz(): Promise<NonNullable<Window['qz']> | null> {
  try {
    const qz = await loadQzTray()
    configureQzSecurity(qz)
    if (!qz.websocket.isActive()) {
      await Promise.race([
        qz.websocket.connect(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Tiempo de espera agotado')), QZ_CONNECT_TIMEOUT_MS)
        ),
      ])
    }
    return qz
  } catch {
    return null
  }
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

export async function detectPrinters(): Promise<{ available: boolean; printers: string[]; selected: string | null }> {
  const qz = await connectQz()
  if (!qz) {
    return { available: false, printers: [], selected: null }
  }

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

async function printPdfWithQz(doc: jsPDF, printerName: string): Promise<void> {
  const qz = await connectQz()
  if (!qz) throw new Error('QZ Tray no conectado')

  const config = qz.configs.create(printerName)
  const base64 = pdfToBase64(doc)
  await qz.print(config, [
    {
      type: 'pixel',
      format: 'pdf',
      flavor: 'base64',
      data: base64,
    },
  ])
}

export type TicketPrintResult = {
  method: 'qz' | 'browser'
  printer?: string
}

export async function printTicketDocument(
  doc: jsPDF,
  options: { printerName?: string } = {}
): Promise<TicketPrintResult> {
  const qz = await connectQz()
  if (qz) {
    try {
      const printers = await qz.printers.find()
      let defaultName: string | null = null
      try {
        defaultName = await qz.printers.getDefault()
      } catch {
        defaultName = null
      }

      const printer = pickBestPrinter(printers, options.printerName, defaultName)
      if (printer) {
        await printPdfWithQz(doc, printer)
        return { method: 'qz', printer }
      }
    } catch (error) {
      console.warn('Impresion QZ fallida, usando navegador', error)
    }
  }

  printPdfInBrowser(doc)
  return { method: 'browser' }
}

export function isLikelyQzInstalled(): boolean {
  return Boolean(window.qz?.websocket?.isActive?.())
}
