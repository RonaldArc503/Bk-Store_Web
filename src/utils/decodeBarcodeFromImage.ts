/**
 * Decodifica código de barras / QR desde un archivo de imagen (foto o galería).
 */
import { Html5Qrcode } from 'html5-qrcode'

const CONTAINER_ID = 'html5qr-barcode-file-mount'

function ensureHiddenContainer(): HTMLElement {
  let el = document.getElementById(CONTAINER_ID)
  if (!el) {
    el = document.createElement('div')
    el.id = CONTAINER_ID
    el.setAttribute('aria-hidden', 'true')
    Object.assign(el.style, {
      position: 'fixed',
      width: '256px',
      height: '256px',
      left: '-9999px',
      top: '0',
      opacity: '0',
      pointerEvents: 'none',
      overflow: 'hidden',
    })
    document.body.appendChild(el)
  }
  return el
}

export async function decodeBarcodeFromImageFile(file: File): Promise<string> {
  ensureHiddenContainer()
  const scanner = new Html5Qrcode(CONTAINER_ID, { verbose: false })
  try {
    const text = await scanner.scanFile(file, false)
    return text.trim()
  } finally {
    await scanner.clear()
  }
}
