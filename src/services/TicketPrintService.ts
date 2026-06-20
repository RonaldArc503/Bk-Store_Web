import type { jsPDF } from 'jspdf'
import type { PaperSize } from '../utils/printPaperSize'
import {
  DEFAULT_THERMAL_PRINTER,
  getBrowserPrintHint,
  printElementInPage,
  printPdfInBrowser,
} from '../utils/browserTicketPrint'

export type { SaleTicketData } from '../utils/escposTicket'
export { buildEscPosTicket } from '../utils/escposTicket'
export { DEFAULT_THERMAL_PRINTER, getBrowserPrintHint, printElementInPage, printPdfInBrowser }

export type TicketPrintResult = {
  method: 'element' | 'pdf'
  printer: string
}

function resolvePrinterName(name?: string): string {
  const trimmed = name?.trim()
  return trimmed || DEFAULT_THERMAL_PRINTER
}

export async function printTicketFromPreview(
  options: { paperSize: PaperSize; printerName?: string; pdfFallback?: jsPDF | null }
): Promise<TicketPrintResult> {
  const printer = resolvePrinterName(options.printerName)

  try {
    await printElementInPage('print-area', options.paperSize)
    return { method: 'element', printer }
  } catch (elementError) {
    if (options.pdfFallback) {
      try {
        await printPdfInBrowser(options.pdfFallback)
        return { method: 'pdf', printer }
      } catch {
        /* fall through */
      }
    }
    throw elementError instanceof Error
      ? elementError
      : new Error(`No se pudo imprimir en ${printer}.`)
  }
}

export function getPrintInstructions(): string {
  return [
    'Ticketera POS-58 / PR-100 (58 mm).',
    '1. Deja POS-58 como impresora predeterminada en Windows.',
    '2. Al cobrar se muestra el ticket dentro del sistema.',
    '3. Pulsa Imprimir o PDF en el modal del ticket.',
  ].join('\n')
}
