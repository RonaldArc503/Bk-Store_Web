/**
 * Inventory Page
 * CRUD completo de productos e inventario
 */

import { useState, useEffect } from 'react'
import { Package, AlertTriangle, Search, Edit2, Trash2 } from 'lucide-react'
import { Sidebar } from '../components/Sidebar'
import { InventoryModal } from '../components/InventoryModal'
import { InventoryService } from '../services/InventoryService'
import type { Product, InventoryStats } from '../types/product'

const MIN_STOCK_WARNING = 24

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [stats, setStats] = useState<InventoryStats>({ totalProductos: 0, stockTotal: 0, alertasStock: 0 })
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Cargar productos y estadísticas
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [productsData, statsData] = await Promise.all([
        InventoryService.getProducts(),
        InventoryService.getInventoryStats(),
      ])
      setProducts(productsData)
      setFilteredProducts(productsData)
      setStats(statsData)
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

  // Eliminar producto
  const handleDeleteProduct = async (id: string) => {
    setDeleteLoading(true)
    try {
      await InventoryService.deleteProduct(id)
      setProducts(products.filter((p) => p.id !== id))
      setFilteredProducts(filteredProducts.filter((p) => p.id !== id))
      setDeleteConfirm(null)
      loadData() // Actualizar stats
    } catch (error) {
      console.error('Error deleting product:', error)
    } finally {
      setDeleteLoading(false)
    }
  }

  // Abrir modal para editar
  const handleEditClick = (product: Product) => {
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
    if (editingProduct) {
      handleUpdateProduct(product)
    } else {
      handleCreateProduct(product)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar activeItem="inventario" />

      <main className="flex-1 p-8 overflow-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Inventario</h1>
          <p className="text-gray-500 mt-1">Gestión de productos y stock</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Total Productos */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-lime-100 rounded-lg flex items-center justify-center">
                <Package className="w-6 h-6 text-lime-600" />
              </div>
            </div>
            <p className="text-gray-500 text-sm font-medium">Total de Productos</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalProductos}</p>
            <p className="text-xs text-gray-400 mt-2">En catálogo</p>
          </div>

          {/* Stock Total */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <p className="text-gray-500 text-sm font-medium">Stock Total</p>
            <p className="text-2xl font-bold text-gray-900">{stats.stockTotal}</p>
            <p className="text-xs text-gray-400 mt-2">Unidades disponibles</p>
          </div>

          {/* Alertas Stock */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-orange-600" />
              </div>
            </div>
            <p className="text-gray-500 text-sm font-medium">Alertas de Stock</p>
            <p className="text-2xl font-bold text-gray-900">{stats.alertasStock}</p>
            <p className="text-xs text-gray-400 mt-2">Productos con stock bajo</p>
          </div>
        </div>

        {/* Search and Add Button */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nombre, código de barras o tipo..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => {
                setEditingProduct(null)
                setIsModalOpen(true)
              }}
              className="px-6 py-2 bg-lime-500 hover:bg-lime-600 text-white rounded-lg font-medium transition whitespace-nowrap"
            >
              + Agregar Producto
            </button>
          </div>
        </div>

        {/* Products Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
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
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Código
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Producto
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Material
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Género
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Stock
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Costo
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      P. Unitario
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 text-sm font-mono text-gray-500">{product.codigo}</td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{product.nombre}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{product.tipo}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{product.material}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{product.genero}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-sm font-medium ${product.stock < MIN_STOCK_WARNING ? 'text-orange-600' : 'text-green-600'}`}
                          >
                            {product.stock}
                          </span>
                          {product.stock < MIN_STOCK_WARNING && <AlertTriangle className="w-4 h-4 text-orange-600" />}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 font-medium">${product.costo.toFixed(2)}</td>
                      <td className="px-6 py-4 text-sm text-gray-900 font-medium">${product.precioUnitario.toFixed(2)}</td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditClick(product)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(product.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">¿Eliminar producto?</h3>
              <p className="text-gray-600 mb-6">
                Esta acción no se puede deshacer. El producto será eliminado permanentemente.
              </p>
              <div className="flex gap-4 justify-end">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  disabled={deleteLoading}
                  className="px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleDeleteProduct(deleteConfirm)}
                  disabled={deleteLoading}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition disabled:opacity-50"
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
