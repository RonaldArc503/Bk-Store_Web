/**
 * Inventory Page
 * CRUD completo de productos e inventario
 */

import { useState, useEffect, useRef } from 'react'
import { Package, AlertTriangle, Search, Edit2, Power, Trash2 } from 'lucide-react'
import { Sidebar } from '../components/Sidebar'
import { InventoryModal } from '../components/InventoryModal'
import { InventoryService } from '../services/InventoryService'
import { useSettings } from '../context/SettingsContext'
import { useAuth } from '../hooks/useAuth'
import type { Product, InventoryStats } from '../types/product'
import { toast } from 'react-toastify'

export default function InventoryPage() {
  const { settings } = useSettings()
  const { hasModuleAccess } = useAuth()
  const canManageInventory = hasModuleAccess('inventory', 'full')
  const lowStockThreshold = settings.inventory.lowStockThreshold
  const lastLowStockNotice = useRef<number | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [stats, setStats] = useState<InventoryStats>({ totalProductos: 0, stockTotal: 0, alertasStock: 0 })
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deletionCheckMap, setDeletionCheckMap] = useState<Record<string, boolean>>({})

  // Cargar productos y estadísticas
  useEffect(() => {
    loadData()
  }, [lowStockThreshold])

  useEffect(() => {
    if (!settings.notifications.lowStock) return
    if (stats.alertasStock <= 0) return
    if (lastLowStockNotice.current === stats.alertasStock) return

    toast.warning(`Hay ${stats.alertasStock} productos con stock bajo`)
    lastLowStockNotice.current = stats.alertasStock
  }, [settings.notifications.lowStock, stats.alertasStock])

  const loadData = async () => {
    setLoading(true)
    try {
      const [productsData, statsData] = await Promise.all([
        InventoryService.getProducts(),
        InventoryService.getInventoryStats(lowStockThreshold),
      ])
      const deletionChecks = await Promise.all(
        productsData.map(async (product) => [product.id, await InventoryService.getProductDeletionCheck(product.id)] as const),
      )
      setProducts(productsData)
      setFilteredProducts(productsData)
      setStats(statsData)
      setDeletionCheckMap(Object.fromEntries(deletionChecks.map(([id, check]) => [id, check.canDelete])))
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Buscar productos
  const handleSearch = async (query: string) => {
    setSearchQuery(query)
    if (!query.trim()) {
      setFilteredProducts(products)
    } else {
      const results = await InventoryService.searchProducts(query)
      setFilteredProducts(results)
    }
  }

  // Crear nuevo producto
  const handleCreateProduct = (product: Product) => {
    setProducts([...products, product])
    setFilteredProducts([...filteredProducts, product])
    loadData() // Actualizar stats
  }

  // Actualizar producto
  const handleUpdateProduct = (updatedProduct: Product) => {
    setProducts(products.map((p) => (p.id === updatedProduct.id ? updatedProduct : p)))
    setFilteredProducts(filteredProducts.map((p) => (p.id === updatedProduct.id ? updatedProduct : p)))
    setEditingProduct(null)
    loadData() // Actualizar stats
  }

  // Deshabilitar / habilitar producto
  const handleToggleProductStatus = async (id: string) => {
    setDeleteLoading(true)
    try {
      const current = products.find((p) => p.id === id)
      const nextStatus = current?.estado === 'Inactivo' ? 'Activo' : 'Inactivo'
      const updated = await InventoryService.setProductStatus(id, nextStatus)
      setProducts(products.map((p) => (p.id === id ? updated : p)))
      setFilteredProducts(filteredProducts.map((p) => (p.id === id ? updated : p)))
      loadData() // Actualizar stats
    } catch (error) {
      console.error('Error updating product status:', error)
      toast.error(error instanceof Error ? error.message : 'Error al actualizar producto')
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleDeleteProduct = async (id: string) => {
    setDeleteLoading(true)
    try {
      await InventoryService.deleteProduct(id)
      setProducts(products.filter((p) => p.id !== id))
      setFilteredProducts(filteredProducts.filter((p) => p.id !== id))
      setDeleteConfirm(null)
      await loadData()
    } catch (error) {
      console.error('Error deleting product:', error)
      toast.error(error instanceof Error ? error.message : 'Error al eliminar producto')
    } finally {
      setDeleteLoading(false)
    }
  }

  // Abrir modal para editar
  const handleEditClick = (product: Product) => {
    if (!canManageInventory) {
      toast.error('No tienes permisos para editar productos')
      return
    }
    setEditingProduct(product)
    setIsModalOpen(true)
  }

  // Cerrar modal
  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingProduct(null)
  }

  // Manejar éxito del modal
  const handleModalSuccess = (product: Product) => {
    if (!canManageInventory) {
      return
    }
    if (editingProduct) {
      handleUpdateProduct(product)
    } else {
      handleCreateProduct(product)
    }
  }

  return (
    <div className="min-h-screen app-page-bg text-gray-900 dark:text-gray-100 flex flex-col md:flex-row">
      <Sidebar activeItem="inventario" />

      <main className="flex-1 overflow-auto md:p-8 p-4 pt-20 md:pt-0">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Inventario</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm md:text-base">Gestión de productos y stock</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6 mb-6 md:mb-8">
          {/* Total Productos */}
          <div className="bg-white dark:bg-gray-900 p-4 md:p-6 rounded-lg md:rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-lime-100 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 md:w-6 md:h-6 text-lime-600" />
              </div>
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-xs md:text-sm font-medium">Total de Productos</p>
            <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{stats.totalProductos}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">En catálogo</p>
          </div>

          {/* Stock Total */}
          <div className="bg-white dark:bg-gray-900 p-4 md:p-6 rounded-lg md:rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-100 dark:bg-blue-950/40 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 md:w-6 md:h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-xs md:text-sm font-medium">Stock Total</p>
            <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{stats.stockTotal}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Unidades disponibles</p>
          </div>

          {/* Alertas Stock */}
          <div className="bg-white dark:bg-gray-900 p-4 md:p-6 rounded-lg md:rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-orange-100 dark:bg-orange-950/40 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 md:w-6 md:h-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-xs md:text-sm font-medium">Alertas de Stock</p>
            <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{stats.alertasStock}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Productos con stock bajo</p>
          </div>
        </div>

        {/* Search and Add Button */}
        <div className="bg-white dark:bg-gray-900 rounded-lg md:rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-4 md:p-6 mb-6">
          <div className="flex flex-col gap-3 md:gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nombre, código..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-lime-500 dark:focus:ring-lime-600 focus:border-transparent text-sm"
              />
            </div>
            {canManageInventory && (
              <button
                onClick={() => {
                  setEditingProduct(null)
                  setIsModalOpen(true)
                }}
                className="w-full md:w-auto px-4 md:px-6 py-3 md:py-2 bg-lime-500 hover:bg-lime-600 text-white rounded-lg font-medium transition whitespace-nowrap text-sm md:text-base"
              >
                + Agregar Producto
              </button>
            )}
          </div>
        </div>

        {/* Products Table - Desktop */}
        <div className="hidden md:block bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <p className="text-gray-500">Cargando productos...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-12 text-center">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No se encontraron productos</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-800">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Código
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Producto
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Material
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Género
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Stock
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Costo
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      P. Unitario
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filteredProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition">
                      <td className="px-6 py-4 text-sm font-mono text-gray-500 dark:text-gray-400">{product.codigo}</td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{product.nombre}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{product.tipo}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{product.material}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{product.genero}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                            product.estado === 'Inactivo'
                              ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                              : 'bg-lime-100 text-lime-700 dark:bg-lime-950/40 dark:text-lime-300'
                          }`}
                        >
                          {product.estado === 'Inactivo' ? 'Deshabilitado' : 'Activo'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-sm font-medium ${product.stock < lowStockThreshold ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'}`}
                          >
                            {product.stock}
                          </span>
                          {product.stock < lowStockThreshold && <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-400" />}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100 font-medium">${product.costo.toFixed(2)}</td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100 font-medium">${product.precioUnitario.toFixed(2)}</td>
                      <td className="px-6 py-4">
                        {canManageInventory && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditClick(product)}
                              className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition"
                              title="Editar"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => void handleToggleProductStatus(product.id)}
                              disabled={deleteLoading}
                              className={`p-2 rounded-lg transition disabled:opacity-50 ${
                                product.estado === 'Inactivo'
                                  ? 'text-lime-600 dark:text-lime-400 hover:bg-lime-50 dark:hover:bg-lime-950/40'
                                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                              }`}
                              title={product.estado === 'Inactivo' ? 'Habilitar' : 'Deshabilitar'}
                            >
                              <Power className="w-4 h-4" />
                            </button>
                            {deletionCheckMap[product.id] && (
                              <button
                                onClick={() => setDeleteConfirm(product.id)}
                                className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition"
                                title="Eliminar definitivamente"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Products Cards - Mobile */}
        <div className="md:hidden space-y-4 pb-8">
          {loading ? (
            <div className="p-8 text-center bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800">
              <p className="text-gray-500 dark:text-gray-400">Cargando productos...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800">
              <Package className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No se encontraron productos</p>
            </div>
          ) : (
            filteredProducts.map((product) => (
              <div key={product.id} className="bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 p-4 shadow-sm">
                <div className="mb-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{product.nombre}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">{product.codigo}</p>
                    </div>
                    {product.stock < lowStockThreshold && (
                      <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Tipo</p>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{product.tipo}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Material</p>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{product.material}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Género</p>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{product.genero}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Estado</p>
                    <p className={`font-medium ${product.estado === 'Inactivo' ? 'text-gray-500 dark:text-gray-400' : 'text-lime-600 dark:text-lime-400'}`}>
                      {product.estado === 'Inactivo' ? 'Deshabilitado' : 'Activo'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Stock</p>
                    <p className={`font-medium ${product.stock < lowStockThreshold ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'}`}>
                      {product.stock} unidades
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Costo</p>
                    <p className="font-medium text-gray-900 dark:text-gray-100">${product.costo.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Precio</p>
                    <p className="font-medium text-gray-900 dark:text-gray-100">${product.precioUnitario.toFixed(2)}</p>
                  </div>
                </div>

                {canManageInventory && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditClick(product)}
                      className="flex-1 flex items-center justify-center gap-2 py-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition border border-blue-200 dark:border-blue-800/60"
                    >
                      <Edit2 className="w-4 h-4" />
                      <span className="text-sm font-medium">Editar</span>
                    </button>
                    {deletionCheckMap[product.id] && (
                      <button
                        onClick={() => setDeleteConfirm(product.id)}
                        className="flex-1 flex items-center justify-center gap-2 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition border border-red-200 dark:border-red-800/60"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span className="text-sm font-medium">Eliminar</span>
                      </button>
                    )}
                    <button
                      onClick={() => void handleToggleProductStatus(product.id)}
                      disabled={deleteLoading}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition border disabled:opacity-50 ${
                        product.estado === 'Inactivo'
                          ? 'text-lime-600 dark:text-lime-400 hover:bg-lime-50 dark:hover:bg-lime-950/40 border-lime-200 dark:border-lime-800/60'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <Power className="w-4 h-4" />
                      <span className="text-sm font-medium">{product.estado === 'Inactivo' ? 'Habilitar' : 'Deshabilitar'}</span>
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {deleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40 p-4">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-xl max-w-sm w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">¿Eliminar producto definitivamente?</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Solo podrás eliminarlo si no existe en ventas, movimientos ni devoluciones. Si aparece aquí, puedes deshabilitarlo con el botón de power.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-end">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  disabled={deleteLoading}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition text-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    if (!canManageInventory) {
                      toast.error('No tienes permisos para eliminar productos')
                      return
                    }
                    void handleDeleteProduct(deleteConfirm)
                  }}
                  disabled={deleteLoading}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition disabled:opacity-50 text-sm"
                >
                  {deleteLoading ? 'Eliminando...' : 'Eliminar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Inventory Modal */}
      <InventoryModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSuccess={handleModalSuccess}
        editingProduct={editingProduct}
      />
    </div>
  )
}
