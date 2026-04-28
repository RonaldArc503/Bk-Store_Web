import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'

const CONTAINER_ID = 'html5qr-barcode-file-mount'

export const BARCODE_FORMATS = [
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.CODE_93,
  Html5QrcodeSupportedFormats.CODABAR,
  Html5QrcodeSupportedFormats.ITF,
]

function ensureHiddenContainer(): HTMLElement {
  let el = document.getElementById(CONTAINER_ID)
  if (!el) {
    el = document.createElement('div')
    el.id = CONTAINER_ID
    el.setAttribute('aria-hidden', 'true')
    Object.assign(el.style, {
      position: 'fixed',
      width: '600px',
      height: '600px',
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
  const scanner = new Html5Qrcode(CONTAINER_ID, {
    verbose: false,
    formatsToSupport: BARCODE_FORMATS,
  })
  try {
    const text = await scanner.scanFile(file, true)
    return text.trim()
  } finally {
    await scanner.clear()
  }
}
