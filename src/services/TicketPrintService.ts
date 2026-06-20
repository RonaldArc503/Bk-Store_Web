import type { jsPDF } from 'jspdf'
import { buildEscPosTicket, type SaleTicketData } from '../utils/escposTicket'
import type { PaperSize } from '../utils/printPaperSize'
import {
  DEFAULT_THERMAL_PRINTER,
  getBrowserPrintHint,
  printHtmlInBrowser,
  printPdfInBrowser,
} from '../utils/browserTicketPrint'
import { buildTestTicketHtml, buildThermalTicketHtml } from '../utils/thermalTicketHtml'

export type { SaleTicketData }
export { DEFAULT_THERMAL_PRINTER, getBrowserPrintHint }

export type TicketPrintResult = {
  method: 'html' | 'pdf'
  printer: string
}

function resolvePrinterName(name?: string): string {
  const trimmed = name?.trim()
  return trimmed || DEFAULT_THERMAL_PRINTER
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
  const html = buildThermalTicketHtml(ticket, options.paperSize)

  try {
    await printHtmlInBrowser(html, 'Ticket de venta', printer)
    return { method: 'html', printer }
  } catch (htmlError) {
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
  await printHtmlInBrowser(buildTestTicketHtml(options.paperSize), 'Prueba POS-58', printer)
  return { method: 'html', printer }
}

export function getPrintInstructions(): string {
  return [
    'Ticketera POS-58 / PR-100 (58 mm).',
    '1. Deja POS-58 como impresora predeterminada en Windows.',
    '2. Pulsa Imprimir ticket de prueba y confirma en el dialogo del navegador.',
    '3. Papel 58 mm, sin margenes ni encabezados.',
  ].join('\n')
}

export { buildEscPosTicket }
