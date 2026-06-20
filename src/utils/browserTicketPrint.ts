import type { jsPDF } from 'jspdf'

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
        try {
          iframe.contentWindow?.focus()
          iframe.contentWindow?.print()
          setTimeout(() => {
            cleanup()
            resolve()
          }, 1500)
        } catch (error) {
          cleanup()
          reject(error)
        }
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
