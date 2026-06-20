import type { jsPDF } from 'jspdf'
import {
  buildEscPosTicket,
  buildTestEscPos,
  type SaleTicketData,
} from '../utils/escposTicket'
import type { PaperSize } from '../utils/printPaperSize'
import {
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

export type TicketPrintResult = {
  method: 'serial' | 'html' | 'pdf'
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
  options: { paperSize: PaperSize; pdfFallback?: jsPDF | null; preferSerial?: boolean }
): Promise<TicketPrintResult> {
  const escpos = buildEscPosTicket(ticket, options.paperSize)

  if (options.preferSerial !== false) {
    const serialOk = await trySerialPrint(escpos)
    if (serialOk) return { method: 'serial' }
  }

  const html = buildThermalTicketHtml(ticket, options.paperSize)
  try {
    await printHtmlInBrowser(html, 'Ticket de venta')
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
      : new Error('No se pudo imprimir. Empareja la PR-100 o revisa la cola de Windows.')
  }
}

export async function printTestTicket(options: {
  paperSize: PaperSize
  preferSerial?: boolean
}): Promise<TicketPrintResult> {
  if (options.preferSerial !== false) {
    const serialOk = await trySerialPrint(buildTestEscPos())
    if (serialOk) return { method: 'serial' }
  }

  await printHtmlInBrowser(buildTestTicketHtml(options.paperSize), 'Prueba PR-100')
  return { method: 'html' }
}

export async function connectSerialPrinter(): Promise<void> {
  await pairSerialPrinter()
}

export function getPrintInstructions(): string {
  return [
    'Ticketera PR-100 (58 mm, ESC/POS).',
    '1. Usa Chrome o Edge en la PC del POS.',
    '2. Pulsa Emparejar PR-100 una sola vez y elige el puerto USB/Serial.',
    '3. Pulsa Imprimir ticket de prueba; debe salir papel al instante.',
    '4. Si usas dialogo del navegador: impresora PR-100, papel 58 mm, sin margenes.',
  ].join('\n')
}

export {
  getBrowserPrintHint,
  buildEscPosTicket,
  isSerialPrintSupported,
}
