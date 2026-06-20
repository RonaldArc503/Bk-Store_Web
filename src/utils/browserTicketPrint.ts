import type { jsPDF } from 'jspdf'
import type { PaperSize } from './printPaperSize'

const PRINT_SHELL = (body: string, title: string) => `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    html, body { margin: 0; background: #f3f4f6; font-family: Arial, sans-serif; }
    .toolbar {
      position: sticky;
      top: 0;
      z-index: 10;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
      padding: 12px 16px;
      background: #111827;
      color: #fff;
    }
    .toolbar button {
      background: #06b6d4;
      color: #fff;
      border: 0;
      border-radius: 10px;
      padding: 10px 16px;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
    }
    .toolbar p { margin: 0; font-size: 12px; color: #d1d5db; max-width: 520px; }
    .preview { display: flex; justify-content: center; padding: 16px; }
    .sheet { background: #fff; box-shadow: 0 8px 24px rgba(0,0,0,.15); }
    @media print {
      html, body { background: #fff; }
      .toolbar { display: none !important; }
      .preview { padding: 0; }
      .sheet { box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="toolbar no-print">
    <button type="button" onclick="window.print()">Imprimir en PR-100</button>
    <p>Impresora: PR-100 / POS-58. Papel: 58 mm. Desactiva encabezado y pie de pagina.</p>
  </div>
  <div class="preview">
    <div class="sheet">${body}</div>
  </div>
  <script>
    window.addEventListener('load', function () {
      setTimeout(function () { window.print(); }, 400);
    });
  </script>
</body>
</html>`

function openPrintWindow(html: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const popup = window.open('', '_blank', 'width=420,height=720')
    if (!popup) {
      reject(new Error('Permite ventanas emergentes para imprimir el ticket.'))
      return
    }

    popup.document.open()
    popup.document.write(html)
    popup.document.close()

    popup.addEventListener('afterprint', () => {
      popup.close()
      resolve()
    })

    setTimeout(resolve, 120000)
  })
}

export function printHtmlInBrowser(html: string, title = 'Ticket'): Promise<void> {
  const match = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)
  const inner = match?.[1] ?? html
  const headMatch = html.match(/<head[^>]*>([\s\S]*)<\/head>/i)
  const headInner = headMatch?.[1] ?? ''
  const wrapped = PRINT_SHELL(`${headInner}${inner}`, title)
  return openPrintWindow(wrapped)
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

export function getBrowserPrintHint(_paperSize: PaperSize): string {
  return 'Si no sale papel, usa el boton Emparejar PR-100 y prueba de nuevo (Chrome/Edge).'
}
