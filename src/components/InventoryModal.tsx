/**
 * Inventory Modal Component
 * Modal para crear y editar productos
 */

import { useState, useEffect } from 'react'
import { X, Copy } from 'lucide-react'
import { BarcodeImageScanButton } from './BarcodeImageScanButton'
import type { Product } from '../types/product'
import { InventoryService } from '../services/InventoryService'

interface InventoryModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (product: Product) => void
  editingProduct?: Product | null
}

const productTypes = ['Bikini', 'Short', 'Bikini Deportivo', 'Entero', 'Cover Up']
const materials = ['Lycra', 'Poliéster', 'Lycra Sport', 'Algodón', 'Nylon', 'Mezcla']
const genders = ['Femenino', 'Masculino', 'Unisex']

export function InventoryModal({ isOpen, onClose, onSuccess, editingProduct }: InventoryModalProps) {
  type FormState = {
    codigo: string
    nombre: string
    tipo: string
    material: string
    genero: string
    stock: number | ''
    costo: number | ''
    precioUnitario: number | ''
  }

  const [formData, setFormData] = useState<FormState>({
    codigo: '',
    nombre: '',
    tipo: '',
    material: '',
    genero: 'Femenino',
    stock: '',
    costo: '',
    precioUnitario: '',
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [stockWarning, setStockWarning] = useState(false)

  const MIN_STOCK_WARNING = 24

  useEffect(() => {
    if (editingProduct) {
      setFormData({
        codigo: editingProduct.codigo,
        nombre: editingProduct.nombre,
        tipo: editingProduct.tipo,
        material: editingProduct.material,
        genero: editingProduct.genero,
        stock: editingProduct.stock === 0 ? '' : editingProduct.stock,
        costo: editingProduct.costo === 0 ? '' : editingProduct.costo,
        precioUnitario: editingProduct.precioUnitario === 0 ? '' : editingProduct.precioUnitario,
      })
    } else {
      setFormData({
        codigo: '',
        nombre: '',
        tipo: '',
        material: '',
        genero: 'Femenino',
        stock: '',
        costo: '',
        precioUnitario: '',
      })
    }
    setError('')
    setStockWarning(false)
  }, [editingProduct, isOpen])

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target

    setFormData((prev) => ({
      ...prev,
      [name]: ['stock', 'costo', 'precioUnitario'].includes(name)
        ? (value === '' ? '' : Number(value))
        : value,
    }))

    if (name === 'stock') {
      setStockWarning(Number(value) < MIN_STOCK_WARNING)
    }
  }

  const generateBarcode = () => {
    const barcode = InventoryService.generateBarcode()
    setFormData((prev) => ({ ...prev, codigo: barcode }))
  }

  const copyBarcode = () => {
    navigator.clipboard.writeText(formData.codigo)
  }

  const costo = Number(formData.costo) || 0
  const unitario = Number(formData.precioUnitario) || 0
  // Calculados automáticamente — no se ingresan
  const mediaDocena = unitario * 6
  const docena = unitario * 12

  const margenUnitario = costo > 0 && unitario > 0 ? ((unitario - costo) / unitario * 100) : null
  const costoInvalido = costo > 0 && unitario > 0 && costo >= unitario

  // Bloquea caracteres que HTML permite en type="number" pero rompen la lógica de negocio
  const blockInvalidNumericKeys = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault()
  }

  const validateForm = (): boolean => {
    if (!formData.nombre.trim()) {
      setError('El nombre del producto es requerido')
      return false
    }
    if (!formData.tipo) {
      setError('Selecciona un tipo de prenda')
      return false
    }
    if (!formData.material) {
      setError('Selecciona un material')
      return false
    }
    if (!unitario || unitario <= 0) {
      setError('El precio unitario debe ser mayor a 0')
      return false
    }
    if (costo > 0 && costo >= unitario) {
      setError(`El costo ($${costo.toFixed(2)}) debe ser menor al precio unitario ($${unitario.toFixed(2)})`)
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!validateForm()) return

    setLoading(true)
    try {
      let product: Product

      const payload = {
        nombre: formData.nombre,
        codigo: formData.codigo,
        tipo: formData.tipo,
        material: formData.material,
        genero: formData.genero,
        stock: Number(formData.stock) || 0,
        costo,
        precioUnitario: unitario,
        precioMediaDocena: mediaDocena,
        precioDocena: docena,
      }

      if (editingProduct) {
        product = await InventoryService.updateProduct({ id: editingProduct.id, ...payload } as any)
      } else {
        const result = await InventoryService.createProductWithInventory(payload as any)
        product = result.producto as any
      }

      onSuccess(product)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar el producto')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4 pt-20 md:pt-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-transparent dark:border-gray-800 max-w-4xl w-full my-8 md:my-0">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-4 md:p-6 border-b border-gray-200 bg-white rounded-t-lg">
          <h2 className="text-lg md:text-xl font-semibold text-gray-900">
            {editingProduct ? 'Editar Producto' : 'Agregar Producto'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1"
            disabled={loading}
          >
            <X className="w-5 h-5 md:w-6 md:h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4 md:space-y-6 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 md:px-4 py-2 md:py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Información Básica */}
          <div>
            <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-3 md:mb-4">Información Básica</h3>
            <div className="space-y-3 md:space-y-4">
              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">
                  Nombre del Producto *
                </label>
                <input
                  type="text"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleInputChange}
                  placeholder="Ej: Bikini Floral Rojo"
                  className="w-full px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-transparent text-sm"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">
                  Código de Barras
                </label>
                <div className="flex flex-col sm:flex-row gap-2 sm:items-start">
                  <input
                    type="text"
                    name="codigo"
                    value={formData.codigo}
                    onChange={handleInputChange}
                    placeholder="Escanear o generar"
                    className="flex-1 min-w-0 px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-transparent text-sm"
                    disabled={loading}
                  />
                  <div className="flex flex-wrap gap-2 items-start">
                    <button
                      type="button"
                      onClick={generateBarcode}
                      className="px-2 md:px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium text-gray-700 transition text-sm whitespace-nowrap"
                      disabled={loading}
                    >
                      Generar
                    </button>
                    <BarcodeImageScanButton
                      disabled={loading}
                      onDecoded={(text) =>
                        setFormData((prev) => ({ ...prev, codigo: text }))
                      }
                    />
                    {formData.codigo && (
                      <button
                        type="button"
                        onClick={copyBarcode}
                        className="px-2 md:px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                        disabled={loading}
                      >
                        <Copy className="w-4 h-4 md:w-5 md:h-5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Atributos */}
          <div>
            <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-3 md:mb-4">Atributos del Producto</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">
                  Tipo de Prenda *
                </label>
                <select
                  name="tipo"
                  value={formData.tipo}
                  onChange={handleInputChange}
                  className="w-full px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-transparent text-sm"
                  disabled={loading}
                >
                  <option value="">Seleccionar...</option>
                  {productTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">
                  Material *
                </label>
                <select
                  name="material"
                  value={formData.material}
                  onChange={handleInputChange}
                  className="w-full px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-transparent text-sm"
                  disabled={loading}
                >
                  <option value="">Seleccionar...</option>
                  {materials.map((material) => (
                    <option key={material} value={material}>
                      {material}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">Género *</label>
                <div className="grid grid-cols-3 gap-2">
                  {genders.map((gender) => (
                    <label key={gender} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="genero"
                        value={gender}
                        checked={formData.genero === gender}
                        onChange={handleInputChange}
                        disabled={loading}
                        className="w-4 h-4"
                      />
                      <span className="text-xs md:text-sm text-gray-700">{gender}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Inventario */}
          <div>
            <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-3 md:mb-4">Inventario</h3>
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">
                Cantidad en Stock *
              </label>
              <input
                type="number"
                name="stock"
                value={formData.stock}
                onChange={handleInputChange}
                onKeyDown={blockInvalidNumericKeys}
                min="0"
                className="w-full px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-transparent text-sm"
                disabled={loading}
              />
              {stockWarning && (
                <p className="mt-2 text-xs md:text-sm text-orange-600 flex items-center gap-2">
                  ⚠️ El stock está por debajo del mínimo recomendado (24 unidades)
                </p>
              )}
            </div>
          </div>

          {/* Precios */}
          <div>
            <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-3 md:mb-4">Precios</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">
                  Costo de Adquisición
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input
                    type="number"
                    name="costo"
                    value={formData.costo}
                    onChange={handleInputChange}
                    onKeyDown={blockInvalidNumericKeys}
                    min="0.01"
                    step="0.01"
                    placeholder="0.00"
                    className={`w-full pl-7 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-transparent text-sm ${costoInvalido ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                    disabled={loading}
                  />
                </div>
                {costoInvalido && (
                  <p className="mt-1 text-xs text-red-600">El costo debe ser menor al precio unitario</p>
                )}
              </div>

              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">
                  Precio por Unidad *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input
                    type="number"
                    name="precioUnitario"
                    value={formData.precioUnitario}
                    onChange={handleInputChange}
                    onKeyDown={blockInvalidNumericKeys}
                    min="0.01"
                    step="0.01"
                    placeholder="0.00"
                    className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-transparent text-sm"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Campos calculados automáticamente */}
              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-500 mb-1 md:mb-2">
                  Precio Media Docena (6 u.) — calculado
                </label>
                <div className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-700 font-medium">
                  {unitario > 0 ? `$${mediaDocena.toFixed(2)}` : '—'}
                </div>
              </div>

              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-500 mb-1 md:mb-2">
                  Precio Docena (12 u.) — calculado
                </label>
                <div className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-700 font-medium">
                  {unitario > 0 ? `$${docena.toFixed(2)}` : '—'}
                </div>
              </div>
            </div>

            {/* Resumen de precios en tiempo real */}
            {unitario > 0 && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Resumen</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-white rounded-lg p-2 border border-gray-200">
                    <p className="text-xs text-gray-400 mb-1">1 unidad</p>
                    <p className="text-sm font-bold text-gray-900">${unitario.toFixed(2)}</p>
                  </div>
                  <div className="bg-white rounded-lg p-2 border border-gray-200">
                    <p className="text-xs text-gray-400 mb-1">½ docena (×6)</p>
                    <p className="text-sm font-bold text-gray-900">${mediaDocena.toFixed(2)}</p>
                    <p className="text-xs text-gray-500">${unitario.toFixed(2)}/u.</p>
                  </div>
                  <div className="bg-white rounded-lg p-2 border border-gray-200">
                    <p className="text-xs text-gray-400 mb-1">docena (×12)</p>
                    <p className="text-sm font-bold text-gray-900">${docena.toFixed(2)}</p>
                    <p className="text-xs text-gray-500">${unitario.toFixed(2)}/u.</p>
                  </div>
                </div>
                {margenUnitario !== null && (
                  <div className="flex items-center justify-between pt-1 border-t border-gray-200">
                    <span className="text-xs text-gray-500">Margen bruto:</span>
                    <span className={`text-xs font-semibold ${margenUnitario < 0 ? 'text-red-600' : margenUnitario < 20 ? 'text-orange-500' : 'text-green-600'}`}>
                      {margenUnitario.toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="flex flex-col-reverse sm:flex-row gap-3 md:gap-4 justify-end pt-4 md:pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 md:px-6 py-2 md:py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition text-sm"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 md:px-6 py-2 md:py-2 bg-lime-500 hover:bg-lime-600 text-white rounded-lg font-medium transition disabled:opacity-50 text-sm"
              disabled={loading}
            >
              {loading ? 'Guardando...' : editingProduct ? 'Actualizar Producto' : 'Agregar Producto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
