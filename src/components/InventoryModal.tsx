/**
 * Inventory Modal Component
 * Modal para crear y editar productos
 */

import { useState, useEffect } from 'react'
import { X, Copy } from 'lucide-react'
import type { Product, CreateProductInput } from '../types/product'
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
  const [formData, setFormData] = useState<CreateProductInput>({
    codigo: '',
    nombre: '',
    tipo: '',
    material: '',
    genero: 'Femenino',
    stock: 0,
    costo: 0,
    precioUnitario: 0,
    precioMediaDocena: 0,
    precioDocena: 0,
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
        stock: editingProduct.stock,
        costo: editingProduct.costo,
        precioUnitario: editingProduct.precioUnitario,
        precioMediaDocena: editingProduct.precioMediaDocena,
        precioDocena: editingProduct.precioDocena,
      })
    } else {
      setFormData({
        codigo: '',
        nombre: '',
        tipo: '',
        material: '',
        genero: 'Femenino',
        stock: 0,
        costo: 0,
        precioUnitario: 0,
        precioMediaDocena: 0,
        precioDocena: 0,
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
      [name]: ['stock', 'costo', 'precioUnitario', 'precioMediaDocena', 'precioDocena'].includes(name)
        ? Number(value)
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
    if (formData.precioUnitario <= 0) {
      setError('El precio debe ser mayor a 0')
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

      if (editingProduct) {
        product = await InventoryService.updateProduct({
          id: editingProduct.id,
          nombre: formData.nombre,
          codigo: formData.codigo,
          tipo: formData.tipo,
          material: formData.material,
          genero: formData.genero,
          stock: formData.stock,
          costo: formData.costo,
          precioUnitario: formData.precioUnitario,
          precioMediaDocena: formData.precioMediaDocena,
          precioDocena: formData.precioDocena,
        })
      } else {
        const result = await InventoryService.createProductWithInventory(formData)
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-6 border-b border-gray-200 bg-white">
          <h2 className="text-xl font-semibold text-gray-900">
            {editingProduct ? 'Editar Producto' : 'Agregar Producto'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={loading}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Información Básica */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Información Básica</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre del Producto *
                </label>
                <input
                  type="text"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleInputChange}
                  placeholder="Ej: Bikini Floral Rojo"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-transparent"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Código de Barras
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    name="codigo"
                    value={formData.codigo}
                    onChange={handleInputChange}
                    placeholder="Escanear o generar"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-transparent"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={generateBarcode}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium text-gray-700 transition"
                    disabled={loading}
                  >
                    Generar
                  </button>
                  {formData.codigo && (
                    <button
                      type="button"
                      onClick={copyBarcode}
                      className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                      disabled={loading}
                    >
                      <Copy className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Atributos */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Atributos del Producto</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Prenda *
                </label>
                <select
                  name="tipo"
                  value={formData.tipo}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-transparent"
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Material *
                </label>
                <select
                  name="material"
                  value={formData.material}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-transparent"
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

              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">Género *</label>
                <div className="space-y-2">
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
                      <span className="text-sm text-gray-700">{gender}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Inventario */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Inventario</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cantidad en Stock *
              </label>
              <input
                type="number"
                name="stock"
                value={formData.stock}
                onChange={handleInputChange}
                min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-transparent"
                disabled={loading}
              />
              {stockWarning && (
                <p className="mt-2 text-sm text-orange-600 flex items-center gap-2">
                  ⚠️ El stock está por debajo del mínimo recomendado (24 unidades)
                </p>
              )}
            </div>
          </div>

          {/* Precios */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Precios</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Costo de Adquisición
                </label>
                <input
                  type="number"
                  name="costo"
                  value={formData.costo}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-transparent"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Precio por Unidad *
                </label>
                <input
                  type="number"
                  name="precioUnitario"
                  value={formData.precioUnitario}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-transparent"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Precio por Media Docena (6 unidades) *
                </label>
                <input
                  type="number"
                  name="precioMediaDocena"
                  value={formData.precioMediaDocena}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-transparent"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Precio por Docena (12 unidades) *
                </label>
                <input
                  type="number"
                  name="precioDocena"
                  value={formData.precioDocena}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-transparent"
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-4 justify-end pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-lime-500 hover:bg-lime-600 text-white rounded-lg font-medium transition disabled:opacity-50"
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
