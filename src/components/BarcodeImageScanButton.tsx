/**
 * Cámara o galería/archivo: decodifica código de barras / QR desde la imagen.
 */
import { useRef, useState } from 'react'
import { Camera, ImageUp, Loader2 } from 'lucide-react'
import { decodeBarcodeFromImageFile } from '../utils/decodeBarcodeFromImage'

interface BarcodeImageScanButtonProps {
  onDecoded: (text: string) => void
  disabled?: boolean
  className?: string
  /** Clases extra para el contenedor de los dos botones */
  buttonGroupClassName?: string
}

export function BarcodeImageScanButton({
  onDecoded,
  disabled,
  className = '',
  buttonGroupClassName = '',
}: BarcodeImageScanButtonProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

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
      setError('No se detectó un código legible. Prueba otra foto más nítida.')
    } finally {
      setBusy(false)
    }
  }

  const handleCameraChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    void processFile(file)
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
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        disabled={isDisabled}
        onChange={handleCameraChange}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        disabled={isDisabled}
        onChange={handleGalleryChange}
      />

      {busy ? (
        <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-600 border border-gray-200 bg-gray-50">
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
            onClick={() => cameraInputRef.current?.click()}
            className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-800 bg-white border border-gray-300 hover:bg-gray-50 transition disabled:opacity-50"
            title="Abrir la cámara"
          >
            <Camera className="w-5 h-5 shrink-0 text-gray-700" aria-hidden />
            <span>Cámara</span>
          </button>

          <button
            type="button"
            disabled={isDisabled}
            onClick={() => galleryInputRef.current?.click()}
            className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-800 bg-white border border-gray-300 hover:bg-gray-50 transition disabled:opacity-50"
            title="Elegir imagen de la galería o archivos"
          >
            <ImageUp className="w-5 h-5 shrink-0 text-gray-700" aria-hidden />
            <span>Subir imagen</span>
          </button>
        </div>
      )}

      {error && <p className="text-xs text-red-600 max-w-[260px]">{error}</p>}
    </div>
  )
}
