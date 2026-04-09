/**
 * Inventory Service
 * Gestión de productos e inventario
 */

import type { Product, CreateProductInput, UpdateProductInput, InventoryStats } from '../types/product'

// Mock data - usando objeto para permitir mutación
const store = {
  products: [
  {
    id: '1',
    codigo: '7501234567890',
    nombre: 'Bikini Floral Rojo',
    tipo: 'Bikini',
    material: 'Lycra',
    genero: 'Femenino',
    stock: 18,
    costo: 35,
    precioUnitario: 70,
    precioMediaDocena: 65,
    precioDocena: 60,
    fechaCreacion: '2026-01-15',
    fechaActualizacion: '2026-01-15',
  },
  {
    id: '2',
    codigo: '7501234567891',
    nombre: 'Short de Baño Negro',
    tipo: 'Short',
    material: 'Poliéster',
    genero: 'Masculino',
    stock: 22,
    costo: 40,
    precioUnitario: 80,
    precioMediaDocena: 75,
    precioDocena: 70,
    fechaCreacion: '2026-01-16',
    fechaActualizacion: '2026-01-16',
  },
  {
    id: '3',
    codigo: '7501234567892',
    nombre: 'Bikini Deportivo Azul',
    tipo: 'Bikini Deportivo',
    material: 'Lycra Sport',
    genero: 'Femenino',
    stock: 35,
    costo: 45,
    precioUnitario: 85,
    precioMediaDocena: 80,
    precioDocena: 75,
    fechaCreacion: '2026-01-17',
    fechaActualizacion: '2026-01-17',
  },
  {
    id: '4',
    codigo: '7501234567893',
    nombre: 'Traje de Baño Entero',
    tipo: 'Entero',
    material: 'Lycra',
    genero: 'Femenino',
    stock: 28,
    costo: 50,
    precioUnitario: 95,
    precioMediaDocena: 90,
    precioDocena: 85,
    fechaCreacion: '2026-01-18',
    fechaActualizacion: '2026-01-18',
  },
  {
    id: '5',
    codigo: '7501234567894',
    nombre: 'Bikini Unisex Blanco',
    tipo: 'Bikini',
    material: 'Algodón',
    genero: 'Unisex',
    stock: 45,
    costo: 30,
    precioUnitario: 60,
    precioMediaDocena: 55,
    precioDocena: 50,
    fechaCreacion: '2026-01-19',
    fechaActualizacion: '2026-01-19',
  },
]
}

export const InventoryService = {
  /**
   * Obtener todos los productos
   */
  async getProducts(): Promise<Product[]> {
    // Simular delay de API
    await new Promise((resolve) => setTimeout(resolve, 500))
    return store.products
  },

  /**
   * Obtener producto por ID
   */
  async getProductById(id: string): Promise<Product | null> {
    await new Promise((resolve) => setTimeout(resolve, 300))
    return store.products.find((p) => p.id === id) || null
  },

  /**
   * Crear nuevo producto
   */
  async createProduct(input: CreateProductInput): Promise<Product> {
    await new Promise((resolve) => setTimeout(resolve, 300))

    const newProduct: Product = {
      id: Math.random().toString(36).substr(2, 9),
      ...input,
      fechaCreacion: new Date().toISOString().split('T')[0],
      fechaActualizacion: new Date().toISOString().split('T')[0],
    }

    store.products.push(newProduct)
    return newProduct
  },

  /**
   * Actualizar producto
   */
  async updateProduct(input: UpdateProductInput): Promise<Product> {
    await new Promise((resolve) => setTimeout(resolve, 300))

    const index = store.products.findIndex((p) => p.id === input.id)
    if (index === -1) throw new Error('Producto no encontrado')

    const updatedProduct: Product = {
      ...store.products[index],
      ...input,
      fechaActualizacion: new Date().toISOString().split('T')[0],
    }

    store.products[index] = updatedProduct
    return updatedProduct
  },

  /**
   * Eliminar producto
   */
  async deleteProduct(id: string): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 300))

    const index = store.products.findIndex((p) => p.id === id)
    if (index === -1) throw new Error('Producto no encontrado')

    store.products.splice(index, 1)
  },

  /**
   * Obtener estadísticas de inventario
   */
  async getInventoryStats(): Promise<InventoryStats> {
    await new Promise((resolve) => setTimeout(resolve, 300))

    const MIN_STOCK = 24
    return {
      totalProductos: store.products.length,
      stockTotal: store.products.reduce((sum, p) => sum + p.stock, 0),
      alertasStock: store.products.filter((p) => p.stock < MIN_STOCK).length,
    }
  },

  /**
   * Buscar productos por nombre, código o tipo
   */
  async searchProducts(query: string): Promise<Product[]> {
    await new Promise((resolve) => setTimeout(resolve, 300))

    const lowerQuery = query.toLowerCase()
    return store.products.filter(
      (p) =>
        p.nombre.toLowerCase().includes(lowerQuery) ||
        p.codigo.toLowerCase().includes(lowerQuery) ||
        p.tipo.toLowerCase().includes(lowerQuery)
    )
  },

  /**
   * Generar código de barras
   */
  generateBarcode(): string {
    return Array(13)
      .fill(0)
      .map(() => Math.floor(Math.random() * 10))
      .join('')
  },
}
