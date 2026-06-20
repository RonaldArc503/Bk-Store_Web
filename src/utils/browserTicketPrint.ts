import type { jsPDF } from 'jspdf'
import { getPaperWidthMm, type PaperSize } from './printPaperSize'

export const DEFAULT_THERMAL_PRINTER = 'POS-58'

const PRINT_STYLE_ID = 'dynamic-ticket-print'

export function printElementInPage(elementId: string, paperSize: PaperSize): Promise<void> {
  const widthMm = getPaperWidthMm(paperSize)
  const target = document.getElementById(elementId)
  if (!target) {
    return Promise.reject(new Error('No se encontro el ticket para imprimir'))
  }

  return new Promise((resolve, reject) => {
    const existing = document.getElementById(PRINT_STYLE_ID)
    existing?.remove()

    const style = document.createElement('style')
    style.id = PRINT_STYLE_ID
    style.textContent = `
      @media print {
        @page { size: ${widthMm}mm auto; margin: 0; }
        html, body { background: #fff !important; }
        body > *:not(#ticket-print-root) { display: none !important; }
        #ticket-print-root {
          position: static !important;
          inset: auto !important;
          width: auto !important;
          height: auto !important;
          max-height: none !important;
          overflow: visible !important;
          background: #fff !important;
          padding: 0 !important;
          margin: 0 !important;
          display: block !important;
        }
        #ticket-print-root > div {
          background: #fff !important;
          border: 0 !important;
          box-shadow: none !important;
          padding: 0 !important;
          max-height: none !important;
          overflow: visible !important;
        }
        #ticket-print-root .ticket-modal-chrome { display: none !important; }
        #${elementId} {
          box-shadow: none !important;
          border-radius: 0 !important;
          width: ${widthMm}mm !important;
          max-width: ${widthMm}mm !important;
          margin: 0 !important;
          padding: 2mm !important;
          color: #000 !important;
          background: #fff !important;
        }
        #${elementId}, #${elementId} * {
          color: #000 !important;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        #${elementId} .bg-gray-50 { background: #f9fafb !important; }
      }
    `
    document.head.appendChild(style)

    const cleanup = () => {
      style.remove()
      window.removeEventListener('afterprint', cleanup)
      resolve()
    }

    try {
      window.addEventListener('afterprint', cleanup)
      window.print()
      setTimeout(cleanup, 5000)
    } catch (error) {
      style.remove()
      reject(error)
    }
  })
}

export function printPdfInBrowser(doc: jsPDF): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const blob = doc.output('blob')
      const url = URL.createObjectURL(blob)
      const popup = window.open(url, '_blank')
      if (!popup) {
        URL.revokeObjectURL(url)
        reject(new Error('Permite ventanas emergentes para imprimir el ticket.'))
        return
      }

      popup.addEventListener('load', () => {
        popup.focus()
        popup.print()
      })

      popup.addEventListener('afterprint', () => {
        URL.revokeObjectURL(url)
        popup.close()
        resolve()
      })

      setTimeout(() => {
        URL.revokeObjectURL(url)
        resolve()
      }, 120000)
    } catch (error) {
      reject(error)
    }
  })
}

export function getBrowserPrintHint(_paperSize: PaperSize, printerName = DEFAULT_THERMAL_PRINTER): string {
  return `Se enviara a ${printerName} (impresora predeterminada en Windows). Papel 58 mm.`
}
