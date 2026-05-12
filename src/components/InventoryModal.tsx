/**
 * Inventory Modal Component
 * Modal para crear y editar productos
 */

import { useMemo, useRef, useState, useEffect } from 'react'
import { X, Copy } from 'lucide-react'
import { BarcodeImageScanButton } from './BarcodeImageScanButton'
import type { Product } from '../types/product'
import { InventoryService } from '../services/InventoryService'
import { useSettings, type InventoryCatalogItem } from '../context/SettingsContext'

interface InventoryModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (product: Product) => void
  editingProduct?: Product | null
}

const genders = ['Femenino', 'Masculino', 'Unisex']

export function InventoryModal({ isOpen, onClose, onSuccess, editingProduct }: InventoryModalProps) {
  const { settings } = useSettings()
  const lowStockThreshold = settings.inventory.lowStockThreshold

  // Admin-configured options (Configuracion > Inventario).
  const productTypes = (settings.inventory.productTypes || []) as InventoryCatalogItem[]
  const materials = (settings.inventory.materials || []) as InventoryCatalogItem[]

  const normalizeKey = (v: string) =>
    v
      .trim()
      .replace(/\s+/g, ' ')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')

  const isLegacyId = (id: string) => id.startsWith('legacy:')
  const legacyLabelFromId = (id: string) => (isLegacyId(id) ? id.slice('legacy:'.length) : '')

  const resolveCatalogLabel = (items: InventoryCatalogItem[], id: string) => {
    if (!id) return ''
    if (isLegacyId(id)) return legacyLabelFromId(id)
    return items.find((x) => x.id === id)?.label || ''
  }

  const findIdByLabel = (items: InventoryCatalogItem[], label: string) => {
    const key = normalizeKey(label)
    return items.find((x) => normalizeKey(x.label) === key)?.id || ''
  }
  type FormState = {
    codigo: string
    nombre: string
    tipoId: string
    materialId: string
    genero: string
    stock: number | ''
    costo: number | ''
    precioUnitario: number | ''
  }

  const [formData, setFormData] = useState<FormState>({
    codigo: '',
    nombre: '',
    tipoId: '',
    materialId: '',
    genero: 'Femenino',
    stock: '',
    costo: '',
    precioUnitario: '',
  })
  const formRef = useRef<HTMLFormElement | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormState, string>>>({})

  const productTypeOptions = useMemo(() => {
    const opts = [...productTypes]
    if (isLegacyId(formData.tipoId)) {
      opts.push({ id: formData.tipoId, label: legacyLabelFromId(formData.tipoId) })
    }
    return opts
  }, [productTypes, formData.tipoId])

  const materialOptions = useMemo(() => {
    const opts = [...materials]
    if (isLegacyId(formData.materialId)) {
      opts.push({ id: formData.materialId, label: legacyLabelFromId(formData.materialId) })
    }
    return opts
  }, [materials, formData.materialId])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [stockWarning, setStockWarning] = useState(false)

  useEffect(() => {
    if (editingProduct) {
      const tipoId =
        editingProduct.tipoId ||
        findIdByLabel(productTypes, editingProduct.tipo) ||
        (editingProduct.tipo ? `legacy:${editingProduct.tipo}` : '')
      const materialId =
        editingProduct.materialId ||
        findIdByLabel(materials, editingProduct.material) ||
        (editingProduct.material ? `legacy:${editingProduct.material}` : '')
      setFormData({
        codigo: editingProduct.codigo,
        nombre: editingProduct.nombre,
        tipoId,
        materialId,
        genero: editingProduct.genero,
        stock: editingProduct.stock === 0 ? '' : editingProduct.stock,
        costo: editingProduct.costo === 0 ? '' : editingProduct.costo,
        precioUnitario: editingProduct.precioUnitario === 0 ? '' : editingProduct.precioUnitario,
      })
    } else {
      setFormData({
        codigo: '',
        nombre: '',
        tipoId: '',
        materialId: '',
        genero: 'Femenino',
        stock: '',
        costo: '',
        precioUnitario: '',
      })
    }
    setError('')
    setFieldErrors({})
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

    // Clear per-field errors as the user fixes inputs.
    setFieldErrors((prev) => {
      const key = name as keyof FormState
      if (!prev[key]) return prev
      const next = { ...prev }
      delete (next as any)[key]
      return next
    })

    if (name === 'stock') {
      setStockWarning(Number(value) < lowStockThreshold)
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

  const focusFirstInvalid = (orderedFields: (keyof FormState)[]) => {
    const root = formRef.current
    if (!root) return
    for (const f of orderedFields) {
      const el = root.querySelector<HTMLInputElement | HTMLSelectElement>(`[name="${String(f)}"]`)
      if (el) {
        el.focus()
        return
      }
    }
  }

  const validateForm = (): boolean => {
    const errs: Partial<Record<keyof FormState, string>> = {}

    if (!formData.nombre.trim()) errs.nombre = 'El nombre del producto es requerido'
    if (!formData.tipoId) errs.tipoId = 'Selecciona un tipo de prenda'
    if (!formData.materialId) errs.materialId = 'Selecciona un material'
    if (!unitario || unitario <= 0) errs.precioUnitario = 'El precio unitario debe ser mayor a 0'
    if (costo > 0 && unitario > 0 && costo >= unitario) {
      errs.costo = `El costo ($${costo.toFixed(2)}) debe ser menor al precio unitario ($${unitario.toFixed(2)})`
    }

    setFieldErrors(errs)

    if (Object.keys(errs).length > 0) {
      setError('Revisa los campos marcados en rojo')
      focusFirstInvalid(['nombre', 'tipoId', 'materialId', 'precioUnitario', 'costo'])
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
        tipo: resolveCatalogLabel(productTypes, formData.tipoId),
        tipoId: isLegacyId(formData.tipoId) ? undefined : formData.tipoId,
        material: resolveCatalogLabel(materials, formData.materialId),
        materialId: isLegacyId(formData.materialId) ? undefined : formData.materialId,
        genero: formData.genero,
        stock: Number(formData.stock) || 0,
        stockMinimo: lowStockThreshold,
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
        <div className="sticky top-0 flex items-center justify-between p-4 md:p-6 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 rounded-t-lg">
          <h2 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white">
            {editingProduct ? 'Editar Producto' : 'Agregar Producto'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 p-1"
            disabled={loading}
          >
            <X className="w-5 h-5 md:w-6 md:h-6" />
          </button>
        </div>

        {/* Form */}
        <form ref={formRef} onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4 md:space-y-6 max-h-[70vh] overflow-y-auto">
          {error && (
            <div role="alert" aria-live="polite" className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg px-3 md:px-4 py-2 md:py-3 text-sm text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Información Básica */}
          <div>
            <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white mb-3 md:mb-4">Información Básica</h3>
            <div className="space-y-3 md:space-y-4">
              <div>
                <label htmlFor="inv-nombre" className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 md:mb-2">
                  Nombre del Producto *
                </label>
                <input
                  id="inv-nombre"
                  type="text"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleInputChange}
                  placeholder="Ej: Bikini Floral Rojo"
                  aria-invalid={!!fieldErrors.nombre}
                  aria-describedby={fieldErrors.nombre ? 'inv-err-nombre' : undefined}
                  className={`w-full px-3 md:px-4 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:border-transparent text-sm ${
                    fieldErrors.nombre ? 'border-red-300 dark:border-red-700 focus:ring-red-500' : 'border-gray-300 dark:border-gray-700 focus:ring-lime-500 dark:focus:ring-lime-600'
                  }`}
                  disabled={loading}
                />
                {fieldErrors.nombre && (
                  <p id="inv-err-nombre" className="mt-1 text-xs text-red-600" role="alert">
                    {fieldErrors.nombre}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 md:mb-2">
                  Código de Barras
                </label>
                <div className="flex flex-col sm:flex-row gap-2 sm:items-start">
                  <input
                    type="text"
                    name="codigo"
                    value={formData.codigo}
                    onChange={handleInputChange}
                    placeholder="Escanear o generar"
                    className="flex-1 min-w-0 px-3 md:px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-lime-500 dark:focus:ring-lime-600 focus:border-transparent text-sm"
                    disabled={loading}
                  />
                  <div className="flex flex-wrap gap-2 items-start">
                    <button
                      type="button"
                      onClick={generateBarcode}
                      className="px-2 md:px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg font-medium text-gray-700 dark:text-gray-300 transition text-sm whitespace-nowrap"
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
                        className="px-2 md:px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded-lg transition"
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
            <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white mb-3 md:mb-4">Atributos del Producto</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
              <div>
                <label htmlFor="inv-tipo" className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 md:mb-2">
                  Tipo de Prenda *
                </label>
                <select
                  id="inv-tipo"
                  name="tipoId"
                  value={formData.tipoId}
                  onChange={handleInputChange}
                  aria-invalid={!!fieldErrors.tipoId}
                  aria-describedby={fieldErrors.tipoId ? 'inv-err-tipo' : undefined}
                  className={`w-full px-3 md:px-4 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:border-transparent text-sm ${
                    fieldErrors.tipoId ? 'border-red-300 dark:border-red-700 focus:ring-red-500' : 'border-gray-300 dark:border-gray-700 focus:ring-lime-500 dark:focus:ring-lime-600'
                  }`}
                  disabled={loading}
                >
                  <option value="">Seleccionar...</option>
                  {productTypeOptions.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.label}
                    </option>
                  ))}
                </select>
                {fieldErrors.tipoId && (
                  <p id="inv-err-tipo" className="mt-1 text-xs text-red-600" role="alert">
                    {fieldErrors.tipoId}
                  </p>
                )}
                {productTypes.length === 0 && (
                  <p className="mt-1 text-xs text-amber-600">
                    No hay tipos configurados. Ve a Configuracion {'>'} Inventario para agregarlos.
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="inv-material" className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 md:mb-2">
                  Material *
                </label>
                <select
                  id="inv-material"
                  name="materialId"
                  value={formData.materialId}
                  onChange={handleInputChange}
                  aria-invalid={!!fieldErrors.materialId}
                  aria-describedby={fieldErrors.materialId ? 'inv-err-material' : undefined}
                  className={`w-full px-3 md:px-4 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:border-transparent text-sm ${
                    fieldErrors.materialId ? 'border-red-300 dark:border-red-700 focus:ring-red-500' : 'border-gray-300 dark:border-gray-700 focus:ring-lime-500 dark:focus:ring-lime-600'
                  }`}
                  disabled={loading}
                >
                  <option value="">Seleccionar...</option>
                  {materialOptions.map((material) => (
                    <option key={material.id} value={material.id}>
                      {material.label}
                    </option>
                  ))}
                </select>
                {fieldErrors.materialId && (
                  <p id="inv-err-material" className="mt-1 text-xs text-red-600" role="alert">
                    {fieldErrors.materialId}
                  </p>
                )}
                {materials.length === 0 && (
                  <p className="mt-1 text-xs text-amber-600">
                    No hay materiales configurados. Ve a Configuracion {'>'} Inventario para agregarlos.
                  </p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Género *</label>
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
                        className="w-4 h-4 accent-lime-500"
                      />
                      <span className="text-xs md:text-sm text-gray-700 dark:text-gray-300">{gender}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Inventario */}
          <div>
            <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white mb-3 md:mb-4">Inventario</h3>
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 md:mb-2">
                Cantidad en Stock *
              </label>
              <input
                type="number"
                name="stock"
                value={formData.stock}
                onChange={handleInputChange}
                onKeyDown={blockInvalidNumericKeys}
                min="0"
                className="w-full px-3 md:px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-lime-500 dark:focus:ring-lime-600 focus:border-transparent text-sm"
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
            <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white mb-3 md:mb-4">Precios</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
              <div>
                <label htmlFor="inv-costo" className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 md:mb-2">
                  Costo de Adquisición
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-sm">$</span>
                  <input
                    id="inv-costo"
                    type="number"
                    name="costo"
                    value={formData.costo}
                    onChange={handleInputChange}
                    onKeyDown={blockInvalidNumericKeys}
                    min="0.01"
                    step="0.01"
                    placeholder="0.00"
                    aria-invalid={!!fieldErrors.costo || costoInvalido}
                    aria-describedby={fieldErrors.costo ? 'inv-err-costo' : undefined}
                    className={`w-full pl-7 pr-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent text-sm ${
                      fieldErrors.costo || costoInvalido
                        ? 'border-red-400 dark:border-red-700 bg-red-50 dark:bg-red-950/30 text-gray-900 dark:text-gray-100 focus:ring-red-500'
                        : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-lime-500 dark:focus:ring-lime-600'
                    }`}
                    disabled={loading}
                  />
                </div>
                {fieldErrors.costo && (
                  <p id="inv-err-costo" className="mt-1 text-xs text-red-600" role="alert">
                    {fieldErrors.costo}
                  </p>
                )}
                {costoInvalido && (
                  <p className="mt-1 text-xs text-red-600">El costo debe ser menor al precio unitario</p>
                )}
              </div>

              <div>
                <label htmlFor="inv-precio-unitario" className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 md:mb-2">
                  Precio por Unidad *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-sm">$</span>
                  <input
                    id="inv-precio-unitario"
                    type="number"
                    name="precioUnitario"
                    value={formData.precioUnitario}
                    onChange={handleInputChange}
                    onKeyDown={blockInvalidNumericKeys}
                    min="0.01"
                    step="0.01"
                    placeholder="0.00"
                    aria-invalid={!!fieldErrors.precioUnitario}
                    aria-describedby={fieldErrors.precioUnitario ? 'inv-err-precioUnitario' : undefined}
                    className={`w-full pl-7 pr-3 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:border-transparent text-sm ${
                      fieldErrors.precioUnitario ? 'border-red-300 dark:border-red-700 focus:ring-red-500' : 'border-gray-300 dark:border-gray-700 focus:ring-lime-500 dark:focus:ring-lime-600'
                    }`}
                    disabled={loading}
                  />
                </div>
                {fieldErrors.precioUnitario && (
                  <p id="inv-err-precioUnitario" className="mt-1 text-xs text-red-600" role="alert">
                    {fieldErrors.precioUnitario}
                  </p>
                )}
              </div>

              {/* Campos calculados automáticamente */}
              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400 mb-1 md:mb-2">
                  Precio Media Docena (6 u.) — calculado
                </label>
                <div className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 font-medium">
                  {unitario > 0 ? `$${mediaDocena.toFixed(2)}` : '—'}
                </div>
              </div>

              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400 mb-1 md:mb-2">
                  Precio Docena (12 u.) — calculado
                </label>
                <div className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 font-medium">
                  {unitario > 0 ? `$${docena.toFixed(2)}` : '—'}
                </div>
              </div>
            </div>

            {/* Resumen de precios en tiempo real */}
            {unitario > 0 && (
              <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800/60 rounded-lg border border-gray-200 dark:border-gray-700 space-y-2">
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Resumen</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-white dark:bg-gray-900 rounded-lg p-2 border border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">1 unidad</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">${unitario.toFixed(2)}</p>
                  </div>
                  <div className="bg-white dark:bg-gray-900 rounded-lg p-2 border border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">½ docena (×6)</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">${mediaDocena.toFixed(2)}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">${unitario.toFixed(2)}/u.</p>
                  </div>
                  <div className="bg-white dark:bg-gray-900 rounded-lg p-2 border border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">docena (×12)</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">${docena.toFixed(2)}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">${unitario.toFixed(2)}/u.</p>
                  </div>
                </div>
                {margenUnitario !== null && (
                  <div className="flex items-center justify-between pt-1 border-t border-gray-200 dark:border-gray-700">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Margen bruto:</span>
                    <span className={`text-xs font-semibold ${margenUnitario < 0 ? 'text-red-600' : margenUnitario < 20 ? 'text-orange-500' : 'text-green-600'}`}>
                      {margenUnitario.toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="flex flex-col-reverse sm:flex-row gap-3 md:gap-4 justify-end pt-4 md:pt-6 border-t border-gray-200 dark:border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 md:px-6 py-2 md:py-2 border border-gray-300 dark:border-gray-700 rounded-lg font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition text-sm"
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
