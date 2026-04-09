/**
 * Inventory Service
 * Gestión de productos e inventario con Firebase Realtime Database
 */

import {
  ref,
  set,
  get,
  remove,
  onValue,
} from "firebase/database";
import { database } from "../app/firebase";
import type { Product, CreateProductInput, UpdateProductInput, InventoryStats } from '../types/product'

const PRODUCTS_PATH = 'products'

export const InventoryService = {
  /**
   * Obtener todos los productos desde Firebase
   */
  async getProducts(): Promise<Product[]> {
    try {
      const productsRef = ref(database, PRODUCTS_PATH)
      const snapshot = await get(productsRef)
      
      if (!snapshot.exists()) {
        return []
      }

      const data = snapshot.val()
      return Object.values(data) as Product[]
    } catch (error) {
      console.error('Error fetching products:', error)
      throw new Error('Error al obtener productos')
    }
  },

  /**
   * Obtener producto por ID
   */
  async getProductById(id: string): Promise<Product | null> {
    try {
      const productRef = ref(database, `${PRODUCTS_PATH}/${id}`)
      const snapshot = await get(productRef)
      
      if (!snapshot.exists()) {
        return null
      }

      return snapshot.val() as Product
    } catch (error) {
      console.error('Error fetching product:', error)
      throw new Error('Error al obtener producto')
    }
  },

  /**
   * Crear nuevo producto
   */
  async createProduct(input: CreateProductInput): Promise<Product> {
    try {
      const id = Math.random().toString(36).substr(2, 9)
      
      const newProduct: Product = {
        id,
        ...input,
        fechaCreacion: new Date().toISOString().split('T')[0],
        fechaActualizacion: new Date().toISOString().split('T')[0],
      }

      const productRef = ref(database, `${PRODUCTS_PATH}/${id}`)
      await set(productRef, newProduct)
      
      return newProduct
    } catch (error) {
      console.error('Error creating product:', error)
      throw new Error('Error al crear producto')
    }
  },

  /**
   * Actualizar producto
   */
  async updateProduct(input: UpdateProductInput): Promise<Product> {
    try {
      const productRef = ref(database, `${PRODUCTS_PATH}/${input.id}`)
      const snapshot = await get(productRef)
      
      if (!snapshot.exists()) {
        throw new Error('Producto no encontrado')
      }

      const updatedProduct: Product = {
        ...snapshot.val(),
        ...input,
        fechaActualizacion: new Date().toISOString().split('T')[0],
      }

      await set(productRef, updatedProduct)
      return updatedProduct
    } catch (error) {
      console.error('Error updating product:', error)
      throw new Error('Error al actualizar producto')
    }
  },

  /**
   * Eliminar producto
   */
  async deleteProduct(id: string): Promise<void> {
    try {
      const productRef = ref(database, `${PRODUCTS_PATH}/${id}`)
      await remove(productRef)
    } catch (error) {
      console.error('Error deleting product:', error)
      throw new Error('Error al eliminar producto')
    }
  },

  /**
   * Obtener estadísticas de inventario
   */
  async getInventoryStats(): Promise<InventoryStats> {
    try {
      const products = await this.getProducts()
      const MIN_STOCK = 24
      
      return {
        totalProductos: products.length,
        stockTotal: products.reduce((sum, p) => sum + p.stock, 0),
        alertasStock: products.filter((p) => p.stock < MIN_STOCK).length,
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
      throw new Error('Error al obtener estadísticas')
    }
  },

  /**
   * Buscar productos por nombre, código o tipo
   */
  async searchProducts(query_str: string): Promise<Product[]> {
    try {
      const products = await this.getProducts()
      const lowerQuery = query_str.toLowerCase()
      
      return products.filter(
        (p) =>
          p.nombre.toLowerCase().includes(lowerQuery) ||
          p.codigo.toLowerCase().includes(lowerQuery) ||
          p.tipo.toLowerCase().includes(lowerQuery)
      )
    } catch (error) {
      console.error('Error searching products:', error)
      throw new Error('Error al buscar productos')
    }
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

  /**
   * Suscribirse a cambios en tiempo real (opcional)
   */
  onProductsChange(callback: (products: Product[]) => void): () => void {
    const productsRef = ref(database, PRODUCTS_PATH)
    
    const unsubscribe = onValue(productsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val()
        const products = Object.values(data) as Product[]
        callback(products)
      } else {
        callback([])
      }
    })

    return unsubscribe
  },
}
