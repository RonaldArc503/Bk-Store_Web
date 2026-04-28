import { useCallback, useEffect, useRef, useState } from 'react'
import { Camera, ImageUp, Loader2, X } from 'lucide-react'
import { Html5Qrcode } from 'html5-qrcode'
import {
  decodeBarcodeFromImageFile,
  BARCODE_FORMATS,
} from '../utils/decodeBarcodeFromImage'

interface BarcodeImageScanButtonProps {
  onDecoded: (text: string) => void
  disabled?: boolean
  className?: string
  buttonGroupClassName?: string
}

const CAMERA_REGION_ID = 'html5qr-camera-region'

export function BarcodeImageScanButton({
  onDecoded,
  disabled,
  className = '',
  buttonGroupClassName = '',
}: BarcodeImageScanButtonProps) {
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [cameraOpen, setCameraOpen] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [lastScanned, setLastScanned] = useState('')

  const stopScanner = useCallback(async () => {
    try {
      const s = scannerRef.current
      if (s) {
        const state = s.getState()
        if (state === 2 || state === 3) {
          await s.stop()
        }
        s.clear()
      }
    } catch {
      // ignore cleanup errors
    }
    scannerRef.current = null
    setScanning(false)
  }, [])

  const closeCameraModal = useCallback(async () => {
    await stopScanner()
    setCameraOpen(false)
    setLastScanned('')
  }, [stopScanner])

  useEffect(() => {
    return () => {
      void stopScanner()
    }
  }, [stopScanner])

  const openCamera = async () => {
    setError('')
    setLastScanned('')
    setCameraOpen(true)
  }

  useEffect(() => {
    if (!cameraOpen) return

    let cancelled = false

    const startScanning = async () => {
      await new Promise((r) => setTimeout(r, 300))
      if (cancelled) return

      const container = document.getElementById(CAMERA_REGION_ID)
      if (!container) return

      try {
        const scanner = new Html5Qrcode(CAMERA_REGION_ID, {
          verbose: false,
          formatsToSupport: BARCODE_FORMATS,
        })
        scannerRef.current = scanner

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 280, height: 160 },
            aspectRatio: 1.333,
            disableFlip: false,
          },
          (decodedText) => {
            if (!cancelled) {
              setLastScanned(decodedText.trim())
              onDecoded(decodedText.trim())
              void closeCameraModal()
            }
          },
          () => {
            // frame sin lectura — normal, sigue escaneando
          },
        )
        if (!cancelled) setScanning(true)
      } catch (err) {
        if (!cancelled) {
          try {
            const scanner = new Html5Qrcode(CAMERA_REGION_ID, {
              verbose: false,
              formatsToSupport: BARCODE_FORMATS,
            })
            scannerRef.current = scanner
            await scanner.start(
              { facingMode: 'user' },
              {
                fps: 10,
                qrbox: { width: 280, height: 160 },
                aspectRatio: 1.333,
                disableFlip: false,
              },
              (decodedText) => {
                if (!cancelled) {
                  setLastScanned(decodedText.trim())
                  onDecoded(decodedText.trim())
                  void closeCameraModal()
                }
              },
              () => {},
            )
            if (!cancelled) setScanning(true)
          } catch {
            if (!cancelled) {
              console.error('Camera error:', err)
              setError('No se pudo abrir la cámara. Revisa permisos del navegador.')
              setCameraOpen(false)
            }
          }
        }
      }
    }

    void startScanning()

    return () => {
      cancelled = true
      void stopScanner()
    }
  }, [cameraOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  const processFile = async (file: File | undefined) => {
    if (!file || !file.type.startsWith('image/')) {
      if (file) setError('Selecciona un archivo de imagen.')
      return
    }

    setError('')
    setBusy(true)
    try {
      const text = await decodeBarcodeFromImageFile(file)
      if (!text) {
        setError('No se leyó ningún código en la imagen.')
        return
      }
      onDecoded(text)
    } catch {
      setError('No se detectó un código legible. Prueba con otra foto más nítida y centrada.')
    } finally {
      setBusy(false)
    }
  }

  const handleGalleryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    void processFile(file)
  }

  const isDisabled = disabled || busy

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        disabled={isDisabled}
        onChange={handleGalleryChange}
      />

      {busy ? (
        <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <Loader2 className="w-5 h-5 animate-spin shrink-0" aria-hidden />
          <span>Leyendo código…</span>
        </div>
      ) : (
        <div
          className={`flex flex-wrap gap-2 items-center ${buttonGroupClassName}`}
          role="group"
          aria-label="Escanear código desde imagen"
        >
          <button
            type="button"
            disabled={isDisabled}
            onClick={() => void openCamera()}
            className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition disabled:opacity-50"
            title="Escaneo en tiempo real con cámara"
          >
            <Camera className="w-5 h-5 shrink-0 text-gray-700 dark:text-gray-300" aria-hidden />
            <span>Cámara</span>
          </button>

          <button
            type="button"
            disabled={isDisabled}
            onClick={() => galleryInputRef.current?.click()}
            className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition disabled:opacity-50"
            title="Elegir imagen de archivos"
          >
            <ImageUp className="w-5 h-5 shrink-0 text-gray-700 dark:text-gray-300" aria-hidden />
            <span>Subir imagen</span>
          </button>
        </div>
      )}

      {error && <p className="text-xs text-red-600 dark:text-red-400 max-w-[300px]">{error}</p>}

      {cameraOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 dark:bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Escáner de código de barras"
        >
          <div className="relative w-full max-w-lg rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-4 shadow-xl">
            <button
              type="button"
              onClick={() => void closeCameraModal()}
              className="absolute right-3 top-3 z-10 rounded-lg p-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>

            <p className="mb-3 pr-10 text-sm font-medium text-gray-900 dark:text-gray-100">
              Apunta al código de barras — se lee automáticamente
            </p>

            <div className="relative w-full overflow-hidden rounded-lg bg-black">
              <div id={CAMERA_REGION_ID} className="w-full" />
              {!scanning && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                  <Loader2 className="w-8 h-8 animate-spin text-white" />
                </div>
              )}
            </div>

            {scanning && (
              <p className="mt-3 text-xs text-center text-gray-500 dark:text-gray-400 animate-pulse">
                Buscando código de barras…
              </p>
            )}

            {lastScanned && (
              <p className="mt-2 text-xs text-center text-lime-600 dark:text-lime-400 font-medium">
                Código detectado: {lastScanned}
              </p>
            )}

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => void closeCameraModal()}
                className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
