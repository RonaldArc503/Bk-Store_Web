import type { jsPDF } from 'jspdf'
import type { PaperSize } from './printPaperSize'

function waitForPrint(frame: HTMLIFrameElement): Promise<void> {
  return new Promise((resolve, reject) => {
    const win = frame.contentWindow
    if (!win) {
      reject(new Error('No se pudo abrir la ventana de impresion'))
      return
    }

    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      resolve()
    }

    win.addEventListener('afterprint', finish, { once: true })
    win.focus()
    win.print()

    setTimeout(finish, 3000)
  })
}

export function printHtmlInBrowser(html: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const iframe = document.createElement('iframe')
      iframe.style.cssText =
        'position:fixed;right:0;bottom:0;width:0;height:0;border:none;opacity:0;pointer-events:none'
      document.body.appendChild(iframe)

      const cleanup = () => {
        iframe.remove()
      }

      const doc = iframe.contentDocument
      if (!doc) {
        cleanup()
        reject(new Error('No se pudo preparar el ticket'))
        return
      }

      doc.open()
      doc.write(html)
      doc.close()

      void waitForPrint(iframe)
        .then(() => {
          cleanup()
          resolve()
        })
        .catch((error) => {
          cleanup()
          reject(error)
        })
    } catch (error) {
      reject(error)
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
        'position:fixed;right:0;bottom:0;width:0;height:0;border:none;opacity:0;pointer-events:none'
      iframe.src = url
      document.body.appendChild(iframe)

      const cleanup = () => {
        URL.revokeObjectURL(url)
        iframe.remove()
      }

      iframe.onload = () => {
        void waitForPrint(iframe)
          .then(() => {
            cleanup()
            resolve()
          })
          .catch((error) => {
            cleanup()
            reject(error)
          })
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

export function getBrowserPrintHint(_paperSize: PaperSize): string {
  return 'En el dialogo elige la impresora LR2000 y pulsa Imprimir.'
}
