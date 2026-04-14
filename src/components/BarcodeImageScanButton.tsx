/**
 * Botón para tomar foto (móvil) o elegir imagen y decodificar código de barras / QR.
 */
import { useRef, useState } from 'react'
import { Camera, Loader2 } from 'lucide-react'
import { decodeBarcodeFromImageFile } from '../utils/decodeBarcodeFromImage'

interface BarcodeImageScanButtonProps {
  onDecoded: (text: string) => void
  disabled?: boolean
  className?: string
  label?: string
}

export function BarcodeImageScanButton({
  onDecoded,
  disabled,
  className = '',
  label = 'Foto o imagen',
}: BarcodeImageScanButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
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

  return (
    <div className="flex flex-col gap-1">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        disabled={disabled || busy}
        onChange={handleChange}
      />
      <button
        type="button"
        disabled={disabled || busy}
        onClick={() => inputRef.current?.click()}
        className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-gray-800 bg-white border border-gray-300 hover:bg-gray-50 transition disabled:opacity-50 ${className}`}
      >
        {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
        {busy ? 'Leyendo…' : label}
      </button>
      {error && <p className="text-xs text-red-600 max-w-[220px]">{error}</p>}
    </div>
  )
}
