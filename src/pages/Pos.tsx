/**
 * Punto de venta — búsqueda por código de barras (teclado, imagen o escáner).
 */
import { useState } from 'react'
import { ScanLine, Plus } from 'lucide-react'
import { Sidebar } from '../components/Sidebar'
import { BarcodeImageScanButton } from '../components/BarcodeImageScanButton'
import { InventoryService } from '../services/InventoryService'
import type { Product } from '../types/product'

type Line = { product: Product; cantidad: number }

export default function PosPage() {
  const [codigo, setCodigo] = useState('')
  const [lines, setLines] = useState<Line[]>([])
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const addProductByCode = async (code: string) => {
    const trimmed = code.trim()
    if (!trimmed) {
      setNotice({ type: 'err', text: 'Ingresa o escanea un código.' })
      return
    }

    setLoading(true)
    setNotice(null)
    try {
      const products = await InventoryService.getProducts()
      const found = products.find((p) => p.codigo.trim() === trimmed)
      if (!found) {
        setNotice({ type: 'err', text: 'No hay producto con ese código.' })
        return
      }
      if (found.stock <= 0) {
        setNotice({ type: 'err', text: 'Sin stock para este producto.' })
        return
      }

      setLines((prev) => {
        const i = prev.findIndex((l) => l.product.id === found.id)
        if (i >= 0) {
          const line = prev[i]
          if (line.cantidad >= line.product.stock) {
            Promise.resolve().then(() =>
              setNotice({ type: 'err', text: 'No hay más stock disponible.' })
            )
            return prev
          }
          const next = [...prev]
          next[i] = { ...line, cantidad: line.cantidad + 1 }
          Promise.resolve().then(() =>
            setNotice({
              type: 'ok',
              text: `${found.nombre} — cantidad ${next[i].cantidad}`,
            })
          )
          return next
        }
        Promise.resolve().then(() =>
          setNotice({ type: 'ok', text: `${found.nombre} agregado.` })
        )
        return [...prev, { product: found, cantidad: 1 }]
      })
      setCodigo('')
    } catch (e) {
      console.error(e)
      setNotice({ type: 'err', text: 'Error al buscar el producto.' })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    void addProductByCode(codigo)
  }

  const total = lines.reduce((s, l) => s + l.cantidad * l.product.precioUnitario, 0)

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar activeItem="pos" />

      <main className="flex-1 p-6 md:p-8 overflow-auto">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Punto de venta</h1>
          <p className="text-gray-500 mt-1">Código de barras — escribir, escanear con pistola o leer desde foto</p>

          <form onSubmit={handleSubmit} className="mt-8 bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
            <label className="block text-sm font-medium text-gray-700">Código de barras</label>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 flex gap-2">
                <div className="relative flex-1">
                  <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value)}
                    placeholder="Escanear o escribir código"
                    autoComplete="off"
                    disabled={loading}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2 items-start">
                <BarcodeImageScanButton
                  disabled={loading}
                  onDecoded={(text) => {
                    setCodigo(text)
                    void addProductByCode(text)
                  }}
                  label="Foto o imagen"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-medium text-white bg-lime-500 hover:bg-lime-600 transition disabled:opacity-50"
                >
                  {loading ? (
                    '…'
                  ) : (
                    <>
                      <Plus className="w-5 h-5" />
                      Agregar
                    </>
                  )}
                </button>
              </div>
            </div>

            {notice && (
              <p
                className={`text-sm ${notice.type === 'ok' ? 'text-green-700' : 'text-red-600'}`}
              >
                {notice.text}
              </p>
            )}
          </form>

          {lines.length > 0 && (
            <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                <h2 className="font-semibold text-gray-900">Venta actual</h2>
                <span className="text-lg font-bold text-lime-600">
                  ${total.toFixed(2)}
                </span>
              </div>
              <ul className="divide-y divide-gray-100">
                {lines.map((line) => (
                  <li key={line.product.id} className="px-6 py-3 flex justify-between text-sm">
                    <span>
                      <span className="font-medium text-gray-900">{line.product.nombre}</span>
                      <span className="text-gray-500 ml-2">×{line.cantidad}</span>
                    </span>
                    <span className="text-gray-900">
                      ${(line.cantidad * line.product.precioUnitario).toFixed(2)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
