import type { jsPDF } from 'jspdf'
import { buildEscPosTicket, type SaleTicketData } from '../utils/escposTicket'
import type { PaperSize } from '../utils/printPaperSize'
import {
  getBrowserPrintHint,
  printHtmlInBrowser,
  printPdfInBrowser,
} from '../utils/browserTicketPrint'
import { buildTestTicketHtml, buildThermalTicketHtml } from '../utils/thermalTicketHtml'

export type { SaleTicketData }

export type TicketPrintResult = {
  method: 'html' | 'pdf'
}

export async function printSaleTicket(
  ticket: SaleTicketData,
  options: { paperSize: PaperSize; pdfFallback?: jsPDF | null }
): Promise<TicketPrintResult> {
  const html = buildThermalTicketHtml(ticket, options.paperSize)

  try {
    await printHtmlInBrowser(html)
    return { method: 'html' }
  } catch (htmlError) {
    if (options.pdfFallback) {
      try {
        await printPdfInBrowser(options.pdfFallback)
        return { method: 'pdf' }
      } catch {
        /* fall through */
      }
    }
    throw htmlError instanceof Error
      ? htmlError
      : new Error('No se pudo imprimir. Revisa que la LR2000 este encendida y seleccionada.')
  }
}

export async function printTestTicket(options: {
  paperSize: PaperSize
}): Promise<void> {
  const html = buildTestTicketHtml(options.paperSize)
  await printHtmlInBrowser(html)
}

export function getPrintInstructions(): string {
  return [
    'Impresion directa desde el navegador (sin QZ Tray).',
    '1. En Windows, configura la LR2000 como impresora predeterminada.',
    '2. Al cobrar se abrira el dialogo de impresion: elige LR2000.',
    '3. Si hay documentos atascados: Configuracion > Impresoras > LR2000 > Ver cola > Cancelar todo.',
    '4. Cierra QZ Tray si lo tienes instalado (puede bloquear la impresora).',
  ].join('\n')
}

export { getBrowserPrintHint, buildEscPosTicket }
