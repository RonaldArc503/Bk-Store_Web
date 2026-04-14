/**
 * Cámara (getUserMedia) o archivo: decodifica código de barras / QR desde la imagen.
 * En escritorio, <input capture> abre el explorador; la cámara real usa la API de video.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { Camera, ImageUp, Loader2, X } from 'lucide-react'
import { decodeBarcodeFromImageFile } from '../utils/decodeBarcodeFromImage'

interface BarcodeImageScanButtonProps {
  onDecoded: (text: string) => void
  disabled?: boolean
  className?: string
  buttonGroupClassName?: string
}

export function BarcodeImageScanButton({
  onDecoded,
  disabled,
  className = '',
  buttonGroupClassName = '',
}: BarcodeImageScanButtonProps) {
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [cameraOpen, setCameraOpen] = useState(false)
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null)

  const stopStream = useCallback((stream: MediaStream | null) => {
    stream?.getTracks().forEach((t) => t.stop())
  }, [])

  const closeCameraModal = useCallback(() => {
    stopStream(mediaStream)
    setMediaStream(null)
    setCameraOpen(false)
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }, [mediaStream, stopStream])

  const openCamera = async () => {
    setError('')
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Tu navegador no permite usar la cámara.')
      return
    }
    try {
      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        })
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        })
      }
      setMediaStream(stream)
      setCameraOpen(true)
    } catch {
      setError('No se pudo abrir la cámara. Revisa permisos del navegador.')
    }
  }

  useEffect(() => {
    if (!cameraOpen || !mediaStream) return
    const video = videoRef.current
    if (!video) return
    video.srcObject = mediaStream
    video.setAttribute('playsinline', 'true')
    video.muted = true
    const play = video.play()
    if (play !== undefined) {
      void play.catch(() => {})
    }
  }, [cameraOpen, mediaStream])

  useEffect(() => {
    return () => {
      stopStream(mediaStream)
    }
  }, [mediaStream, stopStream])

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

  const captureFrame = () => {
    const video = videoRef.current
    if (!video || video.readyState < 2) {
      setError('Espera a que la cámara esté lista.')
      return
    }
    const w = video.videoWidth
    const h = video.videoHeight
    if (!w || !h) {
      setError('La cámara aún no está lista. Intenta de nuevo.')
      return
    }
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, w, h)
    canvas.toBlob(
      (blob) => {
        if (!blob) return
        closeCameraModal()
        void processFile(new File([blob], 'camara.jpg', { type: 'image/jpeg' }))
      },
      'image/jpeg',
      0.92
    )
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
            onClick={() => void openCamera()}
            className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-800 bg-white border border-gray-300 hover:bg-gray-50 transition disabled:opacity-50"
            title="Usar la cámara del dispositivo"
          >
            <Camera className="w-5 h-5 shrink-0 text-gray-700" aria-hidden />
            <span>Cámara</span>
          </button>

          <button
            type="button"
            disabled={isDisabled}
            onClick={() => galleryInputRef.current?.click()}
            className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-800 bg-white border border-gray-300 hover:bg-gray-50 transition disabled:opacity-50"
            title="Elegir imagen de archivos"
          >
            <ImageUp className="w-5 h-5 shrink-0 text-gray-700" aria-hidden />
            <span>Subir imagen</span>
          </button>
        </div>
      )}

      {error && <p className="text-xs text-red-600 max-w-[260px]">{error}</p>}

      {cameraOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Vista de cámara"
        >
          <div className="relative w-full max-w-lg rounded-xl bg-white p-4 shadow-xl">
            <button
              type="button"
              onClick={closeCameraModal}
              className="absolute right-3 top-3 z-10 rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
              aria-label="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
            <p className="mb-3 pr-10 text-sm font-medium text-gray-900">Enfoca el código y captura</p>
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-black">
              <video
                ref={videoRef}
                className="h-full w-full object-cover"
                autoPlay
                playsInline
                muted
              />
            </div>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={closeCameraModal}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={captureFrame}
                disabled={busy}
                className="rounded-lg bg-lime-500 px-4 py-2 text-sm font-medium text-white hover:bg-lime-600 disabled:opacity-50"
              >
                Capturar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
