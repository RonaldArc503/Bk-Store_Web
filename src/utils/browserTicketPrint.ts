import type { jsPDF } from 'jspdf'
import { getPaperWidthMm, type PaperSize } from './printPaperSize'

export const DEFAULT_THERMAL_PRINTER = 'POS-58'

function collectDocumentStyles(): string {
  return Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map((node) => node.outerHTML)
    .join('\n')
}

export function printElementInPage(elementId: string, paperSize: PaperSize): Promise<void> {
  const source = document.getElementById(elementId)
  if (!source) {
    return Promise.reject(new Error('No se encontro el ticket para imprimir'))
  }

  const widthMm = getPaperWidthMm(paperSize)
  const styles = collectDocumentStyles()

  const iframe = document.createElement('iframe')
  iframe.setAttribute('aria-hidden', 'true')
  iframe.title = 'Impresion ticket'
  iframe.style.cssText =
    'position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none'

  document.body.appendChild(iframe)

  const doc = iframe.contentDocument
  if (!doc) {
    iframe.remove()
    return Promise.reject(new Error('No se pudo preparar la impresion'))
  }

  doc.open()
  doc.write(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Ticket</title>
  ${styles}
  <style>
    @page { size: ${widthMm}mm auto; margin: 0; }
    html, body {
      margin: 0;
      padding: 0;
      background: #fff !important;
      color: #000 !important;
    }
    body {
      width: ${widthMm}mm;
      padding: 2mm;
      box-sizing: border-box;
    }
    #print-area, #print-area * {
      color: #000 !important;
      background: transparent !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    #print-area .bg-gray-50 { background: #f3f4f6 !important; }
    #print-area .text-\\[\\#8CC63F\\] { color: #166534 !important; }
    #print-area .border-gray-200,
    #print-area .border-gray-100,
    #print-area .border-gray-900 {
      border-color: #000 !important;
    }
  </style>
</head>
<body>
  <div id="print-area">${source.innerHTML}</div>
</body>
</html>`)
  doc.close()

  return new Promise((resolve, reject) => {
    const win = iframe.contentWindow
    if (!win) {
      iframe.remove()
      reject(new Error('No se pudo abrir la impresion'))
      return
    }

    const cleanup = () => {
      iframe.remove()
      window.removeEventListener('afterprint', cleanup)
      resolve()
    }

    const startPrint = () => {
      try {
        win.focus()
        win.print()
      } catch (error) {
        iframe.remove()
        reject(error instanceof Error ? error : new Error('No se pudo imprimir'))
        return
      }
      win.addEventListener('afterprint', cleanup, { once: true })
      setTimeout(cleanup, 8000)
    }

    if (doc.readyState === 'complete') {
      setTimeout(startPrint, 250)
    } else {
      iframe.onload = () => setTimeout(startPrint, 250)
    }
  })
}

export function printPdfInBrowser(doc: jsPDF): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const blob = doc.output('blob')
      const url = URL.createObjectURL(blob)
      const iframe = document.createElement('iframe')
      iframe.style.cssText =
        'position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none'
      iframe.src = url
      document.body.appendChild(iframe)

      const cleanup = () => {
        URL.revokeObjectURL(url)
        iframe.remove()
      }

      iframe.onload = () => {
        const win = iframe.contentWindow
        if (!win) {
          cleanup()
          reject(new Error('No se pudo abrir el PDF'))
          return
        }
        win.focus()
        win.print()
        win.addEventListener(
          'afterprint',
          () => {
            cleanup()
            resolve()
          },
          { once: true }
        )
        setTimeout(() => {
          cleanup()
          resolve()
        }, 8000)
      }

      iframe.onerror = () => {
        cleanup()
        reject(new Error('No se pudo abrir el dialogo de impresion'))
      }
    } catch (error) {
      reject(error)
    }
  })
}

export function getBrowserPrintHint(_paperSize: PaperSize, printerName = DEFAULT_THERMAL_PRINTER): string {
  return `Se enviara a ${printerName} (impresora predeterminada en Windows). Papel 58 mm.`
}
