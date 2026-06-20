import type { jsPDF } from 'jspdf'
import {
  buildEscPosTicket,
  buildTestEscPos,
  type SaleTicketData,
} from '../utils/escposTicket'
import type { PaperSize } from '../utils/printPaperSize'
import {
  DEFAULT_THERMAL_PRINTER,
  getBrowserPrintHint,
  printHtmlInBrowser,
  printPdfInBrowser,
} from '../utils/browserTicketPrint'
import {
  isSerialPrintSupported,
  pairSerialPrinter,
  printEscPosViaSerial,
} from '../utils/serialThermalPrint'
import { buildTestTicketHtml, buildThermalTicketHtml } from '../utils/thermalTicketHtml'

export type { SaleTicketData }
export { DEFAULT_THERMAL_PRINTER, getBrowserPrintHint }

export type TicketPrintResult = {
  method: 'serial' | 'html' | 'pdf'
  printer: string
}

function resolvePrinterName(name?: string): string {
  const trimmed = name?.trim()
  return trimmed || DEFAULT_THERMAL_PRINTER
}

async function trySerialPrint(payload: string): Promise<boolean> {
  if (!isSerialPrintSupported()) return false
  try {
    await printEscPosViaSerial(payload)
    return true
  } catch {
    return false
  }
}

export async function printSaleTicket(
  ticket: SaleTicketData,
  options: {
    paperSize: PaperSize
    pdfFallback?: jsPDF | null
    printerName?: string
  }
): Promise<TicketPrintResult> {
  const printer = resolvePrinterName(options.printerName)
  const escpos = buildEscPosTicket(ticket, options.paperSize)
  const html = buildThermalTicketHtml(ticket, options.paperSize)

  try {
    await printHtmlInBrowser(html, 'Ticket de venta', printer)
    return { method: 'html', printer }
  } catch (htmlError) {
    const serialOk = await trySerialPrint(escpos)
    if (serialOk) return { method: 'serial', printer }

    if (options.pdfFallback) {
      try {
        await printPdfInBrowser(options.pdfFallback)
        return { method: 'pdf', printer }
      } catch {
        /* fall through */
      }
    }
    throw htmlError instanceof Error
      ? htmlError
      : new Error(`No se pudo imprimir en ${printer}. Revisa la cola de impresion.`)
  }
}

export async function printTestTicket(options: {
  paperSize: PaperSize
  printerName?: string
}): Promise<TicketPrintResult> {
  const printer = resolvePrinterName(options.printerName)

  try {
    await printHtmlInBrowser(buildTestTicketHtml(options.paperSize), 'Prueba POS-58', printer)
    return { method: 'html', printer }
  } catch {
    const serialOk = await trySerialPrint(buildTestEscPos())
    if (serialOk) return { method: 'serial', printer }
    throw new Error(`No se pudo imprimir en ${printer}.`)
  }
}

export async function connectSerialPrinter(): Promise<void> {
  await pairSerialPrinter()
}

export function getPrintInstructions(): string {
  return [
    'Ticketera POS-58 / PR-100 (58 mm).',
    '1. Deja POS-58 como impresora predeterminada en Windows.',
    '2. Al imprimir, el navegador usa esa impresora automaticamente.',
    '3. Papel 58 mm, sin margenes ni encabezados.',
  ].join('\n')
}

export { buildEscPosTicket, isSerialPrintSupported }
